"""Restaurants routes"""
from fastapi import APIRouter, HTTPException, Depends
from typing import List
from datetime import datetime, timezone
import uuid
from database import db
from auth import get_current_user
from models import UserRole, Restaurant, RestaurantCreate

router = APIRouter()

# ==================== RESTAURANTS ====================

@router.post("/restaurants", response_model=Restaurant)
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

@router.get("/restaurants")
async def get_restaurants(current_user: dict = Depends(get_current_user)):
    if current_user['role'] != UserRole.OWNER:
        raise HTTPException(status_code=403, detail="Only owner can view all restaurants")
    
    # Owner sees ALL restaurants (not just their own)
    restaurants = await db.restaurants.find({}, {"_id": 0}).to_list(1000)
    
    # Add admin count and status for each restaurant
    for rest in restaurants:
        admin_count = await db.users.count_documents({"restaurant_id": rest['id'], "role": "admin"})
        staff_count = await db.users.count_documents({"restaurant_id": rest['id'], "role": {"$in": ["kitchen", "waiter", "bar"]}})
        rest['admin_count'] = admin_count
        rest['staff_count'] = staff_count
        if isinstance(rest['created_at'], str):
            rest['created_at'] = datetime.fromisoformat(rest['created_at'])
    
    return restaurants

@router.get("/restaurants/{restaurant_id}")
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

@router.put("/restaurants/{restaurant_id}")
async def update_restaurant(restaurant_id: str, restaurant: RestaurantCreate, current_user: dict = Depends(get_current_user)):
    if current_user['role'] != UserRole.OWNER:
        raise HTTPException(status_code=403, detail="Only owner can update restaurants")
    
    existing = await db.restaurants.find_one({"id": restaurant_id}, {"_id": 0})
    if not existing:
        raise HTTPException(status_code=404, detail="Restaurant not found")
    
    await db.restaurants.update_one({"id": restaurant_id}, {"$set": restaurant.model_dump()})
    updated = await db.restaurants.find_one({"id": restaurant_id}, {"_id": 0})
    return updated

@router.put("/restaurants/{restaurant_id}/toggle-status")
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

@router.delete("/restaurants/{restaurant_id}")
async def delete_restaurant(restaurant_id: str, current_user: dict = Depends(get_current_user)):
    if current_user['role'] != UserRole.OWNER:
        raise HTTPException(status_code=403, detail="Only owner can delete restaurants")
    
    restaurant = await db.restaurants.find_one({"id": restaurant_id}, {"_id": 0})
    if not restaurant:
        raise HTTPException(status_code=404, detail="Restaurant not found")
    
    # Delete all users associated with this restaurant
    await db.users.delete_many({"restaurant_id": restaurant_id})
    await db.restaurants.delete_one({"id": restaurant_id})
    return {"message": "Restaurant deleted"}

