# 🛠️ FerreMax · Estado del Proyecto y Memoria Técnica de Desarrollo
**Fecha de corte:** 23 de Octubre de 2026 (Corte de Mediodía)  
**Versión de la plataforma:** Core-Business Suite v1.19 (Motor Dinámico de Publicidad & Banners Comerciales + Cajas de Texto Reactivas Verde Agua + Acceso Móvil Wi-Fi + 102 Pruebas Automatizadas)  
**Propósito de este documento:** Servir como guía y contexto maestro para continuar el desarrollo sin pérdida de hilo técnico ni funcional.

---

## 1. Visión General del Proyecto
**FerreMax** es una solución integral (E-commerce + Punto de Venta POS + ERP administrativo + Cuentas por Cobrar + Nómina LOTTT + Inteligencia de Negocios Predictiva + Trazabilidad por Seriales/Lotes + Motor de Publicidad y Banners Comerciales + Centro de Respaldos + Despliegue VPS en 1 Clic + Centro de Ayuda & Copiloto IA) diseñada con arquitectura **Marca Blanca (SaaS)** para ofrecerse a cualquier empresa ferretera o comercial en **Venezuela**:

- **Marca Blanca y Personalización Total (White-Label):** El frontend no está atado al nombre "FerreMax". Cualquier empresa cliente puede cargar su propio logotipo corporativo, definir su nombre comercial, eslogan y seleccionar sus 2 colores base (Primario y Secundario) desde el módulo de Ajustes, actualizando en tiempo real la tienda online, el panel administrativo, la pantalla de inicio de sesión, los comprobantes de venta, los recibos de abono y las planillas de nómina.
- **Estilizado Reactivo de Cajas de Texto e Inputs (v1.19 - NUEVO):**
  - **Contraste y Visibilidad:** Eliminación del blanco sobre blanco en inputs colocados sobre tarjetas. Se crearon las variables CSS `--input-bg: rgba(15, 118, 110, 0.055)` y `--input-border: rgba(15, 118, 110, 0.22)` en modo claro (`rgba(20, 184, 166, 0.09)` y `rgba(20, 184, 166, 0.28)` en modo oscuro), otorgando un tono verde agua tenue y translúcido que delimita claramente sus formas contra cualquier fondo.
  - **Interacción y Foco:** En reposo exhibe el tono translúcido; en hover intensifica el borde; y en foco (`focus`) aclara el fondo a blanco limpio (`rgba(255, 255, 255, 0.95)`) con un halo exterior verde agua (`0 0 0 4px var(--accent-soft)`), garantizando máxima legibilidad tipográfica.
  - **Conexión Reactiva a la Identidad:** Vinculado a `applyThemeTokens()`. Si la empresa modifica su color corporativo en Ajustes, todas las cajas de texto adaptan su traslucidez y borde al nuevo color automáticamente.
- **Acceso Multi-Dispositivo Móvil en Red Local Wi-Fi (v1.19 - NUEVO):**
  - El servidor backend Express escucha en `0.0.0.0:4000` y sirve directamente el frontend SPA y los endpoints API.
  - Cualquier teléfono celular, tablet o laptop conectado a la misma red Wi-Fi puede abrir el sistema ingresando en su navegador a `http://192.168.0.101:4000`.
  - La variable `API_URL` se resuelve dinámicamente según `window.location.origin`, permitiendo que el POS táctil, catálogo, filtros y compras operen desde el móvil sin configuración manual.
- **Motor Dinámico de Publicidad y Banners Comerciales (v1.19 - NUEVO):**
  1. **Monetización de Espacios Publicitarios para Marcas Aliadas y Fabricantes:** Capacidad de vender banners publicitarios y espacios destacados a marcas comerciales (ej: DeWalt, Stanley, Bosch, Tubrica, Vencemos, Truper) y gestionarlos al 100% desde el panel de control administrativo sin tocar una sola línea de código y sin reiniciar el servidor.
  2. **4 Slots / Ubicaciones Estratégicas en la Tienda Online:**
     - `top_bar` (Cinta Superior de Anuncio): Franja delgada en el encabezado superior para promociones de delivery nacional gratuito o avisos comerciales de alto impacto.
     - `home_hero` (Portada Principal Patrocinada): Banner de gran formato con llamado a la acción (CTA), gradientes visuales de marca, insignias ("⭐ PATROCINADOR OFICIAL") y fotografía del producto insignia.
     - `catalog_middle` (Separador Comercial en Catálogo): Banner publicitario horizontal insertado naturalmente entre las tarjetas de producto del catálogo.
     - `brands_carousel` (Carrusel de Fabricantes y Marcas Aliadas): Tarjetas interactivas con logotipo oficial, efecto hover y filtro directo a la categoría de la marca.
  3. **Colapso Inteligente a Cero Píxeles (Zero Layout Shift):** Si un slot no tiene banners asignados o el administrador lo desactiva con el interruptor, el espacio colapsa suavemente a 0px de altura sin dejar espacios vacíos, cajas rotas ni alterar el diseño responsivo de la tienda.
  4. **Analítica en Tiempo Real:** Medición automática de Impresiones (Vistas), Clics registrados y Tasa de Conversión (CTR % Promedio) con endpoints dedicados `/api/marketing/metrics` y `/api/marketing/banners/:id/click`.
