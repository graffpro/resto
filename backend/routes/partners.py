"""Partner Restaurants - public landing page directory.

Owners can promote tenants to "partners" so they show up on the public landing page.
Each partner can be marked featured, has a public profile (logo, address, phone,
social links, map coordinates, link to their public menu) and accepts ratings (1–5)
from anonymous visitors.
"""
from fastapi import APIRouter, HTTPException, Depends, Query
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional
from datetime import datetime, timezone
import uuid
import math
from database import db
from auth import get_current_user
from models import UserRole

router = APIRouter()


class SocialLink(BaseModel):
    platform: str  # instagram, facebook, tiktok, youtube, x, telegram, linkedin, threads, website, other
    url: str
    label: Optional[str] = ""  # optional custom label for "other"


class PartnerCreate(BaseModel):
    restaurant_id: str
    name: str
    description: Optional[str] = ""
    logo_url: Optional[str] = ""
    cover_url: Optional[str] = ""
    address: Optional[str] = ""
    phone: Optional[str] = ""
    # Legacy single-field socials (kept for backward compatibility on read)
    instagram: Optional[str] = ""
    facebook: Optional[str] = ""
    whatsapp: Optional[str] = ""
    website: Optional[str] = ""
    # New: dynamic list of social links — preferred way
    social_links: Optional[List[SocialLink]] = []
    menu_table_id: Optional[str] = None  # auto-populated from first table of restaurant
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    is_featured: bool = False
    is_visible: bool = True


class PartnerUpdate(BaseModel):
    model_config = ConfigDict(extra="ignore")
    name: Optional[str] = None
    description: Optional[str] = None
    logo_url: Optional[str] = None
    cover_url: Optional[str] = None
    address: Optional[str] = None
    phone: Optional[str] = None
    instagram: Optional[str] = None
    facebook: Optional[str] = None
    whatsapp: Optional[str] = None
    website: Optional[str] = None
    social_links: Optional[List[SocialLink]] = None
    menu_table_id: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    is_featured: Optional[bool] = None
    is_visible: Optional[bool] = None


class RatingSubmit(BaseModel):
    stars: int = Field(ge=1, le=5)
    comment: Optional[str] = ""


def _haversine_km(lat1, lon1, lat2, lon2):
    R = 6371.0
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = math.sin(dlat / 2) ** 2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlon / 2) ** 2
    return 2 * R * math.asin(math.sqrt(a))


# ==================== PUBLIC LIST ====================
@router.get("/partner-restaurants")
async def list_public_partners(
    featured: Optional[bool] = Query(None),
    near_lat: Optional[float] = Query(None),
    near_lng: Optional[float] = Query(None),
    radius_km: float = Query(50.0),
):
    """Public list of visible partner restaurants. Supports filters:
    - featured=true → only featured
    - near_lat, near_lng → sort by distance, optionally filter by radius_km
    """
    query = {"is_visible": True}
    if featured is True:
        query["is_featured"] = True
    partners = await db.partner_restaurants.find(query, {"_id": 0}).to_list(500)

    if near_lat is not None and near_lng is not None:
        with_dist = []
        for p in partners:
            if p.get("latitude") is not None and p.get("longitude") is not None:
                d = _haversine_km(near_lat, near_lng, p["latitude"], p["longitude"])
                if d <= radius_km:
                    p["distance_km"] = round(d, 2)
                    with_dist.append(p)
        with_dist.sort(key=lambda x: x.get("distance_km", 99999))
        return with_dist

    # Default sort: featured first, then by rating, then by created_at desc
    partners.sort(key=lambda p: (
        0 if p.get("is_featured") else 1,
        -(p.get("rating_avg", 0) or 0),
        -(p.get("ratings_count", 0) or 0),
    ))
    return partners


@router.get("/partner-restaurants/{partner_id}")
async def get_partner(partner_id: str):
    p = await db.partner_restaurants.find_one({"id": partner_id, "is_visible": True}, {"_id": 0})
    if not p:
        raise HTTPException(status_code=404, detail="Partner not found")
    return p


# ==================== PUBLIC MENU (browse-only, by restaurant_id) ====================
@router.get("/public/restaurant/{restaurant_id}")
async def get_public_restaurant(restaurant_id: str):
    """Public restaurant info for browse-only menu (only if restaurant is a visible partner)."""
    partner = await db.partner_restaurants.find_one(
        {"restaurant_id": restaurant_id, "is_visible": True},
        {"_id": 0},
    )
    if not partner:
        raise HTTPException(status_code=404, detail="Restaurant not available for public browsing")

    rest = await db.restaurants.find_one({"id": restaurant_id, "is_active": True}, {"_id": 0})
    if not rest:
        raise HTTPException(status_code=404, detail="Restaurant not found")

    # Recent reviews (top 5) for context
    reviews = await db.partner_ratings.find(
        {"partner_id": partner["id"]}, {"_id": 0}
    ).sort("created_at", -1).to_list(5)

    return {
        "restaurant": {
            "id": rest["id"],
            "name": rest.get("name"),
            "address": rest.get("address"),
            "phone": rest.get("phone"),
        },
        "partner": partner,
        "recent_reviews": reviews,
    }



