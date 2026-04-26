"""Venues, Tables, Sessions routes"""
from fastapi import APIRouter, HTTPException, Depends, Request, Query
from typing import List, Optional
from datetime import datetime, timezone
import uuid
from database import db
from auth import get_current_user, get_current_user_optional
from models import UserRole, Venue, VenueCreate, Table, TableCreate, TableSession, OrderStatus
from routes.shared import generate_qr_code, tenant_query, stamp_restaurant_id, get_restaurant_id_for_table
from routes.services import deactivate_session_timed_services
from ws_manager import manager

router = APIRouter()

@router.post("/venues", response_model=Venue)
async def create_venue(venue: VenueCreate, current_user: dict = Depends(get_current_user)):
    if current_user['role'] not in [UserRole.OWNER, UserRole.ADMIN]:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    venue_obj = Venue(**venue.model_dump(), restaurant_id=current_user.get('restaurant_id'))
    doc = venue_obj.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    stamp_restaurant_id(doc, current_user)
    await db.venues.insert_one(doc)
    return venue_obj

@router.get("/venues", response_model=List[Venue])
async def get_venues(restaurant_id: Optional[str] = Query(None), current_user: Optional[dict] = Depends(get_current_user_optional)):
    # Authenticated calls are tenant-scoped; public calls (no auth) require explicit restaurant_id.
    query = {}
    if current_user:
        query.update(tenant_query(current_user))
    elif restaurant_id:
        query["restaurant_id"] = restaurant_id
    venues = await db.venues.find(query, {"_id": 0}).to_list(1000)
    for venue in venues:
        if isinstance(venue['created_at'], str):
            venue['created_at'] = datetime.fromisoformat(venue['created_at'])
    return venues

@router.put("/venues/{venue_id}", response_model=Venue)
async def update_venue(venue_id: str, venue: VenueCreate, current_user: dict = Depends(get_current_user)):
    if current_user['role'] not in [UserRole.OWNER, UserRole.ADMIN]:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    q = {"id": venue_id, **tenant_query(current_user)}
    existing = await db.venues.find_one(q, {"_id": 0})
    if not existing:
        raise HTTPException(status_code=404, detail="Venue not found")
    
    await db.venues.update_one(q, {"$set": venue.model_dump()})
    updated = await db.venues.find_one(q, {"_id": 0})
    if isinstance(updated['created_at'], str):
        updated['created_at'] = datetime.fromisoformat(updated['created_at'])
    return Venue(**updated)

@router.delete("/venues/{venue_id}")
async def delete_venue(venue_id: str, current_user: dict = Depends(get_current_user)):
    if current_user['role'] not in [UserRole.OWNER, UserRole.ADMIN]:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    q = {"id": venue_id, **tenant_query(current_user)}
    result = await db.venues.delete_one(q)
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Venue not found")
    return {"message": "Venue deleted"}

@router.post("/tables", response_model=Table)
async def create_table(table: TableCreate, current_user: dict = Depends(get_current_user)):
    if current_user['role'] not in [UserRole.OWNER, UserRole.ADMIN]:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    table_id = str(uuid.uuid4())
    qr_code = generate_qr_code(table_id)
    
    table_obj = Table(
        id=table_id,
        table_number=table.table_number,
        venue_id=table.venue_id,
        qr_code=qr_code,
        restaurant_id=current_user.get('restaurant_id')
    )
    
    doc = table_obj.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    stamp_restaurant_id(doc, current_user)
    await db.tables.insert_one(doc)
    return table_obj

@router.get("/tables", response_model=List[Table])
async def get_tables(venue_id: Optional[str] = None, restaurant_id: Optional[str] = Query(None), current_user: Optional[dict] = Depends(get_current_user_optional)):
    query = {}
    if venue_id:
        query["venue_id"] = venue_id
    if current_user:
        query.update(tenant_query(current_user))
    elif restaurant_id:
        query["restaurant_id"] = restaurant_id
    
    tables = await db.tables.find(query, {"_id": 0}).to_list(1000)
    for table in tables:
        if isinstance(table['created_at'], str):
            table['created_at'] = datetime.fromisoformat(table['created_at'])
    return tables

@router.put("/tables/{table_id}", response_model=Table)
async def update_table(table_id: str, table: TableCreate, current_user: dict = Depends(get_current_user)):
    if current_user['role'] not in [UserRole.OWNER, UserRole.ADMIN]:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    q = {"id": table_id, **tenant_query(current_user)}
    existing = await db.tables.find_one(q, {"_id": 0})
    if not existing:
        raise HTTPException(status_code=404, detail="Table not found")
    
    await db.tables.update_one(q, {"$set": {"table_number": table.table_number, "venue_id": table.venue_id}})
    updated = await db.tables.find_one(q, {"_id": 0})
    if isinstance(updated['created_at'], str):
        updated['created_at'] = datetime.fromisoformat(updated['created_at'])
    return Table(**updated)


