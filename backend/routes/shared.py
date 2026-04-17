"""Shared utilities used across route modules"""
import os
import re
import logging
import requests
import qrcode
import base64
from io import BytesIO
from datetime import datetime, timezone
from fastapi import HTTPException
from database import db
from ws_manager import manager

# Object Storage
STORAGE_URL = "https://integrations.emergentagent.com/objstore/api/v1/storage"
EMERGENT_KEY = os.environ.get("EMERGENT_LLM_KEY")
APP_NAME = "qr-restaurant"
storage_key = None
LOCAL_UPLOAD_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "uploads")
os.makedirs(LOCAL_UPLOAD_DIR, exist_ok=True)

def init_storage():
    global storage_key
    if storage_key:
        return storage_key
    if not EMERGENT_KEY:
        logging.warning("EMERGENT_LLM_KEY not set, using local storage")
        return None
    try:
        resp = requests.post(f"{STORAGE_URL}/init", json={"emergent_key": EMERGENT_KEY}, timeout=30)
        resp.raise_for_status()
        storage_key = resp.json()["storage_key"]
        logging.info("Object storage initialized")
        return storage_key
    except Exception as e:
        logging.error(f"Storage init failed: {e}, using local storage")
        return None

def put_object(path: str, data: bytes, content_type: str) -> dict:
    key = init_storage()
    if not key:
        local_path = os.path.join(LOCAL_UPLOAD_DIR, os.path.basename(path))
        with open(local_path, "wb") as f:
            f.write(data)
        return {"path": os.path.basename(path), "size": len(data), "local": True}
    resp = requests.put(
        f"{STORAGE_URL}/objects/{path}",
        headers={"X-Storage-Key": key, "Content-Type": content_type},
        data=data, timeout=120
    )
    resp.raise_for_status()
    return resp.json()

def get_object(path: str):
    local_path = os.path.join(LOCAL_UPLOAD_DIR, os.path.basename(path))
    if os.path.exists(local_path):
        with open(local_path, "rb") as f:
            data = f.read()
        import mimetypes
        ct = mimetypes.guess_type(local_path)[0] or "application/octet-stream"
        return data, ct
    key = init_storage()
    if not key:
        raise HTTPException(status_code=503, detail="Storage not available")
    resp = requests.get(
        f"{STORAGE_URL}/objects/{path}",
        headers={"X-Storage-Key": key}, timeout=60
    )
    resp.raise_for_status()
    return resp.content, resp.headers.get("Content-Type", "application/octet-stream")

def sanitize_input(text: str) -> str:
    if not text:
        return text
    text = re.sub(r'[<>]', '', text)
    text = text.strip()
    return text[:500]

def generate_qr_code(table_id: str, base_url: str = None) -> str:
    qr = qrcode.QRCode(version=1, box_size=10, border=5)
    base_url = "https://resto.az"
    qr_data = f"{base_url}/table/{table_id}"
    qr.add_data(qr_data)
    qr.make(fit=True)
    img = qr.make_image(fill_color="black", back_color="white")
    buffered = BytesIO()
    img.save(buffered, format="PNG")
    img_str = base64.b64encode(buffered.getvalue()).decode()
    return f"data:image/png;base64,{img_str}"

async def notify_order_update(order_data: dict, event_type: str):
    message = {
        "type": event_type,
        "data": order_data,
        "timestamp": datetime.now(timezone.utc).isoformat()
    }
    if event_type == "new_order":
        await manager.broadcast_to_role(message, "kitchen")
        await manager.broadcast_to_role(message, "waiter")
    elif event_type in ["order_update"]:
        await manager.broadcast_to_role(message, "kitchen")
        await manager.broadcast_to_role(message, "waiter")
    elif event_type == "order_ready":
        await manager.broadcast_to_role(message, "waiter")
    await manager.broadcast_to_role(message, "admin")
