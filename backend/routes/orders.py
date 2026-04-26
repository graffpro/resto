"""Orders, Menu Items, Categories routes"""
from fastapi import APIRouter, HTTPException, Depends, Request, Query
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime, timezone
import uuid
from database import db
from auth import get_current_user, get_current_user_optional
from models import UserRole, OrderStatus, Category, CategoryCreate, MenuItem, MenuItemCreate, OrderItem, Order, OrderCreate
from routes.shared import sanitize_input, notify_order_update, tenant_query, stamp_restaurant_id, get_restaurant_id_for_table, get_restaurant_id_for_session

router = APIRouter()

@router.post("/categories", response_model=Category)
async def create_category(category: CategoryCreate, current_user: dict = Depends(get_current_user)):
    if current_user['role'] not in [UserRole.OWNER, UserRole.ADMIN]:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    category_obj = Category(**category.model_dump(), restaurant_id=current_user.get('restaurant_id'))
    doc = category_obj.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    stamp_restaurant_id(doc, current_user)
    await db.categories.insert_one(doc)
    return category_obj

@router.get("/categories", response_model=List[Category])
async def get_categories(restaurant_id: Optional[str] = Query(None), current_user: Optional[dict] = Depends(get_current_user_optional)):
    query = {}
    if current_user:
        query.update(tenant_query(current_user))
    elif restaurant_id:
        query["restaurant_id"] = restaurant_id
    else:
        # Public access without restaurant_id is not allowed (multi-tenant)
        return []
    categories = await db.categories.find(query, {"_id": 0}).sort("display_order", 1).to_list(1000)
    for cat in categories:
        if isinstance(cat['created_at'], str):
            cat['created_at'] = datetime.fromisoformat(cat['created_at'])
    return categories

@router.put("/categories/{category_id}", response_model=Category)
async def update_category(category_id: str, category: CategoryCreate, current_user: dict = Depends(get_current_user)):
    if current_user['role'] not in [UserRole.OWNER, UserRole.ADMIN]:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    q = {"id": category_id, **tenant_query(current_user)}
    result = await db.categories.find_one(q, {"_id": 0})
    if not result:
        raise HTTPException(status_code=404, detail="Category not found")
    
    await db.categories.update_one(q, {"$set": category.model_dump()})
    updated = await db.categories.find_one(q, {"_id": 0})
    if isinstance(updated['created_at'], str):
        updated['created_at'] = datetime.fromisoformat(updated['created_at'])
    return Category(**updated)

@router.delete("/categories/{category_id}")
async def delete_category(category_id: str, current_user: dict = Depends(get_current_user)):
    if current_user['role'] not in [UserRole.OWNER, UserRole.ADMIN]:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    q = {"id": category_id, **tenant_query(current_user)}
    result = await db.categories.delete_one(q)
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Category not found")
    return {"message": "Category deleted"}

@router.post("/menu-items", response_model=MenuItem)
async def create_menu_item(item: MenuItemCreate, current_user: dict = Depends(get_current_user)):
    if current_user['role'] not in [UserRole.OWNER, UserRole.ADMIN]:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    item_obj = MenuItem(**item.model_dump(), restaurant_id=current_user.get('restaurant_id'))
    doc = item_obj.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    stamp_restaurant_id(doc, current_user)
    await db.menu_items.insert_one(doc)
    return item_obj

@router.get("/menu-items", response_model=List[MenuItem])
async def get_menu_items(category_id: Optional[str] = None, restaurant_id: Optional[str] = Query(None), current_user: Optional[dict] = Depends(get_current_user_optional)):
    query = {}
    if category_id:
        query["category_id"] = category_id
    if current_user:
        query.update(tenant_query(current_user))
    elif restaurant_id:
        query["restaurant_id"] = restaurant_id
    else:
        # Public access without restaurant_id is not allowed (multi-tenant)
        return []
    
    items = await db.menu_items.find(query, {"_id": 0}).to_list(1000)
    for item in items:
        if isinstance(item['created_at'], str):
            item['created_at'] = datetime.fromisoformat(item['created_at'])
    return items

