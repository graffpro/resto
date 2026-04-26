"""Customer Auth + Reservations + Delivery (public-facing customer accounts).

This is SEPARATE from the staff/admin auth in routes/auth.py.
Customers register via passwordless Email OTP (Resend) and store accounts in
`customer_users` collection. JWTs issued here use a different secret so that a
customer token can NEVER be used to access staff endpoints.
"""
from fastapi import APIRouter, HTTPException, Depends, Header, Query
from pydantic import BaseModel, EmailStr, Field, ConfigDict
from typing import List, Optional
from datetime import datetime, timezone, timedelta
import os
import asyncio
import secrets
import logging
import uuid
import jwt as pyjwt
from database import db

logger = logging.getLogger(__name__)
router = APIRouter()

# ==================== CONFIG ====================
JWT_SECRET = os.environ.get("JWT_SECRET_CUSTOMER", "customer-secret-change-me")
JWT_ALGO = "HS256"
ACCESS_TTL_DAYS = 30
OTP_TTL_MINUTES = 10
OTP_RESEND_COOLDOWN_SECONDS = 60
OTP_MAX_ATTEMPTS = 5

# ==================== EMAIL HELPER ====================
async def _send_otp_email(email: str, code: str, lang: str = "az") -> None:
    """Send OTP via Resend. Falls back to logging the code if API key missing."""
    api_key = os.environ.get("RESEND_API_KEY")
    sender = os.environ.get("SENDER_EMAIL", "onboarding@resend.dev")
    if not api_key:
        logger.warning("RESEND_API_KEY missing — logging OTP only. Code=%s for %s", code, email)
        return

    try:
        import resend
        resend.api_key = api_key

        # Bilingual transactional template (AZ + EN)
        html = f"""
        <table width="100%" cellpadding="0" cellspacing="0" style="font-family:Arial,sans-serif;background:#fafafa;padding:32px 0;">
          <tr><td align="center">
            <table width="480" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 6px 24px rgba(0,0,0,0.06);">
              <tr><td style="background:#1A251E;padding:24px 28px;">
                <h1 style="color:#fff;margin:0;font-size:18px;letter-spacing:0.06em;text-transform:uppercase;">QR Restoran</h1>
              </td></tr>
              <tr><td style="padding:32px 28px 16px 28px;color:#0a0a0a;">
                <h2 style="font-size:22px;margin:0 0 12px 0;">Doğrulama kodu / Verification code</h2>
                <p style="color:#555;margin:0 0 24px 0;font-size:14px;line-height:1.6;">
                  Hesabınızı təsdiqləmək üçün aşağıdakı kodu daxil edin. Kod 10 dəqiqə ərzində etibarlıdır.<br/>
                  <span style="color:#888;font-size:13px;">Use the code below to verify your account. Valid for 10 minutes.</span>
                </p>
                <div style="text-align:center;margin:24px 0;">
                  <div style="display:inline-block;background:#fff5ef;border:2px solid #E0402A;color:#C05C3D;font-size:30px;font-weight:900;letter-spacing:0.4em;padding:18px 28px;border-radius:14px;font-family:'Courier New',monospace;">{code}</div>
                </div>
                <p style="color:#999;font-size:12px;margin-top:24px;line-height:1.6;">
                  Bu kodu xahiş etməmisinizsə, bu emaili nəzərə almayın.<br/>
                  If you didn't request this code, you can ignore this email.
                </p>
              </td></tr>
              <tr><td style="background:#fafafa;padding:16px 28px;text-align:center;color:#aaa;font-size:11px;">
                © QR Restoran · Bakı, Azərbaycan
              </td></tr>
            </table>
          </td></tr>
        </table>
        """
        params = {
            "from": sender,
            "to": [email],
            "subject": f"QR Restoran — Doğrulama kodu: {code}",
            "html": html,
        }
        await asyncio.to_thread(resend.Emails.send, params)
        logger.info("OTP email sent to %s", email)
    except Exception as e:
        logger.error("Failed to send OTP email to %s: %s", email, e)
        # Don't raise — registration continues even if email fails (OTP also logged)


