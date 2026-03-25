from fastapi import FastAPI, APIRouter, HTTPException, Depends, status, WebSocket, WebSocketDisconnect
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional, Dict
import uuid
from datetime import datetime, timezone, timedelta
from enum import Enum
import jwt
import bcrypt
import qrcode
from io import BytesIO
import base64
import asyncio
import json

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

app = FastAPI()
api_router = APIRouter(prefix="/api")
security = HTTPBearer()

JWT_SECRET = os.environ.get('JWT_SECRET', 'your-secret-key-change-in-production')
JWT_ALGORITHM = 'HS256'

class UserRole(str, Enum):
    OWNER = "owner"
    ADMIN = "admin"
    KITCHEN = "kitchen"
    WAITER = "waiter"

class OrderStatus(str, Enum):
    PENDING = "pending"
    PREPARING = "preparing"
    READY = "ready"
    DELIVERED = "delivered"
    COMPLETED = "completed"

# Restaurant Model - Each Admin manages one restaurant
class Restaurant(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    address: Optional[str] = None
    phone: Optional[str] = None
    whatsapp: Optional[str] = None
    email: Optional[str] = None
    logo_url: Optional[str] = None
    description: Optional[str] = None
    tax_percentage: float = 18
    service_charge_percentage: float = 0
    currency: str = "AZN"
    is_active: bool = True
    created_by: str  # Owner ID
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class RestaurantCreate(BaseModel):
    name: str
    address: Optional[str] = None
    phone: Optional[str] = None
    whatsapp: Optional[str] = None
    email: Optional[str] = None
    logo_url: Optional[str] = None
    description: Optional[str] = None
    tax_percentage: float = 18
    service_charge_percentage: float = 0

class User(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    username: str
    role: UserRole
    full_name: str
    restaurant_id: Optional[str] = None  # Which restaurant this user belongs to
    admin_pin: Optional[str] = None  # PIN for admin access
    is_active: bool = True
    expires_at: Optional[str] = None  # When user access expires (for admins)
    created_by: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    # Waiter specific fields
    rest_days: List[str] = []  # List of rest day dates
    points: int = 0  # Performance points

class UserCreate(BaseModel):
    username: str
    password: str
    role: UserRole
    full_name: str
    restaurant_id: Optional[str] = None
    admin_pin: Optional[str] = None
    expires_at: Optional[str] = None  # Format: YYYY-MM-DD

class LoginRequest(BaseModel):
    username: str
    password: str

class Venue(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    description: Optional[str] = None
    is_active: bool = True
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class VenueCreate(BaseModel):
    name: str
    description: Optional[str] = None

class Table(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    table_number: str
    venue_id: str
    qr_code: str
    is_active: bool = True
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class TableCreate(BaseModel):
    table_number: str
    venue_id: str

class TableSession(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    table_id: str
    session_token: str
    started_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    ended_at: Optional[datetime] = None
    is_active: bool = True

class Category(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    description: Optional[str] = None
    display_order: int = 0
    menu_id: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class CategoryCreate(BaseModel):
    name: str
    description: Optional[str] = None
    display_order: int = 0
    menu_id: Optional[str] = None

class MenuItem(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    description: str
    price: float
    category_id: str
    image_url: Optional[str] = None
    discount_percentage: float = 0  # Per-item discount
    is_available: bool = True
    preparation_time: int = 15
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class MenuItemCreate(BaseModel):
    name: str
    description: str
    price: float
    category_id: str
    image_url: Optional[str] = None
    discount_percentage: float = 0
    is_available: bool = True
    preparation_time: int = 15

class OrderItem(BaseModel):
    menu_item_id: str
    name: str
    price: float
    quantity: int
    discount_percentage: float = 0  # Per-item discount
    discounted_price: Optional[float] = None  # Price after item discount

class Order(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    order_number: str
    session_id: str
    table_id: str
    items: List[OrderItem]
    subtotal: float = 0  # Before discounts
    discount_id: Optional[str] = None  # Applied order-level discount
    discount_name: Optional[str] = None
    discount_type: Optional[str] = None  # percentage or fixed
    discount_value: float = 0  # The discount rate/amount
    discount_amount: float = 0  # Calculated discount
    total_amount: float  # Final amount after all discounts
    status: OrderStatus = OrderStatus.PENDING
    ordered_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    preparing_started_at: Optional[datetime] = None
    ready_at: Optional[datetime] = None
    delivered_at: Optional[datetime] = None
    waiter_id: Optional[str] = None

class OrderCreate(BaseModel):
    session_token: str
    items: List[OrderItem]
    subtotal: float = 0  # Will be calculated
    total_amount: float = 0  # Will be calculated with discounts
    discount_id: Optional[str] = None  # Optional order-level discount to apply

def create_token(user_id: str, role: str) -> str:
    payload = {
        'user_id': user_id,
        'role': role,
        'exp': datetime.now(timezone.utc) + timedelta(days=7)
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

def verify_token(token: str) -> dict:
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    payload = verify_token(credentials.credentials)
    user = await db.users.find_one({"id": payload['user_id']}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    return user

def generate_qr_code(table_id: str) -> str:
    qr = qrcode.QRCode(version=1, box_size=10, border=5)
    qr_data = f"{os.environ.get('FRONTEND_URL', 'http://localhost:3000')}/table/{table_id}"
    qr.add_data(qr_data)
    qr.make(fit=True)
    img = qr.make_image(fill_color="black", back_color="white")
    buffered = BytesIO()
    img.save(buffered, format="PNG")
    img_str = base64.b64encode(buffered.getvalue()).decode()
    return f"data:image/png;base64,{img_str}"

@api_router.post("/auth/login")
async def login(request: LoginRequest):
    user = await db.users.find_one({"username": request.username}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    stored_password = user.get('password', '')
    if not bcrypt.checkpw(request.password.encode('utf-8'), stored_password.encode('utf-8')):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    # Check if user is active
    if not user.get('is_active', True):
        raise HTTPException(status_code=403, detail="Hesabınız deaktiv edilib")
    
    # Check expiration for admins
    if user.get('expires_at'):
        today = datetime.now(timezone.utc).strftime('%Y-%m-%d')
        if today > user['expires_at']:
            # Auto-deactivate expired admin and their staff
            await db.users.update_one({"id": user['id']}, {"$set": {"is_active": False}})
            await db.users.update_many({"created_by": user['id']}, {"$set": {"is_active": False}})
            raise HTTPException(status_code=403, detail="Hesabınızın müddəti bitib")
    
    # Check if restaurant is active (for non-owners)
    if user.get('restaurant_id'):
        restaurant = await db.restaurants.find_one({"id": user['restaurant_id']}, {"_id": 0})
        if restaurant and not restaurant.get('is_active', True):
            raise HTTPException(status_code=403, detail="Restoran deaktiv edilib")
    
    token = create_token(user['id'], user['role'])
    return {
        "token": token,
        "user": {
            "id": user['id'],
            "username": user['username'],
            "role": user['role'],
            "full_name": user['full_name'],
            "restaurant_id": user.get('restaurant_id')
        }
    }

# ==================== RESTAURANTS ====================

@api_router.post("/restaurants", response_model=Restaurant)
async def create_restaurant(restaurant: RestaurantCreate, current_user: dict = Depends(get_current_user)):
    if current_user['role'] != UserRole.OWNER:
        raise HTTPException(status_code=403, detail="Only owner can create restaurants")
    
    restaurant_obj = Restaurant(
        **restaurant.model_dump(),
        created_by=current_user['id']
    )
    doc = restaurant_obj.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    await db.restaurants.insert_one(doc)
    return restaurant_obj

@api_router.get("/restaurants")
async def get_restaurants(current_user: dict = Depends(get_current_user)):
    if current_user['role'] != UserRole.OWNER:
        raise HTTPException(status_code=403, detail="Only owner can view all restaurants")
    
    restaurants = await db.restaurants.find({"created_by": current_user['id']}, {"_id": 0}).to_list(1000)
    
    # Add admin count and status for each restaurant
    for rest in restaurants:
        admin_count = await db.users.count_documents({"restaurant_id": rest['id'], "role": "admin"})
        staff_count = await db.users.count_documents({"restaurant_id": rest['id'], "role": {"$in": ["kitchen", "waiter"]}})
        rest['admin_count'] = admin_count
        rest['staff_count'] = staff_count
        if isinstance(rest['created_at'], str):
            rest['created_at'] = datetime.fromisoformat(rest['created_at'])
    
    return restaurants

@api_router.get("/restaurants/{restaurant_id}")
async def get_restaurant(restaurant_id: str, current_user: dict = Depends(get_current_user)):
    restaurant = await db.restaurants.find_one({"id": restaurant_id}, {"_id": 0})
    if not restaurant:
        raise HTTPException(status_code=404, detail="Restaurant not found")
    
    # Check access
    if current_user['role'] == UserRole.OWNER:
        if restaurant['created_by'] != current_user['id']:
            raise HTTPException(status_code=403, detail="Not authorized")
    elif current_user['role'] == UserRole.ADMIN:
        if current_user.get('restaurant_id') != restaurant_id:
            raise HTTPException(status_code=403, detail="Not authorized")
    
    return restaurant

@api_router.put("/restaurants/{restaurant_id}")
async def update_restaurant(restaurant_id: str, restaurant: RestaurantCreate, current_user: dict = Depends(get_current_user)):
    if current_user['role'] != UserRole.OWNER:
        raise HTTPException(status_code=403, detail="Only owner can update restaurants")
    
    existing = await db.restaurants.find_one({"id": restaurant_id}, {"_id": 0})
    if not existing:
        raise HTTPException(status_code=404, detail="Restaurant not found")
    
    await db.restaurants.update_one({"id": restaurant_id}, {"$set": restaurant.model_dump()})
    updated = await db.restaurants.find_one({"id": restaurant_id}, {"_id": 0})
    return updated

@api_router.put("/restaurants/{restaurant_id}/toggle-status")
async def toggle_restaurant_status(restaurant_id: str, current_user: dict = Depends(get_current_user)):
    if current_user['role'] != UserRole.OWNER:
        raise HTTPException(status_code=403, detail="Only owner can toggle restaurant status")
    
    restaurant = await db.restaurants.find_one({"id": restaurant_id}, {"_id": 0})
    if not restaurant:
        raise HTTPException(status_code=404, detail="Restaurant not found")
    
    new_status = not restaurant.get('is_active', True)
    await db.restaurants.update_one({"id": restaurant_id}, {"$set": {"is_active": new_status}})
    
    # If deactivating, also deactivate all users of this restaurant
    if not new_status:
        await db.users.update_many({"restaurant_id": restaurant_id}, {"$set": {"is_active": False}})
    
    return {"message": "Restaurant status updated", "is_active": new_status}

# ==================== USERS ====================

@api_router.post("/users", response_model=User)
async def create_user(user: UserCreate, current_user: dict = Depends(get_current_user)):
    if current_user['role'] == UserRole.OWNER:
        if user.role != UserRole.ADMIN:
            raise HTTPException(status_code=403, detail="Owner can only create admins")
        if not user.restaurant_id:
            raise HTTPException(status_code=400, detail="Restaurant ID required for admin")
    elif current_user['role'] == UserRole.ADMIN:
        if user.role not in [UserRole.KITCHEN, UserRole.WAITER]:
            raise HTTPException(status_code=403, detail="Admin can only create kitchen/waiter users")
        user.restaurant_id = current_user.get('restaurant_id')
    else:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    existing = await db.users.find_one({"username": user.username}, {"_id": 0})
    if existing:
        raise HTTPException(status_code=400, detail="Username already exists")
    
    hashed_password = bcrypt.hashpw(user.password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
    
    user_obj = User(
        username=user.username,
        role=user.role,
        full_name=user.full_name,
        restaurant_id=user.restaurant_id,
        admin_pin=user.admin_pin,
        expires_at=user.expires_at,
        created_by=current_user['id']
    )
    
    doc = user_obj.model_dump()
    doc['password'] = hashed_password
    doc['created_at'] = doc['created_at'].isoformat()
    
    await db.users.insert_one(doc)
    return user_obj

@api_router.get("/users", response_model=List[User])
async def get_users(current_user: dict = Depends(get_current_user)):
    if current_user['role'] == UserRole.OWNER:
        # Owner sees admins they created (not other owners or themselves)
        users = await db.users.find({
            "created_by": current_user['id'],
            "role": "admin"
        }, {"_id": 0, "password": 0}).to_list(1000)
    elif current_user['role'] == UserRole.ADMIN:
        # Admin sees staff of their restaurant
        users = await db.users.find({
            "restaurant_id": current_user.get('restaurant_id'),
            "role": {"$in": ["kitchen", "waiter"]}
        }, {"_id": 0, "password": 0}).to_list(1000)
    else:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    for user in users:
        if isinstance(user['created_at'], str):
            user['created_at'] = datetime.fromisoformat(user['created_at'])
    return users

@api_router.get("/users/{user_id}")
async def get_user(user_id: str, current_user: dict = Depends(get_current_user)):
    user = await db.users.find_one({"id": user_id}, {"_id": 0, "password": 0})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user

@api_router.put("/users/{user_id}")
async def update_user(user_id: str, update_data: dict, current_user: dict = Depends(get_current_user)):
    if current_user['role'] not in [UserRole.OWNER, UserRole.ADMIN]:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    user = await db.users.find_one({"id": user_id}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Remove protected fields
    update_data.pop('id', None)
    update_data.pop('password', None)
    update_data.pop('created_at', None)
    
    # If password update requested
    if 'new_password' in update_data:
        update_data['password'] = bcrypt.hashpw(
            update_data.pop('new_password').encode('utf-8'), 
            bcrypt.gensalt()
        ).decode('utf-8')
    
    await db.users.update_one({"id": user_id}, {"$set": update_data})
    updated = await db.users.find_one({"id": user_id}, {"_id": 0, "password": 0})
    return updated

@api_router.put("/users/{user_id}/toggle-status")
async def toggle_user_status(user_id: str, current_user: dict = Depends(get_current_user)):
    if current_user['role'] not in [UserRole.OWNER, UserRole.ADMIN]:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    user = await db.users.find_one({"id": user_id}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    new_status = not user.get('is_active', True)
    await db.users.update_one({"id": user_id}, {"$set": {"is_active": new_status}})
    
    # If deactivating an admin, also deactivate all their staff
    if not new_status and user.get('role') == 'admin':
        await db.users.update_many({"created_by": user_id}, {"$set": {"is_active": False}})
    
    return {"message": "User status updated", "is_active": new_status}

# Waiter points and rest days
@api_router.put("/users/{user_id}/add-points")
async def add_user_points(user_id: str, points: int, current_user: dict = Depends(get_current_user)):
    if current_user['role'] not in [UserRole.OWNER, UserRole.ADMIN]:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    user = await db.users.find_one({"id": user_id}, {"_id": 0})
    if not user or user.get('role') != 'waiter':
        raise HTTPException(status_code=404, detail="Waiter not found")
    
    current_points = user.get('points', 0)
    await db.users.update_one({"id": user_id}, {"$set": {"points": current_points + points}})
    return {"message": "Points added", "new_total": current_points + points}

@api_router.put("/users/{user_id}/rest-days")
async def set_rest_days(user_id: str, rest_days: List[str], current_user: dict = Depends(get_current_user)):
    if current_user['role'] not in [UserRole.OWNER, UserRole.ADMIN]:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    user = await db.users.find_one({"id": user_id}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    await db.users.update_one({"id": user_id}, {"$set": {"rest_days": rest_days}})
    return {"message": "Rest days updated"}

# Staff Analytics
@api_router.get("/analytics/staff-performance")
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

@api_router.post("/venues", response_model=Venue)
async def create_venue(venue: VenueCreate, current_user: dict = Depends(get_current_user)):
    if current_user['role'] != UserRole.OWNER:
        raise HTTPException(status_code=403, detail="Only owner can create venues")
    
    venue_obj = Venue(**venue.model_dump())
    doc = venue_obj.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    await db.venues.insert_one(doc)
    return venue_obj

@api_router.get("/venues", response_model=List[Venue])
async def get_venues():
    venues = await db.venues.find({}, {"_id": 0}).to_list(1000)
    for venue in venues:
        if isinstance(venue['created_at'], str):
            venue['created_at'] = datetime.fromisoformat(venue['created_at'])
    return venues

@api_router.put("/venues/{venue_id}", response_model=Venue)
async def update_venue(venue_id: str, venue: VenueCreate, current_user: dict = Depends(get_current_user)):
    if current_user['role'] != UserRole.OWNER:
        raise HTTPException(status_code=403, detail="Only owner can update venues")
    
    existing = await db.venues.find_one({"id": venue_id}, {"_id": 0})
    if not existing:
        raise HTTPException(status_code=404, detail="Venue not found")
    
    await db.venues.update_one({"id": venue_id}, {"$set": venue.model_dump()})
    updated = await db.venues.find_one({"id": venue_id}, {"_id": 0})
    if isinstance(updated['created_at'], str):
        updated['created_at'] = datetime.fromisoformat(updated['created_at'])
    return Venue(**updated)

@api_router.delete("/venues/{venue_id}")
async def delete_venue(venue_id: str, current_user: dict = Depends(get_current_user)):
    if current_user['role'] != UserRole.OWNER:
        raise HTTPException(status_code=403, detail="Only owner can delete venues")
    
    result = await db.venues.delete_one({"id": venue_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Venue not found")
    return {"message": "Venue deleted"}

@api_router.post("/tables", response_model=Table)
async def create_table(table: TableCreate, current_user: dict = Depends(get_current_user)):
    if current_user['role'] != UserRole.OWNER:
        raise HTTPException(status_code=403, detail="Only owner can create tables")
    
    table_id = str(uuid.uuid4())
    qr_code = generate_qr_code(table_id)
    
    table_obj = Table(
        id=table_id,
        table_number=table.table_number,
        venue_id=table.venue_id,
        qr_code=qr_code
    )
    
    doc = table_obj.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    await db.tables.insert_one(doc)
    return table_obj

@api_router.get("/tables", response_model=List[Table])
async def get_tables(venue_id: Optional[str] = None):
    query = {}
    if venue_id:
        query["venue_id"] = venue_id
    
    tables = await db.tables.find(query, {"_id": 0}).to_list(1000)
    for table in tables:
        if isinstance(table['created_at'], str):
            table['created_at'] = datetime.fromisoformat(table['created_at'])
    return tables

@api_router.delete("/tables/{table_id}")
async def delete_table(table_id: str, current_user: dict = Depends(get_current_user)):
    if current_user['role'] != UserRole.OWNER:
        raise HTTPException(status_code=403, detail="Only owner can delete tables")
    
    result = await db.tables.delete_one({"id": table_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Table not found")
    return {"message": "Table deleted"}

@api_router.post("/sessions/start/{table_id}")
async def start_session(table_id: str):
    table = await db.tables.find_one({"id": table_id}, {"_id": 0})
    if not table:
        raise HTTPException(status_code=404, detail="Table not found")
    
    active_session = await db.table_sessions.find_one({
        "table_id": table_id,
        "is_active": True
    }, {"_id": 0})
    
    if active_session:
        if isinstance(active_session['started_at'], str):
            active_session['started_at'] = datetime.fromisoformat(active_session['started_at'])
        return {
            "session": active_session,
            "table": table
        }
    
    session_token = str(uuid.uuid4())
    session = TableSession(
        table_id=table_id,
        session_token=session_token
    )
    
    doc = session.model_dump()
    doc['started_at'] = doc['started_at'].isoformat()
    await db.table_sessions.insert_one(doc)
    
    return {
        "session": session,
        "table": table
    }

@api_router.get("/sessions/active")
async def get_active_sessions():
    sessions = await db.table_sessions.find({"is_active": True}, {"_id": 0}).to_list(1000)
    
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

@api_router.post("/sessions/close/{session_id}")
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
    total_amount = sum(o.get('total_amount', 0) for o in orders)
    
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
            "total_amount": round(total_amount, 2),
            "discounts_applied": discounts_applied,
            "closed_at": datetime.now(timezone.utc).isoformat()
        }
    }

@api_router.post("/sessions/continue/{session_id}")
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

@api_router.post("/categories", response_model=Category)
async def create_category(category: CategoryCreate, current_user: dict = Depends(get_current_user)):
    if current_user['role'] not in [UserRole.OWNER, UserRole.ADMIN]:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    category_obj = Category(**category.model_dump())
    doc = category_obj.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    await db.categories.insert_one(doc)
    return category_obj

@api_router.get("/categories", response_model=List[Category])
async def get_categories():
    categories = await db.categories.find({}, {"_id": 0}).sort("display_order", 1).to_list(1000)
    for cat in categories:
        if isinstance(cat['created_at'], str):
            cat['created_at'] = datetime.fromisoformat(cat['created_at'])
    return categories

@api_router.put("/categories/{category_id}", response_model=Category)
async def update_category(category_id: str, category: CategoryCreate, current_user: dict = Depends(get_current_user)):
    if current_user['role'] not in [UserRole.OWNER, UserRole.ADMIN]:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    result = await db.categories.find_one({"id": category_id}, {"_id": 0})
    if not result:
        raise HTTPException(status_code=404, detail="Category not found")
    
    await db.categories.update_one({"id": category_id}, {"$set": category.model_dump()})
    updated = await db.categories.find_one({"id": category_id}, {"_id": 0})
    if isinstance(updated['created_at'], str):
        updated['created_at'] = datetime.fromisoformat(updated['created_at'])
    return Category(**updated)

@api_router.delete("/categories/{category_id}")
async def delete_category(category_id: str, current_user: dict = Depends(get_current_user)):
    if current_user['role'] not in [UserRole.OWNER, UserRole.ADMIN]:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    result = await db.categories.delete_one({"id": category_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Category not found")
    return {"message": "Category deleted"}

@api_router.post("/menu-items", response_model=MenuItem)
async def create_menu_item(item: MenuItemCreate, current_user: dict = Depends(get_current_user)):
    if current_user['role'] not in [UserRole.OWNER, UserRole.ADMIN]:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    item_obj = MenuItem(**item.model_dump())
    doc = item_obj.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    await db.menu_items.insert_one(doc)
    return item_obj

@api_router.get("/menu-items", response_model=List[MenuItem])
async def get_menu_items(category_id: Optional[str] = None):
    query = {}
    if category_id:
        query["category_id"] = category_id
    
    items = await db.menu_items.find(query, {"_id": 0}).to_list(1000)
    for item in items:
        if isinstance(item['created_at'], str):
            item['created_at'] = datetime.fromisoformat(item['created_at'])
    return items

@api_router.put("/menu-items/{item_id}", response_model=MenuItem)
async def update_menu_item(item_id: str, item: MenuItemCreate, current_user: dict = Depends(get_current_user)):
    if current_user['role'] not in [UserRole.OWNER, UserRole.ADMIN]:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    result = await db.menu_items.find_one({"id": item_id}, {"_id": 0})
    if not result:
        raise HTTPException(status_code=404, detail="Menu item not found")
    
    await db.menu_items.update_one({"id": item_id}, {"$set": item.model_dump()})
    updated = await db.menu_items.find_one({"id": item_id}, {"_id": 0})
    if isinstance(updated['created_at'], str):
        updated['created_at'] = datetime.fromisoformat(updated['created_at'])
    return MenuItem(**updated)

@api_router.delete("/menu-items/{item_id}")
async def delete_menu_item(item_id: str, current_user: dict = Depends(get_current_user)):
    if current_user['role'] not in [UserRole.OWNER, UserRole.ADMIN]:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    result = await db.menu_items.delete_one({"id": item_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Menu item not found")
    return {"message": "Menu item deleted"}

@api_router.post("/orders", response_model=Order)
async def create_order(order: OrderCreate):
    session = await db.table_sessions.find_one({"session_token": order.session_token}, {"_id": 0})
    if not session or not session.get('is_active'):
        raise HTTPException(status_code=400, detail="Invalid or inactive session")
    
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
    
    # Find applicable active discount
    today = datetime.now(timezone.utc).strftime('%Y-%m-%d')
    active_discounts = await db.discounts.find({
        "is_active": True,
        "$or": [
            {"valid_until": None},
            {"valid_until": {"$gte": today}},
            {"valid_until": ""}
        ]
    }, {"_id": 0}).to_list(100)
    
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
        total_amount=round(total_amount, 2)
    )
    
    doc = order_obj.model_dump()
    doc['ordered_at'] = doc['ordered_at'].isoformat()
    await db.orders.insert_one(doc)
    
    # Get table info for notification
    table = await db.tables.find_one({"id": session['table_id']}, {"_id": 0})
    
    # Send WebSocket notification to kitchen
    await notify_order_update({
        "order": doc,
        "table": table
    }, "new_order")
    
    return order_obj

@api_router.get("/orders/session/{session_token}")
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

@api_router.get("/orders/kitchen")
async def get_kitchen_orders(current_user: dict = Depends(get_current_user)):
    if current_user['role'] not in [UserRole.KITCHEN, UserRole.ADMIN, UserRole.OWNER]:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    orders = await db.orders.find({
        "status": {"$in": [OrderStatus.PENDING, OrderStatus.PREPARING]}
    }, {"_id": 0}).sort("ordered_at", 1).to_list(1000)
    
    result = []
    for order in orders:
        for field in ['ordered_at', 'preparing_started_at']:
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

@api_router.put("/orders/{order_id}/status")
async def update_order_status(order_id: str, status: OrderStatus, current_user: dict = Depends(get_current_user)):
    order = await db.orders.find_one({"id": order_id}, {"_id": 0})
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    update_data = {"status": status}
    
    if status == OrderStatus.PREPARING and current_user['role'] == UserRole.KITCHEN:
        update_data['preparing_started_at'] = datetime.now(timezone.utc).isoformat()
    elif status == OrderStatus.READY and current_user['role'] == UserRole.KITCHEN:
        update_data['ready_at'] = datetime.now(timezone.utc).isoformat()
    elif status == OrderStatus.DELIVERED and current_user['role'] == UserRole.WAITER:
        update_data['delivered_at'] = datetime.now(timezone.utc).isoformat()
        update_data['waiter_id'] = current_user['id']
    
    await db.orders.update_one({"id": order_id}, {"$set": update_data})
    
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
@api_router.delete("/orders/{order_id}")
async def delete_order(order_id: str, current_user: dict = Depends(get_current_user)):
    if current_user['role'] not in [UserRole.ADMIN, UserRole.OWNER]:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    order = await db.orders.find_one({"id": order_id}, {"_id": 0})
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    result = await db.orders.delete_one({"id": order_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Order not found")
    
    return {"message": "Order deleted"}


# Update order items
class OrderUpdate(BaseModel):
    items: List[dict]
    total_amount: float

@api_router.put("/orders/{order_id}")
async def update_order(order_id: str, order_update: OrderUpdate, current_user: dict = Depends(get_current_user)):
    if current_user['role'] not in [UserRole.ADMIN, UserRole.OWNER]:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    order = await db.orders.find_one({"id": order_id}, {"_id": 0})
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    await db.orders.update_one(
        {"id": order_id},
        {"$set": {
            "items": order_update.items,
            "total_amount": order_update.total_amount
        }}
    )
    
    return {"message": "Order updated"}


@api_router.get("/orders/waiter")
async def get_waiter_orders(current_user: dict = Depends(get_current_user)):
    if current_user['role'] not in [UserRole.WAITER, UserRole.ADMIN, UserRole.OWNER]:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    orders = await db.orders.find({
        "status": OrderStatus.READY
    }, {"_id": 0}).sort("ready_at", 1).to_list(1000)
    
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

@api_router.get("/analytics/detailed")
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

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
@api_router.get("/settings")
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
            "admin_pin": ""  # PIN for admin protected sections
        }
        await db.settings.insert_one({**default_settings})
        return default_settings
    return settings

@api_router.put("/settings")
async def update_settings(settings: dict, current_user: dict = Depends(get_current_user)):
    if current_user['role'] not in [UserRole.OWNER, UserRole.ADMIN]:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    settings["id"] = "settings"
    await db.settings.update_one({"id": "settings"}, {"$set": settings}, upsert=True)
    return settings

# Verify Admin PIN
@api_router.post("/verify-admin-pin")
async def verify_admin_pin(data: dict, current_user: dict = Depends(get_current_user)):
    if current_user['role'] != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    settings = await db.settings.find_one({"id": "settings"}, {"_id": 0})
    if not settings or not settings.get('admin_pin'):
        return {"valid": True, "message": "No PIN set"}
    
    if data.get('pin') == settings.get('admin_pin'):
        return {"valid": True}
    else:
        raise HTTPException(status_code=401, detail="Invalid PIN")

@api_router.get("/analytics/popular-items")
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

@api_router.get("/sessions/history")
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

@api_router.post("/reservations")
async def create_reservation(reservation: ReservationCreate):
    reservation_obj = TableReservation(**reservation.model_dump())
    doc = reservation_obj.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    await db.reservations.insert_one(doc)
    return reservation_obj

@api_router.get("/reservations")
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

@api_router.put("/reservations/{reservation_id}/status")
async def update_reservation_status(reservation_id: str, status: str, current_user: dict = Depends(get_current_user)):
    if current_user['role'] not in [UserRole.ADMIN, UserRole.OWNER]:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    await db.reservations.update_one({"id": reservation_id}, {"$set": {"status": status}})
    return {"message": "Reservation status updated"}

@api_router.delete("/reservations/{reservation_id}")
async def delete_reservation(reservation_id: str, current_user: dict = Depends(get_current_user)):
    if current_user['role'] not in [UserRole.ADMIN, UserRole.OWNER]:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    result = await db.reservations.delete_one({"id": reservation_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Reservation not found")
    return {"message": "Reservation deleted"}

@api_router.get("/tables/available")
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

@api_router.post("/menus", response_model=Menu)
async def create_menu(menu: MenuCreate, current_user: dict = Depends(get_current_user)):
    if current_user['role'] not in [UserRole.OWNER, UserRole.ADMIN]:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    menu_obj = Menu(**menu.model_dump())
    doc = menu_obj.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    await db.menus.insert_one(doc)
    return menu_obj

@api_router.get("/menus", response_model=List[Menu])
async def get_menus():
    menus = await db.menus.find({}, {"_id": 0}).sort("display_order", 1).to_list(1000)
    for menu in menus:
        if isinstance(menu['created_at'], str):
            menu['created_at'] = datetime.fromisoformat(menu['created_at'])
    return menus

@api_router.put("/menus/{menu_id}", response_model=Menu)
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

@api_router.delete("/menus/{menu_id}")
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

@api_router.post("/expenses", response_model=Expense)
async def create_expense(expense: ExpenseCreate, current_user: dict = Depends(get_current_user)):
    if current_user['role'] not in [UserRole.ADMIN, UserRole.OWNER]:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    expense_obj = Expense(**expense.model_dump(), created_by=current_user['id'])
    doc = expense_obj.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    await db.expenses.insert_one(doc)
    return expense_obj

@api_router.get("/expenses", response_model=List[Expense])
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

@api_router.put("/expenses/{expense_id}", response_model=Expense)
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

@api_router.delete("/expenses/{expense_id}")
async def delete_expense(expense_id: str, current_user: dict = Depends(get_current_user)):
    if current_user['role'] not in [UserRole.ADMIN, UserRole.OWNER]:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    result = await db.expenses.delete_one({"id": expense_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Expense not found")
    return {"message": "Expense deleted"}

@api_router.get("/analytics/financial")
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
@api_router.get("/sessions/{session_id}/details")
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
@api_router.get("/analytics/sales-by-item")
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


# WebSocket Connection Manager
class ConnectionManager:
    def __init__(self):
        self.active_connections: Dict[str, List[WebSocket]] = {
            "kitchen": [],
            "waiter": [],
            "admin": [],
            "customer": []
        }
    
    async def connect(self, websocket: WebSocket, role: str):
        await websocket.accept()
        if role not in self.active_connections:
            self.active_connections[role] = []
        self.active_connections[role].append(websocket)
    
    def disconnect(self, websocket: WebSocket, role: str):
        if role in self.active_connections and websocket in self.active_connections[role]:
            self.active_connections[role].remove(websocket)
    
    async def broadcast_to_role(self, message: dict, role: str):
        if role in self.active_connections:
            for connection in self.active_connections[role]:
                try:
                    await connection.send_json(message)
                except:
                    pass
    
    async def broadcast_to_all(self, message: dict):
        for role in self.active_connections:
            await self.broadcast_to_role(message, role)

manager = ConnectionManager()

@app.websocket("/ws/{role}")
async def websocket_endpoint(websocket: WebSocket, role: str):
    await manager.connect(websocket, role)
    try:
        while True:
            data = await websocket.receive_text()
            # Keep connection alive with ping-pong
            if data == "ping":
                await websocket.send_text("pong")
    except WebSocketDisconnect:
        manager.disconnect(websocket, role)

# Helper function to notify relevant roles
async def notify_order_update(order_data: dict, event_type: str):
    message = {
        "type": event_type,
        "data": order_data,
        "timestamp": datetime.now(timezone.utc).isoformat()
    }
    # Notify kitchen for new orders
    if event_type in ["new_order", "order_update"]:
        await manager.broadcast_to_role(message, "kitchen")
    # Notify waiters for ready orders
    if event_type in ["order_ready", "order_update"]:
        await manager.broadcast_to_role(message, "waiter")
    # Notify admin about all order events
    await manager.broadcast_to_role(message, "admin")


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

@api_router.post("/discounts", response_model=Discount)
async def create_discount(discount: DiscountCreate, current_user: dict = Depends(get_current_user)):
    if current_user['role'] not in [UserRole.OWNER, UserRole.ADMIN]:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    discount_obj = Discount(**discount.model_dump())
    doc = discount_obj.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    await db.discounts.insert_one(doc)
    return discount_obj

@api_router.get("/discounts", response_model=List[Discount])
async def get_discounts():
    discounts = await db.discounts.find({}, {"_id": 0}).to_list(1000)
    for disc in discounts:
        if isinstance(disc['created_at'], str):
            disc['created_at'] = datetime.fromisoformat(disc['created_at'])
    return discounts

@api_router.get("/discounts/active", response_model=List[Discount])
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

@api_router.put("/discounts/{discount_id}", response_model=Discount)
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

@api_router.put("/discounts/{discount_id}/toggle")
async def toggle_discount(discount_id: str, current_user: dict = Depends(get_current_user)):
    if current_user['role'] not in [UserRole.OWNER, UserRole.ADMIN]:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    discount = await db.discounts.find_one({"id": discount_id}, {"_id": 0})
    if not discount:
        raise HTTPException(status_code=404, detail="Discount not found")
    
    new_status = not discount.get('is_active', True)
    await db.discounts.update_one({"id": discount_id}, {"$set": {"is_active": new_status}})
    return {"message": "Discount toggled", "is_active": new_status}

@api_router.delete("/discounts/{discount_id}")
async def delete_discount(discount_id: str, current_user: dict = Depends(get_current_user)):
    if current_user['role'] not in [UserRole.OWNER, UserRole.ADMIN]:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    result = await db.discounts.delete_one({"id": discount_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Discount not found")
    return {"message": "Discount deleted"}


# Include router at the end after all routes are defined
app.include_router(api_router)