@router.put("/menu-items/{item_id}", response_model=MenuItem)
async def update_menu_item(item_id: str, item: MenuItemCreate, current_user: dict = Depends(get_current_user)):
    if current_user['role'] not in [UserRole.OWNER, UserRole.ADMIN]:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    q = {"id": item_id, **tenant_query(current_user)}
    result = await db.menu_items.find_one(q, {"_id": 0})
    if not result:
        raise HTTPException(status_code=404, detail="Menu item not found")
    
    await db.menu_items.update_one(q, {"$set": item.model_dump()})
    updated = await db.menu_items.find_one(q, {"_id": 0})
    if isinstance(updated['created_at'], str):
        updated['created_at'] = datetime.fromisoformat(updated['created_at'])
    return MenuItem(**updated)

@router.delete("/menu-items/{item_id}")
async def delete_menu_item(item_id: str, current_user: dict = Depends(get_current_user)):
    if current_user['role'] not in [UserRole.OWNER, UserRole.ADMIN]:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    q = {"id": item_id, **tenant_query(current_user)}
    result = await db.menu_items.delete_one(q)
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Menu item not found")
    return {"message": "Menu item deleted"}

@router.post("/orders", response_model=Order)
async def create_order(order: OrderCreate):
    session = await db.table_sessions.find_one({"session_token": order.session_token}, {"_id": 0})
    if not session or not session.get('is_active'):
        raise HTTPException(status_code=400, detail="Invalid or inactive session")
    
    # Resolve restaurant_id from session/table for tenant stamping
    rid = session.get('restaurant_id') or await get_restaurant_id_for_table(session.get('table_id'))
    
    # Check venue order rules
    table = await db.tables.find_one({"id": session["table_id"]}, {"_id": 0})
    if table:
        venue = await db.venues.find_one({"id": table.get("venue_id")}, {"_id": 0})
        if venue and venue.get("order_rules"):
            for rule in venue["order_rules"]:
                if rule.get("type") == "require_with":
                    trigger_cat = rule.get("trigger_category_id")
                    required_cat = rule.get("required_category_id")
                    min_qty = rule.get("min_required", 1)
                    if trigger_cat and required_cat:
                        has_trigger = False
                        required_count = 0
                        for item in order.items:
                            item_d = item.model_dump() if hasattr(item, 'model_dump') else dict(item)
                            mi = await db.menu_items.find_one({"id": item_d["menu_item_id"]}, {"_id": 0})
                            if mi:
                                if mi.get("category_id") == trigger_cat:
                                    has_trigger = True
                                if mi.get("category_id") == required_cat:
                                    required_count += item_d.get("quantity", 1)
                        if has_trigger and required_count < min_qty:
                            trigger_cat_doc = await db.categories.find_one({"id": trigger_cat}, {"_id": 0})
                            required_cat_doc = await db.categories.find_one({"id": required_cat}, {"_id": 0})
                            t_name = trigger_cat_doc["name"] if trigger_cat_doc else trigger_cat
                            r_name = required_cat_doc["name"] if required_cat_doc else required_cat
                            raise HTTPException(status_code=400, detail=f"Bu məkanda {t_name} sifariş etmək üçün ən azı {min_qty} ədəd {r_name} da sifariş etməlisiniz")
    
    order_count = await db.orders.count_documents({}) + 1
    order_number = f"ORD{str(order_count).zfill(5)}"
    
    # Calculate subtotal with per-item discounts
    subtotal = 0
    processed_items = []
    for item in order.items:
        item_dict = item.model_dump() if hasattr(item, 'model_dump') else dict(item)
        original_price = item_dict['price'] * item_dict['quantity']
        
        # Get menu item to check for per-item discount
        menu_item = await db.menu_items.find_one({"id": item_dict['menu_item_id']}, {"_id": 0})
        item_discount = menu_item.get('discount_percentage', 0) if menu_item else 0
        
        # Get target_station from menu item
        item_dict['target_station'] = menu_item.get('target_station', 'kitchen') if menu_item else 'kitchen'
        
        if item_discount > 0:
            discounted_price = original_price * (1 - item_discount / 100)
            item_dict['discount_percentage'] = item_discount
            item_dict['discounted_price'] = discounted_price
            subtotal += discounted_price
        else:
            item_dict['discount_percentage'] = 0
            item_dict['discounted_price'] = original_price
            subtotal += original_price
        
        processed_items.append(item_dict)
    
    # Check for order-level discounts
    discount_id = None
    discount_name = None
    discount_type = None
    discount_value = 0
    discount_amount = 0
    total_amount = subtotal
    
    # Find applicable active discount (tenant scoped)
    today = datetime.now(timezone.utc).strftime('%Y-%m-%d')
    discount_filter = {
        "is_active": True,
        "$or": [
            {"valid_until": None},
            {"valid_until": {"$gte": today}},
            {"valid_until": ""}
        ]
    }
    if rid:
        discount_filter["restaurant_id"] = rid
    active_discounts = await db.discounts.find(discount_filter, {"_id": 0}).to_list(100)
    
    # Find the best applicable discount
    best_discount = None
    for discount in active_discounts:
        min_order = discount.get('min_order_amount', 0)
        if subtotal >= min_order:
            if not best_discount or discount.get('value', 0) > best_discount.get('value', 0):
                best_discount = discount
    
    if best_discount:
        discount_id = best_discount['id']
        discount_name = best_discount['name']
        discount_type = best_discount['discount_type']
        discount_value = best_discount['value']
        
        if discount_type == 'percentage':
            discount_amount = subtotal * (discount_value / 100)
        else:  # fixed
            discount_amount = min(discount_value, subtotal)
        
        total_amount = subtotal - discount_amount
    
    # Service charge is NOT applied per order - only when admin closes the session

    order_obj = Order(
        order_number=order_number,
        session_id=session['id'],
        table_id=session['table_id'],
        items=[OrderItem(**item) for item in processed_items],
        subtotal=round(subtotal, 2),
        discount_id=discount_id,
        discount_name=discount_name,
        discount_type=discount_type,
        discount_value=discount_value,
        discount_amount=round(discount_amount, 2),
        service_charge_percentage=0,
        service_charge_amount=0,
        total_amount=round(total_amount, 2),
        restaurant_id=rid
    )
    
    doc = order_obj.model_dump()
    doc['ordered_at'] = doc['ordered_at'].isoformat()
    if rid and not doc.get('restaurant_id'):
        doc['restaurant_id'] = rid
    await db.orders.insert_one(doc)
    
    # Auto-deduct stock from inventory based on recipes (tenant scoped)
    for item in processed_items:
        menu_item_id = item.get('menu_item_id')
        if not menu_item_id:
            continue
        recipe_q = {"menu_item_id": menu_item_id}
        if rid:
            recipe_q["restaurant_id"] = rid
        recipe = await db.recipes.find_one(recipe_q, {"_id": 0})
        if not recipe:
            continue
        for ri in recipe.get('ingredients', []):
            deduct_qty = ri['quantity'] * item.get('quantity', 1)
            ing_q = {"id": ri['ingredient_id']}
            if rid:
                ing_q["restaurant_id"] = rid
            ing = await db.ingredients.find_one(ing_q, {"_id": 0})
            if ing:
                new_stock = max(0, ing.get('current_stock', 0) - deduct_qty)
                await db.ingredients.update_one({"id": ri['ingredient_id']}, {"$set": {"current_stock": new_stock}})
                # Log the auto-deduction as a usage transaction
                tx_doc = {
                    "id": str(uuid.uuid4()),
                    "ingredient_id": ri['ingredient_id'],
                    "ingredient_name": ri.get('ingredient_name', ''),
                    "transaction_type": "usage",
                    "quantity": deduct_qty,
                    "unit_cost": None,
                    "total_cost": 0,
                    "notes": f"Avtomatik: Sifariş #{order_obj.order_number} - {item.get('name', '')}",
                    "date": datetime.now(timezone.utc).strftime('%Y-%m-%d'),
                    "stock_after": new_stock,
                    "created_by": "system",
                    "created_at": datetime.now(timezone.utc).isoformat()
                }
                if rid:
                    tx_doc['restaurant_id'] = rid
                await db.stock_transactions.insert_one(tx_doc)
    
    # Get table info for notification
    table = await db.tables.find_one({"id": session['table_id']}, {"_id": 0})
    
    # Send WebSocket notification to kitchen
    await notify_order_update({
        "order": doc,
        "table": table
    }, "new_order")
    
    return order_obj

