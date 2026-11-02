#!/bin/bash
# ==============================================================================
# Script de Despliegue Automatizado - FerreMax SaaS (Producción VPS)
# Diseñado para principiantes: instala dependencias, configura y arranca en 1 paso
# Compatible con: Ubuntu 20.04+, Ubuntu 22.04+, Ubuntu 24.04+, Debian 11+
# ==============================================================================

set -e

# Colores para la terminal
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # Sin color

echo -e "${BLUE}================================================================${NC}"
echo -e "${GREEN}  FERREMAX SAAS - ASISTENTE DE INSTALACIÓN Y DESPLIEGUE EN VPS  ${NC}"
echo -e "${BLUE}================================================================${NC}"
echo ""

# 1. Verificar permisos de superusuario
if [ "$EUID" -ne 0 ]; then
  echo -e "${YELLOW}[!] Recomendación: Ejecuta este script con 'sudo bash deploy.sh' para permitir la instalación de Docker si es necesario.${NC}"
fi

# 2. Detectar e instalar Docker si no está presente
if ! command -v docker &> /dev/null; then
    echo -e "${YELLOW}[+] Docker no está instalado en este VPS. Instalándolo automáticamente...${NC}"
    apt-get update -y
    apt-get install -y curl ca-certificates
    curl -fsSL https://get.docker.com -o get-docker.sh
    sh get-docker.sh
    rm -f get-docker.sh
    systemctl enable docker
    systemctl start docker
    echo -e "${GREEN}[✓] Docker instalado con éxito.${NC}"
else
    echo -e "${GREEN}[✓] Docker ya está instalado en el sistema.${NC}"
fi

# 3. Detectar soporte para docker compose
if docker compose version &> /dev/null; then
    DOCKER_COMPOSE_CMD="docker compose"
elif command -v docker-compose &> /dev/null; then
    DOCKER_COMPOSE_CMD="docker-compose"
else
    echo -e "${YELLOW}[+] Instalando plugin de Docker Compose...${NC}"
    apt-get update -y
    apt-get install -y docker-compose-plugin
    DOCKER_COMPOSE_CMD="docker compose"
fi
echo -e "${GREEN}[✓] Usando comando: $DOCKER_COMPOSE_CMD${NC}"

# 4. Crear carpetas persistentes en el disco del VPS
echo -e "${BLUE}[+] Verificando carpetas de datos persistentes...${NC}"
mkdir -p ./data ./uploads/products ./uploads/branding ./backups
chmod -R 775 ./data ./uploads ./backups

# Si existe una base de datos local previa y no hay en data/, inicializarla
if [ ! -f "./data/dev.db" ] && [ -f "./backend/prisma/dev.db" ]; then
    echo -e "${YELLOW}[+] Copiando base de datos inicial desde el repositorio a ./data/dev.db...${NC}"
    cp ./backend/prisma/dev.db ./data/dev.db
fi