# ==================== JWT HELPERS ====================
def _create_token(customer_id: str, email: str) -> str:
    payload = {
        "sub": customer_id,
        "email": email,
        "type": "customer_access",
        "exp": datetime.now(timezone.utc) + timedelta(days=ACCESS_TTL_DAYS),
        "iat": datetime.now(timezone.utc),
    }
    return pyjwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGO)


async def get_current_customer(authorization: Optional[str] = Header(None)) -> dict:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing token")
    token = authorization[7:]
    try:
        payload = pyjwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGO])
        if payload.get("type") != "customer_access":
            raise HTTPException(status_code=401, detail="Invalid token type")
    except pyjwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except pyjwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

    user = await db.customer_users.find_one({"id": payload["sub"]}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=401, detail="Customer not found")
    return user


async def get_optional_customer(authorization: Optional[str] = Header(None)) -> Optional[dict]:
    if not authorization:
        return None
    try:
        return await get_current_customer(authorization)
    except HTTPException:
        return None


# ==================== MODELS ====================
class OTPRequest(BaseModel):
    email: EmailStr
    name: Optional[str] = None
    phone: Optional[str] = None  # E.164 format from frontend


class OTPVerify(BaseModel):
    email: EmailStr
    code: str = Field(min_length=4, max_length=8)


class CustomerProfile(BaseModel):
    model_config = ConfigDict(extra="ignore")
    name: Optional[str] = None
    phone: Optional[str] = None


# ==================== AUTH ENDPOINTS ====================
@router.post("/customer/auth/send-otp")
async def send_otp(req: OTPRequest):
    """Send a 6-digit OTP code to the user's email. Used for both signup and login.
    Rate-limited to 1 request per 60s per email.
    """
    email = req.email.lower().strip()
    now = datetime.now(timezone.utc)

    # Cooldown check
    last = await db.customer_otp.find_one({"email": email}, {"_id": 0})
    if last and last.get("created_at"):
        last_time = datetime.fromisoformat(last["created_at"]) if isinstance(last["created_at"], str) else last["created_at"]
        elapsed = (now - last_time).total_seconds()
        if elapsed < OTP_RESEND_COOLDOWN_SECONDS and not last.get("verified"):
            wait = int(OTP_RESEND_COOLDOWN_SECONDS - elapsed)
            raise HTTPException(status_code=429, detail=f"Çox sürətli. {wait} saniyə gözləyin.")

    # Generate 6-digit code
    code = f"{secrets.randbelow(900000) + 100000}"

    await db.customer_otp.update_one(
        {"email": email},
        {"$set": {
            "email": email,
            "code": code,
            "name": req.name,
            "phone": req.phone,
            "attempts": 0,
            "verified": False,
            "created_at": now.isoformat(),
            "expires_at": (now + timedelta(minutes=OTP_TTL_MINUTES)).isoformat(),
        }},
        upsert=True,
    )

    await _send_otp_email(email, code)
    return {"message": "OTP göndərildi", "email": email, "expires_in": OTP_TTL_MINUTES * 60}