@router.delete("/tables/{table_id}")
async def delete_table(table_id: str, current_user: dict = Depends(get_current_user)):
    if current_user['role'] not in [UserRole.OWNER, UserRole.ADMIN]:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    q = {"id": table_id, **tenant_query(current_user)}
    result = await db.tables.delete_one(q)
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Table not found")
    return {"message": "Table deleted"}

DEVICE_LOCK_TIMEOUT_MINUTES = 10

@router.post("/sessions/start/{table_id}")
async def start_session(table_id: str, request: Request = None):
    table = await db.tables.find_one({"id": table_id}, {"_id": 0})
    if not table:
        raise HTTPException(status_code=404, detail="Table not found")
    
    device_id = None
    force_takeover = False
    try:
        body = await request.json()
        device_id = body.get("device_id")
        force_takeover = body.get("force_takeover", False)
    except:
        pass
    
    active_session = await db.table_sessions.find_one({
        "table_id": table_id,
        "is_active": True
    }, {"_id": 0})
    
    if active_session:
        if isinstance(active_session['started_at'], str):
            active_session['started_at'] = datetime.fromisoformat(active_session['started_at'])
        
        stored_device = active_session.get("device_id")
        is_owner = (not stored_device) or (stored_device == device_id)
        
        # If no device was registered yet, register this one
        if not stored_device and device_id:
            await db.table_sessions.update_one(
                {"id": active_session["id"]},
                {"$set": {"device_id": device_id, "device_last_active": datetime.now(timezone.utc).isoformat()}}
            )
            is_owner = True
        
        # Check if device lock has expired (inactivity timeout)
        if stored_device and stored_device != device_id and not is_owner:
            last_active = active_session.get("device_last_active")
            lock_expired = False
            if last_active:
                if isinstance(last_active, str):
                    last_active_dt = datetime.fromisoformat(last_active.replace('Z', '+00:00'))
                else:
                    last_active_dt = last_active
                if last_active_dt.tzinfo is None:
                    last_active_dt = last_active_dt.replace(tzinfo=timezone.utc)
                elapsed = (datetime.now(timezone.utc) - last_active_dt).total_seconds() / 60
                if elapsed >= DEVICE_LOCK_TIMEOUT_MINUTES:
                    lock_expired = True
            else:
                # No last_active recorded — check session start time
                started = active_session['started_at']
                if started.tzinfo is None:
                    started = started.replace(tzinfo=timezone.utc)
                elapsed = (datetime.now(timezone.utc) - started).total_seconds() / 60
                if elapsed >= DEVICE_LOCK_TIMEOUT_MINUTES:
                    lock_expired = True
            
            # Auto-unlock if expired OR force takeover requested
            if lock_expired or force_takeover:
                await db.table_sessions.update_one(
                    {"id": active_session["id"]},
                    {"$set": {"device_id": device_id, "device_last_active": datetime.now(timezone.utc).isoformat()}}
                )
                is_owner = True
                active_session['device_id'] = device_id
            else:
                # Still locked — return remaining time
                remaining = DEVICE_LOCK_TIMEOUT_MINUTES - elapsed if 'elapsed' in dir() else DEVICE_LOCK_TIMEOUT_MINUTES
                return {
                    "session": active_session,
                    "table": table,
                    "is_session_owner": False,
                    "lock_expires_in_minutes": round(max(0, remaining), 1)
                }
        
        # Update last active for the owner
        if is_owner and device_id:
            await db.table_sessions.update_one(
                {"id": active_session["id"]},
                {"$set": {"device_last_active": datetime.now(timezone.utc).isoformat()}}
            )
        
        return {
            "session": active_session,
            "table": table,
            "is_session_owner": is_owner
        }
    
    session_token = str(uuid.uuid4())
    session = TableSession(
        table_id=table_id,
        session_token=session_token,
        restaurant_id=table.get('restaurant_id')
    )
    
    doc = session.model_dump()
    doc['started_at'] = doc['started_at'].isoformat()
    if table.get('restaurant_id') and not doc.get('restaurant_id'):
        doc['restaurant_id'] = table.get('restaurant_id')
    if device_id:
        doc['device_id'] = device_id
        doc['device_last_active'] = datetime.now(timezone.utc).isoformat()
    await db.table_sessions.insert_one(doc)
    
    return {
        "session": session,
        "table": table,
        "is_session_owner": True
    }

# Admin unlock session device
@router.post("/sessions/{session_id}/unlock-device")
async def unlock_session_device(session_id: str, current_user: dict = Depends(get_current_user)):
    if current_user['role'] not in [UserRole.OWNER, UserRole.ADMIN]:
        raise HTTPException(status_code=403, detail="Not authorized")
    result = await db.table_sessions.update_one(
        {"id": session_id, "is_active": True},
        {"$unset": {"device_id": "", "device_last_active": ""}}
    )
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Session not found")
    return {"message": "Cihaz kilidi açıldı"}

