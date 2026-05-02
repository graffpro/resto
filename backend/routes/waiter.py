"""
Master Waiter endpoints — allow elevated waiters to take orders on behalf of
customers directly at the table (useful for elderly guests who struggle with QR
self-ordering).

Flow:
  1. master waiter opens /waiter/take-order page → GET /api/waiter/takable-tables
  2. picks a table → POST /api/waiter/take-order with items[]
  3. backend auto-opens a session if none active, creates an Order marked with
     source="waiter_manual" + taken_by_user_id so admin can distinguish.
"""
from __future__ import annotations

import uuid
from datetime import datetime, timezone
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field

from auth import get_current_user
from database import db
from models import UserRole, Order, OrderItem, OrderStatus
from routes.shared import tenant_query
from ws_manager import manager as ws_manager

router = APIRouter(prefix="/waiter", tags=["waiter"])


ALLOWED_ROLES = {UserRole.MASTER_WAITER.value, UserRole.ADMIN.value, UserRole.OWNER.value}


def _require_master_waiter(current: dict) -> None:
    if current.get("role") not in ALLOWED_ROLES:
        raise HTTPException(status_code=403, detail="Master ofitsiant icazəsi tələb olunur")


# ---------- Tables list (for the table picker screen) ----------

@router.get("/takable-tables")
async def list_takable_tables(current: dict = Depends(get_current_user)):
    """All tables in the master waiter's restaurant, with open-session info so
    the UI can show "occupied / available / needs-session"."""
    _require_master_waiter(current)
    q = tenant_query(current)
    tables = await db.tables.find(q, {"_id": 0}).sort("table_number", 1).to_list(500)
    # Attach open session info
    result = []
    for t in tables:
        session = await db.table_sessions.find_one(
            {"table_id": t["id"], "is_active": True}, {"_id": 0}
        )
        venue = None
        if t.get("venue_id"):
            venue = await db.venues.find_one({"id": t["venue_id"]}, {"_id": 0, "name": 1, "id": 1})
        result.append({
            "id": t["id"],
            "table_number": t.get("table_number"),
            "name": t.get("name"),
            "capacity": t.get("capacity", 0),
            "venue_id": t.get("venue_id"),
            "venue_name": venue.get("name") if venue else None,
            "has_active_session": bool(session),
            "session_id": session.get("id") if session else None,
        })
    return result


# ---------- Menu snapshot (same restaurant's menu for the waiter to pick) ----------

@router.get("/menu")
async def waiter_menu(current: dict = Depends(get_current_user)):
    _require_master_waiter(current)
    q = tenant_query(current)
    cats = await db.categories.find(q, {"_id": 0}).sort("display_order", 1).to_list(500)
    items = await db.menu_items.find({**q, "is_available": True}, {"_id": 0}).to_list(2000)
    return {"categories": cats, "items": items}


# ---------- Take order on behalf of a customer ----------

class TakeOrderItem(BaseModel):
    menu_item_id: str
    quantity: int = Field(ge=1, le=99)
    notes: Optional[str] = None


class TakeOrderRequest(BaseModel):
    table_id: str
    items: List[TakeOrderItem] = Field(min_length=1)
    customer_note: Optional[str] = None


@router.post("/take-order")
async def take_order_for_customer(req: TakeOrderRequest, current: dict = Depends(get_current_user)):
    _require_master_waiter(current)
    q = tenant_query(current)

    # Verify table belongs to waiter's restaurant
    table = await db.tables.find_one({"id": req.table_id, **q}, {"_id": 0})
    if not table:
        raise HTTPException(status_code=404, detail="Masa tapılmadı")

    rid = table.get("restaurant_id") or current.get("restaurant_id")

    # Ensure there's an active session for this table; if not, create one
    session = await db.table_sessions.find_one(
        {"table_id": req.table_id, "is_active": True}, {"_id": 0}
    )
    if not session:
        session_doc = {
            "id": str(uuid.uuid4()),
            "session_token": str(uuid.uuid4()),
            "table_id": req.table_id,
            "restaurant_id": rid,
            "is_active": True,
            "opened_by_user_id": current["id"],
            "opened_by_role": "master_waiter",
            "started_at": datetime.now(timezone.utc).isoformat(),
        }
        await db.table_sessions.insert_one(session_doc)
        session = session_doc

    # Resolve menu items + compute prices server-side (never trust client prices)
    processed_items: List[dict] = []
    subtotal = 0.0
    for it in req.items:
        mi = await db.menu_items.find_one({"id": it.menu_item_id, **q}, {"_id": 0})
        if not mi:
            raise HTTPException(status_code=400, detail=f"Menyu maddəsi tapılmadı: {it.menu_item_id}")
        price = float(mi.get("price", 0))
        line_total = price * it.quantity
        item_discount = float(mi.get("discount_percentage", 0) or 0)
        discounted = line_total * (1 - item_discount / 100) if item_discount else line_total
        processed_items.append({
            "menu_item_id": it.menu_item_id,
            "name": mi.get("name", ""),
            "price": price,
            "quantity": it.quantity,
            "discount_percentage": item_discount,
            "discounted_price": round(discounted, 2),
            "target_station": mi.get("target_station", "kitchen"),
        })
        subtotal += discounted

    order_count = await db.orders.count_documents({}) + 1
    order = Order(
        order_number=f"ORD{str(order_count).zfill(5)}",
        session_id=session["id"],
        table_id=req.table_id,
        items=[OrderItem(**pi) for pi in processed_items],
        subtotal=round(subtotal, 2),
        total_amount=round(subtotal, 2),
        status=OrderStatus.PENDING,
        restaurant_id=rid,
        source="waiter_manual",
        taken_by_user_id=current["id"],
        taken_by_name=current.get("full_name") or current.get("username") or "",
    )
    doc = order.model_dump()
    doc["ordered_at"] = doc["ordered_at"].isoformat()
    await db.orders.insert_one(doc)
    doc.pop("_id", None)

    # Realtime broadcast to kitchen/bar/admin so all screens light up immediately
    try:
        payload = {
            "type": "new_order",
            "data": {
                "id": order.id,
                "order_number": order.order_number,
                "table_id": req.table_id,
                "total_amount": order.total_amount,
                "items_count": len(processed_items),
                "source": "waiter_manual",
                "taken_by_name": order.taken_by_name,
                "restaurant_id": rid,
            },
            "timestamp": datetime.now(timezone.utc).isoformat(),
        }
        for role in ("kitchen", "bar", "admin", "waiter"):
            await ws_manager.broadcast_to_role(payload, role)
    except Exception:
        pass

    return {"order": doc, "session_id": session["id"]}