@router.get("/orders/session/{session_token}")
async def get_session_orders(session_token: str):
    session = await db.table_sessions.find_one({"session_token": session_token}, {"_id": 0})
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    orders = await db.orders.find({"session_id": session['id']}, {"_id": 0}).sort("ordered_at", -1).to_list(1000)
    for order in orders:
        for field in ['ordered_at', 'preparing_started_at', 'ready_at', 'delivered_at']:
            if order.get(field) and isinstance(order[field], str):
                order[field] = datetime.fromisoformat(order[field])
    
    total = sum(o.get('total_amount', 0) for o in orders if o.get('status') != OrderStatus.COMPLETED)
    
    return {
        "orders": orders,
        "total_bill": total
    }

@router.get("/orders/recommendations/{session_token}")
async def get_recommendations(session_token: str):
    """Get 3-5 product recommendations based on what the customer already ordered"""
    session = await db.table_sessions.find_one({"session_token": session_token}, {"_id": 0})
    if not session:
        return []
    
    rid = session.get('restaurant_id') or await get_restaurant_id_for_table(session.get('table_id'))
    
    # Get all items already ordered in this session
    orders = await db.orders.find({"session_id": session['id']}, {"_id": 0}).to_list(100)
    ordered_item_ids = set()
    ordered_category_ids = set()
    for order in orders:
        for item in order.get('items', []):
            ordered_item_ids.add(item.get('menu_item_id'))
    
    # Get categories of ordered items
    for item_id in ordered_item_ids:
        menu_item = await db.menu_items.find_one({"id": item_id}, {"_id": 0})
        if menu_item:
            ordered_category_ids.add(menu_item.get('category_id'))
    
    # Get all available menu items (tenant scoped)
    items_filter = {"is_available": True}
    if rid:
        items_filter["restaurant_id"] = rid
    all_items = await db.menu_items.find(items_filter, {"_id": 0}).to_list(500)
    
    recommendations = []
    
    # Priority 1: Items from DIFFERENT categories (complementary)
    for item in all_items:
        if item['id'] not in ordered_item_ids and item.get('category_id') not in ordered_category_ids:
            recommendations.append(item)
    
    # Priority 2: Popular items from SAME categories but not yet ordered
    if len(recommendations) < 5:
        for item in all_items:
            if item['id'] not in ordered_item_ids and item not in recommendations:
                recommendations.append(item)
    
    # Shuffle and limit to 5
    import random
    random.shuffle(recommendations)
    return recommendations[:5]

