"""Services: Settings, Analytics, Discounts, Timed Services, Waiter Calls, Uploads, etc."""
from fastapi import APIRouter, HTTPException, Depends, UploadFile, File, Response, Query
from fastapi.responses import FileResponse
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional
from datetime import datetime, timezone, timedelta
import uuid
import os
import hashlib
from database import db
from auth import get_current_user
from models import UserRole, OrderStatus
from routes.shared import sanitize_input, put_object, get_object, generate_qr_code, init_storage, LOCAL_UPLOAD_DIR, notify_order_update
from ws_manager import manager

router = APIRouter()

@router.get("/analytics/detailed")
async def get_detailed_analytics(current_user: dict = Depends(get_current_user)):
    if current_user['role'] not in [UserRole.ADMIN, UserRole.OWNER]:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    all_sessions = await db.table_sessions.find({}, {"_id": 0}).to_list(10000)
    
    if not all_sessions:
        return []
    
    table_ids = list(set(s['table_id'] for s in all_sessions))
    tables = await db.tables.find({"id": {"$in": table_ids}}, {"_id": 0}).to_list(10000)
    tables_map = {t['id']: t for t in tables}
    
    venue_ids = list(set(t['venue_id'] for t in tables if t.get('venue_id')))
    venues = await db.venues.find({"id": {"$in": venue_ids}}, {"_id": 0}).to_list(10000)
    venues_map = {v['id']: v for v in venues}
    
    session_ids = [s['id'] for s in all_sessions]
    all_orders = await db.orders.find({"session_id": {"$in": session_ids}}, {"_id": 0}).to_list(100000)
    
    waiter_ids = list(set(o['waiter_id'] for o in all_orders if o.get('waiter_id')))
    waiters = await db.users.find({"id": {"$in": waiter_ids}}, {"_id": 0, "password": 0}).to_list(1000)
    waiters_map = {w['id']: w for w in waiters}
    
    orders_by_session = {}
    for order in all_orders:
        session_id = order['session_id']
        if session_id not in orders_by_session:
            orders_by_session[session_id] = []
        orders_by_session[session_id].append(order)
    
    detailed_data = []
    for session in all_sessions:
        if isinstance(session.get('started_at'), str):
            session['started_at'] = datetime.fromisoformat(session['started_at'])
        if session.get('ended_at') and isinstance(session['ended_at'], str):
            session['ended_at'] = datetime.fromisoformat(session['ended_at'])
        
        table = tables_map.get(session['table_id'])
        venue = venues_map.get(table['venue_id']) if table and table.get('venue_id') else None
        
        orders = orders_by_session.get(session['id'], [])
        
        for order in orders:
            for field in ['ordered_at', 'preparing_started_at', 'ready_at', 'delivered_at']:
                if order.get(field) and isinstance(order[field], str):
                    order[field] = datetime.fromisoformat(order[field])
            
            prep_time = None
            delivery_time = None
            
            if order.get('preparing_started_at') and order.get('ready_at'):
                prep_time = (order['ready_at'] - order['preparing_started_at']).total_seconds() / 60
            
            if order.get('ready_at') and order.get('delivered_at'):
                delivery_time = (order['delivered_at'] - order['ready_at']).total_seconds() / 60
            
            waiter = waiters_map.get(order.get('waiter_id')) if order.get('waiter_id') else None
            
            detailed_data.append({
                "session": session,
                "table": table,
                "venue": venue,
                "order": order,
                "preparation_time_minutes": prep_time,
                "delivery_time_minutes": delivery_time,
                "waiter": waiter
            })
    
    return detailed_data

@router.get("/settings")
async def get_settings():
    settings = await db.settings.find_one({"id": "settings"}, {"_id": 0})
    if not settings:
        default_settings = {
            "id": "settings",
            "name": "Green Plate Restaurant",
            "address": "Bakı, Azərbaycan",
            "phone": "+994 XX XXX XX XX",
            "email": "info@greenplate.az",
            "tax_percentage": 18,
            "service_charge_percentage": 10,
            "currency": "AZN",
            "admin_pin": "",
            "base_url": ""
        }
        await db.settings.insert_one({**default_settings})
        return default_settings
    return settings

@router.put("/settings")
async def update_settings(settings: dict, current_user: dict = Depends(get_current_user)):
    if current_user['role'] not in [UserRole.OWNER, UserRole.ADMIN]:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    settings["id"] = "settings"
    await db.settings.update_one({"id": "settings"}, {"$set": settings}, upsert=True)
    return settings

# Verify Admin PIN
@router.post("/verify-admin-pin")
async def verify_admin_pin(data: dict, current_user: dict = Depends(get_current_user)):
    if current_user['role'] not in [UserRole.ADMIN, UserRole.OWNER]:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    # Check user's personal PIN first
    user = await db.users.find_one({"id": current_user['id']}, {"_id": 0})
    user_pin = user.get('admin_pin') if user else None
    
    if user_pin:
        if data.get('pin') == user_pin:
            return {"valid": True}
        else:
            raise HTTPException(status_code=401, detail="Invalid PIN")
    
    # Fallback to settings PIN
    settings = await db.settings.find_one({"id": "settings"}, {"_id": 0})
    if not settings or not settings.get('admin_pin'):
        return {"valid": True, "message": "No PIN set"}
    
    if data.get('pin') == settings.get('admin_pin'):
        return {"valid": True}
    else:
        raise HTTPException(status_code=401, detail="Invalid PIN")


