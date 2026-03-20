import asyncio
import sys
from motor.motor_asyncio import AsyncIOMotorClient
import os
from pathlib import Path
from dotenv import load_dotenv
from datetime import datetime, timezone
import bcrypt

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

async def initialize_system():
    try:
        print("🔄 Clearing old data...")
        await db.users.delete_many({})
        await db.venues.delete_many({})
        await db.tables.delete_many({})
        await db.table_sessions.delete_many({})
        await db.orders.delete_many({})
        await db.categories.delete_many({})
        await db.menu_items.delete_many({})
        await db.status_checks.delete_many({})
        await db.reservations.delete_many({})
        print("✓ Old data cleared")
        
        print("\n🔄 Creating owner account...")
        owner_password = "owner123"
        hashed_password = bcrypt.hashpw(owner_password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
        
        owner = {
            "id": "owner-1",
            "username": "owner",
            "password": hashed_password,
            "role": "owner",
            "full_name": "Restaurant Sahibi",
            "created_by": None,
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        
        await db.users.insert_one(owner)
        print("✓ Owner created")
        print(f"  Username: owner")
        print(f"  Password: {owner_password}")
        
        print("\n✓ System initialized successfully!")
        print("\n📝 Next steps:")
        print("1. Login as owner")
        print("2. Create venues (помещения)")
        print("3. Create tables with QR codes")
        print("4. Create admin users")
        print("5. Admin can create kitchen and waiter users")
        
    except Exception as e:
        print(f"✗ Error: {e}")
        sys.exit(1)
    finally:
        client.close()

if __name__ == "__main__":
    asyncio.run(initialize_system())
