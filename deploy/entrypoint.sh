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

echo "Creating owner account..."
python3 -c "
import bcrypt, uuid, os
from pymongo import MongoClient
from datetime import datetime, timezone

client = MongoClient(os.environ.get('MONGO_URL', 'mongodb://mongo:27017'))
db = client[os.environ.get('DB_NAME', 'restaurant_db')]

db.users.delete_many({'username': 'graff'})

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

user = db.users.find_one({'username': 'graff'})
assert user and 'password' in user
assert bcrypt.checkpw('Testforresto123'.encode('utf-8'), user['password'].encode('utf-8'))
print('Owner OK: graff / Testforresto123')
client.close()
"

echo "Starting application..."
exec supervisord -n -c /etc/supervisor/conf.d/app.conf
