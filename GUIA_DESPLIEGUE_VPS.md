# 🚀 Guía Definitiva de Despliegue en VPS para Principiantes - FerreMax SaaS

> **¿Eres nuevo en servidores y Linux? No te preocupes.** Esta guía fue redactada paso a paso para que cualquier persona, sin conocimientos técnicos previos, pueda poner en marcha su sistema **FerreMax** en internet en menos de 10 minutos y sin riesgo de perder información.

---

## 📌 Tabla de Contenidos
1. [Conceptos Básicos en Palabras Simples](#1-conceptos-básicos-en-palabras-simples)
2. [¿Qué Servidor Elegir y Cuánto Cuesta?](#2-qué-servidor-elegir-y-cuánto-cuesta)
3. [El Tema del Dominio: ¿Viene Incluido o se Compra Aparte?](#3-el-tema-del-dominio-viene-incluido-o-se-compra-aparte)
4. [Paso 1: Contratar y Crear el Servidor VPS](#paso-1-contratar-y-crear-el-servidor-vps)
5. [Paso 2: Conectarte a tu Servidor desde Windows](#paso-2-conectarte-a-tu-servidor-desde-windows)
6. [Paso 3: Subir los Archivos de FerreMax al Servidor](#paso-3-subir-los-archivos-de-ferremax-al-servidor)
7. [Paso 4: El Despliegue en 1 Solo Comando](#paso-4-el-despliegue-en-1-solo-comando)
8. [Paso 5: Conectar tu Dominio y Activar HTTPS Automático](#paso-5-conectar-tu-dominio-y-activar-https-automático)
9. [Paso 6: Actualizaciones Seguras (Cero Pérdida de Datos)](#paso-6-actualizaciones-seguras-cero-pérdida-de-datos)
10. [Paso 7: Respaldos Automáticos Diarios](#paso-7-respaldos-automáticos-diarios)
11. [Preguntas Frecuentes y Solución de Problemas](#preguntas-frecuentes-y-solución-de-problemas)

---

## 1. Conceptos Básicos en Palabras Simples

- **VPS (Servidor Privado Virtual):** Es una computadora real encendida las 24 horas del día, los 365 días del año, en un centro de datos con internet ultra veloz y electricidad ininterrumpida.
- **Docker:** Es como un "contenedor marítimo" digital. Todo lo que el sistema necesita para funcionar (Node.js, librerías, dependencias) ya viene empaquetado adentro. No tienes que instalar Node ni configurar librerías en Linux.
- **Caddy:** Es el recepcionista web. Recibe a los clientes que visitan tu tienda, cifra la conexión con candadito verde (**HTTPS**) automáticamente y envía las peticiones al sistema.
- **Volumen Persistente:** Es una carpeta en el disco duro del servidor (`./data`, `./uploads`, `./backups`) que está **fuera** del contenedor. Aunque actualices el sistema 100 veces, tus datos jamás se tocan.

---

## 2. ¿Qué Servidor Elegir y Cuánto Cuesta?

El sistema FerreMax está optimizado al 100% y no consume casi recursos gracias a SQLite y Node.js compilado. 

Cualquiera de estos proveedores funciona de manera idéntica:

| Proveedor | Plan Recomendado | Costo Aprox. | Ubicación Ideal para Venezuela |
| :--- | :--- | :--- | :--- |
| **Vultr** | Cloud Compute (Shared CPU, 1 vCPU, 1 GB RAM, 25 GB NVMe) | **\$5 a \$6 / mes** | Miami, FL (USA) o Atlanta (USA) |
| **Hetzner** | Cloud Server (CX22, 2 vCPU, 4 GB RAM, 40 GB NVMe) | **~€4 / mes (~\$4.5)** | Ashburn, VA (USA) o Nuremberg |
| **DigitalOcean** | Basic Droplet (1 vCPU, 1 GB RAM, 25 GB SSD) | **\$6 / mes** | New York (NYC3) o Miami |
| **Servidor Físico Local** | Cualquier PC con Windows 10/11 o Ubuntu en tu ferretería | **\$0 extra** | Tu propio local comercial |

> [!TIP]
> **Recomendación para Venezuela:** Elige **Miami** o **Atlanta** como ubicación del servidor. Ofrece la menor latencia (tiempo de respuesta) para conexiones desde CANTV, Fibra Óptica (NetUno, Inter, Airtek, Thundernet) y telefonía móvil (Movistar, Digitel).

---

## 3. El Tema del Dominio: ¿Viene Incluido o se Compra Aparte?

### ¿Viene con el VPS?
**No.** Los proveedores de VPS como Vultr, Hetzner o DigitalOcean venden solo el hardware (la computadora en la nube). Te asignan una dirección IP pública (por ejemplo: `149.28.120.45`).

### ¿Es obligatorio comprar un dominio para empezar a usar FerreMax?
**¡NO es obligatorio!** Puedes iniciar y operar tu sistema inmediatamente usando solo la **IP de tu VPS** (por ejemplo: `http://149.28.120.45`). Todos tus cajeros, administradores y clientes de mostrador podrán facturar sin ningún problema.

### Cuando decidas comprar un dominio:
- Cuesta entre **\$8 y \$12 al año** (ej: `ferreteriaelvalle.com`).
- Registradores económicos y confiables: **Porkbun.com**, **Namecheap.com** o **Cloudflare Registrar**.
- FerreMax y Caddy detectarán tu dominio y le instalarán el certificado de seguridad SSL gratis de por vida sin que tengas que hacer nada.

---

## 4. Paso 1: Contratar y Crear el Servidor VPS

*(Ejemplo en Vultr, los pasos son equivalentes en cualquier otro proveedor)*

1. Ingresa a [Vultr.com](https://www.vultr.com/) y crea tu cuenta.
2. Haz clic en el botón azul **Deploy** (o **Deploy Server**).
3. Selecciona:
   - **Server Type:** `Cloud Compute - Shared CPU`.
   - **Location:** `Miami` (o `Atlanta` / `New York`).
   - **Operating System:** `Ubuntu` -> Versión **24.04 LTS x64** (o **22.04 LTS**).
   - **Server Size:** El plan más económico (\$5 o \$6 / mes con 1 GB o 2 GB RAM).
   - **Auto Backups:** Opcional (el sistema ya incluye su propio botón de respaldos).
4. Haz clic en **Deploy Now**.
5. Espera 60 segundos hasta que el estado cambie a **Running**.
6. Haz clic sobre el servidor creado. Verás tres datos fundamentales:
   - **IP Address:** (ejemplo: `149.28.120.45`)
   - **Username:** `root`
   - **Password:** (un botón para copiar la contraseña generada)

---

## 5. Paso 2: Conectarte a tu Servidor desde Windows

No necesitas instalar programas raros. Windows 10 y Windows 11 ya tienen la herramienta oficial de conexión (**SSH**) incorporada.

1. En tu computadora con Windows, presiona la tecla `Windows`, escribe **PowerShell** y ábrelo.
2. Escribe el siguiente comando (sustituyendo la IP por la que te dio tu proveedor) y presiona `ENTER`:

```bash
ssh root@149.28.120.45
```

3. Si es la primera vez que te conectas, te preguntará:
   ```text
   Are you sure you want to continue connecting (yes/no/[fingerprint])?
   ```
   Escribe **`yes`** y presiona `ENTER`.
4. Te pedirá la contraseña. **Pega la contraseña de tu VPS** (haz clic derecho con el ratón sobre la ventana de PowerShell para pegar) y presiona `ENTER`.
   *(Nota: Por seguridad de Linux, al escribir la contraseña no se ven asteriscos ni letras en pantalla; pégala y pulsa Enter).*
5. ¡Listo! Verás el mensaje de bienvenida de Ubuntu: `root@vultr:~#`. Ya estás dentro de tu servidor.

---

## 6. Paso 3: Subir los Archivos de FerreMax al Servidor

Tienes dos métodos muy sencillos:

### Opción A (La más recomendada si tienes Git o GitHub):
En la consola de tu servidor, ejecuta:
```bash
git clone https://github.com/TU_USUARIO/ferremax.git
cd ferremax
```

### Opción B (Si tienes la carpeta en tu computadora Windows):
1. Abre otra ventana de **PowerShell** en tu computadora local.
2. Comprime o envía la carpeta del proyecto a tu VPS con este comando:
```powershell
scp -r "c:\Users\abc\Downloads\FerreMax Proyecto" root@149.28.120.45:/root/ferremax
```
3. Regresa a la consola de tu VPS y entra a la carpeta:
```bash
cd /root/ferremax
```

---

## 7. Paso 4: El Despliegue en 1 Solo Comando

Dentro de la carpeta del proyecto en tu VPS, simplemente ejecuta:

```bash
sudo bash deploy.sh
```

### ¿Qué hará el asistente automáticamente por ti?
1. **Detecta e instala Docker** y Docker Compose si no estaban instalados.
2. **Crea las carpetas seguras** para tu base de datos (`./data`), imágenes de productos (`./uploads`) y copias de seguridad (`./backups`).
3. **Copia tu catálogo inicial de productos** si ya lo tenías creado.
4. **Te hará 3 preguntas rápidas:**
   - *¿Tienes un dominio web?*: Si aún no tienes, solo presiona `ENTER` (usará tu IP). Si tienes, escríbelo (ej: `pos.miempresa.com`).
   - *¿Nombre de tu empresa?*: Ej: `Ferretería El Valle C.A.`.
   - *¿RIF de la empresa?*: Ej: `J-50123456-7`.
5. **Genera una clave de seguridad cifrada** de 64 caracteres para proteger tus sesiones.
6. **Compila y arranca el sistema**.

Al finalizar (unos 60 a 90 segundos), verás en pantalla:

```text
================================================================
  ¡DESPLIEGUE COMPLETADO CON ÉXITO! EL SISTEMA ESTÁ EN LÍNEA     
================================================================

  🌐 Acceso Web Inmediato:  http://149.28.120.45
  🔒 Acceso Seguro SSL:     https://pos.miempresa.com (si indicaste dominio)
```

¡Abre esa dirección en tu navegador (Google Chrome, Firefox o teléfono móvil) y tu sistema estará funcionando en vivo!

---

## 8. Paso 5: Conectar tu Dominio y Activar HTTPS Automático

Cuando decidas colocarle un nombre profesional (ej: `sistema.tuferreteria.com`):

1. Ve a la empresa donde compraste el dominio (Namecheap, Porkbun, GoDaddy, etc.).
2. Entra a la sección **DNS Management** (o Administrador de DNS).
3. Añade un **Registro Tipo A**:
   - **Tipo:** `A`
   - **Host / Nombre:** `@` (o `sistema` si es un subdominio)
   - **Valor / Dirección IP:** La IP pública de tu VPS (ej: `149.28.120.45`)
   - **TTL:** Automático o 5 minutos.
4. En tu servidor VPS, edita el archivo `.env`:
   ```bash
   nano .env
   ```
   Cambia la línea:
   ```env
   DOMAIN_NAME=sistema.tuferreteria.com
   ```
   *(Para guardar en nano presiona `Ctrl + O`, luego `ENTER`, y para salir `Ctrl + X`).*
5. Reinicia el proxy web con:
   ```bash
   docker compose restart caddy
   ```
6. **¡Listo!** Caddy hablará con Let's Encrypt y en 10 segundos tu web tendrá candado verde de seguridad con certificado SSL sin pagar nada mensual ni renovar manualmente.

---

## 9. Paso 6: Actualizaciones Seguras (Cero Pérdida de Datos)

Uno de los mayores temores al ser principiante es: *"Si el programador hace una mejora o corrige algo, ¿se me van a borrar mis 20.000 productos y mis cuentas por cobrar?"*

**Respuesta: NUNCA.** El sistema cuenta con arquitectura desacoplada:

Para actualizar el sistema a una nueva versión, solo ejecutas:

```bash
bash update.sh
```

### Lo que hace `update.sh` automáticamente:
1. **Guarda un respaldo preventivo obligatorio** de tu base de datos en `./backups/pre_update_YYYYMMDD_HHMMSS.db`.
2. Descarga el código nuevo de GitHub.
3. Recompila la aplicación web.
4. Aplica las nuevas tablas o campos a la base de datos sin borrar las filas existentes (`prisma db push`).
5. Reinicia el servicio. Si algo sale mal, el script te indica cómo volver al punto anterior con 1 tecla.

---

## 10. Paso 7: Respaldos Automáticos Diarios

### Opción A: Desde el propio sistema visual
En cualquier momento, tú o tu administrador pueden ir en el sistema a:
`Ajustes -> Centro de Respaldos -> [Descargar Respaldo (.db)]`
Y se descargará el archivo completo a tu computadora personal en 2 segundos.

### Opción B: Copia automática todas las noches en el servidor
Para que el servidor respalde automáticamente la base de datos y todas las fotos de productos todas las noches a las 2:00 AM:

1. Abre el programador de tareas de Linux:
   ```bash
   crontab -e
   ```
   *(Si te pregunta qué editor usar, elige el número 1 para `nano`).*
2. Ve al final del archivo y pega esta línea:
   ```text
   0 2 * * * /bin/bash /root/ferremax/backup-cron.sh >> /root/ferremax/backups/cron.log 2>&1
   ```
3. Guarda (`Ctrl + O`, `ENTER`) y sal (`Ctrl + X`).

Cada noche, el servidor creará un archivo comprimido `.tar.gz` con la base de datos y fotos, y eliminará automáticamente los respaldos que tengan más de 30 días para no saturar el disco.

---

## 11. Preguntas Frecuentes y Solución de Problemas

### ¿Qué comandos útiles de Docker debo conocer?
| Necesidad | Comando |
| :--- | :--- |
| Ver si el sistema está encendido | `docker compose ps` |
| Ver los registros y errores en tiempo real | `docker compose logs -f` |
| Reiniciar el sistema si se congeló | `docker compose restart` |
| Detener el sistema | `docker compose down` |
| Encender el sistema | `docker compose up -d` |

### ¿Qué pasa si se va la luz o reinician el VPS?
Docker tiene configurado `restart: unless-stopped`. Cuando el servidor vuelva a encender, el sistema FerreMax, la base de datos y el proxy SSL arrancarán **solos automáticamente** sin que tengas que intervenir.

### ¿Puedo descargar el archivo de la base de datos a mi laptop?
**Sí.** El archivo físico en el servidor es `/root/ferremax/data/dev.db`. Puedes descargarlo con FileZilla (SFTP) o simplemente haciendo clic en el botón **Descargar Respaldo (.db)** desde el navegador en la pestaña de Ajustes del sistema.

### ¿Cómo restauro una copia de seguridad vieja?
- **Desde la interfaz web:** Ve a Ajustes -> Centro de Respaldos -> `Restaurar Base de Datos` -> Selecciona tu archivo `.db`.
- **Desde la consola Linux:**
  ```bash
  cp ./backups/tu_copia_de_seguridad.db ./data/dev.db
  docker compose restart ferremax
  ```

---

*¡Felicidades! Con esta infraestructura tienes un sistema comercial con nivel de disponibilidad empresarial, alta velocidad, seguro y 100% bajo tu control.*
