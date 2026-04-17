#!/bin/bash
# Daily MongoDB backup script for QR Restaurant
# Add to crontab: 0 2 * * * /app/deploy/backup.sh

BACKUP_DIR="/data/backups"
DATE=$(date +%Y%m%d_%H%M%S)
KEEP_DAYS=7

mkdir -p $BACKUP_DIR

echo "[$DATE] Starting backup..."
docker compose -f ~/resto/deploy/docker-compose.yml exec -T mongo mongodump --archive="/data/backup_${DATE}.gz" --gzip --db restaurant_db

# Copy from container
docker cp $(docker compose -f ~/resto/deploy/docker-compose.yml ps -q mongo):/data/backup_${DATE}.gz ${BACKUP_DIR}/backup_${DATE}.gz 2>/dev/null

# Delete old backups
find ${BACKUP_DIR} -name "backup_*.gz" -mtime +${KEEP_DAYS} -delete

echo "[$DATE] Backup complete: ${BACKUP_DIR}/backup_${DATE}.gz"
echo "[$DATE] Backups kept: $(ls ${BACKUP_DIR}/backup_*.gz 2>/dev/null | wc -l)"