@router.get("/orders/kitchen")
async def get_kitchen_orders(current_user: dict = Depends(get_current_user), station: Optional[str] = None):
    if current_user['role'] not in [UserRole.KITCHEN, UserRole.BAR, UserRole.ADMIN, UserRole.OWNER]:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    # Only show TODAY's orders
    today_start = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
    
    orders_filter = {
        "status": {"$in": [OrderStatus.PENDING, OrderStatus.PREPARING]},
        "ordered_at": {"$gte": today_start.isoformat()},
        **tenant_query(current_user)
    }
    orders = await db.orders.find(orders_filter, {"_id": 0}).sort("ordered_at", 1).to_list(1000)
    
    result = []
    for order in orders:
        for field in ['ordered_at', 'preparing_started_at']:
            if order.get(field) and isinstance(order[field], str):
                order[field] = datetime.fromisoformat(order[field])
        
        # Filter items by station if specified
        if station:
            filtered_items = [item for item in order.get('items', []) if item.get('target_station', 'kitchen') == station]
            if not filtered_items:
                continue
            order = {**order, 'items': filtered_items}
        
        table = await db.tables.find_one({"id": order['table_id']}, {"_id": 0})
        venue = await db.venues.find_one({"id": table['venue_id']}, {"_id": 0}) if table else None
        
        result.append({
            "order": order,
            "table": table,
            "venue": venue
        })
    
    return result