# 5. Configurar archivo .env
if [ ! -f ".env" ]; then
    echo -e "${BLUE}================================================================${NC}"
    echo -e "${YELLOW}  CONFIGURACIÓN INICIAL DEL SISTEMA (Solo la primera vez)       ${NC}"
    echo -e "${BLUE}================================================================${NC}"
    
    # Preguntar dominio
    read -p ">> Ingresa tu Dominio Web (ej: pos.miempresa.com) o presiona ENTER para usar la IP del VPS: " USER_DOMAIN
    if [ -z "$USER_DOMAIN" ]; then
        USER_DOMAIN=":80"
        echo -e "${YELLOW}--> Configurado para acceso por IP directa (HTTP estándar).${NC}"
    else
        echo -e "${GREEN}--> Dominio configurado: $USER_DOMAIN (Caddy activará SSL HTTPS automático).${NC}"
    fi

    # Preguntar nombre del negocio
    read -p ">> Nombre de tu Empresa / Ferretería (ENTER para 'FerreMax Venezuela'): " USER_STORE
    if [ -z "$USER_STORE" ]; then
        USER_STORE="FerreMax Venezuela"
    fi

    # Preguntar RIF
    read -p ">> RIF fiscal de la empresa (ENTER para 'J-50123456-7'): " USER_RIF
    if [ -z "$USER_RIF" ]; then
        USER_RIF="J-50123456-7"
    fi

    # Generar clave secreta aleatoria segura
    RANDOM_JWT=$(openssl rand -hex 32 2>/dev/null || date +%s%N | sha256sum | head -c 64)

    # Crear .env desde la plantilla
    sed -e "s|DOMAIN_NAME=:80|DOMAIN_NAME=${USER_DOMAIN}|g" \
        -e "s|JWT_SECRET=.*|JWT_SECRET=${RANDOM_JWT}|g" \
        -e "s|STORE_NAME=.*|STORE_NAME=\"${USER_STORE}\"|g" \
        -e "s|STORE_RIF=.*|STORE_RIF=\"${USER_RIF}\"|g" \
        .env.production.example > .env

    echo -e "${GREEN}[✓] Archivo de configuración .env generado con éxito.${NC}"
else
    echo -e "${GREEN}[✓] Archivo .env existente detectado. Manteniendo configuración.${NC}"
fi

# 6. Construir y levantar los contenedores Docker
echo -e "${BLUE}[+] Compilando y levantando contenedores de FerreMax y Caddy...${NC}"
$DOCKER_COMPOSE_CMD down --remove-orphans 2>/dev/null || true
$DOCKER_COMPOSE_CMD up -d --build

# 7. Esperar a que el servicio esté listo
echo -e "${BLUE}[+] Verificando estado del servidor web y base de datos...${NC}"
ATTEMPTS=0
MAX_ATTEMPTS=15
ONLINE=false

while [ $ATTEMPTS -lt $MAX_ATTEMPTS ]; do
    sleep 3
    ATTEMPTS=$((ATTEMPTS+1))
    if curl -s http://localhost:4000/health | grep -q "online"; then
        ONLINE=true
        break
    fi
    echo -n "."
done
echo ""

# 8. Obtener la IP pública del VPS
SERVER_IP=$(curl -s -4 https://ifconfig.me || curl -s -4 https://api.ipify.org || echo "IP_DE_TU_VPS")

# 9. Mostrar resumen final
if [ "$ONLINE" = true ]; then
    echo -e "${GREEN}================================================================${NC}"
    echo -e "${GREEN}  ¡DESPLIEGUE COMPLETADO CON ÉXITO! EL SISTEMA ESTÁ EN LÍNEA     ${NC}"
    echo -e "${GREEN}================================================================${NC}"
    echo ""
    echo -e "  🌐 Acceso Web Inmediato:  ${GREEN}http://${SERVER_IP}${NC}"
    
    # Si hay dominio configurado en .env
    ENV_DOMAIN=$(grep '^DOMAIN_NAME=' .env | cut -d '=' -f2)
    if [ "$ENV_DOMAIN" != ":80" ] && [ -n "$ENV_DOMAIN" ]; then
        echo -e "  🔒 Acceso Seguro con SSL: ${GREEN}https://${ENV_DOMAIN}${NC}"
        echo -e "     (Asegúrate de que el DNS apunte a la IP ${SERVER_IP})"
    fi
    echo ""
    echo -e "  📊 Panel de Control Docker: $DOCKER_COMPOSE_CMD ps"
    echo -e "  📜 Ver Registros en Vivo:  $DOCKER_COMPOSE_CMD logs -f"
    echo -e "  🔄 Actualizar Sistema:     bash update.sh"
    echo -e "  💾 Realizar Respaldo:      bash backup-cron.sh"
    echo -e "${BLUE}================================================================${NC}"
else
    echo -e "${YELLOW}[!] El contenedor está iniciando. Revisa los logs con: $DOCKER_COMPOSE_CMD logs -f${NC}"
fi