# ==================== REGENERATE QR CODES ====================
@router.post("/tables/regenerate-qr")
async def regenerate_all_qr(current_user: dict = Depends(get_current_user)):
    if current_user['role'] not in [UserRole.OWNER, UserRole.ADMIN]:
        raise HTTPException(status_code=403, detail="Not authorized")
    tables = await db.tables.find({}, {"_id": 0}).to_list(1000)
    count = 0
    for t in tables:
        new_qr = generate_qr_code(t["id"])
        await db.tables.update_one({"id": t["id"]}, {"$set": {"qr_code": new_qr}})
        count += 1
    return {"message": f"{count} masanın QR kodu yeniləndi (resto.az)"}

# ==================== WAITER CALL ====================
@router.post("/waiter-call/{table_id}")
async def call_waiter(table_id: str):
    table = await db.tables.find_one({"id": table_id}, {"_id": 0})
    if not table:
        raise HTTPException(status_code=404, detail="Table not found")
    call_doc = {
        "id": str(uuid.uuid4()),
        "table_id": table_id,
        "table_number": table.get("table_number", "?"),
        "venue_id": table.get("venue_id", ""),
        "status": "pending",
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.waiter_calls.insert_one(call_doc)
    # Notify waiters and admins via WebSocket
    msg = {
        "type": "waiter_call",
        "table_id": table_id,
        "table_number": table.get("table_number", "?"),
        "venue_id": table.get("venue_id", ""),
        "call_id": call_doc["id"]
    }
    await manager.broadcast_to_role(msg, "waiter")
    await manager.broadcast_to_role(msg, "admin")
    return {"message": "Ofisiant çağırıldı", "call_id": call_doc["id"]}

@router.get("/waiter-calls")
async def get_waiter_calls(status: str = "pending"):
    calls = await db.waiter_calls.find({"status": status}, {"_id": 0}).sort("created_at", -1).to_list(100)
    return calls

@router.post("/waiter-call/{call_id}/acknowledge")
async def acknowledge_waiter_call(call_id: str):
    result = await db.waiter_calls.update_one({"id": call_id}, {"$set": {"status": "acknowledged"}})
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Call not found")
    await manager.broadcast_to_role({"type": "waiter_call_ack", "call_id": call_id}, "waiter")
    await manager.broadcast_to_role({"type": "waiter_call_ack", "call_id": call_id}, "admin")
    return {"message": "OK"}


@router.get("/venues/{venue_id}/order-rules")
async def get_venue_order_rules(venue_id: str):
    venue = await db.venues.find_one({"id": venue_id}, {"_id": 0})
    if not venue:
        raise HTTPException(status_code=404, detail="Venue not found")
    rules = venue.get("order_rules", [])
    enriched = []
    for rule in rules:
        r = dict(rule)
        if r.get("trigger_category_id"):
            cat = await db.categories.find_one({"id": r["trigger_category_id"]}, {"_id": 0})
            r["trigger_category_name"] = cat["name"] if cat else ""
        if r.get("required_category_id"):
            cat = await db.categories.find_one({"id": r["required_category_id"]}, {"_id": 0})
            r["required_category_name"] = cat["name"] if cat else ""
        enriched.append(r)
    return enriched



# ==================== IMAGE UPLOAD ====================
ALLOWED_IMAGE_TYPES = {"image/jpeg", "image/png", "image/webp", "image/gif"}
MAX_IMAGE_SIZE = 5 * 1024 * 1024  # 5MB

@router.post("/upload/image")
async def upload_image(file: UploadFile = File(...), current_user: dict = Depends(get_current_user)):
    if current_user['role'] not in [UserRole.OWNER, UserRole.ADMIN]:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    if file.content_type not in ALLOWED_IMAGE_TYPES:
        raise HTTPException(status_code=400, detail="Yalnız JPEG, PNG, WebP və GIF şəkillər qəbul edilir")
    
    data = await file.read()
    if len(data) > MAX_IMAGE_SIZE:
        raise HTTPException(status_code=400, detail="Şəkil ölçüsü 5MB-dan böyük ola bilməz")
    
    ext = file.filename.split(".")[-1] if "." in file.filename else "jpg"
    file_id = str(uuid.uuid4())
    path = f"{APP_NAME}/images/{file_id}.{ext}"
    
    try:
        result = put_object(path, data, file.content_type)
        # Store reference in DB
        file_doc = {
            "id": file_id,
            "storage_path": result["path"],
            "original_filename": file.filename,
            "content_type": file.content_type,
            "size": result.get("size", len(data)),
            "is_deleted": False,
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        await db.files.insert_one(file_doc)
        file_doc.pop('_id', None)
        return {"id": file_id, "path": result["path"], "url": f"/api/files/{file_id}"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Yükləmə xətası: {str(e)}")

@router.get("/files/{file_id}")
async def get_file(file_id: str):
    record = await db.files.find_one({"id": file_id, "is_deleted": False}, {"_id": 0})
    if not record:
        raise HTTPException(status_code=404, detail="Fayl tapılmadı")
    try:
        data, content_type = get_object(record["storage_path"])
        return Response(content=data, media_type=record.get("content_type", content_type),
                       headers={"Cache-Control": "public, max-age=86400"})
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Fayl oxunma xətası: {str(e)}")

@router.get("/analytics/popular-items")
async def get_popular_items_stats():
    orders = await db.orders.find({}, {"_id": 0}).to_list(100000)
    
    item_stats = {}
    for order in orders:
        for item in order.get('items', []):
            menu_item_id = item.get('menu_item_id')
            if menu_item_id not in item_stats:
                item_stats[menu_item_id] = {
                    'id': menu_item_id,
                    'name': item.get('name'),
                    'count': 0,
                    'revenue': 0
                }
            item_stats[menu_item_id]['count'] += item.get('quantity', 0)
            item_stats[menu_item_id]['revenue'] += item.get('price', 0) * item.get('quantity', 0)
    
    popular = sorted(item_stats.values(), key=lambda x: x['count'], reverse=True)
    return popular

@router.get("/sessions/history")
async def get_sessions_history(current_user: dict = Depends(get_current_user)):
    if current_user['role'] not in [UserRole.ADMIN, UserRole.OWNER]:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    sessions = await db.table_sessions.find({"is_active": False}, {"_id": 0}).sort("ended_at", -1).limit(100).to_list(100)
    
    result = []
    for session in sessions:
        if isinstance(session.get('started_at'), str):
            session['started_at'] = datetime.fromisoformat(session['started_at'])
        if session.get('ended_at') and isinstance(session['ended_at'], str):
            session['ended_at'] = datetime.fromisoformat(session['ended_at'])
        
        table = await db.tables.find_one({"id": session['table_id']}, {"_id": 0})
        venue = await db.venues.find_one({"id": table['venue_id']}, {"_id": 0}) if table else None
        
        orders = await db.orders.find({"session_id": session['id']}, {"_id": 0}).to_list(1000)
        total_revenue = sum(o.get('total_amount', 0) for o in orders)
        
        result.append({
            "session": session,
            "table": table,
            "venue": venue,
            "orders_count": len(orders),
            "total_revenue": total_revenue
        })
    
    return result

@router.delete("/sessions/{session_id}")
async def delete_session(session_id: str, current_user: dict = Depends(get_current_user)):
    if current_user['role'] not in [UserRole.ADMIN, UserRole.OWNER]:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    session = await db.table_sessions.find_one({"id": session_id}, {"_id": 0})
    if not session:
        raise HTTPException(status_code=404, detail="Sessiya tapılmadı")
    
    # Delete all related data
    await db.orders.delete_many({"session_id": session_id})
    await db.timed_services.delete_many({"session_id": session_id})
    await db.table_sessions.delete_one({"id": session_id})
    
    return {"message": "Sessiya və bütün əlaqəli məlumatlar silindi"}


class TableReservation(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    table_id: str
    customer_name: str
    customer_phone: str
    customer_email: Optional[str] = None
    reservation_date: str
    reservation_time: str
    guest_count: int
    special_requests: Optional[str] = None
    status: str = "pending"
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class ReservationCreate(BaseModel):
    table_id: str
    customer_name: str
    customer_phone: str
    customer_email: Optional[str] = None
    reservation_date: str
    reservation_time: str
    guest_count: int
    special_requests: Optional[str] = None

@router.post("/reservations")
async def create_reservation(reservation: ReservationCreate):
    reservation_obj = TableReservation(**reservation.model_dump())
    doc = reservation_obj.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    await db.reservations.insert_one(doc)
    return reservation_obj

@router.get("/reservations")
async def get_reservations(current_user: dict = Depends(get_current_user)):
    if current_user['role'] not in [UserRole.ADMIN, UserRole.OWNER]:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    reservations = await db.reservations.find({}, {"_id": 0}).sort("reservation_date", 1).to_list(1000)
    result = []
    for res in reservations:
        if isinstance(res['created_at'], str):
            res['created_at'] = datetime.fromisoformat(res['created_at'])
        table = await db.tables.find_one({"id": res['table_id']}, {"_id": 0})
        venue = await db.venues.find_one({"id": table['venue_id']}, {"_id": 0}) if table else None
        result.append({
            "reservation": res,
            "table": table,
            "venue": venue
        })
    return result

@router.put("/reservations/{reservation_id}/status")
async def update_reservation_status(reservation_id: str, status: str, current_user: dict = Depends(get_current_user)):
    if current_user['role'] not in [UserRole.ADMIN, UserRole.OWNER]:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    await db.reservations.update_one({"id": reservation_id}, {"$set": {"status": status}})
    return {"message": "Reservation status updated"}

@router.delete("/reservations/{reservation_id}")
async def delete_reservation(reservation_id: str, current_user: dict = Depends(get_current_user)):
    if current_user['role'] not in [UserRole.ADMIN, UserRole.OWNER]:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    result = await db.reservations.delete_one({"id": reservation_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Reservation not found")
    return {"message": "Reservation deleted"}

@router.get("/tables/available")
async def get_available_tables(date: str, time: str):
    all_tables = await db.tables.find({"is_active": True}, {"_id": 0}).to_list(1000)
    
    reserved_table_ids = []
    reservations = await db.reservations.find({
        "reservation_date": date,
        "status": {"$ne": "cancelled"}
    }, {"_id": 0}).to_list(1000)
    
    for res in reservations:
        reserved_table_ids.append(res['table_id'])
    
    available_tables = [t for t in all_tables if t['id'] not in reserved_table_ids]
    return available_tables


class Menu(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    description: Optional[str] = None
    is_active: bool = True
    display_order: int = 0
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class MenuCreate(BaseModel):
    name: str
    description: Optional[str] = None
    display_order: int = 0

@router.post("/menus", response_model=Menu)
async def create_menu(menu: MenuCreate, current_user: dict = Depends(get_current_user)):
    if current_user['role'] not in [UserRole.OWNER, UserRole.ADMIN]:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    menu_obj = Menu(**menu.model_dump())
    doc = menu_obj.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    await db.menus.insert_one(doc)
    return menu_obj

@router.get("/menus", response_model=List[Menu])
async def get_menus():
    menus = await db.menus.find({}, {"_id": 0}).sort("display_order", 1).to_list(1000)
    for menu in menus:
        if isinstance(menu['created_at'], str):
            menu['created_at'] = datetime.fromisoformat(menu['created_at'])
    return menus

@router.put("/menus/{menu_id}", response_model=Menu)
async def update_menu(menu_id: str, menu: MenuCreate, current_user: dict = Depends(get_current_user)):
    if current_user['role'] not in [UserRole.OWNER, UserRole.ADMIN]:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    result = await db.menus.find_one({"id": menu_id}, {"_id": 0})
    if not result:
        raise HTTPException(status_code=404, detail="Menu not found")
    
    await db.menus.update_one({"id": menu_id}, {"$set": menu.model_dump()})
    updated = await db.menus.find_one({"id": menu_id}, {"_id": 0})
    if isinstance(updated['created_at'], str):
        updated['created_at'] = datetime.fromisoformat(updated['created_at'])
    return Menu(**updated)

@router.delete("/menus/{menu_id}")
async def delete_menu(menu_id: str, current_user: dict = Depends(get_current_user)):
    if current_user['role'] not in [UserRole.OWNER, UserRole.ADMIN]:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    result = await db.menus.delete_one({"id": menu_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Menu not found")
    return {"message": "Menu deleted"}


class Expense(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    amount: float
    category: str
    expense_type: str
    date: str
    notes: Optional[str] = None
    created_by: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class ExpenseCreate(BaseModel):
    name: str
    amount: float
    category: str
    expense_type: str
    date: str
    notes: Optional[str] = None

@router.post("/expenses", response_model=Expense)
async def create_expense(expense: ExpenseCreate, current_user: dict = Depends(get_current_user)):
    if current_user['role'] not in [UserRole.ADMIN, UserRole.OWNER]:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    expense_obj = Expense(**expense.model_dump(), created_by=current_user['id'])
    doc = expense_obj.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    await db.expenses.insert_one(doc)
    return expense_obj

@router.get("/expenses", response_model=List[Expense])
async def get_expenses(current_user: dict = Depends(get_current_user), start_date: Optional[str] = None, end_date: Optional[str] = None):
    if current_user['role'] not in [UserRole.ADMIN, UserRole.OWNER]:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    query = {}
    if start_date and end_date:
        query["date"] = {"$gte": start_date, "$lte": end_date}
    
    expenses = await db.expenses.find(query, {"_id": 0}).sort("date", -1).to_list(10000)
    for expense in expenses:
        if isinstance(expense['created_at'], str):
            expense['created_at'] = datetime.fromisoformat(expense['created_at'])
    return expenses

@router.put("/expenses/{expense_id}", response_model=Expense)
async def update_expense(expense_id: str, expense: ExpenseCreate, current_user: dict = Depends(get_current_user)):
    if current_user['role'] not in [UserRole.ADMIN, UserRole.OWNER]:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    result = await db.expenses.find_one({"id": expense_id}, {"_id": 0})
    if not result:
        raise HTTPException(status_code=404, detail="Expense not found")
    
    update_data = expense.model_dump()
    await db.expenses.update_one({"id": expense_id}, {"$set": update_data})
    
    updated = await db.expenses.find_one({"id": expense_id}, {"_id": 0})
    if isinstance(updated['created_at'], str):
        updated['created_at'] = datetime.fromisoformat(updated['created_at'])
    return Expense(**updated)

@router.delete("/expenses/{expense_id}")
async def delete_expense(expense_id: str, current_user: dict = Depends(get_current_user)):
    if current_user['role'] not in [UserRole.ADMIN, UserRole.OWNER]:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    result = await db.expenses.delete_one({"id": expense_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Expense not found")
    return {"message": "Expense deleted"}

@router.get("/analytics/financial")
async def get_financial_analytics(current_user: dict = Depends(get_current_user), start_date: Optional[str] = None, end_date: Optional[str] = None):
    if current_user['role'] not in [UserRole.ADMIN, UserRole.OWNER]:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    # Get all orders and filter by date in Python (since ordered_at is ISO string)
    all_orders = await db.orders.find({}, {"_id": 0}).to_list(100000)
    
    # Filter orders by date range
    if start_date and end_date:
        filtered_orders = []
        for order in all_orders:
            order_date_str = order.get('ordered_at', '')
            if order_date_str:
                # Extract date part from ISO string (e.g., "2026-03-20T22:15:00+00:00" -> "2026-03-20")
                order_date = order_date_str[:10] if isinstance(order_date_str, str) else str(order_date_str)[:10]
                if start_date <= order_date <= end_date:
                    filtered_orders.append(order)
        orders = filtered_orders
    else:
        orders = all_orders
    
    total_revenue = sum(o.get('total_amount', 0) for o in orders)
    
    expense_query = {}
    if start_date and end_date:
        expense_query["date"] = {"$gte": start_date, "$lte": end_date}
    
    expenses = await db.expenses.find(expense_query, {"_id": 0}).to_list(100000)
    total_expenses = sum(e.get('amount', 0) for e in expenses)
    
    net_profit = total_revenue - total_expenses
    profit_margin = (net_profit / total_revenue * 100) if total_revenue > 0 else 0
    
    expense_by_category = {}
    for expense in expenses:
        cat = expense.get('category', 'Digər')
        if cat not in expense_by_category:
            expense_by_category[cat] = 0
        expense_by_category[cat] += expense.get('amount', 0)
    
    return {
        "total_revenue": total_revenue,
        "total_expenses": total_expenses,
        "net_profit": net_profit,
        "profit_margin": profit_margin,
        "orders_count": len(orders),
        "expenses_count": len(expenses),
        "expense_by_category": expense_by_category
    }


# Get table session details with all orders
@router.get("/sessions/{session_id}/details")
async def get_session_details(session_id: str, current_user: dict = Depends(get_current_user)):
    if current_user['role'] not in [UserRole.ADMIN, UserRole.OWNER]:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    session = await db.table_sessions.find_one({"id": session_id}, {"_id": 0})
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    table = await db.tables.find_one({"id": session['table_id']}, {"_id": 0})
    venue = await db.venues.find_one({"id": table['venue_id']}, {"_id": 0}) if table else None
    
    orders = await db.orders.find({"session_id": session_id}, {"_id": 0}).sort("ordered_at", 1).to_list(1000)
    
    for order in orders:
        for field in ['ordered_at', 'preparing_started_at', 'ready_at', 'delivered_at']:
            if order.get(field) and isinstance(order[field], str):
                order[field] = datetime.fromisoformat(order[field])
    
    total_amount = sum(o.get('total_amount', 0) for o in orders)
    
    return {
        "session": session,
        "table": table,
        "venue": venue,
        "orders": orders,
        "total_amount": total_amount
    }


# Sales statistics by item (daily, monthly, yearly, all time)
@router.get("/analytics/sales-by-item")
async def get_sales_by_item(current_user: dict = Depends(get_current_user), period: str = "all"):
    if current_user['role'] not in [UserRole.ADMIN, UserRole.OWNER]:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    all_orders = await db.orders.find({}, {"_id": 0}).to_list(100000)
    
    # Filter by period
    today = datetime.now(timezone.utc)
    today_str = today.strftime('%Y-%m-%d')
    
    filtered_orders = []
    for order in all_orders:
        order_date_str = order.get('ordered_at', '')
        if order_date_str:
            order_date = order_date_str[:10] if isinstance(order_date_str, str) else str(order_date_str)[:10]
            
            if period == "today":
                if order_date == today_str:
                    filtered_orders.append(order)
            elif period == "month":
                month_start = today.replace(day=1).strftime('%Y-%m-%d')
                if order_date >= month_start:
                    filtered_orders.append(order)
            elif period == "year":
                year_start = today.replace(month=1, day=1).strftime('%Y-%m-%d')
                if order_date >= year_start:
                    filtered_orders.append(order)
            else:  # all
                filtered_orders.append(order)
    
    # Aggregate sales by item
    item_sales = {}
    for order in filtered_orders:
        for item in order.get('items', []):
            item_id = item.get('menu_item_id', 'unknown')
            item_name = item.get('name', 'Unknown')
            quantity = item.get('quantity', 0)
            price = item.get('price', 0)
            
            if item_id not in item_sales:
                item_sales[item_id] = {
                    'id': item_id,
                    'name': item_name,
                    'total_quantity': 0,
                    'total_revenue': 0,
                    'orders_count': 0
                }
            
            item_sales[item_id]['total_quantity'] += quantity
            item_sales[item_id]['total_revenue'] += price * quantity
            item_sales[item_id]['orders_count'] += 1
    
    # Sort by total revenue
    sorted_sales = sorted(item_sales.values(), key=lambda x: x['total_revenue'], reverse=True)
    
    total_revenue = sum(item['total_revenue'] for item in sorted_sales)
    total_items_sold = sum(item['total_quantity'] for item in sorted_sales)
    
    return {
        "period": period,
        "items": sorted_sales,
        "total_revenue": total_revenue,
        "total_items_sold": total_items_sold,
        "unique_items_count": len(sorted_sales)
    }


DEFAULT_STATIONS = [
    {"id": "kitchen", "name": "Mətbəx", "icon": "chef-hat"},
    {"id": "bar", "name": "Bar", "icon": "wine"},
    {"id": "waiter", "name": "Ofisiant", "icon": "user"},
]

@router.get("/stations")
async def get_stations():
    stations = await db.stations.find({}, {"_id": 0}).to_list(100)
    if not stations:
        return DEFAULT_STATIONS
    return stations

@router.post("/stations")
async def create_station(station: dict, current_user: dict = Depends(get_current_user)):
    if current_user['role'] not in [UserRole.OWNER, UserRole.ADMIN]:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    station_doc = {
        "id": station.get("id", str(uuid.uuid4())),
        "name": station["name"],
        "icon": station.get("icon", "chef-hat"),
    }
    await db.stations.insert_one(station_doc)
    return station_doc

@router.delete("/stations/{station_id}")
async def delete_station(station_id: str, current_user: dict = Depends(get_current_user)):
    if current_user['role'] not in [UserRole.OWNER, UserRole.ADMIN]:
        raise HTTPException(status_code=403, detail="Not authorized")
    if station_id in ("kitchen", "bar", "waiter"):
        raise HTTPException(status_code=400, detail="Standart stansiyalar silinə bilməz")
    await db.stations.delete_one({"id": station_id})
    return {"message": "Station deleted"}


# Discount Model and Endpoints
class Discount(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    description: Optional[str] = None
    discount_type: str  # "percentage" or "fixed"
    value: float
    min_order_amount: float = 0
    is_active: bool = True
    valid_from: Optional[str] = None
    valid_until: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class DiscountCreate(BaseModel):
    name: str
    description: Optional[str] = None
    discount_type: str
    value: float
    min_order_amount: float = 0
    valid_from: Optional[str] = None
    valid_until: Optional[str] = None

@router.post("/discounts", response_model=Discount)
async def create_discount(discount: DiscountCreate, current_user: dict = Depends(get_current_user)):
    if current_user['role'] not in [UserRole.OWNER, UserRole.ADMIN]:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    discount_obj = Discount(**discount.model_dump())
    doc = discount_obj.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    await db.discounts.insert_one(doc)
    return discount_obj

@router.get("/discounts", response_model=List[Discount])
async def get_discounts():
    discounts = await db.discounts.find({}, {"_id": 0}).to_list(1000)
    for disc in discounts:
        if isinstance(disc['created_at'], str):
            disc['created_at'] = datetime.fromisoformat(disc['created_at'])
    return discounts

@router.get("/discounts/active", response_model=List[Discount])
async def get_active_discounts():
    today = datetime.now(timezone.utc).strftime('%Y-%m-%d')
    discounts = await db.discounts.find({
        "is_active": True,
        "$or": [
            {"valid_until": None},
            {"valid_until": {"$gte": today}}
        ]
    }, {"_id": 0}).to_list(1000)
    for disc in discounts:
        if isinstance(disc['created_at'], str):
            disc['created_at'] = datetime.fromisoformat(disc['created_at'])
    return discounts

@router.put("/discounts/{discount_id}", response_model=Discount)
async def update_discount(discount_id: str, discount: DiscountCreate, current_user: dict = Depends(get_current_user)):
    if current_user['role'] not in [UserRole.OWNER, UserRole.ADMIN]:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    result = await db.discounts.find_one({"id": discount_id}, {"_id": 0})
    if not result:
        raise HTTPException(status_code=404, detail="Discount not found")
    
    await db.discounts.update_one({"id": discount_id}, {"$set": discount.model_dump()})
    updated = await db.discounts.find_one({"id": discount_id}, {"_id": 0})
    if isinstance(updated['created_at'], str):
        updated['created_at'] = datetime.fromisoformat(updated['created_at'])
    return Discount(**updated)

@router.put("/discounts/{discount_id}/toggle")
async def toggle_discount(discount_id: str, current_user: dict = Depends(get_current_user)):
    if current_user['role'] not in [UserRole.OWNER, UserRole.ADMIN]:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    discount = await db.discounts.find_one({"id": discount_id}, {"_id": 0})
    if not discount:
        raise HTTPException(status_code=404, detail="Discount not found")
    
    new_status = not discount.get('is_active', True)
    await db.discounts.update_one({"id": discount_id}, {"$set": {"is_active": new_status}})
    return {"message": "Discount toggled", "is_active": new_status}

@router.delete("/discounts/{discount_id}")
async def delete_discount(discount_id: str, current_user: dict = Depends(get_current_user)):
    if current_user['role'] not in [UserRole.OWNER, UserRole.ADMIN]:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    result = await db.discounts.delete_one({"id": discount_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Discount not found")
    return {"message": "Discount deleted"}


# ==================== TIMED TABLE SERVICE ====================
class TimedServiceCreate(BaseModel):
    table_id: str
    session_id: str
    menu_item_id: str
    interval_minutes: int = 45
    notes: Optional[str] = None

@router.post("/timed-services")
async def create_timed_service(svc: TimedServiceCreate, current_user: dict = Depends(get_current_user)):
    if current_user['role'] not in [UserRole.OWNER, UserRole.ADMIN]:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    # Verify table session is active
    session = await db.table_sessions.find_one({"id": svc.session_id, "is_active": True}, {"_id": 0})
    if not session:
        raise HTTPException(status_code=400, detail="Aktiv sessiya tapılmadı")
    
    menu_item = await db.menu_items.find_one({"id": svc.menu_item_id}, {"_id": 0})
    if not menu_item:
        raise HTTPException(status_code=404, detail="Menyu elementi tapılmadı")
    
    table = await db.tables.find_one({"id": svc.table_id}, {"_id": 0})
    
    doc = {
        "id": str(uuid.uuid4()),
        "table_id": svc.table_id,
        "table_number": table.get('table_number', '') if table else '',
        "session_id": svc.session_id,
        "menu_item_id": svc.menu_item_id,
        "menu_item_name": menu_item['name'],
        "menu_item_price": menu_item['price'],
        "interval_minutes": svc.interval_minutes,
        "notes": svc.notes,
        "is_active": True,
        "last_served_at": None,
        "next_serve_at": (datetime.now(timezone.utc) + timedelta(minutes=svc.interval_minutes)).isoformat(),
        "serve_count": 0,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "created_by": current_user['id']
    }
    await db.timed_services.insert_one(doc)
    doc.pop('_id', None)
    
    # Notify via WebSocket
    await manager.broadcast_to_role({
        "type": "timed_service_created",
        "data": doc,
        "timestamp": datetime.now(timezone.utc).isoformat()
    }, "kitchen")
    await manager.broadcast_to_role({
        "type": "timed_service_created",
        "data": doc,
        "timestamp": datetime.now(timezone.utc).isoformat()
    }, "waiter")
    
    return doc

@router.get("/timed-services")
async def get_timed_services(table_id: Optional[str] = None, session_id: Optional[str] = None, current_user: dict = Depends(get_current_user)):
    query = {}
    if table_id:
        query["table_id"] = table_id
    if session_id:
        query["session_id"] = session_id
    services = await db.timed_services.find(query, {"_id": 0}).to_list(1000)
    return services

@router.get("/timed-services/active")
async def get_active_timed_services(current_user: dict = Depends(get_current_user)):
    services = await db.timed_services.find({"is_active": True}, {"_id": 0}).to_list(1000)
    return services

@router.put("/timed-services/{service_id}/serve")
async def mark_timed_service_served(service_id: str, current_user: dict = Depends(get_current_user)):
    svc = await db.timed_services.find_one({"id": service_id}, {"_id": 0})
    if not svc:
        raise HTTPException(status_code=404, detail="Xidmət tapılmadı")
    
    now = datetime.now(timezone.utc)
    next_serve = now + timedelta(minutes=svc['interval_minutes'])
    
    # Add the served item to the session's orders (create a mini order)
    session = await db.table_sessions.find_one({"id": svc['session_id'], "is_active": True}, {"_id": 0})
    if session:
        item_price = svc.get('menu_item_price', 0)
        subtotal = item_price
        
        # Generate order number
        order_count = await db.orders.count_documents({})
        order_number = f"TS-{order_count + 1:04d}"
        
        order_doc = {
            "id": str(uuid.uuid4()),
            "order_number": order_number,
            "session_id": svc['session_id'],
            "table_id": svc['table_id'],
            "items": [{
                "menu_item_id": svc['menu_item_id'],
                "name": svc['menu_item_name'],
                "price": item_price,
                "quantity": 1,
                "discount_percentage": 0,
                "discounted_price": item_price
            }],
            "subtotal": subtotal,
            "discount_id": None,
            "discount_name": None,
            "discount_type": None,
            "discount_value": 0,
            "discount_amount": 0,
            "service_charge_percentage": 0,
            "service_charge_amount": 0,
            "total_amount": subtotal,
            "status": "delivered",
            "ordered_at": now.isoformat(),
            "notes": f"Vaxtlı xidmət: {svc.get('notes', '')}" if svc.get('notes') else "Vaxtlı xidmət"
        }
        await db.orders.insert_one(order_doc)
        order_doc.pop('_id', None)
        
        # Notify via WebSocket
        table = await db.tables.find_one({"id": svc['table_id']}, {"_id": 0})
        await manager.broadcast_to_role({
            "type": "timed_service_order",
            "data": {"order": order_doc, "table": table, "timed_service": svc},
            "timestamp": now.isoformat()
        }, "kitchen")
    
    await db.timed_services.update_one({"id": service_id}, {"$set": {
        "last_served_at": now.isoformat(),
        "next_serve_at": next_serve.isoformat(),
        "serve_count": svc.get('serve_count', 0) + 1
    }})
    
    updated = await db.timed_services.find_one({"id": service_id}, {"_id": 0})
    return updated

@router.put("/timed-services/{service_id}/stop")
async def stop_timed_service(service_id: str, current_user: dict = Depends(get_current_user)):
    """Stop a timed service - 'Yetərlidir' (Enough)"""
    svc = await db.timed_services.find_one({"id": service_id}, {"_id": 0})
    if not svc:
        raise HTTPException(status_code=404, detail="Xidmət tapılmadı")
    await db.timed_services.update_one({"id": service_id}, {"$set": {"is_active": False}})
    return {"message": "Vaxtlı xidmət dayandırıldı", "is_active": False}

@router.delete("/timed-services/{service_id}")
async def delete_timed_service(service_id: str, current_user: dict = Depends(get_current_user)):
    if current_user['role'] not in [UserRole.OWNER, UserRole.ADMIN]:
        raise HTTPException(status_code=403, detail="Not authorized")
    result = await db.timed_services.delete_one({"id": service_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Xidmət tapılmadı")
    return {"message": "Vaxtlı xidmət silindi"}

@router.put("/timed-services/{service_id}/toggle")
async def toggle_timed_service(service_id: str, current_user: dict = Depends(get_current_user)):
    svc = await db.timed_services.find_one({"id": service_id}, {"_id": 0})
    if not svc:
        raise HTTPException(status_code=404, detail="Xidmət tapılmadı")
    new_status = not svc.get('is_active', True)
    await db.timed_services.update_one({"id": service_id}, {"$set": {"is_active": new_status}})
    return {"message": "Status dəyişdirildi", "is_active": new_status}

# Deactivate timed services when session closes
async def deactivate_session_timed_services(session_id: str):
    await db.timed_services.update_many(
        {"session_id": session_id, "is_active": True},
        {"$set": {"is_active": False}}
    )

# ==================== TABLE TRANSFER ====================
class TableTransferRequest(BaseModel):
    session_id: str
    new_table_id: str

@router.post("/sessions/transfer")
async def transfer_table(req: TableTransferRequest, current_user: dict = Depends(get_current_user)):
    if current_user['role'] not in [UserRole.OWNER, UserRole.ADMIN]:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    # Verify session exists and is active
    session = await db.table_sessions.find_one({"id": req.session_id, "is_active": True}, {"_id": 0})
    if not session:
        raise HTTPException(status_code=404, detail="Aktiv sessiya tapılmadı")
    
    old_table_id = session['table_id']
    if old_table_id == req.new_table_id:
        raise HTTPException(status_code=400, detail="Eyni masa seçilə bilməz")
    
    # Verify new table exists
    new_table = await db.tables.find_one({"id": req.new_table_id}, {"_id": 0})
    if not new_table:
        raise HTTPException(status_code=404, detail="Yeni masa tapılmadı")
    
    # Check new table doesn't have an active session
    existing = await db.table_sessions.find_one({"table_id": req.new_table_id, "is_active": True}, {"_id": 0})
    if existing:
        raise HTTPException(status_code=400, detail="Bu masada artıq aktiv sessiya var")
    
    # Transfer: update session, orders, and timed services
    await db.table_sessions.update_one({"id": req.session_id}, {"$set": {"table_id": req.new_table_id}})
    await db.orders.update_many({"session_id": req.session_id}, {"$set": {"table_id": req.new_table_id}})
    await db.timed_services.update_many({"session_id": req.session_id}, {"$set": {
        "table_id": req.new_table_id,
        "table_number": new_table.get('table_number', '')
    }})
    
    old_table = await db.tables.find_one({"id": old_table_id}, {"_id": 0})
    
    # Notify via WebSocket
    await manager.broadcast_to_role({
        "type": "table_transferred",
        "data": {
            "session_id": req.session_id,
            "old_table": old_table,
            "new_table": new_table
        },
        "timestamp": datetime.now(timezone.utc).isoformat()
    }, "kitchen")
    await manager.broadcast_to_role({
        "type": "table_transferred",
        "data": {
            "session_id": req.session_id,
            "old_table": old_table,
            "new_table": new_table
        },
        "timestamp": datetime.now(timezone.utc).isoformat()
    }, "waiter")
    
    return {
        "message": f"Masa {old_table.get('table_number','')} → Masa {new_table.get('table_number','')} köçürüldü",
        "old_table": old_table,
        "new_table": new_table
    }