- **Inteligencia de Negocios Avanzada y Trazabilidad por Seriales/Lotes (v1.18 - Paso 6):**
  1. **Alertas Inteligentes Min/Max Predictivas Dinámicas:** Motor de reposición basado en el Consumo Diario Real ($DCR$) de ventas en caja y el tiempo de respuesta del proveedor (`leadTimeDays`), no con un número estático. Cálculo del Punto de Reorden Dinámico ($ROP = (DCR \times \text{leadTime}) + \text{SafetyStock}$), Días de Inventario Restantes antes del quiebre de stock, clasificación de riesgo semaforizada (`CRITICAL_DEPLETED`, `WARNING_REORDER_NOW`, `HEALTHY`, `OVERSTOCKED`) y cantidad sugerida a ordenar con estimación de capital en USD y Bs. BCV.
  2. **Trazabilidad 360° de Seriales y Lotes (Garantías & Ciclo de Vida Completo):** Hoja de vida digital individual para cada herramienta eléctrica, maquinaria o planta eléctrica:
     - *Adquisición Mayorista:* Proveedor de origen, factura de compra y fecha de recepción.
     - *Venta en Mostrador POS:* Vinculación y activación automática del serial en checkout, asociando cliente con Cédula/RIF, factura u orden POS y fecha de salida.
     - *Auditoría de Garantía Oficial:* Cobertura (12-24 meses), fecha de vencimiento y barra visual interactiva con los días de vigencia restantes.
     - *Tramitación de Devoluciones y Garantías (RMA):* Registro oficial con folio (`RMA-100x`) y dictamen técnico de taller: Reemplazo inmediato (`REPLACED`), Reparación en taller autorizado (`REPAIRED`), Reembolso/Nota de crédito (`REFUNDED`) o Rechazo por mal uso (`REJECTED`).
  3. **Dashboard Gerencial Móvil & Métricas Comerciales en Vivo:** Consulta ejecutiva desde smartphones con ventas del día, margen bruto diario, cuentas por cobrar vs. cuentas por pagar (Capital de Trabajo Neto) y conteo de equipos serializados bajo garantía.
- **Nómina y Pasivos Laborales Bajo la LOTTT (v1.17 - Paso 5):** Motor legal venezolano integral para talento humano:
  1. **Cálculo Automático de Pasivos Laborales (LOTTT Art. 142):** Salario Integral Diario (Base diario + alícuotas utilidades y bono vacacional), doble régimen simultáneo obligatorio: **(A) Garantía Trimestral** (15 días de salario integral por trimestre + 2 días adicionales por año a partir del 2do año) vs. **(B) Cálculo Retroactivo al Cese** (30 días por año al último salario integral devengado), adjudicando con un solo clic el monto legal mayor exigido por la LOTTT.
  2. **Generación de TXT Oficial para Entes Patronales:** Archivos batch listos para cargar en portales gubernamentales venezolanos: **BANAVIH / FAOV** (delimitado por pipes `|`), **INCES** (delimitado por `;`) y **IVSS TIUNA RPE** (delimitado por tabulaciones `\t`).
  3. **Nómina Quincenal con Cruce de Ventas POS:** Cruce reactivo de órdenes cobradas en el POS durante el período para liquidar automáticamente las comisiones (1.5% - 2.0%) a cajeros y asesores de ventas, con Cesta Ticket socialista indexado ($40) y deducciones automáticas de ley (IVSS 4%, FAOV 1%).
