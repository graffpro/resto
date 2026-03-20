import asyncio
import sys
from motor.motor_asyncio import AsyncIOMotorClient
import os
from pathlib import Path
from dotenv import load_dotenv
from datetime import datetime, timezone

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

categories_data = [
    {
        "id": "cat-1",
        "name": "Appetizers",
        "description": "Start your meal with our delicious appetizers",
        "display_order": 1,
        "created_at": datetime.now(timezone.utc).isoformat()
    },
    {
        "id": "cat-2",
        "name": "Main Course",
        "description": "Hearty and satisfying main dishes",
        "display_order": 2,
        "created_at": datetime.now(timezone.utc).isoformat()
    },
    {
        "id": "cat-3",
        "name": "Desserts",
        "description": "Sweet treats to end your meal",
        "display_order": 3,
        "created_at": datetime.now(timezone.utc).isoformat()
    },
    {
        "id": "cat-4",
        "name": "Beverages",
        "description": "Refreshing drinks and beverages",
        "display_order": 4,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
]

menu_items_data = [
    {
        "id": "item-1",
        "name": "Garden Fresh Salad",
        "description": "Mixed greens with seasonal vegetables, cherry tomatoes, and house vinaigrette",
        "price": 8.99,
        "category_id": "cat-1",
        "image_url": "https://images.unsplash.com/photo-1512621776951-a57141f2eefd",
        "is_available": True,
        "preparation_time": 10,
        "created_at": datetime.now(timezone.utc).isoformat()
    },
    {
        "id": "item-2",
        "name": "Crispy Spring Rolls",
        "description": "Golden fried spring rolls filled with vegetables and served with sweet chili sauce",
        "price": 6.99,
        "category_id": "cat-1",
        "image_url": "https://images.unsplash.com/photo-1504544750208-dc0358e63f7f",
        "is_available": True,
        "preparation_time": 15,
        "created_at": datetime.now(timezone.utc).isoformat()
    },
    {
        "id": "item-3",
        "name": "Grilled Salmon",
        "description": "Fresh Atlantic salmon grilled to perfection with lemon butter sauce and seasonal vegetables",
        "price": 24.99,
        "category_id": "cat-2",
        "image_url": "https://images.unsplash.com/photo-1467003909585-2f8a72700288",
        "is_available": True,
        "preparation_time": 25,
        "created_at": datetime.now(timezone.utc).isoformat()
    },
    {
        "id": "item-4",
        "name": "Organic Veggie Bowl",
        "description": "Quinoa bowl with roasted vegetables, avocado, and tahini dressing",
        "price": 16.99,
        "category_id": "cat-2",
        "image_url": "https://images.unsplash.com/photo-1546069901-ba9599a7e63c",
        "is_available": True,
        "preparation_time": 20,
        "created_at": datetime.now(timezone.utc).isoformat()
    },
    {
        "id": "item-5",
        "name": "Grass-Fed Burger",
        "description": "Juicy beef burger with lettuce, tomato, pickles, and special sauce on a brioche bun",
        "price": 14.99,
        "category_id": "cat-2",
        "image_url": "https://images.unsplash.com/photo-1568901346375-23c9450c58cd",
        "is_available": True,
        "preparation_time": 20,
        "created_at": datetime.now(timezone.utc).isoformat()
    },
    {
        "id": "item-6",
        "name": "Margherita Pizza",
        "description": "Classic pizza with fresh mozzarella, tomatoes, and basil",
        "price": 18.99,
        "category_id": "cat-2",
        "image_url": "https://images.unsplash.com/photo-1574071318508-1cdbab80d002",
        "is_available": True,
        "preparation_time": 25,
        "created_at": datetime.now(timezone.utc).isoformat()
    },
    {
        "id": "item-7",
        "name": "Chocolate Lava Cake",
        "description": "Warm chocolate cake with a molten center, served with vanilla ice cream",
        "price": 8.99,
        "category_id": "cat-3",
        "image_url": "https://images.unsplash.com/photo-1624353365286-3f8d62daad51",
        "is_available": True,
        "preparation_time": 15,
        "created_at": datetime.now(timezone.utc).isoformat()
    },
    {
        "id": "item-8",
        "name": "Fresh Fruit Tart",
        "description": "Buttery tart shell filled with pastry cream and topped with seasonal fruits",
        "price": 7.99,
        "category_id": "cat-3",
        "image_url": "https://images.unsplash.com/photo-1488477181946-6428a0291777",
        "is_available": True,
        "preparation_time": 10,
        "created_at": datetime.now(timezone.utc).isoformat()
    },
    {
        "id": "item-9",
        "name": "Fresh Squeezed Orange Juice",
        "description": "100% fresh orange juice squeezed daily",
        "price": 4.99,
        "category_id": "cat-4",
        "image_url": "https://images.unsplash.com/photo-1600271886742-f049cd451bba",
        "is_available": True,
        "preparation_time": 5,
        "created_at": datetime.now(timezone.utc).isoformat()
    },
    {
        "id": "item-10",
        "name": "Green Smoothie",
        "description": "Healthy blend of spinach, banana, mango, and almond milk",
        "price": 6.99,
        "category_id": "cat-4",
        "image_url": "https://images.unsplash.com/photo-1505252585461-04db1eb84625",
        "is_available": True,
        "preparation_time": 5,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
]

async def seed_database():
    try:
        print("Starting database seeding...")
        
        existing_categories = await db.categories.count_documents({})
        if existing_categories > 0:
            print(f"Database already has {existing_categories} categories. Clearing...")
            await db.categories.delete_many({})
            await db.menu_items.delete_many({})
        
        print("Inserting categories...")
        await db.categories.insert_many(categories_data)
        print(f"✓ Inserted {len(categories_data)} categories")
        
        print("Inserting menu items...")
        await db.menu_items.insert_many(menu_items_data)
        print(f"✓ Inserted {len(menu_items_data)} menu items")
        
        print("\n✓ Database seeded successfully!")
        print("\nSeeded data:")
        print(f"  - Categories: {len(categories_data)}")
        print(f"  - Menu Items: {len(menu_items_data)}")
        
    except Exception as e:
        print(f"✗ Error seeding database: {e}")
        sys.exit(1)
    finally:
        client.close()

if __name__ == "__main__":
    asyncio.run(seed_database())
