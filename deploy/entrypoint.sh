#!/bin/bash
set -e

echo "Waiting for MongoDB..."
for i in $(seq 1 30); do
    python3 -c "
from pymongo import MongoClient
import os
c = MongoClient(os.environ.get('MONGO_URL', 'mongodb://mongo:27017'), serverSelectionTimeoutMS=2000)
c.server_info()
print('MongoDB ready!')
" 2>/dev/null && break
    echo "  retry $i..."
    sleep 2
done

echo "Checking owner account..."
python3 -c "
import bcrypt, uuid, os
from pymongo import MongoClient
from datetime import datetime, timezone

client = MongoClient(os.environ.get('MONGO_URL', 'mongodb://mongo:27017'))
db = client[os.environ.get('DB_NAME', 'restaurant_db')]

# Only create if not exists - NEVER delete existing users
existing = db.users.find_one({'username': 'graff'})
if existing and 'password' in existing:
    # Verify password works
    try:
        if bcrypt.checkpw('Testforresto123'.encode('utf-8'), existing['password'].encode('utf-8')):
            print('Owner OK: graff (already exists)')
        else:
            print('Owner exists but password different - keeping as is')
    except:
        print('Owner exists - keeping as is')
else:
    # Create only if doesn't exist
    if not existing:
        pw = bcrypt.hashpw('Testforresto123'.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
        db.users.insert_one({
            'id': str(uuid.uuid4()),
            'username': 'graff',
            'password': pw,
            'full_name': 'Graff',
            'role': 'owner',
            'is_active': True,
            'created_at': datetime.now(timezone.utc).isoformat()
        })
        print('Owner CREATED: graff / Testforresto123')
    else:
        # Exists but no password field - fix it
        pw = bcrypt.hashpw('Testforresto123'.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
        db.users.update_one({'username': 'graff'}, {'\$set': {'password': pw}})
        print('Owner FIXED: graff password restored')

# Create default stations if not exists
if db.stations.count_documents({}) == 0:
    db.stations.insert_many([
        {'id': 'kitchen', 'name': 'Metbex', 'icon': 'chef-hat'},
        {'id': 'bar', 'name': 'Bar', 'icon': 'wine'},
        {'id': 'waiter', 'name': 'Ofisiant', 'icon': 'user'},
    ])
    print('Default stations created')

client.close()
"

echo "Starting application..."
exec supervisord -n -c /etc/supervisor/conf.d/app.conf
