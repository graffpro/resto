"""Authentication & User management routes"""
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime, timezone
import uuid
import bcrypt
from database import db
from auth import create_token, get_current_user
from models import UserRole, User, UserCreate, LoginRequest
from routes.shared import sanitize_input

router = APIRouter()

class RegisterRequest(BaseModel):
    restaurant_name: str
    owner_name: str
    username: str
    password: str
    phone: Optional[str] = None

@router.post("/auth/login")
async def login(request: LoginRequest):
    user = await db.users.find_one({"username": request.username}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    stored_password = user.get('password', '')
    if not bcrypt.checkpw(request.password.encode('utf-8'), stored_password.encode('utf-8')):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    if not user.get('is_active', True):
        raise HTTPException(status_code=403, detail="Hesabınız deaktiv edilib")
    if user.get('expires_at'):
        today = datetime.now(timezone.utc).strftime('%Y-%m-%d')
        if today > user['expires_at']:
            await db.users.update_one({"id": user['id']}, {"$set": {"is_active": False}})
            await db.users.update_many({"created_by": user['id']}, {"$set": {"is_active": False}})
            raise HTTPException(status_code=403, detail="Hesabınızın müddəti bitib")
    if user.get('restaurant_id'):
        restaurant = await db.restaurants.find_one({"id": user['restaurant_id']}, {"_id": 0})
        if restaurant and not restaurant.get('is_active', True):
            raise HTTPException(status_code=403, detail="Restoran deaktiv edilib")
    token = create_token(user['id'], user['role'])
    return {"token": token, "user": {"id": user['id'], "username": user['username'], "role": user['role'], "full_name": user['full_name'], "restaurant_id": user.get('restaurant_id')}}

@router.post("/auth/register")
async def register(request: RegisterRequest):
    existing = await db.users.find_one({"username": request.username})
    if existing:
        raise HTTPException(status_code=400, detail="Bu istifadəçi adı artıq mövcuddur")
    user_id = str(uuid.uuid4())
    hashed_pw = bcrypt.hashpw(request.password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
    user_doc = {"id": user_id, "username": request.username, "password": hashed_pw, "full_name": request.owner_name, "role": "admin", "is_active": True, "phone": request.phone, "created_at": datetime.now(timezone.utc).isoformat()}
    restaurant_id = str(uuid.uuid4())
    restaurant_doc = {"id": restaurant_id, "name": request.restaurant_name, "is_active": True, "created_by": user_id, "created_at": datetime.now(timezone.utc).isoformat()}
    user_doc["restaurant_id"] = restaurant_id
    await db.users.insert_one(user_doc)
    await db.restaurants.insert_one(restaurant_doc)
    token = create_token(user_id, "admin")
    return {"token": token, "user": {"id": user_id, "username": request.username, "role": "admin", "full_name": request.owner_name, "restaurant_id": restaurant_id}, "restaurant": {"id": restaurant_id, "name": request.restaurant_name}}

@router.post("/users", response_model=User)
async def create_user(user: UserCreate, current_user: dict = Depends(get_current_user)):
    if current_user['role'] == UserRole.OWNER:
        pass
    elif current_user['role'] == UserRole.ADMIN:
        if user.role not in [UserRole.KITCHEN, UserRole.WAITER, UserRole.BAR]:
            raise HTTPException(status_code=403, detail="Admin can only create kitchen/waiter/bar users")
        user.restaurant_id = current_user.get('restaurant_id')
    else:
        raise HTTPException(status_code=403, detail="Not authorized")
    existing = await db.users.find_one({"username": user.username})
    if existing:
        raise HTTPException(status_code=400, detail="Username already exists")
    hashed = bcrypt.hashpw(user.password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
    user_obj = User(**{k: v for k, v in user.model_dump().items() if k != 'password'}, created_by=current_user['id'])
    doc = user_obj.model_dump()
    doc['password'] = hashed
    doc['created_at'] = doc['created_at'].isoformat()
    await db.users.insert_one(doc)
    return user_obj

@router.get("/users", response_model=List[User])
async def get_users(current_user: dict = Depends(get_current_user)):
    if current_user['role'] == UserRole.OWNER:
        users = await db.users.find({"role": {"$ne": "owner"}}, {"_id": 0, "password": 0}).to_list(1000)
    elif current_user['role'] == UserRole.ADMIN:
        users = await db.users.find({"role": {"$in": ["kitchen", "waiter", "bar"]}, "restaurant_id": current_user.get('restaurant_id')}, {"_id": 0, "password": 0}).to_list(1000)
    else:
        raise HTTPException(status_code=403, detail="Not authorized")
    return users

@router.get("/users/{user_id}")
async def get_user(user_id: str, current_user: dict = Depends(get_current_user)):
    user = await db.users.find_one({"id": user_id}, {"_id": 0, "password": 0})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user

@router.put("/users/{user_id}")
async def update_user(user_id: str, user_data: dict, current_user: dict = Depends(get_current_user)):
    if current_user['role'] not in [UserRole.OWNER, UserRole.ADMIN]:
        raise HTTPException(status_code=403, detail="Not authorized")
    existing = await db.users.find_one({"id": user_id}, {"_id": 0})
    if not existing:
        raise HTTPException(status_code=404, detail="User not found")
    update = {}
    for field in ['full_name', 'admin_pin', 'expires_at', 'restaurant_id', 'role']:
        if field in user_data:
            update[field] = user_data[field]
    if 'password' in user_data and user_data['password']:
        update['password'] = bcrypt.hashpw(user_data['password'].encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
    if update:
        await db.users.update_one({"id": user_id}, {"$set": update})
    updated = await db.users.find_one({"id": user_id}, {"_id": 0, "password": 0})
    return updated

@router.put("/users/{user_id}/toggle-status")
async def toggle_user_status(user_id: str, current_user: dict = Depends(get_current_user)):
    if current_user['role'] not in [UserRole.OWNER, UserRole.ADMIN]:
        raise HTTPException(status_code=403, detail="Not authorized")
    user = await db.users.find_one({"id": user_id}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    new_status = not user.get('is_active', True)
    await db.users.update_one({"id": user_id}, {"$set": {"is_active": new_status}})
    return {"message": "User status updated", "is_active": new_status}

@router.delete("/users/{user_id}")
async def delete_user(user_id: str, current_user: dict = Depends(get_current_user)):
    if current_user['role'] not in [UserRole.OWNER, UserRole.ADMIN]:
        raise HTTPException(status_code=403, detail="Not authorized")
    user = await db.users.find_one({"id": user_id}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if user['role'] == UserRole.OWNER:
        raise HTTPException(status_code=403, detail="Cannot delete owner")
    await db.users.delete_one({"id": user_id})
    return {"message": "User deleted"}

@router.put("/users/{user_id}/add-points")
async def add_user_points(user_id: str, data: dict, current_user: dict = Depends(get_current_user)):
    if current_user['role'] not in [UserRole.OWNER, UserRole.ADMIN]:
        raise HTTPException(status_code=403, detail="Not authorized")
    points = data.get('points', 0)
    await db.users.update_one({"id": user_id}, {"$inc": {"points": points}})
    return {"message": "Points added"}

@router.put("/users/{user_id}/rest-days")
async def update_rest_days(user_id: str, data: dict, current_user: dict = Depends(get_current_user)):
    if current_user['role'] not in [UserRole.OWNER, UserRole.ADMIN]:
        raise HTTPException(status_code=403, detail="Not authorized")
    rest_days = data.get('rest_days', [])
    await db.users.update_one({"id": user_id}, {"$set": {"rest_days": rest_days}})
    return {"message": "Rest days updated"}

@router.post("/shifts")
async def create_shift(shift_data: dict, current_user: dict = Depends(get_current_user)):
    if current_user['role'] not in [UserRole.OWNER, UserRole.ADMIN]:
        raise HTTPException(status_code=403, detail="Not authorized")
    doc = {"id": str(uuid.uuid4()), "user_id": shift_data['user_id'], "date": shift_data['date'], "start_time": shift_data.get('start_time', ''), "end_time": shift_data.get('end_time', ''), "notes": shift_data.get('notes', ''), "created_at": datetime.now(timezone.utc).isoformat(), "created_by": current_user['id']}
    await db.shifts.insert_one(doc)
    return doc

@router.get("/shifts")
async def get_shifts(current_user: dict = Depends(get_current_user)):
    if current_user['role'] not in [UserRole.OWNER, UserRole.ADMIN]:
        raise HTTPException(status_code=403, detail="Not authorized")
    shifts = await db.shifts.find({}, {"_id": 0}).sort("date", -1).to_list(1000)
    for s in shifts:
        user = await db.users.find_one({"id": s['user_id']}, {"_id": 0, "password": 0})
        s['user'] = user
    return shifts

@router.delete("/shifts/{shift_id}")
async def delete_shift(shift_id: str, current_user: dict = Depends(get_current_user)):
    if current_user['role'] not in [UserRole.OWNER, UserRole.ADMIN]:
        raise HTTPException(status_code=403, detail="Not authorized")
    await db.shifts.delete_one({"id": shift_id})
    return {"message": "Shift deleted"}

@router.post("/points")
async def add_points_history(data: dict, current_user: dict = Depends(get_current_user)):
    if current_user['role'] not in [UserRole.OWNER, UserRole.ADMIN]:
        raise HTTPException(status_code=403, detail="Not authorized")
    doc = {"id": str(uuid.uuid4()), "user_id": data['user_id'], "points": data['points'], "reason": data.get('reason', ''), "created_at": datetime.now(timezone.utc).isoformat(), "created_by": current_user['id']}
    await db.points_history.insert_one(doc)
    await db.users.update_one({"id": data['user_id']}, {"$inc": {"points": data['points']}})
    return doc

@router.get("/points/{user_id}")
async def get_points_history(user_id: str, current_user: dict = Depends(get_current_user)):
    history = await db.points_history.find({"user_id": user_id}, {"_id": 0}).sort("created_at", -1).to_list(100)
    return history