- **Multi-moneda nativa:** Precios base en Dólares (USD), conversión y cobro dinámico en Bolívares (Bs.) según la tasa oficial del **Banco Central de Venezuela (BCV)**.
- **Facturación Fiscal SENIAT y Consolidación 1-Clic (v1.16):** Consolidación de Notas de Entrega a Factura Fiscal definitiva con correlativo oficial (`FAC-xxxx`) y número de control (`00-xxxx`), Libro Especial de Ventas en tiempo real con exportación oficial a CSV.
- **Compras Mayoristas & Costos SUNDDE (v1.16):** Recepción mayorista con prorrateo de fletes, Cuentas por Pagar (CxP), retención de IVA (75%/100%) y generación del archivo oficial TXT SENIAT.
- **Centro de Ayuda Integral, Manual Operativo y Copiloto con IA (v1.12):** Sistema de asistencia para principiantes (`MANUAL_OPERATIVO_SISTEMA_FERREMAX.md`) con workflows paso a paso por cargo y Copiloto IA (Google Gemini) con fallback local.
- **Infraestructura de Despliegue en VPS en 1 Clic (v1.11):** Paquete agnóstico con Docker multietapa, Docker Compose, proxy Caddy con SSL automático (HTTPS), scripts `deploy.sh`, `update.sh` y `backup-cron.sh`.
- **Centro de Respaldos y Salvaguarda de Información (v1.10):** Protección total de datos con interfaz rediseñada en cuadrícula responsiva (Grid 4 columnas), descarga 1-clic de la base de datos (`.db`), volcado universal JSON, snapshots fechados y asistente de restauración asistida.

---

## 2. Arquitectura y Estructura de Archivos