@router.get("/sessions/active")
async def get_active_sessions(current_user: dict = Depends(get_current_user)):
    sessions_filter = {"is_active": True, **tenant_query(current_user)}
    sessions = await db.table_sessions.find(sessions_filter, {"_id": 0}).to_list(1000)
    
    if not sessions:
        return []
    
    table_ids = [s['table_id'] for s in sessions]
    tables = await db.tables.find({"id": {"$in": table_ids}}, {"_id": 0}).to_list(1000)
    tables_map = {t['id']: t for t in tables}
    
    venue_ids = [t['venue_id'] for t in tables if t.get('venue_id')]
    venues = await db.venues.find({"id": {"$in": venue_ids}}, {"_id": 0}).to_list(1000)
    venues_map = {v['id']: v for v in venues}
    
    session_ids = [s['id'] for s in sessions]
    orders = await db.orders.find({
        "session_id": {"$in": session_ids},
        "status": {"$ne": OrderStatus.COMPLETED}
    }, {"_id": 0}).to_list(10000)
    
    orders_count = {}
    for order in orders:
        session_id = order['session_id']
        orders_count[session_id] = orders_count.get(session_id, 0) + 1
    
    result = []
    for session in sessions:
        if isinstance(session['started_at'], str):
            session['started_at'] = datetime.fromisoformat(session['started_at'])
        
        table = tables_map.get(session['table_id'])
        venue = venues_map.get(table['venue_id']) if table and table.get('venue_id') else None
        
        result.append({
            "session": session,
            "table": table,
            "venue": venue,
            "active_orders": orders_count.get(session['id'], 0)
        })
    
    return result

@router.post("/sessions/close/{session_id}")
async def close_session(session_id: str, current_user: dict = Depends(get_current_user)):
    if current_user['role'] not in [UserRole.ADMIN, UserRole.OWNER]:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    session = await db.table_sessions.find_one({"id": session_id}, {"_id": 0})
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    # Get all orders for this session
    orders = await db.orders.find({"session_id": session_id}, {"_id": 0}).to_list(1000)
    
    # Calculate totals
    subtotal = sum(o.get('subtotal', o.get('total_amount', 0)) for o in orders)
    total_discount = sum(o.get('discount_amount', 0) for o in orders)
    orders_total = sum(o.get('total_amount', 0) for o in orders)
    
    # Calculate service charge on the final total (applied only at close)
    settings = await db.settings.find_one({"id": "settings"}, {"_id": 0})
    service_charge_pct = settings.get('service_charge_percentage', 0) if settings else 0
    total_service_charge = round(orders_total * (service_charge_pct / 100), 2) if service_charge_pct > 0 else 0
    total_amount = round(orders_total + total_service_charge, 2)
    
    # Collect discount details
    discounts_applied = []
    for order in orders:
        if order.get('discount_name'):
            discounts_applied.append({
                "order_number": order.get('order_number'),
                "discount_name": order.get('discount_name'),
                "discount_type": order.get('discount_type'),
                "discount_value": order.get('discount_value'),
                "discount_amount": order.get('discount_amount')
            })
        # Also check per-item discounts
        for item in order.get('items', []):
            if item.get('discount_percentage', 0) > 0:
                original = item.get('price', 0) * item.get('quantity', 0)
                discounted = item.get('discounted_price', original)
                discounts_applied.append({
                    "order_number": order.get('order_number'),
                    "item_name": item.get('name'),
                    "discount_type": "percentage",
                    "discount_value": item.get('discount_percentage'),
                    "discount_amount": original - discounted
                })
    
    # Get table info
    table = await db.tables.find_one({"id": session['table_id']}, {"_id": 0})
    venue = await db.venues.find_one({"id": table['venue_id']}, {"_id": 0}) if table else None
    
    await db.table_sessions.update_one(
        {"id": session_id},
        {
            "$set": {
                "is_active": False,
                "ended_at": datetime.now(timezone.utc).isoformat()
            }
        }
    )
    
    await db.orders.update_many(
        {"session_id": session_id},
        {"$set": {"status": OrderStatus.COMPLETED}}
    )
    
    # Deactivate any timed services for this session
    await deactivate_session_timed_services(session_id)
    
    # Return detailed bill summary
    return {
        "message": "Session closed",
        "bill_summary": {
            "table": table,
            "venue": venue,
            "session": session,
            "orders": orders,
            "orders_count": len(orders),
            "subtotal": round(subtotal, 2),
            "total_discount": round(total_discount, 2),
            "total_service_charge": round(total_service_charge, 2),
            "service_charge_percentage": service_charge_pct,
            "total_amount": round(total_amount, 2),
            "discounts_applied": discounts_applied,
            "closed_at": datetime.now(timezone.utc).isoformat()
        }
    }

@router.post("/sessions/continue/{session_id}")
async def continue_session(session_id: str, current_user: dict = Depends(get_current_user)):
    if current_user['role'] not in [UserRole.ADMIN, UserRole.OWNER]:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    await db.table_sessions.update_one(
        {"id": session_id},
        {
            "$set": {
                "is_active": True,
                "ended_at": None
            }
        }
    )
    
    return {"message": "Session continued"}

