"""Inventory, Ingredients, Recipes routes"""
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime, timezone
import uuid
from database import db
from auth import get_current_user
from models import UserRole

router = APIRouter()

# ==================== INVENTORY ====================
class IngredientCreate(BaseModel):
    name: str
    unit: str  # "ədəd", "kq", "litr", "qram"
    current_stock: float = 0
    min_stock: float = 0
    cost_per_unit: float = 0

@router.post("/ingredients")
async def create_ingredient(ing: IngredientCreate, current_user: dict = Depends(get_current_user)):
    if current_user['role'] not in [UserRole.OWNER, UserRole.ADMIN]:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    doc = {
        "id": str(uuid.uuid4()),
        "name": ing.name,
        "unit": ing.unit,
        "current_stock": ing.current_stock,
        "min_stock": ing.min_stock,
        "cost_per_unit": ing.cost_per_unit,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.ingredients.insert_one(doc)
    doc.pop('_id', None)
    return doc

@router.get("/ingredients")
async def get_ingredients(current_user: dict = Depends(get_current_user)):
    if current_user['role'] not in [UserRole.OWNER, UserRole.ADMIN]:
        raise HTTPException(status_code=403, detail="Not authorized")
    items = await db.ingredients.find({}, {"_id": 0}).to_list(1000)
    return items

@router.put("/ingredients/{ingredient_id}")
async def update_ingredient(ingredient_id: str, ing: IngredientCreate, current_user: dict = Depends(get_current_user)):
    if current_user['role'] not in [UserRole.OWNER, UserRole.ADMIN]:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    result = await db.ingredients.update_one({"id": ingredient_id}, {"$set": {
        "name": ing.name, "unit": ing.unit, "current_stock": ing.current_stock,
        "min_stock": ing.min_stock, "cost_per_unit": ing.cost_per_unit
    }})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Ingredient not found")
    updated = await db.ingredients.find_one({"id": ingredient_id}, {"_id": 0})
    return updated

@router.delete("/ingredients/{ingredient_id}")
async def delete_ingredient(ingredient_id: str, current_user: dict = Depends(get_current_user)):
    if current_user['role'] not in [UserRole.OWNER, UserRole.ADMIN]:
        raise HTTPException(status_code=403, detail="Not authorized")
    result = await db.ingredients.delete_one({"id": ingredient_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Not found")
    return {"message": "Ingredient deleted"}

# Stock transactions (purchase / usage)
class StockTransactionCreate(BaseModel):
    ingredient_id: str
    transaction_type: str  # "purchase" or "usage"
    quantity: float
    unit_cost: Optional[float] = None
    notes: Optional[str] = None
    date: Optional[str] = None

@router.post("/stock-transactions")
async def create_stock_transaction(tx: StockTransactionCreate, current_user: dict = Depends(get_current_user)):
    if current_user['role'] not in [UserRole.OWNER, UserRole.ADMIN]:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    ingredient = await db.ingredients.find_one({"id": tx.ingredient_id}, {"_id": 0})
    if not ingredient:
        raise HTTPException(status_code=404, detail="Ingredient not found")
    
    current_stock = ingredient.get('current_stock', 0)
    if tx.transaction_type == "purchase":
        new_stock = current_stock + tx.quantity
    else:
        new_stock = max(0, current_stock - tx.quantity)
    
    await db.ingredients.update_one({"id": tx.ingredient_id}, {"$set": {"current_stock": new_stock}})
    
    doc = {
        "id": str(uuid.uuid4()),
        "ingredient_id": tx.ingredient_id,
        "ingredient_name": ingredient['name'],
        "transaction_type": tx.transaction_type,
        "quantity": tx.quantity,
        "unit_cost": tx.unit_cost,
        "total_cost": (tx.unit_cost or 0) * tx.quantity,
        "notes": tx.notes,
        "date": tx.date or datetime.now(timezone.utc).strftime('%Y-%m-%d'),
        "stock_after": new_stock,
        "created_by": current_user['id'],
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.stock_transactions.insert_one(doc)
    doc.pop('_id', None)
    return doc

@router.get("/stock-transactions")
async def get_stock_transactions(ingredient_id: Optional[str] = None, date_from: Optional[str] = None, date_to: Optional[str] = None, current_user: dict = Depends(get_current_user)):
    if current_user['role'] not in [UserRole.OWNER, UserRole.ADMIN]:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    query = {}
    if ingredient_id:
        query["ingredient_id"] = ingredient_id
    if date_from:
        query["date"] = {"$gte": date_from}
    if date_to:
        query.setdefault("date", {})
        if isinstance(query["date"], dict):
            query["date"]["$lte"] = date_to
        else:
            query["date"] = {"$gte": query["date"], "$lte": date_to}
    
    txs = await db.stock_transactions.find(query, {"_id": 0}).sort("created_at", -1).to_list(5000)
    return txs

@router.get("/inventory/summary")
async def get_inventory_summary(current_user: dict = Depends(get_current_user)):
    if current_user['role'] not in [UserRole.OWNER, UserRole.ADMIN]:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    ingredients = await db.ingredients.find({}, {"_id": 0}).to_list(1000)
    summary = []
    for ing in ingredients:
        txs = await db.stock_transactions.find({"ingredient_id": ing['id']}, {"_id": 0}).to_list(10000)
        total_purchased = sum(t['quantity'] for t in txs if t['transaction_type'] == 'purchase')
        total_used = sum(t['quantity'] for t in txs if t['transaction_type'] == 'usage')
        total_cost = sum(t.get('total_cost', 0) for t in txs if t['transaction_type'] == 'purchase')
        
        summary.append({
            "id": ing['id'],
            "name": ing['name'],
            "unit": ing['unit'],
            "current_stock": ing.get('current_stock', 0),
            "min_stock": ing.get('min_stock', 0),
            "cost_per_unit": ing.get('cost_per_unit', 0),
            "total_purchased": total_purchased,
            "total_used": total_used,
            "total_cost": round(total_cost, 2),
            "is_low_stock": ing.get('current_stock', 0) <= ing.get('min_stock', 0)
        })
    
    return summary

# ==================== MENU-INGREDIENT MAPPING ====================
class RecipeItem(BaseModel):
    ingredient_id: str
    quantity: float

class RecipeCreate(BaseModel):
    menu_item_id: str
    ingredients: List[RecipeItem]

@router.post("/recipes")
async def set_recipe(recipe: RecipeCreate, current_user: dict = Depends(get_current_user)):
    if current_user['role'] not in [UserRole.OWNER, UserRole.ADMIN]:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    menu_item = await db.menu_items.find_one({"id": recipe.menu_item_id}, {"_id": 0})
    if not menu_item:
        raise HTTPException(status_code=404, detail="Menu item not found")
    
    # Build recipe with ingredient names
    recipe_items = []
    for ri in recipe.ingredients:
        ing = await db.ingredients.find_one({"id": ri.ingredient_id}, {"_id": 0})
        if not ing:
            continue
        recipe_items.append({
            "ingredient_id": ri.ingredient_id,
            "ingredient_name": ing['name'],
            "ingredient_unit": ing['unit'],
            "quantity": ri.quantity
        })
    
    # Upsert recipe
    await db.recipes.update_one(
        {"menu_item_id": recipe.menu_item_id},
        {"$set": {
            "menu_item_id": recipe.menu_item_id,
            "menu_item_name": menu_item['name'],
            "ingredients": recipe_items,
            "updated_at": datetime.now(timezone.utc).isoformat()
        }},
        upsert=True
    )
    
    return {"message": "Recipe saved", "menu_item": menu_item['name'], "ingredients_count": len(recipe_items)}

@router.get("/recipes")
async def get_all_recipes(current_user: dict = Depends(get_current_user)):
    if current_user['role'] not in [UserRole.OWNER, UserRole.ADMIN]:
        raise HTTPException(status_code=403, detail="Not authorized")
    recipes = await db.recipes.find({}, {"_id": 0}).to_list(1000)
    return recipes

@router.get("/recipes/{menu_item_id}")
async def get_recipe(menu_item_id: str, current_user: dict = Depends(get_current_user)):
    if current_user['role'] not in [UserRole.OWNER, UserRole.ADMIN]:
        raise HTTPException(status_code=403, detail="Not authorized")
    recipe = await db.recipes.find_one({"menu_item_id": menu_item_id}, {"_id": 0})
    return recipe or {"menu_item_id": menu_item_id, "ingredients": []}

@router.delete("/recipes/{menu_item_id}")
async def delete_recipe(menu_item_id: str, current_user: dict = Depends(get_current_user)):
    if current_user['role'] not in [UserRole.OWNER, UserRole.ADMIN]:
        raise HTTPException(status_code=403, detail="Not authorized")
    await db.recipes.delete_one({"menu_item_id": menu_item_id})
    return {"message": "Recipe deleted"}

# Staff Analytics
@router.get("/analytics/staff-performance")
async def get_staff_performance(current_user: dict = Depends(get_current_user), period: str = "month"):
    if current_user['role'] not in [UserRole.OWNER, UserRole.ADMIN]:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    # Get waiters
    query = {"role": "waiter"}
    if current_user['role'] == UserRole.ADMIN:
        query['restaurant_id'] = current_user.get('restaurant_id')
    
    waiters = await db.users.find(query, {"_id": 0, "password": 0}).to_list(1000)
    
    # Calculate period
    today = datetime.now(timezone.utc)
    if period == "today":
        start_date = today.strftime('%Y-%m-%d')
    elif period == "week":
        start_date = (today - timedelta(days=7)).strftime('%Y-%m-%d')
    elif period == "month":
        start_date = (today - timedelta(days=30)).strftime('%Y-%m-%d')
    else:
        start_date = (today - timedelta(days=365)).strftime('%Y-%m-%d')
    
    performance = []
    for waiter in waiters:
        # Count delivered orders
        orders = await db.orders.find({"waiter_id": waiter['id']}, {"_id": 0}).to_list(10000)
        
        # Filter by date
        delivered_count = 0
        total_delivery_time = 0
        for order in orders:
            order_date = order.get('delivered_at', order.get('ordered_at', ''))[:10]
            if order_date >= start_date:
                delivered_count += 1
                if order.get('ready_at') and order.get('delivered_at'):
                    ready = datetime.fromisoformat(order['ready_at'].replace('Z', '+00:00'))
                    delivered = datetime.fromisoformat(order['delivered_at'].replace('Z', '+00:00'))
                    total_delivery_time += (delivered - ready).total_seconds() / 60
        
        avg_delivery_time = total_delivery_time / delivered_count if delivered_count > 0 else 0
        
        performance.append({
            "id": waiter['id'],
            "name": waiter['full_name'],
            "points": waiter.get('points', 0),
            "delivered_orders": delivered_count,
            "avg_delivery_time": round(avg_delivery_time, 1),
            "rest_days": waiter.get('rest_days', []),
            "is_active": waiter.get('is_active', True)
        })
    
    # Sort by points
    performance.sort(key=lambda x: x['points'], reverse=True)
    return performance

