# 🚀 FerreMax — Guía de Uso del Sistema Integrado

Bienvenido al sistema **FerreMax (Core-Business Suite)** adaptado para el mercado venezolano. El frontend interactivo y el backend API con base de datos ya están conectados y funcionando en tiempo real.

---

## 📌 ¿Cómo abrir y usar el sistema?

### 1. El Backend API (Servidor)
El backend está programado en **Node.js + TypeScript** sobre una base de datos relacional persistente (**Prisma ORM**).
* **Estado actual:** El servidor ya está corriendo en segundo plano en:  
  `http://localhost:4000`
* **Verificar salud del servidor:** Abre en tu navegador [http://localhost:4000/health](http://localhost:4000/health).  
  Verás la confirmación de que la API está en línea junto con la **Tasa Oficial del BCV** activa.
* **Si alguna vez reinicias tu computadora y deseas encender el servidor:**  
  Abre una terminal PowerShell en la carpeta `backend` y ejecuta:
  ```powershell
  npm run dev
  ```

---

### 2. Abrir la Tienda Online y el Panel Administrativo
Simplemente haz doble clic sobre el archivo:  
👉 **`Prototipo Sistema Integrado empresa.html`** (en esta misma carpeta) para abrirlo en Chrome, Edge o tu navegador preferido.

---

## 🛒 Pruebas que puedes realizar ahora mismo

### A. Catálogo Bimoneda y Tienda Online
1. Abre `Prototipo Sistema Integrado empresa.html`.
2. Verás en el encabezado superior el badge verde en vivo:  
   `● BCV: Bs. 52.50`
3. Todos los productos (taladro percutor, martillos, cables, pinturas, bombas de agua) muestran su precio dual:  
   **Dólares ($) y Bolívares (Bs.) calculados automáticamente a la tasa oficial del día**.
4. Agrega un producto al carrito y ve al Checkout:
   * Puedes elegir **Pago Móvil** o **Efectivo**.
   * Ingresa tus datos y confirma el pedido.
   * La orden se guardará automáticamente en la base de datos con folio correlativo (ej. `FM-1003`) y descontará el stock en tiempo real.

---

### B. Panel Administrativo y Punto de Venta (POS)
1. En la esquina superior derecha de la tienda, haz clic en **"Panel admin"** (o ve a `#/login`).
2. Tienes 3 usuarios reales registrados en la base de datos:

| Rol | Correo | Contraseña | Permisos |
| :--- | :--- | :--- | :--- |
| **Administrador** | `admin@ferremax.ve` | `Admin1234!` | Acceso total a todos los módulos y configuración |
| **Cajero (POS)** | `caja1@ferremax.ve` | `Caja1234!` | Punto de venta, pedidos y clientes |
| **Almacén** | `almacen@ferremax.ve` | `Almacen1234!` | Control de inventario, stock y despachos |

> *Tip:* Puedes hacer clic directo en el botón **"Entrar como Administrador"** o **"Cajero"** y el sistema se autenticará automáticamente contra la API emitiendo un token criptográfico JWT real.

3. **En el módulo Punto de Venta (POS / Mostrador):**
   * Agrega productos al ticket haciendo clic sobre ellos.
   * Haz clic en **"Cobrar"**.
   * Selecciona el medio de pago (Efectivo USD o Pago Móvil). Si seleccionas divisas, el sistema calcula de forma exacta el **3% de IGTF** como exige la ley venezolana.
   * Al confirmar, se emite el ticket digital y el inventario se descuenta en la base de datos del servidor.
4. **En el módulo Ventas y Pedidos:**
   * Verás los pedidos realizados desde la tienda online.
   * Puedes hacer clic en **"Verificar pago"** para aprobar una referencia de Pago Móvil con un solo clic.

---

## ⚙️ Estructura del Proyecto

* **`backend/`**: Servidor API REST en TypeScript (Express + Prisma ORM + SQLite/Postgres).
  * `src/services/bcv.service.ts`: Sincronizador de la Tasa Oficial del Banco Central de Venezuela.
  * `src/services/auth.service.ts`: Autenticación segura con JWT y Bcrypt.
  * `src/routes/storefront.routes.ts`: Endpoints públicos para catálogo y checkout.
  * `src/routes/pos.routes.ts`: Cobro rápido en mostrador con cálculo de IGTF.
  * `src/routes/orders.routes.ts`: Gestión de pedidos y verificación de Pago Móvil.
  * `dev.db`: Base de datos SQLite local (cero configuración). Cuando vayas a subirlo a un VPS en producción, basta con apuntar a PostgreSQL en `.env`.
* **`Prototipo Sistema Integrado empresa.html`**: La aplicación web frontend completa (Storefront + Backoffice), ya conectada a la API local.
* **`Prototipo Sistema Integrado empresa.original.html`**: Copia de respaldo del prototipo original intacto.
