from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional
from enum import Enum
from datetime import datetime, timezone
import uuid


class UserRole(str, Enum):
    OWNER = "owner"
    ADMIN = "admin"
    KITCHEN = "kitchen"
    WAITER = "waiter"
    BAR = "bar"

class OrderStatus(str, Enum):
    PENDING = "pending"
    PREPARING = "preparing"
    READY = "ready"
    DELIVERED = "delivered"
    COMPLETED = "completed"

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
    created_by: str
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
    restaurant_id: Optional[str] = None
    admin_pin: Optional[str] = None
    is_active: bool = True
    expires_at: Optional[str] = None
    created_by: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    rest_days: List[str] = []
    points: int = 0

class UserCreate(BaseModel):
    username: str
    password: str
    role: UserRole
    full_name: str
    restaurant_id: Optional[str] = None
    admin_pin: Optional[str] = None
    expires_at: Optional[str] = None

class LoginRequest(BaseModel):
    username: str
    password: str

class Venue(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    description: Optional[str] = None
    is_active: bool = True
    restaurant_id: Optional[str] = None
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
    restaurant_id: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class TableCreate(BaseModel):
    table_number: str
    venue_id: str

class TableSession(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    table_id: str
    session_token: str
    restaurant_id: Optional[str] = None
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
    restaurant_id: Optional[str] = None
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
    discount_percentage: float = 0
    is_available: bool = True
    preparation_time: int = 15
    target_station: str = "kitchen"
    restaurant_id: Optional[str] = None
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
    target_station: str = "kitchen"

class OrderItem(BaseModel):
    menu_item_id: str
    name: str
    price: float
    quantity: int
    discount_percentage: float = 0
    discounted_price: Optional[float] = None
    target_station: str = "kitchen"

class Order(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    order_number: str
    session_id: str
    table_id: str
    items: List[OrderItem]
    subtotal: float = 0
    discount_id: Optional[str] = None
    discount_name: Optional[str] = None
    discount_type: Optional[str] = None
    discount_value: float = 0
    discount_amount: float = 0
    service_charge_percentage: float = 0
    service_charge_amount: float = 0
    total_amount: float
    status: OrderStatus = OrderStatus.PENDING
    restaurant_id: Optional[str] = None
    ordered_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    preparing_started_at: Optional[datetime] = None
    ready_at: Optional[datetime] = None
    delivered_at: Optional[datetime] = None
    waiter_id: Optional[str] = None

class OrderCreate(BaseModel):
    session_token: str
    items: List[OrderItem]
    subtotal: float = 0
    total_amount: float = 0
    discount_id: Optional[str] = None

class ShiftLogCreate(BaseModel):
    user_id: str
    shift_type: str
    date: str
    notes: Optional[str] = None

class PointsAction(BaseModel):
    user_id: str
    points: int
    reason: str

class IngredientCreate(BaseModel):
    name: str
    unit: str
    current_stock: float = 0
    min_stock_level: float = 0

class StockTransactionCreate(BaseModel):
    ingredient_id: str
    type: str
    quantity: float
    cost: float = 0
    notes: Optional[str] = None

class RecipeCreate(BaseModel):
    menu_item_id: str
    ingredients: List[dict]

class TimedServiceCreate(BaseModel):
    table_id: str
    session_id: str
    menu_item_id: str
    interval_minutes: int = 45
    notes: Optional[str] = None

class TableTransferRequest(BaseModel):
    session_id: str
    new_table_id: str