# ==================== OWNER MANAGEMENT ====================
@router.get("/owner/partners")
async def list_all_partners(current_user: dict = Depends(get_current_user)):
    """Owner-only: list ALL partners (visible + hidden) for the management dashboard."""
    if current_user['role'] != UserRole.OWNER:
        raise HTTPException(status_code=403, detail="Only owner")
    partners = await db.partner_restaurants.find({}, {"_id": 0}).sort("created_at", -1).to_list(1000)
    # Enrich with restaurant info
    for p in partners:
        rest = await db.restaurants.find_one({"id": p.get("restaurant_id")}, {"_id": 0})
        if rest:
            p["restaurant_name"] = rest.get("name")
            p["restaurant_active"] = rest.get("is_active", True)
    return partners


@router.get("/owner/eligible-restaurants")
async def list_eligible_restaurants(current_user: dict = Depends(get_current_user)):
    """Owner-only: list restaurants that are NOT yet partners."""
    if current_user['role'] != UserRole.OWNER:
        raise HTTPException(status_code=403, detail="Only owner")
    restaurants = await db.restaurants.find({"is_active": True}, {"_id": 0}).to_list(1000)
    partners = await db.partner_restaurants.find({}, {"_id": 0, "restaurant_id": 1}).to_list(1000)
    partner_rids = {p.get("restaurant_id") for p in partners}
    return [r for r in restaurants if r.get("id") not in partner_rids]


@router.post("/owner/partners")
async def create_partner(data: PartnerCreate, current_user: dict = Depends(get_current_user)):
    if current_user['role'] != UserRole.OWNER:
        raise HTTPException(status_code=403, detail="Only owner")

    # Validate restaurant exists
    rest = await db.restaurants.find_one({"id": data.restaurant_id}, {"_id": 0})
    if not rest:
        raise HTTPException(status_code=404, detail="Restaurant not found")

    # Prevent duplicate partner for the same restaurant
    existing = await db.partner_restaurants.find_one({"restaurant_id": data.restaurant_id}, {"_id": 0})
    if existing:
        raise HTTPException(status_code=400, detail="Bu restoran artıq partnyordur")

    doc = data.model_dump()

    # Auto-pick menu_table_id: take first available table of the restaurant if not provided.
    # The owner doesn't need to copy/paste UUIDs; the partner is already in our system.
    if not doc.get("menu_table_id"):
        first_table = await db.tables.find_one(
            {"restaurant_id": data.restaurant_id},
            {"_id": 0, "id": 1},
            sort=[("created_at", 1)],
        )
        if first_table:
            doc["menu_table_id"] = first_table.get("id")

    doc.update({
        "id": str(uuid.uuid4()),
        "rating_avg": 0.0,
        "ratings_count": 0,
        "approved_by": current_user['id'],
        "created_at": datetime.now(timezone.utc).isoformat(),
    })
    await db.partner_restaurants.insert_one(doc)
    doc.pop('_id', None)
    return doc


@router.put("/owner/partners/{partner_id}")
async def update_partner(partner_id: str, data: PartnerUpdate, current_user: dict = Depends(get_current_user)):
    if current_user['role'] != UserRole.OWNER:
        raise HTTPException(status_code=403, detail="Only owner")
    update = {k: v for k, v in data.model_dump().items() if v is not None}
    if not update:
        return {"message": "No changes"}
    result = await db.partner_restaurants.update_one({"id": partner_id}, {"$set": update})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Partner not found")
    updated = await db.partner_restaurants.find_one({"id": partner_id}, {"_id": 0})
    return updated


@router.delete("/owner/partners/{partner_id}")
async def delete_partner(partner_id: str, current_user: dict = Depends(get_current_user)):
    if current_user['role'] != UserRole.OWNER:
        raise HTTPException(status_code=403, detail="Only owner")
    result = await db.partner_restaurants.delete_one({"id": partner_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Partner not found")
    await db.partner_ratings.delete_many({"partner_id": partner_id})
    return {"message": "Partner deleted"}


# ==================== PUBLIC RATINGS ====================
@router.post("/partner-restaurants/{partner_id}/rate")
async def rate_partner(partner_id: str, data: RatingSubmit):
    p = await db.partner_restaurants.find_one({"id": partner_id, "is_visible": True}, {"_id": 0})
    if not p:
        raise HTTPException(status_code=404, detail="Partner not found")

    rating_doc = {
        "id": str(uuid.uuid4()),
        "partner_id": partner_id,
        "stars": data.stars,
        "comment": data.comment or "",
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.partner_ratings.insert_one(rating_doc)

    # Recompute aggregate
    all_ratings = await db.partner_ratings.find({"partner_id": partner_id}, {"_id": 0}).to_list(100000)
    total = sum(r.get("stars", 0) for r in all_ratings)
    count = len(all_ratings)
    avg = round(total / count, 2) if count else 0
    await db.partner_restaurants.update_one(
        {"id": partner_id},
        {"$set": {"rating_avg": avg, "ratings_count": count}}
    )
    rating_doc.pop('_id', None)
    return {"rating": rating_doc, "rating_avg": avg, "ratings_count": count}


@router.get("/partner-restaurants/{partner_id}/ratings")
async def list_partner_ratings(partner_id: str, limit: int = 50):
    ratings = await db.partner_ratings.find({"partner_id": partner_id}, {"_id": 0}).sort("created_at", -1).to_list(limit)
    return ratings
