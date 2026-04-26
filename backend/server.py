"""QR Restoran - Main Server Entry Point (Refactored)"""
from fastapi import FastAPI, APIRouter, WebSocket, WebSocketDisconnect
from fastapi.responses import FileResponse
from starlette.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
from pathlib import Path
from typing import Dict
from datetime import datetime, timezone
import os
import uuid
import asyncio
import logging

# Load env
ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# Shared modules
from database import db
from ws_manager import manager, voice_manager
from routes.shared import init_storage, LOCAL_UPLOAD_DIR

# Route modules
from routes.auth import router as auth_router
from routes.restaurants import router as restaurants_router
from routes.venues import router as venues_router
from routes.orders import router as orders_router
from routes.inventory import router as inventory_router
from routes.services import router as services_router
from routes.partners import router as partners_router
from routes.translate import router as translate_router

# ==================== APP SETUP ====================
app = FastAPI()
api_router = APIRouter(prefix="/api")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ==================== MOUNT ROUTE MODULES ====================
api_router.include_router(auth_router)
api_router.include_router(restaurants_router)
api_router.include_router(venues_router)
api_router.include_router(orders_router)
api_router.include_router(inventory_router)
api_router.include_router(services_router)
api_router.include_router(partners_router)
api_router.include_router(translate_router)

# ==================== APK VERSION & DOWNLOAD ====================
CURRENT_APK_VERSION = "1.1.0"

@api_router.get("/app-version")
async def get_app_version():
    return {"version": CURRENT_APK_VERSION, "download_url": "/qr-restoran.apk"}

@api_router.get("/download/apk")
async def download_apk():
    apk_path = os.path.join(LOCAL_UPLOAD_DIR, "qr-restoran.apk")
    if not os.path.exists(apk_path):
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="APK fayl tapılmadı")
    return FileResponse(apk_path, media_type="application/vnd.android.package-archive", filename="qr-restoran.apk")

# ==================== RATE LIMITER ====================
rate_limit_store: Dict[str, list] = {}
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# ==================== STARTUP / SHUTDOWN ====================
@app.on_event("startup")
async def startup_event():
    try:
        init_storage()
    except Exception as e:
        logger.error(f"Storage init on startup: {e}")
    try:
        graff = await db.users.find_one({"username": "graff"})
        if not graff or "password" not in graff:
            await db.users.delete_many({"username": "graff"})
            import bcrypt as _bc
            pw = _bc.hashpw("Testforresto123".encode("utf-8"), _bc.gensalt()).decode("utf-8")
            await db.users.insert_one({
                "id": str(uuid.uuid4()), "username": "graff", "password": pw,
                "full_name": "Graff", "role": "owner", "is_active": True,
                "created_at": datetime.now(timezone.utc).isoformat()
            })
            logger.info("Owner created: graff")
    except Exception as e:
        logger.error(f"Owner auto-create: {e}")
    # ==================== MULTI-TENANT MIGRATION ====================
    # Ensure every legacy document (before multi-tenant support) is stamped
    # with a restaurant_id so the new tenant filter does not leak/hide data.
    try:
        await migrate_legacy_restaurant_id()
    except Exception as e:
        logger.error(f"Multi-tenant migration error: {e}")
    asyncio.create_task(check_timed_services_loop())

async def migrate_legacy_restaurant_id():
    """One-time migration: stamp legacy data (created before multi-tenant
    support was added) with the restaurant_id of the original admin tenant.

    Strategy:
      * Pick the oldest non-owner user (admin) as the legacy tenant anchor.
      * If that user has a restaurant_id, reuse it; otherwise create a
        Legacy Restaurant and assign it to all admin/staff users with no
        restaurant_id.
      * Update orphan documents in venues / tables / table_sessions /
        categories / menu_items / orders / waiter_calls / timed_services /
        discounts / stations / ingredients / recipes / stock_transactions /
        reservations / expenses / menus / files so that they belong to that
        legacy tenant.
    """
    # Find a legacy tenant anchor (prefer "emin" if present)
    legacy_user = await db.users.find_one(
        {"role": {"$in": ["admin"]}, "restaurant_id": {"$ne": None, "$exists": True}},
        {"_id": 0}
    )
    legacy_rid = legacy_user.get('restaurant_id') if legacy_user else None

    if not legacy_rid:
        # No tenant exists yet - look for any admin without restaurant_id and
        # create one for them.
        orphan_admin = await db.users.find_one(
            {"role": "admin", "$or": [{"restaurant_id": None}, {"restaurant_id": {"$exists": False}}]},
            {"_id": 0}
        )
        if orphan_admin:
            legacy_rid = str(uuid.uuid4())
            await db.restaurants.insert_one({
                "id": legacy_rid,
                "name": "Legacy Restoran",
                "is_active": True,
                "created_by": orphan_admin.get('id'),
                "created_at": datetime.now(timezone.utc).isoformat()
            })
            logger.info(f"Created legacy restaurant {legacy_rid} for orphan admin {orphan_admin.get('username')}")

    if not legacy_rid:
        logger.info("Migration skipped: no admin/tenant found yet.")
        return

    # Stamp orphan staff users (admin/kitchen/waiter/bar) with the legacy tenant
    staff_filter = {
        "role": {"$in": ["admin", "kitchen", "waiter", "bar"]},
        "$or": [{"restaurant_id": None}, {"restaurant_id": {"$exists": False}}]
    }
    staff_res = await db.users.update_many(staff_filter, {"$set": {"restaurant_id": legacy_rid}})
    if staff_res.modified_count:
        logger.info(f"Migration: stamped {staff_res.modified_count} legacy staff users with restaurant {legacy_rid}")

    # Stamp orphan documents across all multi-tenant collections
    collections = [
        "venues", "tables", "table_sessions", "categories", "menu_items",
        "orders", "waiter_calls", "timed_services", "discounts", "stations",
        "ingredients", "recipes", "stock_transactions", "reservations",
        "expenses", "menus", "files", "settings"
    ]
    orphan_filter = {"$or": [{"restaurant_id": None}, {"restaurant_id": {"$exists": False}}]}
    total = 0
    for coll in collections:
        try:
            res = await db[coll].update_many(orphan_filter, {"$set": {"restaurant_id": legacy_rid}})
            if res.modified_count:
                total += res.modified_count
                logger.info(f"Migration: stamped {res.modified_count} {coll} → {legacy_rid}")
        except Exception as e:
            logger.error(f"Migration {coll}: {e}")
    logger.info(f"Multi-tenant migration completed. Total docs migrated: {total}")

