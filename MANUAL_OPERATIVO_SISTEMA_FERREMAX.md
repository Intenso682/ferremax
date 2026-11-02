# 📖 Manual Operativo Oficial y Guía de Procedimientos - FerreMax SaaS
**Versión de Plataforma:** Core-Business Suite v1.11  
**Dirigido a:** Dueños de negocio, Gerentes, Vendedoras/Cajeros, Encargados de Almacén, Contadores y Personal de Cobranzas.  
**Nivel:** Desde principiante absoluto (paso a paso ilustrado) hasta administración técnica.

---

## 🧭 Índice General del Manual

1. [Filosofía y Reglas de Oro del Sistema](#1-filosofía-y-reglas-de-oro-del-sistema)
2. [Módulo 0: Puesta a Punto Inicial de la Empresa (El Día Cero)](#2-módulo-0-puesta-a-punto-inicial-de-la-empresa-el-día-cero)
   - 2.1 Identidad de Marca Blanca (Logo, Nombre, Eslogan y Colores)
   - 2.2 Datos Fiscales SENIAT e Impuestos (IVA 16% e IGTF 3%)
   - 2.3 Cuentas Bancarias Receptoras (Pago Móvil, Punto, Transferencias, Zelle)
   - 2.4 Tasa Oficial del Dólar BCV
   - 2.5 Creación de Empleados y Asignación de Roles
   - 2.6 Carga Inicial del Catálogo de Productos (Manual y Masiva por CSV)
3. [Módulo 1: Manual de la Vendedora y Cajera (Punto de Venta POS)](#3-módulo-1-manual-de-la-vendedora-y-cajera-punto-de-venta-pos)
   - 3.1 Inicio de Sesión y Verificación de la Tasa BCV
   - 3.2 Búsqueda de Productos (Por Escáner, SKU o Nombre)
   - 3.3 Manejo del Carrito: Cantidades, Precios Duales ($ y Bs.) y Eliminación
   - 3.4 Identificación del Cliente (Cédula V/J/E/G o Cliente Mostrador)
   - 3.5 Cobro según Método de Pago:
     - Efectivo USD (Cálculo automático de IGTF 3% y Vuelto)
     - Pago Móvil (Validación de Banco, Teléfono y Referencia)
     - Punto de Venta (Tarjetas de Débito Nacionales)
     - Venta a Crédito Comercial ("Fiado / A Cuenta" con cupo disponible)
     - Multipago (Dividir la cuenta entre métodos)
   - 3.6 Emisión del Comprobante: WhatsApp 1-Clic, Imagen PNG y PDF
   - 3.7 Auditoría en Vivo a Mitad de Turno (Corte X)
   - 3.8 Cierre de Turno Definitivo con Arqueo Físico (Corte Z)
4. [Módulo 2: Manual del Encargado de Almacén e Inventario](#4-módulo-2-manual-del-encargado-de-almacén-e-inventario)
   - 4.1 Registro de un Producto Nuevo y Ficha Técnica Asistida por IA
   - 4.2 Carga Masiva con Plantilla CSV y Simulacro (Dry-Run)
   - 4.3 Control de Stock Mínimo y Alertas de Reabastecimiento
   - 4.4 Ajuste de Costos y Precios de Venta
5. [Módulo 3: Manual de Cobranzas y Créditos (Cuentas por Cobrar & Abonos)](#5-módulo-3-manual-de-cobranzas-y-créditos-cuentas-por-cobrar--abonos)
   - 5.1 Registro de Clientes y Asignación de Cupo en Dólares ($)
   - 5.2 Semáforo de Deudores y Estado de Cuenta Cronológico
   - 5.3 Cómo Registrar un Abono (Parcial o Total) en Cualquier Moneda
   - 5.4 Emisión del Recibo Oficial de Abono (ABO-xxxx) y Notificación WhatsApp
6. [Módulo 4: Manual del Contador y Auditor](#6-módulo-4-manual-del-contador-y-auditor)
   - 6.1 Revisión de Ventas y Facturación Diaria
   - 6.2 Auditoría de Cortes Z y Conciliación de Discrepancias de Caja
   - 6.3 Desglose de Impuestos Recolectados (IVA 16% e IGTF 3%)
   - 6.4 Exportación de Reportes en Excel/CSV y JSON
7. [Módulo 5: Manual del Administrador General y Dueño del Negocio](#7-módulo-5-manual-del-administrador-general-y-dueño-del-negocio)
   - 7.1 Gestión de Usuarios y Permisos por Pantalla (RBAC)
   - 7.2 Centro de Respaldos: Descargar la Base de Datos (.db) con 1 Clic
   - 7.3 Restauración de Copias de Seguridad en Caso de Emergencia
   - 7.4 Actualizaciones Seguras del Sistema sin Pérdida de Datos
   - 7.5 Puesta a Cero de Operaciones y Fin del Período de Pruebas
8. [Módulo 6: Manual de la Tienda Online (Para Clientes Externos)](#8-módulo-6-manual-de-la-tienda-online-para-clientes-externos)
   - 8.1 Navegación del Catálogo y Filtros por Categoría
   - 8.2 Carrito de Compras y Envío de Pedido a WhatsApp
9. [Preguntas Frecuentes y Guía de Emergencia (FAQ)](#9-preguntas-frecuentes-y-guía-de-emergencia-faq)

---

## 1. Filosofía y Reglas de Oro del Sistema

1. **El precio maestro está en Dólares (USD):** Todos los productos tienen su precio base en dólares. El sistema convierte automáticamente a Bolívares (Bs.) al milisegundo según la tasa oficial del Banco Central de Venezuela (BCV). Nadie tiene que recalcular precios a mano cuando cambia la tasa.
2. **Cero Papel Fiscal Obligatorio:** Todo comprobante, nota de entrega, recibo de abono y cierre de caja se genera en formato digital: se envía por **WhatsApp en 1 clic**, se descarga como **imagen PNG de alta calidad** o se guarda en **PDF**.
3. **Desacoplamiento de Datos:** Las ventas, abonos, clientes y fotos están guardados en una base de datos segura. Cualquier actualización del software o reinicio del servidor **jamás** borra la información.
4. **Claridad para el Cajero:** Cada pantalla está pensada para que un vendedor o cajero opere a máxima velocidad durante las horas de mayor afluencia de clientes.

---

## 2. Módulo 0: Puesta a Punto Inicial de la Empresa (El Día Cero)

> **¿Quién realiza esto?** El Dueño de la empresa o el Administrador General antes de abrir la tienda al público.

### 2.1 Identidad de Marca Blanca (White-Label)
El sistema no está atado a la marca "FerreMax". Puedes vestirlo con los colores y logo de tu propia ferretería:
1. Inicia sesión como Administrador (`admin@ferremax.ve`).
2. En el menú lateral izquierdo, haz clic en **Ajustes** (icono de engranaje).
3. En la sección **Identidad de Marca**:
   - **Nombre Comercial:** Escribe el nombre de tu negocio (ej: *Ferretería El Valle C.A.*).
   - **Eslogan:** Frase comercial (ej: *Materiales de construcción y herramientas al mejor precio*).
   - **Color Primario:** Selecciona el color principal de tu marca (ej: Azul `#1570cd` o Naranja `#ea580c`).
   - **Color Secundario:** Selecciona el color de contraste o acento.
   - **Subir Logotipo:** Haz clic en *Seleccionar Logo* y sube una imagen PNG o JPG cuadrada o rectangular.
4. Haz clic en **Guardar Personalización**.
5. *Resultado:* Inmediatamente la barra superior, la pantalla de login, los recibos de venta, las facturas y la tienda online se vestirán con tus colores y tu logo.

### 2.2 Datos Fiscales SENIAT e Impuestos
1. En la misma pantalla de **Ajustes**, dirígete a la sección **Datos Fiscales SENIAT**:
   - **RIF:** Ingresa el número fiscal (ej: `J-12345678-9`).
   - **Dirección Fiscal:** Dirección completa que aparecerá en comprobantes.
   - **Teléfonos de Contacto:** Teléfonos de atención y cobranzas.
   - **IVA (%):** Por defecto `16%`. Puedes ajustarlo si la normativa cambia.
   - **IGTF Divisas (%):** Por defecto `3%`. Aplica sobre los pagos recibidos en Efectivo USD o divisas.
2. Haz clic en **Guardar Configuración Fiscal**.

### 2.3 Cuentas Bancarias Receptoras
Para que las cajeras y los clientes de la tienda online sepan a dónde transferir o hacer Pago Móvil:
1. En **Ajustes**, ve a **Cuentas Bancarias y Métodos de Pago**:
   - **Pago Móvil:** Banco receptor (ej: *Banesco 0134*), Teléfono receptor (ej: *0414-1234567*) y Cédula/RIF del titular.
   - **Transferencias Bs.:** Número de cuenta de 20 dígitos y nombre del titular.
   - **Zelle:** Correo electrónico autorizado y nombre del titular.
2. Haz clic en **Guardar Cuentas**.

### 2.4 Tasa Oficial del Dólar BCV
1. En la parte superior de cualquier pantalla del sistema, verás el indicador en vivo: `BCV: Bs. XX,XX`.
2. El sistema consulta automáticamente la API del Banco Central de Venezuela varias veces al día.
3. **¿Cómo forzar una actualización manual si el BCV cambia la tasa en la tarde?**
   - Haz clic en el indicador de tasa en la barra superior o ve a **Ajustes -> Tasa BCV**.
   - Haz clic en el botón azul **Sincronizar Tasa Oficial Ahora**.
   - O si deseas ingresar una tasa personalizada manualmente, escribe el valor numérico y presiona **Fijar Tasa Manual**.
4. Todos los precios en bolívares de todo el sistema se actualizarán en menos de 1 segundo.

### 2.5 Creación de Empleados y Asignación de Roles
No todos los empleados deben tener acceso a todo. FerreMax tiene 5 roles predefinidos:
1. Ve a **Ajustes -> Gestión de Usuarios y Personal**.
2. Haz clic en **+ Registrar Nuevo Usuario**:
   - **Nombre Completo:** Ej: *María González*.
   - **Correo Electrónico:** Ej: *caja1@tuempresa.com*.
   - **Teléfono Móvil:** Para comunicaciones internas.
   - **Contraseña Inicial:** Escribe una contraseña de al menos 8 caracteres.
   - **Rol Asignado:**
     - `CASHIER` (Cajero): Solo tiene acceso al Punto de Venta POS, Registro de Abonos y Clientes.
     - `WAREHOUSE` (Almacén): Solo tiene acceso al Inventario y Catálogo de Productos.
     - `ACCOUNTANT` (Contabilidad): Acceso a Ventas, Cortes de Caja, Cuentas por Cobrar y Reportes.
     - `MANAGER` (Encargado de Tienda): Acceso operativo general.
     - `ADMIN` (Administrador): Acceso total a ajustes, respaldos y configuración.
3. Haz clic en **Guardar Usuario**.

### 2.6 Carga Inicial del Catálogo de Productos
Tienes 2 métodos:
- **Método A (Rápido para muchos productos - CSV):** Ve a **Inventario -> Carga Masiva**. Descarga la *Plantilla Oficial CSV*, llénala en Excel con tus códigos, nombres, precios en dólares y stock, y súbela con el botón *Subir y Validar*. El sistema hará un simulacro para avisarte si hay algún error antes de guardarlo.
- **Método B (Manual uno a uno):** Ve a **Inventario -> + Nuevo Producto**. Llena el formulario con SKU, nombre, categoría, precio en dólares y fotos.

---

## 3. Módulo 1: Manual de la Vendedora y Cajera (Punto de Venta POS)

> **Perfil del usuario:** Vendedora de mostrador, cajera de tienda, despachador.  
> **Objetivo:** Atender clientes en mostrador con rapidez, emitir comprobantes digitales sin errores de caja y cerrar el turno cuadrado al centavo.

### 3.1 Inicio de Sesión y Verificación de la Tasa BCV
1. Abre tu navegador (Google Chrome o Edge) e ingresa a la dirección del sistema (ej: `http://servidor-pos:4000` o `https://sistema.tuempresa.com`).
2. Ingresa tu correo de cajera y tu contraseña.
3. El sistema te llevará directamente a la pantalla de **Ventas POS**.
4. **Regla de Oro antes de empezar a vender:** Mira la esquina superior derecha de la pantalla y verifica que el valor **BCV: Bs. XX,XX** coincida con la tasa oficial publicada para el día. Si no coincide, notifica al encargado o haz clic en *Actualizar Tasa*.

### 3.2 Búsqueda de Productos en Mostrador
En la pantalla de Ventas POS tienes 3 formas veloces de buscar productos:
1. **Con Lector Óptico de Código de Barras:** Simplemente apunta la pistola lectora al código de barras del producto. El sistema sonará con un pitido y lo agregará inmediatamente a la cuenta.
2. **Por Teclado en el Buscador:** Haz clic en la barra de búsqueda `[ 🔍 Buscar producto por nombre o SKU... ]`. Escribe las primeras letras (ej: *"cemento"*, *"taladro"*, *"tornillo 2x4"*). La lista se filtrará en tiempo real.
3. **Por Tarjetas Visuales de Categorías:** En la parte inferior verás las categorías con botones rápidos (*Herramientas, Pinturas, Electricidad, Plomería, Construcción*). Haz clic en una categoría para ver los productos correspondientes.

### 3.3 Manejo del Carrito de Ventas
Al seleccionar un producto, aparecerá en la columna derecha (Ticket de Venta):
- **Aumentar o Disminuir Cantidad:** Usa los botones `[+]` y `[-]` al lado de cada ítem, o escribe directamente el número (ej: `10` sacos).
- **Verificación de Precios Duales:** Debajo del nombre de cada artículo verás su precio unitario en dólares (ej: `$5.00`) y su equivalente exacto en bolívares (ej: `Bs. 250,00`).
- **Eliminar un Producto del Ticket:** Haz clic en el icono rojo de basurero `[🗑️]` si el cliente se arrepiente de llevar ese producto.
- **Limpiar Todo:** Si el cliente cancela la compra por completo, presiona el botón rojo **Cancelar Venta / Vaciar Carrito**.

### 3.4 Identificación del Cliente
En la parte superior del Ticket de Venta verás el selector de cliente:
- **Para ventas rápidas de mostrador (compras al contado de paso):** Deja seleccionado **Cliente Mostrador (Contado)**. No es necesario pedir datos personales.
- **Para clientes frecuentes o facturación formal:**
  1. Haz clic en el campo **Cédula / RIF del Cliente**.
  2. Escribe la cédula (ej: `V-14555888` o `J-40123456-1`).
  3. Si el cliente ya está registrado, sus datos aparecerán automáticamente en pantalla junto con su límite de crédito disponible.
  4. Si es un cliente nuevo que desea registrarse, haz clic en **[+ Registrar Cliente]**, escribe su nombre y número de WhatsApp en 10 segundos y listo.

### 3.5 Cobro según Método de Pago
Una vez listos los productos, haz clic en el botón verde grande: **[ Cobrar Ticket ($ XX.XX / Bs. XX.XX) ]**. Se abrirá la ventana modal de cobro:

#### A. Cobro en Efectivo Dólares (USD)
1. Selecciona la opción **Efectivo USD**.
2. **Cálculo de IGTF (3%):** Por ley venezolana, el sistema sumará automáticamente el 3% correspondiente a pagos en divisas.
3. En el campo **Monto Recibido**, escribe con qué billete te paga el cliente (ej: si la cuenta son `$20.60` y el cliente te entrega un billete de `$50`, escribe `50`).
4. El sistema te mostrará en letras verdes gigantes: **Vuelto a entregar: $29.40 (o su equivalente en Bs.)**.
5. Entrega el vuelto y haz clic en **Confirmar Venta**.

#### B. Cobro por Pago Móvil
1. Selecciona la opción **Pago Móvil**.
2. Verás en pantalla los datos de la empresa para dictárselos al cliente si los solicita (Banco, Teléfono, RIF).
3. Pídele al cliente su comprobante en su teléfono.
4. **Campo Obligatorio:** Escribe los **últimos 4 o 6 dígitos de la referencia bancaria** en la casilla *N° de Referencia*.
5. Verifica que el dinero haya ingresado en la cuenta de la empresa o en el teléfono receptor de caja.
6. Haz clic en **Confirmar Venta**.

#### C. Cobro por Punto de Venta (Tarjeta de Débito)
1. Selecciona **Punto de Venta**.
2. Pasa la tarjeta del cliente por el dispositivo físico del banco por el monto en bolívares que indica la pantalla.
3. Escribe los 4 números de referencia que imprime el papelito del punto.
4. Haz clic en **Confirmar Venta**.

#### D. Venta a Crédito Comercial ("Fiado / A Cuenta")
> **¡Atención!** Solo se puede fiar si el cliente está registrado en el sistema y tiene cupo de crédito aprobado.
1. Selecciona el cliente registrado por su cédula o nombre.
2. Si el cliente tiene cupo activo, verás en color verde: `Límite Autorizado: $500.00 | Deuda Actual: $120.00 | Disponible: $380.00`.
3. Selecciona la opción de pago **Crédito Comercial (Fiado)**.
4. **Validación Automática:** Si el ticket supera el disponible (ej: la compra es de `$400` y solo tiene `$380`), el sistema **bloqueará la venta** y te avisará que supera el cupo. Deberá abonar primero o pedir autorización al gerente.
5. Si el saldo es suficiente, haz clic en **Confirmar Venta a Crédito**.
6. La deuda del cliente se actualizará en vivo y la factura quedará registrada como cuenta por cobrar.

#### E. Multipago (Dividir la Cuenta)
Si el cliente quiere pagar una parte en dólares y otra en bolívares:
1. Selecciona **Pago Mixto / Multipago**.
2. Escribe cuánto entrega en Efectivo USD (ej: `$10.00`).
3. El sistema calculará el saldo restante en bolívares (ej: `Bs. 520,00`).
4. Selecciona el segundo método (ej: *Punto de Venta*) y confirma el cobro.

### 3.6 Emisión del Comprobante Digital
Al confirmar la venta, la pantalla mostrará el comprobante emitido con su número secuencial (ej: `FM-1025`):
- **Botón Verde [ Enviar a WhatsApp ]:** Escribe el número del cliente (o si ya estaba registrado, ya viene listo). Haz clic y se abrirá WhatsApp con el mensaje formateado con el detalle de los productos, desglose fiscal e impuestos.
- **Botón Azul [ Descargar Imagen PNG ]:** Genera una imagen nítida en alta resolución tipo recibo de caja para enviarla por correo o Telegram.
- **Botón Gris [ Imprimir / PDF ]:** Abre la vista clásica para imprimir en impresora térmica de 80mm o guardar como PDF en la computadora.
- Haz clic en **Nueva Venta** para limpiar la pantalla y atender al siguiente cliente.

### 3.7 Auditoría en Vivo a Mitad de Turno (Corte X)
Si el gerente o tú desean saber cuánto dinero debería haber en caja a las 2:00 PM sin cerrar el turno:
1. En la pantalla de POS, haz clic en el botón superior **Corte X (Auditoría)**.
2. El sistema te mostrará un resumen sin alterar nada:
   - Total vendido hasta el momento en USD y en Bs.
   - Desglose por método: cuánto entró en Efectivo USD, cuánto en Pago Móvil, cuánto en Punto de Venta y cuánto fiado.
3. Puedes imprimirlo o cerrarlo. La caja sigue abierta operando normalmente.

### 3.8 Cierre de Turno Definitivo con Arqueo Físico (Corte Z)
Al finalizar la jornada de trabajo o el cambio de cajera:
1. En la pantalla de POS, haz clic en el botón **Cierre de Caja (Corte Z)**.
2. **Paso 1: Arqueo Físico (Cuenta el dinero real en la gaveta):**
   - Cuenta tus billetes de dólares en la gaveta y escribe el total en la casilla **Efectivo USD en Gaveta**.
   - Cuenta los bolívares en efectivo y escríbelo en **Efectivo Bs. en Gaveta**.
   - Suma los vouchers del punto de venta y anota el total en **Punto de Venta Declarado**.
   - Verifica los pagos móviles del día y anota el total en **Pago Móvil Declarado**.
3. Haz clic en **Calcular Cuadre de Caja**.
4. **Paso 2: Diagnóstico Automático:**
   - Si todo coincide: Aparecerá un cartel verde: **¡CAJA CUADRADA AL 100%!**.
   - Si sobra dinero: Aparecerá un cartel azul: **SOBRANTE: +$2.50**.
   - Si falta dinero: Aparecerá un cartel rojo: **FALTANTE: -$5.00**.
5. Escribe una nota de turno si ocurrió alguna novedad (ej: *"Se entregó vuelto de $1 con billete deteriorado"*).
6. Haz clic en **Generar Cierre Definitivo (Corte Z)**.
7. Se emitirá el comprobante oficial `Z-xxxx`. Puedes enviarlo inmediatamente por WhatsApp a la gerencia y la caja quedará reseteada en cero para el día siguiente.

---

## 4. Módulo 2: Manual del Encargado de Almacén e Inventario

> **Perfil del usuario:** Almacenista, jefe de compras, despachador de depósito.  
> **Objetivo:** Mantener el stock al día, registrar productos nuevos con sus precios y evitar quiebres de inventario.

### 4.1 Registro de un Producto Nuevo con Asistente de IA
1. Ve al menú lateral y haz clic en **Inventario**.
2. Haz clic en el botón azul **+ Nuevo Producto**.
3. Llena los campos básicos:
   - **Nombre:** Ej: *Taladro Percutor 1/2 Pulgada 650W*.
   - **SKU / Código Interno:** Código único (ej: *TAL-PER-650*).
   - **Código de Barras:** Escanéalo directamente con el lector óptico sobre la caja del producto.
   - **Categoría:** Selecciona *Herramientas Eléctricas*.
   - **Precio de Venta ($ USD):** Ej: `45.00`.
   - **Costo de Reposición ($ USD):** Ej: `30.00` (sirve para calcular tu ganancia real).
   - **Stock Actual:** Cantidad de unidades físicas en el almacén (ej: `12`).
   - **Stock Mínimo de Alerta:** Ej: `3` (cuando queden 3 o menos, el sistema te avisará en amarillo).
4. **Redactor Inteligente de Ficha Técnica con IA:**
   - Haz clic en el botón violeta **[ ✨ Generar Descripción con IA ]**.
   - La inteligencia artificial redactará automáticamente una descripción persuasiva y técnica del producto con viñetas de especificaciones para tu tienda online.
5. Haz clic en **Guardar Producto**.

### 4.2 Carga Masiva de Productos con Excel / CSV
Para subir cientos o miles de productos de una sola vez:
1. Ve a **Inventario -> Carga Masiva**.
2. Haz clic en **Descargar Plantilla CSV Oficial**.
3. Abre el archivo en Excel o Google Sheets. Completa las columnas (`sku`, `name`, `category`, `priceUsd`, `costUsd`, `stock`, `minStock`).
4. Guarda el archivo como formato CSV (delimitado por comas).
5. En FerreMax, haz clic en **Seleccionar Archivo** y súbelo.
6. Haz clic en **Simular Validación (Dry-Run)**:
   - El sistema revisará fila por fila sin alterar la base de datos.
   - Te dirá cuántos productos son nuevos, cuántos van a actualizar precio y si hay algún error o código repetido.
7. Si todo está en verde, haz clic en **Confirmar e Importar al Catálogo**.

---

## 5. Módulo 3: Manual de Cobranzas y Créditos (Cuentas por Cobrar & Abonos)

> **Perfil del usuario:** Administrador, encargado de finanzas, responsable de cuentas por cobrar.  
> **Objetivo:** Controlar las ventas a crédito (fiar), evitar deudas incobrables y emitir recibos oficiales cuando el cliente abone.

### 5.1 Registro de Clientes y Límites de Crédito
1. Ve al menú lateral y selecciona **Clientes & CxC**.
2. Haz clic en **+ Registrar Nuevo Cliente**:
   - Tipo de Documento: `V` (Venezolano), `J` (Empresa/Jurídico), `E` (Extranjero), `G` (Gubernamental).
   - Cédula o RIF (ej: `V-18999444`).
   - Nombre o Razón Social (ej: *Construcciones y Remodelaciones El Ávila C.A.*).
   - Teléfono WhatsApp (ej: `0414-9876543`).
   - Dirección física.
   - **Límite de Crédito Autorizado ($ USD):** Monto máximo que la empresa le permite fiar (ej: `$500.00`). Si no tiene crédito aprobado, déjalo en `$0.00`.
   - **Plazo de Pago (Días):** Elige entre `15 días`, `30 días`, `45 días` o `60 días`.
3. Haz clic en **Guardar Cliente**.

### 5.2 Semáforo de Deudores y Estado de Cuenta
En el panel de **Clientes & CxC** verás 4 tarjetas de resumen financiero en tiempo real:
- **Total Cuentas por Cobrar en USD:** Todo el dinero en la calle que te deben los clientes.
- **Total en Bolívares (Tasa BCV):** El equivalente exacto a la tasa oficial de hoy.
- **Clientes con Saldo Deudor:** Cantidad de personas que tienen pagos pendientes.
- **Cupos Totales Otorgados:** Límite máximo de riesgo de crédito en la empresa.

En la tabla de clientes:
- Los clientes con deuda vencida aparecerán con una etiqueta roja **[PLAZO VENCIDO]**.
- Los clientes con deuda al día aparecerán en amarillo **[PENDIENTE]**.
- Los clientes solventes aparecerán en verde **[SOLVENTE]**.

**Botón Rápido de Cobro por WhatsApp:**
- Al lado de cada cliente con deuda verás el botón verde **[ 💬 Cobrar WhatsApp ]**.
- Al presionarlo, se abre WhatsApp con un mensaje cordial y profesional que le recuerda al cliente su deuda actual en dólares y en bolívares a la tasa BCV del día, junto a los datos de la cuenta bancaria de la empresa para que transfiera.

### 5.3 Cómo Registrar un Abono de un Cliente
Cuando el cliente se acerca a la ferretería o envía una transferencia para pagar parte o la totalidad de su deuda:
1. Ve a **Clientes & CxC**.
2. Busca al cliente por su nombre o cédula.
3. Haz clic en el botón azul **[ 💵 Registrar Abono ]**.
4. En el modal que se abre:
   - Verás la **Deuda Actual** del cliente (ej: `$150.00`).
   - **Monto que Abona ($ USD):** Escribe cuánto está pagando (ej: `$50.00`). El sistema calculará el equivalente en Bolívares en vivo.
   - **Método de Pago del Abono:** Selecciona si pagó por *Pago Móvil*, *Punto de Venta*, *Efectivo USD*, *Transferencia* o *Zelle*.
   - **Número de Referencia:** Escribe el número del comprobante bancario.
   - **Notas:** (Opcional) Ej: *"Abono a cuenta factura de cemento"*.
5. Verás en pantalla el cálculo automático de la **Deuda Restante** (ej: `$100.00`).
6. Haz clic en **Guardar y Emitir Recibo de Abono**.

### 5.4 Emisión del Recibo Oficial de Abono (ABO-xxxx)
Inmediatamente se genera el recibo con folio secuencial único (ej: `ABO-1004`):
- Muestra el nombre y RIF de tu empresa, los datos del cliente, el monto abonado, la tasa BCV aplicada, la deuda previa y el saldo que le queda por pagar.
- Haz clic en **[ Enviar por WhatsApp ]** para que el cliente reciba su comprobante de pago en su celular en el acto.
- Haz clic en **[ Descargar Comprobante PNG ]** si deseas archivarlo.

---

## 6. Módulo 4: Manual del Contador y Auditor

> **Perfil del usuario:** Contador público, auditor interno, analista financiero.  
> **Objetivo:** Verificar la integridad de los ingresos, conciliar el arqueo de los cajeros y exportar libros de ventas fiscales.

### 6.1 Auditoría Histórica de Cierres de Caja (Cortes Z)
1. Ve a **Facturación & Caja -> Historial de Cierres Z**.
2. Verás una tabla cronológica con todos los cierres de caja de todos los turnos y cajeros.
3. Puedes filtrar por fecha, tipo (`Z` o `X`) o buscar por nombre de cajero.
4. **Detección de Anomalías:**
   - La columna **Discrepancia** resalta en rojo si un cajero cerró con faltante y en azul si cerró con sobrante.
5. Haz clic en el botón **[ Ver Detalle ]** de cualquier corte para inspeccionar el desglose completo: fondo de caja inicial, ventas registradas por el sistema versus dinero físico declarado en gaveta.

### 6.2 Desglose Impositivo (IVA 16% e IGTF 3%)
1. En cada corte de caja y en la pantalla de **Ventas**, se desglosa con exactitud:
   - Base Imponible Gravada.
   - Monto total recolectado de **IVA (16%)**.
   - Monto total recolectado de **IGTF en Divisas (3%)**.
2. Estos valores sirven de base directa para la declaración quincenal o mensual del SENIAT.

### 6.3 Exportación de Datos
- En la parte superior del historial de cierres y de ventas tienes el botón **[ 📥 Exportar CSV ]**.
- Descarga una hoja de cálculo limpia compatible con Microsoft Excel para importar directamente en tu software contable o archivar en tus libros tributarios.

---

## 7. Módulo 5: Manual del Administrador General y Dueño del Negocio

> **Perfil del usuario:** Propietario, socio director, gerente general.  
> **Objetivo:** Control total, salvaguarda de datos, copias de seguridad y continuidad operativa del negocio.

### 7.1 Centro de Respaldos de la Base de Datos
Uno de los mayores valores de FerreMax es que **tú eres el único dueño de tu información**:
1. Inicia sesión como Administrador y ve a **Ajustes -> Centro de Respaldos**.
2. **Descarga de 1 Clic a tu Computadora:**
   - Haz clic en el botón verde superior **[ 💾 Descargar Respaldo (.db) ]**.
   - En 2 segundos se descargará a tu laptop el archivo físico completo de la base de datos (ej: `FerreMax_Respaldo_2026-10-17.db`).
   - Contiene todos tus productos, clientes, ventas, abonos, usuarios y configuraciones.
   - **Consejo de Seguridad:** Descarga este archivo todos los viernes y guárdalo en un pendrive o en tu Google Drive personal.
3. **Exportación Universal en JSON:**
   - Haz clic en **[ Exportar JSON Estructurado ]** si deseas ver o auditar toda tu base de datos en texto plano legible.
4. **Crear Snapshot en el Servidor:**
   - Haz clic en **[ + Crear Instantánea en Servidor ]**. El sistema guardará una foto exacta del momento en la carpeta `/backups/` del servidor con fecha y hora.

### 7.2 Restauración Asistida en Caso de Emergencia
Si por error un empleado borró información o se dañó una computadora:
1. Ve a **Ajustes -> Centro de Respaldos**.
2. Haz clic en **[ 🔄 Restaurar Base de Datos ]**.
3. Selecciona tu archivo de respaldo `.db` guardado en tu computadora.
4. **Mecanismo de Doble Red:** Antes de restaurar, el sistema genera automáticamente una copia de seguridad preventiva del estado actual. Si te equivocas de archivo, siempre puedes volver atrás.
5. El sistema se recargará con toda tu información restaurada al 100%.

### 7.3 Actualización Segura del Sistema en Servidor VPS
Cuando haya una nueva versión del software:
1. Abre tu terminal de servidor (SSH) y escribe:
   ```bash
   bash update.sh
   ```
2. El script genera un respaldo obligatorio preventivo, baja la versión nueva, compila y reinicia el servicio sin tocar tu base de datos ni tus fotos.

### 7.4 Puesta a Cero de Operaciones (Fin del Período de Pruebas)
Durante la fase de capacitación y marcha blanca, tu equipo registrará ventas falsas, recibos de abono ficticios y cortes de caja de prueba. Cuando concluyan las pruebas y vayas a inaugurar formalmente la tienda:
1. Inicia sesión como **Administrador** y ve a **Ajustes -> Centro de Respaldos**.
2. En el recuadro rojo destacado, haz clic en **[ 🧹 Finalizar Pruebas y Poner a Cero ]**.
3. **Selecciona el Alcance:**
   - **Limpieza Operativa (Recomendada):** Pesa y elimina todas las órdenes de venta ficticias, abonos y cortes de caja, restablece las deudas a `$0.00` y reinicia el contador de facturas en **#000001**. Conserva 100% intactos tus productos, categorías, cuentas bancarias, logotipo y empleados.
   - **Opciones Adicionales:** Puedes marcar si deseas borrar también los clientes ficticios creados o poner en 0 el stock para realizar un conteo físico inicial.
4. **Respaldo Automático:** El sistema genera una copia de seguridad preventiva (`.db`) antes de purgar nada.
5. **Autorización:** Escribe tu contraseña actual de administrador y presiona **[ Confirmar y Poner Sistema a Cero ]**.
6. ¡Listo! El sistema amanece limpio y virgen para su primera venta real del negocio.

---

## 8. Módulo 6: Manual de la Tienda Online (Para Clientes Externos)

> **Perfil del usuario:** Clientes que compran por internet desde su teléfono o computadora.

1. **Acceso:** El cliente abre la dirección web de tu ferretería (ej: `https://tuferreteria.com`).
2. **Precios en Vivo:** El cliente ve el catálogo completo con fotos, descripciones técnicas y precios duales en dólares y bolívares a la tasa oficial del día.
3. **Filtros:** Puede buscar por palabras clave o hacer clic en las categorías (Herramientas, Pinturas, Electricidad).
4. **Carrito:** Agrega los productos que desea comprar indicando la cantidad.
5. **Checkout:** Selecciona si desea *Retiro en Tienda* o *Delivery*, elige su método de pago estimado y presiona **[ Confirmar Pedido por WhatsApp ]**.
6. Se abre un chat de WhatsApp directo con el equipo de ventas de tu ferretería con el pedido armado, totalizado y listo para ser despachado.

---

## 9. Preguntas Frecuentes y Guía de Emergencia (FAQ)

### P1: ¿Qué hago si el cliente pagó por Pago Móvil pero el dinero no aparece en la cuenta del banco?
**Respuesta:** En Venezuela las plataformas bancarias a veces tienen retrasos de unos minutos. **Regla de seguridad:** Nunca entregues la mercancía sin verificar el saldo en el banco o confirmar con el titular de la cuenta receptora. Pídele al cliente la captura de pantalla con el número de referencia y valida que los datos (banco, teléfono y monto) sean idénticos.

### P2: ¿Qué pasa si un cliente quiere comprar a crédito (fiado) pero no tiene cupo suficiente?
**Respuesta:** El sistema protegerá a la empresa bloqueando la venta si el total supera el crédito disponible. Tienes dos soluciones operativas:
1. El cliente paga la diferencia al contado en efectivo o pago móvil, y se fía solo el monto restante dentro de su cupo.
2. El cliente hace un abono previo a su cuenta para liberar cupo disponible.
3. Si el dueño del negocio aprueba ampliarle el crédito, el administrador va a **Clientes & CxC**, edita el cliente y aumenta su límite de crédito autorizado.

### P3: ¿Qué hago si al hacer el Cierre Z me faltó o sobró dinero físico en gaveta?
**Respuesta:** Sé 100% honesto con el arqueo. Si en el sistema debías tener `$100` y contaste `$98`, anota en la casilla de efectivo exactamente los `$98`. El sistema registrará un faltante de `-$2.00` de forma transparente. En el campo de observaciones, explica lo ocurrido (ej: *"Se entregó vuelto equivocado en ticket FM-1015"*). La gerencia revisará el caso con la auditoría.

### P4: ¿Cómo cambio la tasa del dólar si el Banco Central publica una tasa nueva en la tarde?
**Respuesta:** Haz clic sobre el botón de tasa en la barra superior del sistema o ve a **Ajustes -> Tasa BCV**. Haz clic en **Sincronizar Tasa Oficial Ahora**. Si la página del BCV está lenta o caída, puedes escribir el valor numérico a mano y presionar **Fijar Tasa Manual**. Todos los productos se actualizarán al instante.

### P5: ¿Puedo usar el lector de código de barras desde el primer día?
**Respuesta:** ¡Sí! Cualquier lector óptico USB o inalámbrico funciona de inmediato sin instalar programas. Solo conecta el lector a la computadora de caja, haz clic en el buscador de productos y dispara sobre el código de barras.

---
*Fin del Manual Operativo Oficial · FerreMax SaaS*
