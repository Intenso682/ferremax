# 🗺️ Hoja de Ruta Maestra · Proyecto FerreMax / FerreJade

**Fecha de actualización:** 25 de Noviembre de 2026 (Noche — Despliegue VPS Hetzner Completado)  
**Estado general:** 🟢 **100% En Producción en VPS Hetzner (`2.31.188.125`) + Arquitectura Multi-App (3 Apps) + POS Mostrador (Lector Láser)**  
**URL de Producción Principal (VPS Hetzner):**  
👉 **[http://2.31.188.125](http://2.31.188.125)** *(Servidor `novastack` · Proyecto `ProyectoX`)*  
**URL Respaldo en la Nube (Render):** [https://ferremax-473o.onrender.com/#/](https://ferremax-473o.onrender.com/#/)  
**Versión del núcleo:** Core-Business Suite v1.32 (Edición Oficial FerreJade)  
**Cuenta Corporativa Oficial:** `ferrejadepzo@gmail.com` (Google AI Studio, Drive y Sheets)  
**Clave Maestra Escáner IA:** `FERREJADE2026` (también admite `1234`)

---

## 📌 0. Bitácora Reciente (22 – 25 de Noviembre de 2026)

### 🖥️ 1. Rediseño del Punto de Venta (POS) de Mostrador (22 de Noviembre)
- **Eliminación de cuadrícula pesada:** Se reemplazó la grilla masiva de productos por una interfaz ergonómica de mostrador de alta velocidad (`#pos-q`, `#pos-counter-view`).
- **Buscador Predictivo & Lector Láser Plug & Play (HID):**
  - Foco automático en el buscador al abrir el POS y atajos de teclado (`F2` enfocar buscador, `F4` cobrar, `Enter` agregar al ticket, `Esc` limpiar).
  - Compatibilidad nativa con cualquier pistola lectora láser USB / Bluetooth / 2.4 GHz: al leer código de barras o SKU exacto, agrega `+1` al ticket, emite pitido de confirmación Web Audio API, limpia la barra y mantiene el foco listo para el siguiente artículo.
  - Búsqueda predictiva en vivo por nombre, marca, SKU, código de barras o categoría con lista compacta, semáforo de stock y precios duales (**USD** y **Bs. a tasa BCV**).
  - Pantalla inicial limpia con bloque **⚡ Acceso Rápido · Menudeo y Alta Rotación** y enlace directo al **📸 Escáner IA Móvil**.
  - Validado y enviado a GitHub (`main`, commit `b804970`).

### ☁️ 2. Despliegue en Producción VPS Hetzner Multi-App (25 de Noviembre - Noche)
- **Servidor Activo:** `novastack` (Hetzner Cloud `CX23`, Nuremberg, 2 vCPU, 3.7 GB RAM, 38 GB SSD, 2 GB Swap, Ubuntu 24.04 LTS).
- **IP Pública:** `2.31.188.125` · Cortafuegos **UFW** activo (puertos `22`, `80`, `443`).
- **Arquitectura Aislada para 3 Web Apps (`/opt/novastack/`):**
  - **Proxy Inverso (`novastack_proxy`):** Caddy 2 Alpine (`/opt/novastack/proxy/Caddyfile`) conectado a red `novastack_proxy`, listo para HTTPS automático al asignar dominios.
  - **App 1 — FerreMax (`ferremax_app`):** Desplegada en `/opt/novastack/apps/ferremax/` con red aislada `ferremax_internal` y base de datos SQLite persistente en `/opt/novastack/apps/ferremax/data/dev.db`. Verificada en vivo (`http://2.31.188.125/health` -> `200 OK`).
  - **App 2 y App 3 (Espacios Reservados):** `/opt/novastack/apps/app2/` (puerto interno `5000`) y `/opt/novastack/apps/app3/` (puerto interno `6000`), cada una con su `docker-compose.yml.template` (soporte SQLite o PostgreSQL aislado), `data/` y `backups/`.
- **Respaldos Automáticos Diarios:** Script `/opt/novastack/scripts/backup-all.sh` ejecutándose por cron todos los días a las **3:00 AM** con retención de 14 días.
- **Credenciales Privadas:** Resguardadas localmente en [`CREDENCIALES_VPS_PRIVADO.txt`](file:///c:/Users/abc/Downloads/FerreMax%20Proyecto/CREDENCIALES_VPS_PRIVADO.txt) *(excluido de Git por seguridad)*.

---

## 📌 1. Hitos Completados en la Última Sesión (5 de Noviembre de 2026)

### 🚀 1. Escáner Independiente y Autónomo (`escaner_de_productos.html`)
- **Aplicación Dedicada Desacoplada del ERP:** Se extrajo el módulo de escaneo visual y se convirtió en una aplicación web dedicada exclusivamente a la captura y catalogación de productos con IA.
- **Ejecución Directa en 1 Clic (Windows Batch):**
  - Creado el lanzador de doble clic [`Abrir Escaner de Productos.bat`](file:///c:/Users/abc/Downloads/FerreMax%20Proyecto/Abrir%20Escaner%20de%20Productos.bat) tanto en `FerreMax Proyecto` como en `PROYECTO X`.
  - Archivo HTML principal: [`escaner_de_productos.html`](file:///c:/Users/abc/Downloads/FerreMax%20Proyecto/escaner_de_productos.html).
- **Acceso Remoto y Móvil (GitHub Pages):**
  - URL en Vivo: [https://intenso682.github.io/ferremax/escaner_de_productos.html?clave=FERREJADE2026](https://intenso682.github.io/ferremax/escaner_de_productos.html?clave=FERREJADE2026)
- **Control de Acceso por Clave Fija:**
  - Sistema de protección por clave fija corporativa: **`FERREJADE2026`**.
  - Soporte de auto-desbloqueo inmediato pasando `?clave=FERREJADE2026` en la URL.
- **Funcionalidades del Escáner:**
  - Visor en vivo con cámara WebRTC, retícula láser holográfica animada y selector de cámara frontal/trasera.
  - Soporte para linterna (`torch`) y selector alternativo para cargar fotos desde galería o explorador de archivos.
  - Motor Gemini Vision con fallback multi-modelo (`gemini-3.6-flash`, `gemini-3.5-flash`, `gemini-3.8-flash`, `gemini-flash-lite-latest`).
  - Extracción automática de 15 campos de catálogo (Nombre, Marca, Modelo, SKU inteligente, Código de Barras, Categoría, Costo, Precio con margen +35%, Stock, Unidad, Ubicación, Especificaciones y Descripción comercial).
  - Consulta en tiempo real de la tasa oficial del Banco Central de Venezuela (BCV) con conversión instantánea a Bolívares (VES).
  - Historial de productos escaneados en la sesión y botón de exportación directa a formato CSV / Excel.

---

### 📊 2. Hoja de Cálculo Oficial en Google Drive (`ferrejadepzo@gmail.com`)
- **Hoja Creada y Conectada:** Hoja oficial **`FerreJade - Catálogo Maestro`** creada en el Google Drive de la empresa.
  - **ID de la Hoja:** `1L2CzvbImLReOJvGh8V6-6vv_8DfQ3NTEw6e3sL0KWW0`
  - **Enlace Directo:** [https://docs.google.com/spreadsheets/d/1L2CzvbImLReOJvGh8V6-6vv_8DfQ3NTEw6e3sL0KWW0/edit](https://docs.google.com/spreadsheets/d/1L2CzvbImLReOJvGh8V6-6vv_8DfQ3NTEw6e3sL0KWW0/edit)
- **Estructura Formateada:** Pestaña `Catálogo FerreJade` con 16 columnas profesionales:
  - Fila 1 inmovilizada con colores corporativos Verde Jade (`#003333`) y texto en Oro (`#CFB53B`).
  - Columnas: SKU, Código de Barras, Nombre del Producto, Marca, Modelo, Categoría, Costo USD, Precio USD, Margen %, Precio Bs (BCV), Stock Actual, Stock Mínimo, Unidad, Ubicación Almacén, Especificaciones, Descripción / URL Foto.

---

### 🌐 3. Tienda de Aplicaciones NovaStack en Odoo (`novastack.odoo.com`)
- **Adaptación del Catálogo en `repositorio_odoo/index.html` y `live.html`:**
  - Se eliminaron las opciones de pago y marcas de "Modo Prueba".
  - Se configuró el botón principal: `[ 📲 Abrir e Instalar Aplicación de Escáner ]` enlazando directamente al escáner autónomo desbloqueado.
  - **Corrección de Legibilidad:** Se forzó color blanco puro (`#ffffff !important`) con sombra de texto en las insignias superiores de las tarjetas de Odoo para evitar que el framework las pusiera negras.

---

### ⚙️ 4. Control de Versiones y DevOps
- **Repositorio Remoto:** Sincronizado y al día en `https://github.com/Intenso682/ferremax.git` (rama `main`, commit `326c75f`).
- **Push Protection:** Resuelto y blindado contra fugas de credenciales en Git.

---

## 📋 2. Tabla de Estado de Módulos y Tareas

| Módulo / Tarea | Prioridad | Estado | Ubicación / Detalle |
| :--- | :---: | :---: | :--- |
| **Escáner Autónomo con IA** | 🔥 Alta | ✅ **100% Operativo** | [`escaner_de_productos.html`](file:///c:/Users/abc/Downloads/FerreMax%20Proyecto/escaner_de_productos.html) + [Abrir Escaner.bat](file:///c:/Users/abc/Downloads/FerreMax%20Proyecto/Abrir%20Escaner%20de%20Productos.bat) |
| **Hoja Oficial Google Sheets** | 🔥 Alta | ✅ **Conectada** | `FerreJade - Catálogo Maestro` (`1L2CzvbImLReOJvGh8V6-6vv_8DfQ3NTEw6e3sL0KWW0`) |
| **Identidad Corporativa FerreJade** | 🎨 Media | ✅ **100% Operativo** | Logotipo SVG, paleta Verde Jade (`#003333`) y Dorado (`#CFB53B`) |
| **Catálogo NovaStack en Odoo** | 🌐 Media | ✅ **100% Operativo** | Botones limpios, enlace directo al escáner y badges legibles |
| **ERP Completo FerreMax** | 💼 Base | ✅ **100% Operativo** | `index.html` con POS de mostrador (lector láser), inventario, SENIAT y WhatsApp |
| **VPS Multi-App en Hetzner (`ProyectoX`)** | 🔥 Alta | ✅ **100% En Línea** | Servidor `novastack` (`2.31.188.125`), Caddy Proxy + `ferremax_app` + espacios `app2`/`app3` |
| **Flujo Interdepartamental de Despacho** | ⚡ Siguiente | ⏳ **Próximo Paso** | Venta Mostrador ➔ Cobro en Caja ➔ Validación y Entrega en Almacén |
| **Pruebas de Catalogación Física** | 📸 Siguiente | ⏳ **Próximo Paso** | Escanear 10-20 productos ferreteros reales para verificar flujo completo |

---

## 🎯 3. Hoja de Ruta para Reanudar la Próxima Sesión

Al regresar a trabajar en el proyecto, retomaremos en este orden:

1. **Paso 1: Desplegar App 2 y App 3 (cuando estén definidas)**
   - Usar las plantillas ya preparadas en `/opt/novastack/apps/app2/` y `/opt/novastack/apps/app3/` y agregar sus subdominios o puertos en `/opt/novastack/proxy/Caddyfile`.
2. **Paso 2: Dominio Propio y SSL Automático (cuando se adquiera el dominio)**
   - Apuntar el registro DNS `A` del dominio hacia `2.31.188.125` y descomentar el bloque en `/opt/novastack/proxy/Caddyfile`.
3. **Paso 3: Validación Práctica del Escáner y POS con Lector Láser**
   - Abrir el escáner desde la PC ejecutando con doble clic [`Abrir Escaner de Productos.bat`](file:///c:/Users/abc/Downloads/FerreMax%20Proyecto/Abrir%20Escaner%20de%20Productos.bat).
   - O abrirlo desde el teléfono celular escaneando cajas de herramientas/materiales con el enlace:
     `https://intenso682.github.io/ferremax/escaner_de_productos.html?clave=FERREJADE2026`.
   - Realizar 3 escaneos de prueba y verificar el guardado y la exportación.

2. **Paso 2: Conexión Automática del Webhook Apps Script (Opcional)**
   - Si se desea que cada botón de "Guardar" en el escáner agregue automáticamente una nueva fila en Google Sheets en segundo plano sin intervención humana, activar el Webhook de Google Apps Script documentado en `docs/GOOGLE_APPS_SCRIPT_DRIVE_CONNECTOR.js`.

3. **Paso 3: Circuito Operativo de Despacho en FerreMax ERP**
   - Afinar el flujo de venta rápida: Crear ticket en mostrador ➔ Cobro en caja (Efectivo/Pago Móvil/Zelle) ➔ Comprobante de despacho para el bodeguero en almacén.

---

## 🔑 4. Credenciales y Accesos Rápidos

- **Clave Fija del Escáner:** `FERREJADE2026`
- **Hoja Google Sheets Oficial:** [Ver Hoja en Google Drive](https://docs.google.com/spreadsheets/d/1L2CzvbImLReOJvGh8V6-6vv_8DfQ3NTEw6e3sL0KWW0/edit)
- **Correo Corporativo:** `ferrejadepzo@gmail.com`
- **Escáner Web Móvil:** [https://intenso682.github.io/ferremax/escaner_de_productos.html?clave=FERREJADE2026](https://intenso682.github.io/ferremax/escaner_de_productos.html?clave=FERREJADE2026)
- **ERP Web Completo:** [https://intenso682.github.io/ferremax/](https://intenso682.github.io/ferremax/)
- **Repositorio GitHub:** [https://github.com/Intenso682/ferremax](https://github.com/Intenso682/ferremax)
