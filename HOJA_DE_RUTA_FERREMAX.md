# 🗺️ Hoja de Ruta Maestra · Proyecto FerreMax / FerreJade

**Fecha de actualización:** 25 de Noviembre de 2026 (Sesión de Infraestructura VPS Hetzner)  
**Estado general:** 🟢 **100% Operativo en Render + POS Mostrador Rediseñado (Lector Láser) + Listo para Despliegue Multi-App en Hetzner VPS**  
**URL de Producción / Demo Activa en la Nube:**  
👉 **[https://ferremax-473o.onrender.com/#/](https://ferremax-473o.onrender.com/#/)**  
*(Alojado en Render Cloud · Servicio `ferremax-473o`)*  
**Versión del núcleo:** Core-Business Suite v1.31 (Edición Oficial FerreJade)  
**Cuenta Corporativa Oficial:** `ferrejadepzo@gmail.com` (Google AI Studio, Drive y Sheets)  
**Clave Maestra de Acceso:** `FERREJADE2026` (también admite `1234`)

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

### ☁️ 2. Preparación de Infraestructura VPS en Hetzner Cloud (25 de Noviembre)
- **Objetivo Arquitectónico:** Preparar 1 único VPS en Hetzner (Ubuntu 24.04) para alojar **3 aplicaciones web independientes**, cada una con su propio contenedor Docker, su propia base de datos aislada y proxy inverso Caddy con HTTPS/SSL automático.
  - **App 1 (Inmediata):** FerreMax / FerreJade (ERP + POS + Escáner IA).
  - **App 2 y App 3:** Espacios/plantillas aisladas listas en el VPS mientras se definen las otras 2 web apps.
- **Credenciales y Acceso Preparado:**
  - Cuenta Hetzner registrada (`Client number: K1175896926`, login `jkettin@gmail.com`).
  - Par de llaves SSH Ed25519 generado localmente en `C:\Users\abc\.ssh\id_ed25519` y `id_ed25519.pub` para conexión automática desde Windows.
  - Librería `ssh2` instalada en `backend/node_modules/ssh2` para automatizar el aprovisionamiento remoto del VPS.
- **Estado actual (en espera del usuario):** Pendiente completar la verificación de cuenta en `https://accounts.hetzner.com` (sección *Verification*) para que Hetzner habilite la creación del proyecto **`Proyecto X`** y del primer servidor VPS Ubuntu 24.04.

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
| **VPS Multi-App en Hetzner (`Proyecto X`)** | 🔥 Alta | ⏳ **En Verificación** | Cuenta creada (`K1175896926`) + SSH Key lista. Falta verificación en `accounts.hetzner.com` y crear servidor |
| **Flujo Interdepartamental de Despacho** | ⚡ Siguiente | ⏳ **Próximo Paso** | Venta Mostrador ➔ Cobro en Caja ➔ Validación y Entrega en Almacén |
| **Pruebas de Catalogación Física** | 📸 Siguiente | ⏳ **Próximo Paso** | Escanear 10-20 productos ferreteros reales para verificar flujo completo |

---

## 🎯 3. Hoja de Ruta para Reanudar la Próxima Sesión

Al regresar a trabajar en el proyecto, retomaremos exactamente en este orden:

1. **Paso 1 (Prioridad Inmediata): Completar Verificación y Desplegar en Hetzner VPS**
   - Terminar verificación en `https://accounts.hetzner.com` -> *Verification*.
   - En `https://console.hetzner.com`, crear el proyecto **`Proyecto X`** y un servidor **Ubuntu 24.04** pegando la llave SSH pública (`C:\Users\abc\.ssh\id_ed25519.pub`).
   - Pasar la **IP pública (IPv4)** del VPS para conectarnos vía SSH y configurar Docker + Caddy + estructura aislada para **3 web apps independientes con bases de datos separadas**, desplegando **FerreMax** como App 1.

2. **Paso 2: Validación Práctica del Escáner y POS con Lector Láser**
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
