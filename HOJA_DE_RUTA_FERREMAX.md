# 🗺️ Hoja de Ruta Maestra · Proyecto FerreMax

**Fecha de actualización:** 2 de Noviembre de 2026 (Corte Nocturno)  
**Estado general:** 🟢 **En Producción / Nube (Render.com) + Repositorio GitHub con CI/CD activo**  
**Versión del núcleo:** Core-Business Suite v1.19  

---

## 1. Hitos Completados Hasta Hoy

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

---

## 2. Hoja de Ruta para Mañana (Tareas Prioritarias)

Las siguientes tareas quedaron listas y planificadas para iniciar en la próxima sesión:

| Prioridad | Módulo / Tarea | Descripción y Objetivo |
| :---: | :--- | :--- |
| **Alta** 🔥 | **Carga Masiva de Inventario (Excel / CSV)** | Implementar importador de catálogo para cargar listas completas de productos ferreteros con SKU, descripción, precio USD, costo, stock y categoría en 1 clic. |
| **Alta** 🔥 | **Flujo Interdepartamental de Despacho** | Afinar el circuito operativo: Venta en Mostrador ➔ Cobro en Caja ➔ Validación en Almacén / Entrega física con comprobante. |
| **Media** ⚡ | **Limpieza del Ecosistema de Plugins** | Ocultar o reorganizar los módulos que eran maquetas del prototipo original para que el panel administrativo solo muestre herramientas 100% productivas. |
| **Media** ⚡ | **Carga de Datos Reales de la Ferretería** | Configurar nombre real del negocio, RIF, dirección física, logotipo de la empresa y cuentas bancarias para Pago Móvil / Transferencias. |
| **Baja** 💡 | **Dominio Personalizado (Opcional)** | Si el cliente dispone de un dominio propio (ej. `sistema.ferremax.com`), vincularlo con certificado SSL gratuito en Render. |

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