@router.post("/customer/auth/verify-otp")
async def verify_otp(req: OTPVerify):
    """Verify OTP and return JWT. Creates customer account on first verify."""
    email = req.email.lower().strip()
    rec = await db.customer_otp.find_one({"email": email}, {"_id": 0})
    if not rec:
        raise HTTPException(status_code=404, detail="OTP tapılmadı, yenidən göndərin")

    now = datetime.now(timezone.utc)
    expires_at = datetime.fromisoformat(rec["expires_at"]) if isinstance(rec["expires_at"], str) else rec["expires_at"]
    if expires_at < now:
        raise HTTPException(status_code=410, detail="OTP vaxtı bitdi")

    if rec.get("attempts", 0) >= OTP_MAX_ATTEMPTS:
        raise HTTPException(status_code=429, detail="Çox cəhd. Yeni kod istəyin")

    if rec["code"] != req.code.strip():
        await db.customer_otp.update_one({"email": email}, {"$inc": {"attempts": 1}})
        raise HTTPException(status_code=400, detail="Kod yanlışdır")

    # Find or create customer
    customer = await db.customer_users.find_one({"email": email}, {"_id": 0})
    if not customer:
        customer = {
            "id": str(uuid.uuid4()),
            "email": email,
            "name": rec.get("name") or "",
            "phone": rec.get("phone") or "",
            "is_verified": True,
            "created_at": now.isoformat(),
        }
        await db.customer_users.insert_one(customer)
        customer.pop("_id", None)
    else:
        # Update name/phone if missing and provided in OTP request
        update = {}
        if rec.get("name") and not customer.get("name"):
            update["name"] = rec["name"]
        if rec.get("phone") and not customer.get("phone"):
            update["phone"] = rec["phone"]
        if update:
            await db.customer_users.update_one({"id": customer["id"]}, {"$set": update})
            customer.update(update)

    # Mark OTP verified (and clear)
    await db.customer_otp.update_one({"email": email}, {"$set": {"verified": True}})

    token = _create_token(customer["id"], email)
    return {
        "token": token,
        "customer": {
            "id": customer["id"],
            "email": customer["email"],
            "name": customer.get("name"),
            "phone": customer.get("phone"),
        },
    }


@router.get("/customer/auth/me")
async def me(current: dict = Depends(get_current_customer)):
    return {
        "id": current["id"],
        "email": current["email"],
        "name": current.get("name"),
        "phone": current.get("phone"),
    }


@router.put("/customer/auth/profile")
async def update_profile(profile: CustomerProfile, current: dict = Depends(get_current_customer)):
    update = {k: v for k, v in profile.model_dump().items() if v is not None}
    if update:
        await db.customer_users.update_one({"id": current["id"]}, {"$set": update})
    updated = await db.customer_users.find_one({"id": current["id"]}, {"_id": 0})
    return {
        "id": updated["id"],
        "email": updated["email"],
        "name": updated.get("name"),
        "phone": updated.get("phone"),
    }


# ==================== PUBLIC RESERVATIONS ====================
class PublicReservationRequest(BaseModel):
    restaurant_id: str
    customer_name: str = Field(min_length=2, max_length=120)
    customer_phone: str = Field(min_length=4, max_length=32)
    customer_email: Optional[EmailStr] = None
    reservation_date: str  # YYYY-MM-DD
    reservation_time: str  # HH:MM
    guest_count: int = Field(ge=1, le=50)
    special_requests: Optional[str] = ""


