#!/bin/bash
# ==============================================================================
# Script de Respaldo Automatizado Programado (Cron) - FerreMax SaaS
# Respalda la Base de Datos SQLite y la carpeta de Imágenes / Uploads
# ==============================================================================

set -e

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$PROJECT_DIR"

TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_DIR="$PROJECT_DIR/backups"
ARCHIVE_NAME="ferremax_full_backup_${TIMESTAMP}.tar.gz"

mkdir -p "$BACKUP_DIR"

echo "[$(date '+%Y-%m-%d %H:%M:%S')] Iniciando respaldo programado de FerreMax..."

# 1. Crear snapshot en caliente de SQLite si el backend está activo
if curl -s -f http://localhost:4000/health > /dev/null 2>&1; then
    curl -s -X POST http://localhost:4000/api/backup/snapshot \
        -H "Content-Type: application/json" \
        -d "{\"note\":\"Respaldo Cron Diario $TIMESTAMP\"}" > /dev/null 2>&1 || true
fi

# 2. Empaquetar base de datos y carpeta de uploads (imágenes) en un archivo comprimido
if [ -d "./data" ] && [ -d "./uploads" ]; then
    tar -czf "$BACKUP_DIR/$ARCHIVE_NAME" ./data ./uploads
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] Archivo comprimido generado: $BACKUP_DIR/$ARCHIVE_NAME ($(du -h "$BACKUP_DIR/$ARCHIVE_NAME" | cut -f1))"
elif [ -d "./data" ]; then
    tar -czf "$BACKUP_DIR/$ARCHIVE_NAME" ./data
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] Archivo comprimido generado: $BACKUP_DIR/$ARCHIVE_NAME ($(du -h "$BACKUP_DIR/$ARCHIVE_NAME" | cut -f1))"
fi

# 3. Poda automática: eliminar respaldos antiguos de más de 30 días para ahorrar disco
find "$BACKUP_DIR" -type f -name "ferremax_full_backup_*.tar.gz" -mtime +30 -exec rm -f {} \;
find "$BACKUP_DIR" -type f -name "pre_update_*.db" -mtime +15 -exec rm -f {} \;

echo "[$(date '+%Y-%m-%d %H:%M:%S')] Respaldo completado con éxito."