@router.put("/orders/{order_id}/status")
async def update_order_status(order_id: str, status: OrderStatus, current_user: dict = Depends(get_current_user)):
    q = {"id": order_id, **tenant_query(current_user)}
    order = await db.orders.find_one(q, {"_id": 0})
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    update_data = {"status": status}
    
    if status == OrderStatus.PREPARING and current_user['role'] in [UserRole.KITCHEN, UserRole.BAR, UserRole.WAITER]:
        update_data['preparing_started_at'] = datetime.now(timezone.utc).isoformat()
    elif status == OrderStatus.READY and current_user['role'] in [UserRole.KITCHEN, UserRole.BAR, UserRole.WAITER]:
        update_data['ready_at'] = datetime.now(timezone.utc).isoformat()
    elif status == OrderStatus.DELIVERED and current_user['role'] in [UserRole.WAITER, UserRole.ADMIN, UserRole.OWNER]:
        update_data['delivered_at'] = datetime.now(timezone.utc).isoformat()
        update_data['waiter_id'] = current_user['id']
    
    await db.orders.update_one(q, {"$set": update_data})
    
    # Get table info for notification
    table = await db.tables.find_one({"id": order['table_id']}, {"_id": 0})
    updated_order = await db.orders.find_one({"id": order_id}, {"_id": 0})
    
    # Send WebSocket notification
    event_type = "order_ready" if status == OrderStatus.READY else "order_update"
    await notify_order_update({
        "order": updated_order,
        "table": table
    }, event_type)
    
    return {"message": "Order status updated"}


# Delete order
@router.delete("/orders/{order_id}")
async def delete_order(order_id: str, current_user: dict = Depends(get_current_user)):
    if current_user['role'] not in [UserRole.ADMIN, UserRole.OWNER]:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    q = {"id": order_id, **tenant_query(current_user)}
    order = await db.orders.find_one(q, {"_id": 0})
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    result = await db.orders.delete_one(q)
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Order not found")
    
    return {"message": "Order deleted"}


# Update order items
class OrderUpdate(BaseModel):
    items: List[dict]
    total_amount: float

@router.put("/orders/{order_id}")
async def update_order(order_id: str, order_update: OrderUpdate, current_user: dict = Depends(get_current_user)):
    if current_user['role'] not in [UserRole.ADMIN, UserRole.OWNER]:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    q = {"id": order_id, **tenant_query(current_user)}
    order = await db.orders.find_one(q, {"_id": 0})
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    await db.orders.update_one(
        q,
        {"$set": {
            "items": order_update.items,
            "total_amount": order_update.total_amount
        }}
    )
    
    return {"message": "Order updated"}


@router.get("/orders/waiter")
async def get_waiter_orders(current_user: dict = Depends(get_current_user)):
    if current_user['role'] not in [UserRole.WAITER, UserRole.ADMIN, UserRole.OWNER]:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    # Only show TODAY's active orders
    today_start = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
    
    orders_filter = {
        "status": {"$in": [OrderStatus.PENDING, OrderStatus.PREPARING, OrderStatus.READY]},
        "ordered_at": {"$gte": today_start.isoformat()},
        **tenant_query(current_user)
    }
    orders = await db.orders.find(orders_filter, {"_id": 0}).sort("ordered_at", 1).to_list(1000)
    
    result = []
    for order in orders:
        for field in ['ordered_at', 'preparing_started_at', 'ready_at']:
            if order.get(field) and isinstance(order[field], str):
                order[field] = datetime.fromisoformat(order[field])
        
        table = await db.tables.find_one({"id": order['table_id']}, {"_id": 0})
        venue = await db.venues.find_one({"id": table['venue_id']}, {"_id": 0}) if table else None
        
        result.append({
            "order": order,
            "table": table,
            "venue": venue
        })
    
    return result