@router.post("/public/reservations")
async def create_public_reservation(
    req: PublicReservationRequest,
    current: Optional[dict] = Depends(get_optional_customer),
):
    """Anonymous-or-authenticated reservation request from the public menu.
    Restaurant staff can confirm/decline from the admin reservations page.
    """
    # Restaurant must be a visible partner
    partner = await db.partner_restaurants.find_one(
        {"restaurant_id": req.restaurant_id, "is_visible": True},
        {"_id": 0},
    )
    if not partner:
        raise HTTPException(status_code=404, detail="Restoran public rezerv üçün açıq deyil")

    doc = {
        "id": str(uuid.uuid4()),
        "restaurant_id": req.restaurant_id,
        "table_id": None,  # staff assigns later
        "customer_name": req.customer_name,
        "customer_phone": req.customer_phone,
        "customer_email": req.customer_email,
        "reservation_date": req.reservation_date,
        "reservation_time": req.reservation_time,
        "guest_count": req.guest_count,
        "special_requests": req.special_requests or "",
        "status": "pending",
        "source": "public_menu",
        "customer_id": current.get("id") if current else None,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.reservations.insert_one(doc)
    doc.pop("_id", None)
    return {"message": "Rezerv qəbul edildi. Restoran sizinlə əlaqə saxlayacaq.", "reservation": doc}


# ==================== PUBLIC DELIVERY ORDERS ====================
class DeliveryItem(BaseModel):
    menu_item_id: str
    name: str
    price: float
    quantity: int = Field(ge=1, le=50)
    notes: Optional[str] = ""


class PublicDeliveryRequest(BaseModel):
    restaurant_id: str
    customer_name: str = Field(min_length=2, max_length=120)
    customer_phone: str = Field(min_length=4, max_length=32)
    customer_email: Optional[EmailStr] = None
    delivery_address: str = Field(min_length=4, max_length=500)
    address_lat: Optional[float] = None
    address_lng: Optional[float] = None
    address_notes: Optional[str] = ""
    items: List[DeliveryItem] = Field(min_length=1)
    payment_method: str = Field(default="cash")  # cash | card_on_delivery (online payment integrated later)
    notes: Optional[str] = ""


@router.post("/public/delivery-orders")
async def create_delivery_order(
    req: PublicDeliveryRequest,
    current: Optional[dict] = Depends(get_optional_customer),
):
    partner = await db.partner_restaurants.find_one(
        {"restaurant_id": req.restaurant_id, "is_visible": True},
        {"_id": 0},
    )
    if not partner:
        raise HTTPException(status_code=404, detail="Restoran çatdırılma üçün açıq deyil")

    subtotal = sum(it.price * it.quantity for it in req.items)

    doc = {
        "id": str(uuid.uuid4()),
        "restaurant_id": req.restaurant_id,
        "customer_id": current.get("id") if current else None,
        "customer_name": req.customer_name,
        "customer_phone": req.customer_phone,
        "customer_email": req.customer_email,
        "delivery_address": req.delivery_address,
        "address_lat": req.address_lat,
        "address_lng": req.address_lng,
        "address_notes": req.address_notes or "",
        "items": [it.model_dump() for it in req.items],
        "subtotal": round(subtotal, 2),
        "delivery_fee": 0.0,  # restaurants can configure later
        "total": round(subtotal, 2),
        "payment_method": req.payment_method,
        "status": "pending",  # pending → confirmed → preparing → out_for_delivery → delivered | cancelled
        "notes": req.notes or "",
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.delivery_orders.insert_one(doc)
    doc.pop("_id", None)
    return {"message": "Sifariş qəbul edildi", "order": doc, "track_url": f"/delivery/track/{doc['id']}"}


@router.get("/public/delivery-orders/{order_id}")
async def get_delivery_order(order_id: str):
    doc = await db.delivery_orders.find_one({"id": order_id}, {"_id": 0})
    if not doc:
        raise HTTPException(status_code=404, detail="Sifariş tapılmadı")
    return doc


@router.get("/customer/delivery-orders")
async def list_my_delivery_orders(current: dict = Depends(get_current_customer)):
    docs = await db.delivery_orders.find(
        {"customer_id": current["id"]}, {"_id": 0}
    ).sort("created_at", -1).to_list(200)
    return docs


# ==================== STAFF: VIEW & UPDATE DELIVERY ORDERS ====================
# Reuse staff auth from main routes/auth.py via dependency injection
from auth import get_current_user
from models import UserRole
from routes.shared import tenant_query


@router.get("/admin/delivery-orders")
async def list_restaurant_delivery_orders(
    status: Optional[str] = Query(None),
    current_user: dict = Depends(get_current_user),
):
    if current_user["role"] not in [UserRole.OWNER, UserRole.ADMIN]:
        raise HTTPException(status_code=403, detail="Not authorized")
    q = tenant_query(current_user)
    if status:
        q["status"] = status
    docs = await db.delivery_orders.find(q, {"_id": 0}).sort("created_at", -1).to_list(500)
    return docs


@router.put("/admin/delivery-orders/{order_id}/status")
async def update_delivery_status(
    order_id: str,
    new_status: str = Query(..., regex="^(pending|confirmed|preparing|out_for_delivery|delivered|cancelled)$"),
    current_user: dict = Depends(get_current_user),
):
    if current_user["role"] not in [UserRole.OWNER, UserRole.ADMIN]:
        raise HTTPException(status_code=403, detail="Not authorized")
    q = {"id": order_id, **tenant_query(current_user)}
    result = await db.delivery_orders.update_one(q, {"$set": {"status": new_status, "updated_at": datetime.now(timezone.utc).isoformat()}})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Sifariş tapılmadı")
    return {"message": "Status yeniləndi", "status": new_status}