async def check_timed_services_loop():
    """Check timed services every 30s. Only notify once per expired service."""
    notified_ids = set()
    while True:
        try:
            await asyncio.sleep(30)
            now = datetime.now(timezone.utc)
            active_services = await db.timed_services.find({"is_active": True}, {"_id": 0}).to_list(1000)
            
            for svc in active_services:
                # Skip already notified
                if svc["id"] in notified_ids:
                    continue
                
                # Check if session is still active — auto-deactivate if closed
                session = await db.table_sessions.find_one({"id": svc.get("session_id")}, {"_id": 0})
                if session and not session.get("is_active", True):
                    await db.timed_services.update_one({"id": svc["id"]}, {"$set": {"is_active": False}})
                    continue
                
                next_serve = svc.get("next_serve_at")
                if not next_serve:
                    continue
                if isinstance(next_serve, str):
                    next_serve_dt = datetime.fromisoformat(next_serve.replace('Z', '+00:00'))
                else:
                    next_serve_dt = next_serve
                if next_serve_dt.tzinfo is None:
                    next_serve_dt = next_serve_dt.replace(tzinfo=timezone.utc)
                
                if now >= next_serve_dt:
                    table = await db.tables.find_one({"id": svc["table_id"]}, {"_id": 0})
                    table_number = table.get("table_number", "?") if table else "?"
                    alert_msg = {
                        "type": "timed_service_expired",
                        "data": {
                            "service_id": svc["id"], "table_id": svc["table_id"],
                            "table_number": table_number,
                            "menu_item_name": svc.get("menu_item_name", ""),
                            "interval_minutes": svc.get("interval_minutes", 0),
                            "serve_count": svc.get("serve_count", 0),
                            "notes": svc.get("notes", ""),
                        },
                        "timestamp": now.isoformat()
                    }
                    await manager.broadcast_to_role(alert_msg, "waiter")
                    await manager.broadcast_to_role(alert_msg, "admin")
                    await manager.broadcast_to_role(alert_msg, "kitchen")
                    notified_ids.add(svc["id"])
                    logger.info(f"Timed service expired: {svc['id']} - Table {table_number}")
        except Exception as e:
            logger.error(f"Timed services check error: {e}")

@app.on_event("shutdown")
async def shutdown_db_client():
    pass

# ==================== WEBSOCKET ENDPOINTS ====================
@app.websocket("/api/ws/voice/{role}")
async def voice_websocket(websocket: WebSocket, role: str):
    await voice_manager.connect(websocket, role)
    try:
        while True:
            data = await websocket.receive_text()
            import json
            try:
                message = json.loads(data)
                target_role = message.get('target_role', '')
                if target_role:
                    await voice_manager.send_to_role(data, target_role)
            except json.JSONDecodeError:
                pass
    except WebSocketDisconnect:
        voice_manager.disconnect(websocket, role)

@app.websocket("/api/ws/{role}")
async def websocket_endpoint(websocket: WebSocket, role: str):
    await manager.connect(websocket, role)
    try:
        while True:
            data = await websocket.receive_text()
            if data == "ping":
                await websocket.send_text("pong")
    except WebSocketDisconnect:
        manager.disconnect(websocket, role)

# ==================== MOUNT ROUTER ====================
app.include_router(api_router)