### A. Frontend (Interfaz de Usuario)
- **Archivo principal:** `Prototipo Sistema Integrado empresa.html`
- **Ubicación:** Raíz del proyecto (`c:\Users\abc\Downloads\FerreMax Proyecto\`).
- **Naturaleza:** SPA modular reactiva en JavaScript vanilla con EventBus (`Bus.emit`), tokens de diseño CSS dinámicos, modo claro/oscuro y diseño responsivo adaptado a computadoras y smartphones.
- **Módulo de Marketing & Publicidad (`Views.marketing`):**
  - Sub-tab 1: 📢 **Publicidad & Banners Comerciales:** Tablero de control de espacios publicitarios, KPIs de banners activos, impresiones totales, clics registrados y CTR promedio. Filtros por slot, listado de banners con previsualización gráfica, switch de activación instantánea, botón para crear nuevos banners publicitarios y modal completo con selectores de gradiente por marca comercial (DeWalt, Stanley, Bosch, Tubrica, Truper, Vencemos, FerreMax).
  - Sub-tab 2: 🏷️ **Cupones & Automatizaciones:** Gestión de códigos de descuento promocionales validados en checkout y automatizaciones de carrito abandonado.
- **Módulo de Reportes & BI (`Views.reportes`):**
  - Sub-tab 1: ⭐ **Análisis Pareto ABC (80/20):** Concentración de ganancias, productos estrella (Clase A), rotación intermedia (Clase B) y liquidación de inventario inmovilizado ("Huesos" Clase C).
  - Sub-tab 2: 📱 **Dashboard Móvil Ejecutivo:** Flujo de caja en tiempo real, margen bruto del día, cuentas por cobrar, compromisos a proveedores y sugerencias estratégicas.
  - Sub-tab 3: ⚡ **Alertas Min/Max Predictivas:** Semáforo de riesgo de inventario basado en $DCR$ y $ROP$, días restantes de stock, filtros de riesgo (`CRITICAL`, `WARNING`, `HEALTHY`) y sugerencia de compra inmediata.
  - Sub-tab 4: 🛡️ **Trazabilidad & Garantías RMA:** Buscador de seriales por pistola de código de barras o manual, hoja de vida 360°, auditoría de cliente/factura/proveedor, vigencia de garantía con barra de progreso y modal para tramitar RMA con resolución comercial en caliente.
  - Sub-tab 5: 🏦 **Conciliación Bancaria Automática:** Lector multicanal de extractos bancarios TXT/CSV (Banesco, Mercantil, Provincial, BNC, Pago Móvil) cotejando en segundos con ventas POS y recibos de abono.
  - Sub-tab 6: 📈 **Rendimiento General:** KPIs acumulados y gráficos de participación por categoría.
- **Módulo de Ajustes (`Views.ajustes`):**
  - "Centro de Seguridad y Respaldos" con cuadrícula responsiva de 4 tarjetas de acción directa (Descarga SQLite `.db`, Volcado JSON, Snapshots de auditoría y Restauración guiada).

### B. Backend API
- **Directorio:** `backend/`
- **Stack:** Node.js, Express, TypeScript, Prisma ORM, SQLite (`prisma/dev.db`), Axios/Fetch (sincronización BCV en tiempo real con DolarAPI), JWT (`jsonwebtoken`) y bcrypt (`bcryptjs`).
- **Servidor activo:** Ejecutándose en segundo plano en el puerto `4000` (`http://localhost:4000` y `http://192.168.0.101:4000`).
- **Rutas de Publicidad y Banners Comerciales (v1.19):**
  - `GET /api/marketing/banners`: Listado completo de banners comerciales (soporta filtros `?slot=...` y `?activeOnly=true`).
  - `GET /api/marketing/banners/:id`: Detalle individual de un banner.
  - `POST /api/marketing/banners`: Creación de un nuevo banner comercial con gradiente, marca, badge y CTA.
  - `PUT /api/marketing/banners/:id`: Modificación de contenido o pausa/activación en tiempo real.
  - `DELETE /api/marketing/banners/:id`: Eliminación controlada de un banner.
  - `POST /api/marketing/banners/:id/click`: Registro de clics e interacciones atómicas para analítica.
  - `GET /api/marketing/metrics`: Resumen consolidado de impresiones, clics, CTR global y recuento por slot.

---

## 3. Esquema de Base de Datos SQLite (Prisma ORM)

### Modelo de Publicidad y Banners Comerciales (`AdBanner`):
```prisma
model AdBanner {
  id          String    @id @default(uuid())
  slot        String    // "top_bar", "home_hero", "catalog_middle", "brands_carousel"
  title       String
  subtitle    String?
  brandName   String?   // "DeWalt", "Stanley", "Bosch", "Tubrica", "Vencemos", "Truper"
  badgeText   String?   // "PATROCINADOR OFICIAL", "DESCUENTO 20%"
  imageUrl    String?
  linkUrl     String?   // "#/productos", external url
  buttonText  String?   // "Ver Colección", "Comprar Ahora"
  bgGradient  String?   // "linear-gradient(135deg, #0b0f19 0%, #1a2234 45%, #eab308 140%)"
  active      Boolean   @default(true)
  order       Int       @default(0)
  startDate   DateTime?
  endDate     DateTime?
  viewsCount  Int       @default(0)
  clicksCount Int       @default(0)
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt
}
```

---

## 4. Usuarios y Roles Iniciales de Prueba

| Rol | Correo de Acceso | Contraseña Inicial | Pantalla Inicial | Módulos Permitidos |
|---|---|---|---|---|
| **Administrador (`ADMIN`)** | `admin@ferremax.ve` | `Admin1234!` | `/admin/dashboard` | Todos los módulos + Marketing/Banners, Personal, Nómina LOTTT y BI (Acceso Total) |
| **Cajero (`CASHIER`)** | `caja1@ferremax.ve` | `Caja1234!` | `/admin/pos` | POS, Ventas, Clientes (Abonos) |
| **Almacén (`WAREHOUSE`)** | `almacen@ferremax.ve` | `Almacen1234!` | `/admin/inventario` | Inventario, Seriales, Compras, Ventas |
| **Contabilidad (`ACCOUNTANT`)** | `contabilidad@ferremax.ve` | `Conta1234!` | `/admin/dashboard` | Dashboard, Compras, Nómina LOTTT, Facturación & Caja, Reportes |
| **Encargado de Tienda (`MANAGER`)** | `gerente@ferremax.ve` | `Gerente1234!` | `/admin/dashboard` | Dashboard, POS, Inventario, Compras, Nómina LOTTT, BI & Trazabilidad |

---

## 5. Estado Actual del Sistema (v1.19)
- ✅ **Motor Dinámico de Publicidad y Banners Comerciales (v1.19):** 100% completado, probado y en producción local.
  - 9 banners y marcas iniciales sembradas en base de datos.
  - 4 slots activos en la tienda pública (`top_bar`, `home_hero`, `catalog_middle`, `brands_carousel`) con colapso a 0px.
  - Panel administrativo en `Views.marketing` con KPIs, filtros, creación/edición de banners y métricas CTR.
- ✅ **Estilo de Cajas de Texto (Inputs):** Nuevos tokens CSS con verde agua tenue y translúcido (`rgba(15, 118, 110, 0.055)`) con borde definido, eliminando el problema de campos que se perdían contra el fondo blanco de las tarjetas.
- ✅ **Ajustes de UI en Centro de Respaldos (v1.19):** Opciones de descarga y salvaguarda de información reestructuradas en una cuadrícula responsiva limpia y centrada de 4 tarjetas de acción, eliminando textos montados o descentrados.
- ✅ **Batería de Pruebas Automatizadas E2E de Ciclo Completo (v1.19):** **102 de 102 pruebas aprobadas** (100% de éxito), 0 fallas y 0 riesgos operativos. Verificado con `tests/test_full_workflow_suite.js`.
- ✅ **Fases de Prueba Aprobadas en la Suite:**
  - *Fase 0:* Conectividad y Autenticación Administrativa (JWT + Guardián de Roles).
  - *Fase 1:* Depósitos Físicos (Tienda Principal y Galpón Mayorista).
  - *Fase 2:* Definición de Catálogo Ferretero Especializado (Multi-unidad y Seriales).
  - *Fase 3:* Adquisición Mayorista & Cumplimiento Tributario SENIAT (Retención IVA 75% + TXT fiscal).
  - *Fase 4:* Traslado Interno Auditado (`TR-xxxx`).
  - *Fase 5:* Cobro en Mostrador POS (ADN Venezolano, IGTF 3%, Cédula/RIF, Notas a crédito).
  - *Fase 6:* Consolidación Fiscal SENIAT & Libro de Ventas (`FAC-xxxx`, `00-xxxx`, CSV).
  - *Fase 7:* Tesorería, Abonos de Clientes y Conciliación Bancaria Automática.
  - *Fase 8:* Auditoría y Balance de Caja (Corte X y Corte Z).
  - *Fase 9:* Inteligencia de Negocios (BI Pareto ABC 80/20 y Dashboard Gerencial Móvil).
  - *Fase 10:* Centro de Respaldos e Integridad de la Suite.
  - *Fase 11:* Nómina, Pasivos Laborales LOTTT y Entes Patronales (BANAVIH, INCES, IVSS).
  - *Fase 12:* Inteligencia de Negocios Avanzada y Trazabilidad por Seriales/RMA.
  - *Fase 13:* Motor Dinámico de Publicidad y Banners Comerciales (4 slots, creación, tracking de clics y CTR).
- ✅ **Backend API en línea:** Servidor levantado en `http://localhost:4000` (y `http://192.168.0.101:4000`) con sincronización BCV automática.
- ✅ **Frontend SPA Integrado:** Verificado sin errores sintácticos de JavaScript en `Prototipo Sistema Integrado empresa.html`.

---

## 6. Próximos Pasos Recomendados (Para la Tarde)
1. **Paso 7: Despliegue en Servidor VPS en la Nube (Producción):**
   - Ejecutar el paquete automatizado de despliegue `./deploy.sh` con Docker y proxy Caddy con certificado SSL automático (HTTPS).
   - Apuntar el dominio o subdominio comercial del cliente.
2. **Paso 8: Pasarelas de Pago Bancarias Directas (Opcional):**
   - Integración con APIs de Pago Móvil C2P y Débito Inmediato nacional.

---

## 7. Instrucciones para Retomar el Proyecto en la Tarde

### A. Para arrancar el servidor si reiniciaste o cerraste la terminal:
Abre PowerShell en la carpeta del proyecto (`c:\Users\abc\Downloads\FerreMax Proyecto\backend`) y ejecuta:
```powershell
$env:PATH = "C:\Program Files\nodejs;" + $env:PATH
npm.cmd run dev
```
El servidor backend se levantará de inmediato en `http://localhost:4000` y `http://192.168.0.101:4000`.

### B. Para verificar la salud completa de los 14 pilares operativos, fiscales, laborales y de publicidad:
En otra pestaña de PowerShell, ejecuta la batería de pruebas:
```powershell
$env:PATH = "C:\Program Files\nodejs;" + $env:PATH
node tests/test_full_workflow_suite.js
```
Debe arrojar `Pruebas Aprobadas: 102 de 102 (100%)`.

### C. Mensaje para retomar con el Asistente IA al volver:
Copia y pega el siguiente mensaje en la conversación:

> *"Hola, por favor lee el archivo `ESTADO_PROYECTO_FERREMAX.md` en la raíz del proyecto para retomar el desarrollo de FerreMax exactamente por donde lo dejamos en la versión v1.19."*
