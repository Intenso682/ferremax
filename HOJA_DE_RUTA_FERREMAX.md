# 🗺️ Hoja de Ruta Maestra · Proyecto FerreMax / FerreJade

**Fecha de actualización:** 4 de Noviembre de 2026 (Sesión Nocturna)  
**Estado general:** 🟢 **En Producción / Nube (Render.com) + Repositorio GitHub con CI/CD activo**  
**Versión del núcleo:** Core-Business Suite v1.20 (Edición Oficial FerreJade)  
**Cuenta Corporativa Oficial:** `ferrejadepzo@gmail.com` (Google AI Studio, Drive y Sheets)

---

## 1. Hitos Completados Hasta Hoy

### 🎨 Identidad Oficial FerreJade 100% Integrada en Vectores SVG (4 de Noviembre - Noche)
- **Vectores Oficiales Extraídos:** Creado el archivo maestro [`ferrejade_logo.svg`](file:///c:/Users/abc/Downloads/FerreMax%20Proyecto/uploads/branding/ferrejade_logo.svg) e isotipo [`ferrejade_isotipo.svg`](file:///c:/Users/abc/Downloads/FerreMax%20Proyecto/uploads/branding/ferrejade_isotipo.svg) a partir de los trazos matemáticos Bezier originales.
- **Paleta Corporativa Oficial:**
  - **Verde Jade Profundo:** `#003333`
  - **Oro Mostaza / Dorado FerreJade:** `#CFB53B`
- **Branding en Todo el Sistema:** Aplicado en el encabezado de la tienda, barra lateral administrativa (con isotipo FJ), notas de entrega, recibos y pie de página con el eslogan *"Todo a la mano, como en casa"*.

### 📸 Escáner Móvil Inteligente con IA (Gemini 3.8 Flash Vision)
- **Motor Multimodal en Backend:** Creado el endpoint `POST /api/ai/scan-product` en Node/Express con soporte para imágenes Base64 de alta resolución, modelo `gemini-3.8-flash` y fallback adaptativo.
- **Interfaz Móvil con Cámara Real:**
  - Acceso directo mediante el botón **[ 📸 Escáner IA Móvil ]** en el módulo de Inventario y modal de productos.
  - Visor en vivo con cámara (`facingMode: 'environment'`), retícula de enfoque y haz láser de escaneo animado.
  - Botón de captura instantánea y selector nativo de fotos para galería o móviles con permisos restringidos.
  - **Ficha Automatizada de 15 Columnas:** Rellena automáticamente Nombre, Marca, Modelo, Categoría, Código de Barras (EAN/UPC), SKU sugerido, Stock, Unidad, Ubicación, Garantía y Descripción comercial.
  - **Calculadora Dinámica de Margen:** Al tipear el costo de compra en USD, calcula automáticamente el precio de venta sugerido (+35% de margen).
  - **Modo Catalogación Continua:** Botón **[ 📸 Escanear Siguiente Producto ]** para ingresar decenas de cajas en ráfaga.

---

## 2. Estado de la Hoja de Ruta

| Prioridad | Módulo / Tarea | Estado | Descripción y Objetivo |
| :---: | :--- | :---: | :--- |
| **Paso 1** 🔥 | **API Key de Google AI Studio** | ⏳ Clave por ingresar | Generar la clave gratuita en `aistudio.google.com/app/apikey` con `ferrejadepzo@gmail.com` e ingresarla en Ajustes. |
| **Paso 2** 🔥 | **Implementar Escáner Móvil Gemini** | ✅ **100% Operativo** | Cámara en vivo, visión artificial con Gemini 3.8 Flash y guardado en 1 clic en catálogo. |
| **Paso 3** ⚡ | **Carga Masiva de Inventario (Excel / CSV)** | ✅ **100% Operativo** | Botón de importación masiva y plantilla oficial descargable en el módulo de Inventario. |
| **Paso 4** ⚡ | **Flujo Interdepartamental de Despacho** | ⏳ Siguiente paso | Circuito operativo: Venta en Mostrador ➔ Cobro en Caja ➔ Validación en Almacén / Despacho. |
| **Paso 5** 🎨 | **Carga de Identidad FerreJade** | ✅ **100% Operativo** | SVG vectorial del logotipo, isotipo, colores `#003333` y `#CFB53B`, RIF y datos corporativos. |

### 🚀 Despliegue Cloud & DevOps (100% Operativo)
- **Control de Versiones:** Repositorio remoto conectado en `https://github.com/Intenso682/ferremax` (rama `main`).
- **Pipeline CI/CD Automático:** Cada cambio o mejora que se envíe a GitHub compila y se despliega automáticamente en Render sin intervención manual.
- **Actualizador en 1 Clic:** Creado el script `actualizar-servidor.bat` en la carpeta del proyecto para sincronizar cambios futuros desde Windows con un solo clic.
- **Docker Multietapa:** Optimizado para Node.js 20 Alpine, resolución de variables SQLite (`DATABASE_URL`) y auto-ejecución de migraciones de base de datos (`prisma db push --accept-data-loss`).
- **Nube Gratuita:** Configurado bajo el plan Free de Render ($0/mes) garantizando cero costos fijos de servidor.

### 📱 Funcionalidades Clave Verificadas
- **WhatsApp Integrado y Nativo:** Activo en Punto de Venta (recibos a clientes), Cierre de Caja (Corte Z a gerencia), Cobranzas (recordatorios de pago con saldo en USD y Bs a tasa BCV), Abonos de crédito y cotizaciones de catálogo.
- **Multimoneda Dinámica:** Precios base en USD y conversión automática a Bolívares con tasa oficial del BCV.
- **Facturación SENIAT:** Notas de entrega, correlativos oficiales (`FAC-xxxx`), Libro Especial de Ventas e IGTF 3%.
- **Acceso Multidispositivo:** Funciona en PC, laptops, tablets y teléfonos móviles conectados a la red local o desde Internet mediante la URL de Render.
- **Estabilidad Probada:** Suite de 102 pruebas automatizadas pasando al 100% (`tests/test_full_workflow_suite.js`).

### 🧹 Limpieza y Documentación Comercial (4 de Noviembre)
- **Panel Administrativo Pulido para Producción:** Módulos de maqueta (`plugins`, `devops`, `seguridad`, `roadmap`) aislados bajo "Modo Desarrollador" (desactivado por defecto). El panel muestra únicamente herramientas 100% funcionales (Operaciones, Ventas & Clientes, Administración) con salud real del sistema (SQLite, BCV, SENIAT).
- **Propuesta Comercial de Infraestructura para el Cliente:** Generados documentos ejecutivos listos para enviar:
  - `PROPUESTA_HOSTING_Y_DOMINIO_CLIENTE.txt` (texto plano para WhatsApp / Correo).
  - `PROPUESTA_HOSTING_Y_DOMINIO_CLIENTE.html` (formato corporativo visual con opción de impresión directa a PDF).
  - Incluye opciones detalladas de VPS (Hetzner CX22 por ~$4.50/mes y Vultr Miami por $5-$6/mes) y dominios (.com en Porkbun a $10.37/año sin subidas de renovación y .com.ve en CONATEL).
- **Diseño del Escáner Inteligente con IA (Gemini Vision + Google Drive):**
  - Definida la plantilla oficial de 15 columnas maestras para catalogación masiva (SKU, Código de Barras, Nombre, Marca, Categoría, Precio USD, Costo USD, Stock, Min, Unidad, Ubicación, Garantía, Especificaciones, Descripción, Foto URL).
  - Diseñado el flujo móvil: Foto de la caja ➔ Extracción con Gemini Vision en 2 seg ➔ El usuario solo ingresa costo y precio ➔ Guardado automático por Webhook en Google Sheets y en FerreMax.

---

## 2. Hoja de Ruta para la Próxima Sesión (Prioridades)

Al retomar la sesión con la nueva cuenta de correo de **FerreJade** lista, ejecutaremos:

| Prioridad | Módulo / Tarea | Estado | Descripción y Objetivo |
| :---: | :--- | :---: | :--- |
| **Paso 1** 🔥 | **Vincular Credenciales FerreJade** | ⏳ Listo para iniciar | Configurar la API Key gratuita de Google AI Studio (Gemini) y la hoja de Google Sheets en Drive asociada a la nueva cuenta. |
| **Paso 2** 🔥 | **Implementar Escáner Móvil Gemini** | ⏳ Diseñado | Crear la pantalla móvil PWA con cámara para capturar la caja del producto, extraer el JSON estructurado y enviar la fila a Google Sheets y base de datos. |
| **Paso 3** ⚡ | **Carga Masiva de Inventario (Excel / CSV)** | ⏳ Pendiente | Habilitar el botón de importación masiva de catálogo en 1 clic dentro del módulo de Inventario de FerreMax. |
| **Paso 4** ⚡ | **Flujo Interdepartamental de Despacho** | ⏳ Pendiente | Afinar el circuito operativo: Venta en Mostrador ➔ Cobro en Caja ➔ Validación en Almacén / Entrega física con comprobante. |
| **Paso 5** 🎨 | **Carga de Identidad de Marca FerreJade** | ⏳ Pendiente | Cargar logotipo corporativo desde la carpeta `FerreJade`, configurar RIF, dirección fiscal y cuentas bancarias (Pago Móvil / Transferencias). |

---

## 3. Ficha Técnica y Accesos Rápidos

- **Repositorio GitHub:** [github.com/Intenso682/ferremax](https://github.com/Intenso682/ferremax)
- **Panel Render:** Dashboard de Render con el servicio `ferremax`
- **Ambiente Local:** Servidor Express en puerto `4000` (`http://localhost:4000`)
- **Base de Datos:** SQLite persistente (`backend/prisma/dev.db`)
- **Usuarios de Demostración:**
  - `admin@ferremax.ve` (Rol Administrador General)
  - `caja1@ferremax.ve` (Rol Cajero Mostrador)
  - `almacen@ferremax.ve` (Rol Encargado de Almacén)

---

## 📌 Hito: Integración Oficial FerreJade, C.A. & Conector Google Drive / Sheets (v1.17)
- **Identidad Corporativa Oficial:**
  - Logotipo e Isotipo vectoriales nativos en SVG (`uploads/branding/ferrejade_logo.svg` e `isotipo.svg`).
  - Paleta cromática oficial: Verde Jade Profundo (`#003333`) y Dorado FerreJade (`#CFB53B`).
  - Eslogan oficial: *"Todo a la mano, como en casa"*.
- **Google Gemini Vision IA:**
  - Clave API gratuita activada en base de datos `StoreSetting` y backend `.env`.
  - Cadena de contingencia y resiliencia multi-modelo: `gemini-3.8-flash` -> `gemini-3.6-flash` -> `gemini-3.5-flash` -> `gemini-flash-lite-latest` con protección de timeout (15s).
  - Reconocimiento automático de cajas/etiquetas físicas con extracción de 15 campos maestros y cálculo dinámico de margen (+35%).
- **Conector Cloud Google Drive & Google Sheets (`ferrejadepzo@gmail.com`):**
  - Microservicio serverless sin costo vía Google Apps Script (`docs/GOOGLE_APPS_SCRIPT_DRIVE_CONNECTOR.js`).
  - Sincronización automática de productos escaneados en tiempo real.
  - Almacenamiento automático de la fotografía del empaque en la carpeta *"FerreJade - Fotos de Productos"* de Google Drive con enlace directo en la hoja de cálculo.
  - Botón de envío masivo de catálogo completo a Google Sheets desde el panel de Inventario.
- **Ciclo de Pruebas y Limpieza de Catálogo:**
  - Eliminación granular inmediata fila por fila con liberación de SKU en el botón rojo de papelera `[ 🗑️ ]`.
  - Puesta a Cero de Fábrica (*Factory Reset*) en Ajustes -> Centro de Respaldos para purgar pruebas antes del lanzamiento comercial.
- **Batería de Pruebas Automatizadas:** 102/102 pruebas aprobadas al 100%.
