from fastapi import FastAPI, APIRouter, HTTPException, Depends, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional
import uuid
from datetime import datetime, timezone, timedelta
from enum import Enum
import jwt
import bcrypt
import qrcode
from io import BytesIO
import base64

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

class User(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    username: str
    role: UserRole
    full_name: str
    created_by: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class UserCreate(BaseModel):
    username: str
    password: str
    role: UserRole
    full_name: str

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
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class CategoryCreate(BaseModel):
    name: str
    description: Optional[str] = None
    display_order: int = 0

class MenuItem(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    description: str
    price: float
    category_id: str
    image_url: Optional[str] = None
    is_available: bool = True
    preparation_time: int = 15
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class MenuItemCreate(BaseModel):
    name: str
    description: str
    price: float
    category_id: str
    image_url: Optional[str] = None
    is_available: bool = True
    preparation_time: int = 15

class OrderItem(BaseModel):
    menu_item_id: str
    name: str
    price: float
    quantity: int

class Order(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    order_number: str
    session_id: str
    table_id: str
    items: List[OrderItem]
    total_amount: float
    status: OrderStatus = OrderStatus.PENDING
    ordered_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    preparing_started_at: Optional[datetime] = None
    ready_at: Optional[datetime] = None
    delivered_at: Optional[datetime] = None
    waiter_id: Optional[str] = None

class OrderCreate(BaseModel):
    session_token: str
    items: List[OrderItem]
    total_amount: float

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
    
    token = create_token(user['id'], user['role'])
    return {
        "token": token,
        "user": {
            "id": user['id'],
            "username": user['username'],
            "role": user['role'],
            "full_name": user['full_name']
        }
    }

@api_router.post("/users", response_model=User)
async def create_user(user: UserCreate, current_user: dict = Depends(get_current_user)):
    if current_user['role'] == UserRole.OWNER:
        if user.role not in [UserRole.ADMIN]:
            raise HTTPException(status_code=403, detail="Owner can only create admins")
    elif current_user['role'] == UserRole.ADMIN:
        if user.role not in [UserRole.KITCHEN, UserRole.WAITER]:
            raise HTTPException(status_code=403, detail="Admin can only create kitchen/waiter users")
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
        created_by=current_user['id']
    )
    
    doc = user_obj.model_dump()
    doc['password'] = hashed_password
    doc['created_at'] = doc['created_at'].isoformat()
    
    await db.users.insert_one(doc)
    return user_obj

@api_router.get("/users", response_model=List[User])
async def get_users(current_user: dict = Depends(get_current_user)):
    if current_user['role'] not in [UserRole.OWNER, UserRole.ADMIN]:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    users = await db.users.find({}, {"_id": 0, "password": 0}).to_list(1000)
    for user in users:
        if isinstance(user['created_at'], str):
            user['created_at'] = datetime.fromisoformat(user['created_at'])
    return users

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
    
    result = []
    for session in sessions:
        if isinstance(session['started_at'], str):
            session['started_at'] = datetime.fromisoformat(session['started_at'])
        
        table = await db.tables.find_one({"id": session['table_id']}, {"_id": 0})
        venue = await db.venues.find_one({"id": table['venue_id']}, {"_id": 0}) if table else None
        
        orders = await db.orders.find({
            "session_id": session['id'],
            "status": {"$ne": OrderStatus.COMPLETED}
        }, {"_id": 0}).to_list(1000)
        
        result.append({
            "session": session,
            "table": table,
            "venue": venue,
            "active_orders": len(orders)
        })
    
    return result

@api_router.post("/sessions/close/{session_id}")
async def close_session(session_id: str, current_user: dict = Depends(get_current_user)):
    if current_user['role'] not in [UserRole.ADMIN, UserRole.OWNER]:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    session = await db.table_sessions.find_one({"id": session_id}, {"_id": 0})
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    
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
    
    return {"message": "Session closed"}

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
    
    order_obj = Order(
        order_number=order_number,
        session_id=session['id'],
        table_id=session['table_id'],
        items=order.items,
        total_amount=order.total_amount
    )
    
    doc = order_obj.model_dump()
    doc['ordered_at'] = doc['ordered_at'].isoformat()
    await db.orders.insert_one(doc)
    
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
    
    return {"message": "Order status updated"}

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
    
    detailed_data = []
    for session in all_sessions:
        if isinstance(session.get('started_at'), str):
            session['started_at'] = datetime.fromisoformat(session['started_at'])
        if session.get('ended_at') and isinstance(session['ended_at'], str):
            session['ended_at'] = datetime.fromisoformat(session['ended_at'])
        
        table = await db.tables.find_one({"id": session['table_id']}, {"_id": 0})
        venue = await db.venues.find_one({"id": table['venue_id']}, {"_id": 0}) if table else None
        
        orders = await db.orders.find({"session_id": session['id']}, {"_id": 0}).to_list(1000)
        
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
            
            waiter = None
            if order.get('waiter_id'):
                waiter = await db.users.find_one({"id": order['waiter_id']}, {"_id": 0, "password": 0})
            
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

app.include_router(api_router)

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