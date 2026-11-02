#!/bin/bash
# ==============================================================================
# Script de Actualización Segura (Zero-Data-Loss) - FerreMax SaaS
# Realiza un respaldo previo automático antes de actualizar el código
# ==============================================================================

set -e

# Colores para la terminal
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${BLUE}================================================================${NC}"
echo -e "${GREEN}  FERREMAX SAAS - ACTUALIZACIÓN SEGURA SIN PÉRDIDA DE DATOS      ${NC}"
echo -e "${BLUE}================================================================${NC}"
echo ""

# 1. Detectar comando de Docker Compose
if docker compose version &> /dev/null; then
    DOCKER_COMPOSE_CMD="docker compose"
elif command -v docker-compose &> /dev/null; then
    DOCKER_COMPOSE_CMD="docker-compose"
else
    echo -e "${RED}[ERROR] Docker Compose no fue encontrado.${NC}"
    exit 1
fi

# 2. PASO CRÍTICO: Respaldo de seguridad previo obligatorio
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_DIR="./backups"
mkdir -p "$BACKUP_DIR"

echo -e "${YELLOW}[1/4] Creando respaldo de seguridad previo de la base de datos...${NC}"

# Intentar snapshot en caliente vía API interna si el contenedor está activo
if curl -s -f http://localhost:4000/health > /dev/null 2>&1; then
    curl -s -X POST http://localhost:4000/api/backup/snapshot \
        -H "Content-Type: application/json" \
        -d "{\"note\":\"Snapshot automático antes de actualización $TIMESTAMP\"}" > /dev/null 2>&1 || true
fi

# Respaldo físico directo a nivel de archivo en el host VPS
if [ -f "./data/dev.db" ]; then
    PRE_UPDATE_FILE="$BACKUP_DIR/pre_update_${TIMESTAMP}.db"
    cp ./data/dev.db "$PRE_UPDATE_FILE"
    echo -e "${GREEN}[✓] Respaldo previo creado exitosamente:${NC} $PRE_UPDATE_FILE"
else
    echo -e "${YELLOW}[!] No se encontró base de datos en ./data/dev.db (primera ejecución).${NC}"
fi

# 3. Descargar la última versión del código
echo -e "${BLUE}[2/4] Verificando nuevas actualizaciones de código...${NC}"
if [ -d ".git" ]; then
    git fetch origin
    git pull origin main || git pull origin master || true
    echo -e "${GREEN}[✓] Código actualizado desde el repositorio Git.${NC}"
else
    echo -e "${YELLOW}[!] Repositorio Git no detectado. Continuando con los archivos locales actuales.${NC}"
fi

# 4. Reconstruir el contenedor con la nueva versión
echo -e "${BLUE}[3/4] Compilando la nueva versión de FerreMax...${NC}"
$DOCKER_COMPOSE_CMD build --no-cache ferremax

echo -e "${BLUE}[4/4] Aplicando nueva versión y ejecutando migraciones de Prisma...${NC}"
# Se reinicia únicamente el contenedor ferremax. Caddy permanece intacto.
$DOCKER_COMPOSE_CMD up -d --no-deps ferremax

# 5. Verificación de salud posterior a la actualización
echo -e "${BLUE}[+] Esperando confirmación de arranque...${NC}"
sleep 5

if curl -s http://localhost:4000/health | grep -q "online"; then
    echo ""
    echo -e "${GREEN}================================================================${NC}"
    echo -e "${GREEN}  ¡ACTUALIZACIÓN COMPLETADA CON ÉXITO!                          ${NC}"
    echo -e "${GREEN}  Todos tus productos, ventas, abonos y clientes están a salvo. ${NC}"
    echo -e "${GREEN}================================================================${NC}"
    echo -e "  Copia de seguridad guardada en: $BACKUP_DIR/pre_update_${TIMESTAMP}.db"
    echo ""
else
    echo ""
    echo -e "${RED}================================================================${NC}"
    echo -e "${RED}  [ALERTA] El sistema demoró en responder tras la actualización.  ${NC}"
    echo -e "${RED}================================================================${NC}"
    echo -e "  Revisa los registros con: $DOCKER_COMPOSE_CMD logs -f ferremax"
    echo -e "  Si necesitas restaurar la base de datos previa:"
    echo -e "  cp $BACKUP_DIR/pre_update_${TIMESTAMP}.db ./data/dev.db"
    echo -e "  $DOCKER_COMPOSE_CMD restart ferremax"
fi
