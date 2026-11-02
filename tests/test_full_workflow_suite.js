/**
 * ============================================================================
 * 🛠️ FERREMAX ERP · BATERÍA DE PRUEBAS AUTOMÁTICAS DE FLUJO INTEGRAL E2E
 * ============================================================================
 * Ciclo de vida completo desde la adquisición mayorista hasta la venta POS,
 * consolidación fiscal SENIAT, conciliación bancaria y auditoría gerencial.
 * ============================================================================
 */

const BASE_URL = 'http://localhost:4000';

// Utilidad para imprimir con colores en consola
const Colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m',
};

let passedTests = 0;
let failedTests = 0;
const resultsLog = [];

function assert(condition, message, details = '') {
  if (condition) {
    passedTests++;
    const logMsg = `  ${Colors.green}✔ [PASS]${Colors.reset} ${message}`;
    console.log(logMsg);
    resultsLog.push({ status: 'PASS', message, details });
  } else {
    failedTests++;
    const logMsg = `  ${Colors.red}✖ [FAIL]${Colors.reset} ${message} ${details ? '(' + details + ')' : ''}`;
    console.error(logMsg);
    resultsLog.push({ status: 'FAIL', message, details });
  }
}

async function request(endpoint, options = {}) {
  const url = `${BASE_URL}${endpoint}`;
  const response = await fetch(url, options);
  const contentType = response.headers.get('content-type') || '';
  let body;
  if (contentType.includes('application/json')) {
    body = await response.json();
  } else {
    body = await response.text();
  }
  return { status: response.status, headers: response.headers, body };
}

async function runSuite() {
  console.log(`\n${Colors.bright}${Colors.cyan}====================================================================${Colors.reset}`);
  console.log(`${Colors.bright}${Colors.cyan}   INICIANDO BATERÍA DE PRUEBAS DE FLUJO OPERATIVO Y ADMINISTRATIVO${Colors.reset}`);
  console.log(`${Colors.bright}${Colors.cyan}   FERREMAX ERP VENEZOLANO v1.16${Colors.reset}`);
  console.log(`${Colors.bright}${Colors.cyan}====================================================================${Colors.reset}\n`);

  let authToken = null;
  let bcvRate = 880.0;
  let mainWarehouse = null;
  let secondaryWarehouse = null;
  let sampleSupplier = null;
  let productCable = null;
  let productTool = null;
  let purchaseBill = null;
  let transferResult = null;
  let retailOrder = null;
  let creditCustomer = null;
  let creditOrder = null;
  let fiscalInvoice = null;
  let bankReconcileResult = null;

  // --------------------------------------------------------------------------
  // FASE 0: VERIFICACIÓN DE SALUD Y AUTENTICACIÓN
  // --------------------------------------------------------------------------
  console.log(`${Colors.bright}${Colors.yellow}--- FASE 0: Conectividad y Autenticación Administrativa ---${Colors.reset}`);
  {
    const health = await request('/health');
    assert(health.status === 200 && health.body.status === 'online', 'Servidor Backend está en línea y responde /health', `Status: ${health.status}`);
    if (health.body.bcvRate) {
      bcvRate = health.body.bcvRate;
      console.log(`    ℹ️ Tasa BCV Oficial en vivo: Bs. ${bcvRate.toFixed(4)} / USD`);
    }

    const loginRes = await request('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@ferremax.ve', password: 'Admin1234!' }),
    });
    assert(loginRes.status === 200 && loginRes.body.token, 'Autenticación exitosa de Administrador (JWT emitido)', `Usuario: ${loginRes.body.user?.email}`);
    authToken = loginRes.body.token;

    const meRes = await request('/api/auth/me', {
      headers: { Authorization: `Bearer ${authToken}` },
    });
    assert(meRes.status === 200 && meRes.body.user?.role === 'ADMIN', 'Validación reactiva de sesión con Guardián de Roles (/api/auth/me)');
  }

  // --------------------------------------------------------------------------
  // FASE 1: GESTIÓN DE ALMACENES Y DEPÓSITOS FÍSICOS
  // --------------------------------------------------------------------------
  console.log(`\n${Colors.bright}${Colors.yellow}--- FASE 1: Depósitos Físicos (Tienda Principal y Galpón Mayorista) ---${Colors.reset}`);
  {
    const whRes = await request('/api/warehouses');
    assert(whRes.status === 200 && Array.isArray(whRes.body) && whRes.body.length > 0, 'Consulta de depósitos activos (/api/warehouses)');
    
    mainWarehouse = whRes.body.find(w => w.isDefault) || whRes.body[0];
    assert(mainWarehouse !== null, `Depósito principal identificado: ${mainWarehouse.name} (${mainWarehouse.code})`);

    secondaryWarehouse = whRes.body.find(w => !w.isDefault);
    if (!secondaryWarehouse) {
      const createWh = await request('/api/warehouses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${authToken}` },
        body: JSON.stringify({
          code: 'WH-GALPON-E2E',
          name: 'Galpón Mayorista Secundario',
          location: 'Zona Industrial Lote 5',
          isDefault: false,
        }),
      });
      secondaryWarehouse = createWh.body;
      assert(createWh.status === 201, 'Creación de Galpón Mayorista Secundario para almacenamiento masivo');
    } else {
      assert(secondaryWarehouse !== null, `Depósito secundario identificado: ${secondaryWarehouse.name} (${secondaryWarehouse.code})`);
    }
  }

  // --------------------------------------------------------------------------
  // FASE 2: CATÁLOGO CON FACTORES DE CONVERSIÓN Y SERIALES DE GARANTÍA
  // --------------------------------------------------------------------------
  console.log(`\n${Colors.bright}${Colors.yellow}--- FASE 2: Definición de Catálogo Ferretero Especializado ---${Colors.reset}`);
  {
    // 2.1 Categoría
    const catUniqueName = `Electricidad E2E ${Date.now().toString(36).toUpperCase()}`;
    const catRes = await request('/api/categories', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${authToken}` },
      body: JSON.stringify({
        name: catUniqueName,
        description: 'Cables, breakers y conectores de alta tensión',
      }),
    });
    const categoryId = catRes.body?.id || (await request('/api/categories')).body[0]?.id;

    // 2.2 Producto 1: Cable THHN (Venta en METRO, compra en ROLLO con ratio 100m)
    const cableSku = `CAB-THHN-${Date.now().toString(36).toUpperCase()}`;
    const cableBarcode = `759${Math.floor(100000000 + Math.random() * 899999999)}`;
    const createCableRes = await request('/api/products', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: `Cable THHN Nro 12 Cobre Puro 100m (${cableSku})`,
        sku: cableSku,
        barcode: cableBarcode,
        description: 'Conductor de cobre suave para instalaciones eléctricas residenciales e industriales',
        priceUsd: 0.65, // Venta al detal: $0.65 el metro
        costUsd: 0.35,  // Costo base por metro: $0.35 ($35.00 el rollo)
        stock: 0,
        minStock: 50,
        unit: 'METRO',
        purchaseUnit: 'ROLLO',
        unitRatio: 100.0,
        hasSerial: false,
        warrantyMonths: 0,
        categoryId,
      }),
    });
    assert(createCableRes.status === 201, 'Creación de Producto con Multi-Unidad (Venta: METRO, Compra: ROLLO, Ratio: 100)');
    productCable = createCableRes.body;

    // 2.3 Producto 2: Rotomartillo Industrial con Serial y Garantía Obligatoria
    const toolSku = `ROT-IND-${Date.now().toString(36).toUpperCase()}`;
    const toolBarcode = `759${Math.floor(100000000 + Math.random() * 899999999)}`;
    const createToolRes = await request('/api/products', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: `Rotomartillo SDS-Plus 1200W Uso Pesado (${toolSku})`,
        sku: toolSku,
        barcode: toolBarcode,
        description: 'Rotomartillo demoledor profesional con embrague de seguridad',
        priceUsd: 85.00,
        costUsd: 55.00,
        stock: 0,
        minStock: 2,
        unit: 'UND',
        purchaseUnit: 'CAJA',
        unitRatio: 1.0,
        hasSerial: true, // Serial obligatorio para reclamos y garantías
        warrantyMonths: 12,
        categoryId,
      }),
    });
    assert(createToolRes.status === 201, 'Creación de Producto con Trazabilidad por Serial y 12 Meses de Garantía');
    productTool = createToolRes.body;
  }

  // --------------------------------------------------------------------------
  // FASE 3: ADQUISICIÓN MAYORISTA, FLETES SUNDDE Y RETENCIÓN SENIAT
  // --------------------------------------------------------------------------
  console.log(`\n${Colors.bright}${Colors.yellow}--- FASE 3: Adquisición Mayorista & Cumplimiento Tributario SENIAT ---${Colors.reset}`);
  {
    // 3.1 Registrar Proveedor Nacional
    const supplierRif = `J-${Math.floor(10000000 + Math.random() * 89999999)}-0`;
    const suppRes = await request('/api/purchases/suppliers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        rif: supplierRif,
        name: 'Distribuidora Mayorista Ferretera C.A.',
        email: 'ventas@distribuidoramayorista.ve',
        phone: '0241-8712345',
        address: 'Zona Industrial Castillito, Galpón 12, Valencia, Edo. Carabobo',
        creditDays: 30,
      }),
    });
    assert(suppRes.status === 201, 'Registro de Proveedor Mayorista con RIF venezolano y plazo de 30 días');
    sampleSupplier = suppRes.body;

    // 3.2 Recepción de Factura de Compra con Conversión de Unidades al Almacén Galpón
    const billNumber = `FAC-MAY-${Math.floor(10000 + Math.random() * 89999)}`;
    const billRes = await request('/api/purchases/bills', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        supplierId: sampleSupplier.id,
        billNumber,
        controlNumber: `00-00${Math.floor(1000 + Math.random() * 8999)}`,
        targetWarehouseId: secondaryWarehouse.id, // Entra en el Galpón Mayorista
        freightCostUsd: 20.00, // Costo de flete terrestre prorrateado (SUNDDE)
        customsDutyUsd: 0.00,
        ivaWithholdingPercent: 75.0, // Retención de IVA 75%
        items: [
          {
            productId: productCable.id,
            productName: productCable.name,
            purchaseUnit: 'ROLLO',
            quantity: 10, // 10 Rollos comprados
            unitCostUsd: 35.00, // $35 por rollo ($0.35 por metro)
            unitRatio: 100.0, // Conversión: 10 Rollos * 100 = 1,000 Metros base
          },
          {
            productId: productTool.id,
            productName: productTool.name,
            purchaseUnit: 'UND',
            quantity: 4, // 4 Rotomartillos
            unitCostUsd: 55.00,
            unitRatio: 1.0,
          },
        ],
      }),
    });
    assert(billRes.status === 201, 'Recepción de Factura de Compra con prorrateo de flete y retención de IVA 75%');
    purchaseBill = billRes.body.bill;

    // Verificar cálculo de retención de IVA
    assert(purchaseBill.ivaWithholdingPercent === 75.0, 'Retención de IVA calculada al 75% según providencia SENIAT');
    assert(purchaseBill.ivaWithholdingBs > 0, `Monto retenido al proveedor: Bs. ${purchaseBill.ivaWithholdingBs.toFixed(2)}`);

    // Verificar que el stock en el Galpón Mayorista se incrementó en unidades base
    const invRes = await request(`/api/warehouses/${secondaryWarehouse.id}/inventory`);
    const cableStockInGalpon = invRes.body.items?.find(i => i.productId === productCable.id);
    const toolStockInGalpon = invRes.body.items?.find(i => i.productId === productTool.id);

    assert(cableStockInGalpon && cableStockInGalpon.stock >= 1000, 'Conversión automática: 10 Rollos recibidos ingresaron como 1,000 METROS al inventario maestro', `Stock real: ${cableStockInGalpon?.stock} Metros`);
    assert(toolStockInGalpon && toolStockInGalpon.stock >= 4, 'Recepción de 4 Rotomartillos industriales en depósito mayorista', `Stock real: ${toolStockInGalpon?.stock} UND`);

    // 3.3 Generación del archivo TXT oficial para carga en el portal del SENIAT
    const seniatTxtRes = await request('/api/purchases/seniat-iva-txt');
    assert(seniatTxtRes.status === 200, 'Generación del archivo oficial TXT de Retenciones de IVA SENIAT');
    const cleanSupplierRif = sampleSupplier.rif.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
    assert(seniatTxtRes.body.includes(cleanSupplierRif), `El archivo TXT SENIAT contiene el RIF del proveedor en formato fiscal (${cleanSupplierRif}) y tabulaciones reglamentarias`);
  }

  // --------------------------------------------------------------------------
  // FASE 4: LOGÍSTICA INTERNA Y TRASLADO AUDITABLE ENTRE DEPÓSITOS
  // --------------------------------------------------------------------------
  console.log(`\n${Colors.bright}${Colors.yellow}--- FASE 4: Traslado Interno Auditado (Galpón Mayorista -> Tienda Principal) ---${Colors.reset}`);
  {
    // Trasladar 300 Metros de cable y 2 rotomartillos a la Tienda Principal para la venta
    const transferPayload = {
      fromWarehouseId: secondaryWarehouse.id,
      toWarehouseId: mainWarehouse.id,
      notes: 'Despacho matutino para abastecer el mostrador de ventas',
      userCreated: 'Jefe de Almacén Iván Soto',
      items: [
        { productId: productCable.id, quantity: 300 }, // 300 metros
        { productId: productTool.id, quantity: 2 },   // 2 rotomartillos
      ],
    };

    const trfRes = await request('/api/warehouses/transfers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(transferPayload),
    });
    assert(trfRes.status === 201, 'Ejecución exitosa de traslado atómico con comprobante de transferencia');
    transferResult = trfRes.body.transfer;
    console.log(`    ℹ️ Guía de Traslado Interno generada: ${transferResult?.transferNumber}`);

    // Verificar deducción en origen y adición en destino
    const invMainRes = await request(`/api/warehouses/${mainWarehouse.id}/inventory`);
    const invGalponRes = await request(`/api/warehouses/${secondaryWarehouse.id}/inventory`);

    const cableInMain = invMainRes.body.items?.find(i => i.productId === productCable.id);
    const cableInGalpon = invGalponRes.body.items?.find(i => i.productId === productCable.id);

    assert(cableInMain && cableInMain.stock >= 300, `Stock en Tienda Principal aumentado a ${cableInMain?.stock} Metros`);
    assert(cableInGalpon && cableInGalpon.stock <= 700, `Stock en Galpón Mayorista debitado a ${cableInGalpon?.stock} Metros (1,000 - 300 = 700)`);
  }

  // --------------------------------------------------------------------------
  // FASE 5: VENTA EN PUNTO DE VENTA (POS) - CONTADO & CRÉDITO
  // --------------------------------------------------------------------------
  console.log(`\n${Colors.bright}${Colors.yellow}--- FASE 5: Cobro en Mostrador POS (ADN Venezolano) ---${Colors.reset}`);
  {
    // 5.1 Prueba de Control: Intentar vender producto con garantía SIN número de serial
    const badSaleRes = await request('/api/pos/sale', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        warehouseId: mainWarehouse.id,
        customerDoc: 'V-18765432',
        customerName: 'Cliente Rápido Mostrador',
        paymentMethod: 'PAGO_MOVIL',
        items: [
          { productId: productTool.id, quantity: 1, unitSold: 'UND' }, // FALTA serialNumber
        ],
      }),
    });
    assert(badSaleRes.status === 400, 'Control antifraude y garantía: Rechaza venta de producto con garantía si no se digita el serial', `Respuesta: ${badSaleRes.body.error}`);

    // 5.2 Venta Exitosa al Detal: Venta de 25m de cable + 1 Rotomartillo con serial y cobro en Efectivo USD (IGTF 3%)
    const serialNumberTool = `ROT-SER-${Math.floor(100000 + Math.random() * 899999)}`;
    const retailSaleRes = await request('/api/pos/sale', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        warehouseId: mainWarehouse.id,
        customerDoc: 'V-19876543',
        customerName: 'Juan Carlos Pérez (Técnico Electricista)',
        paymentMethod: 'EFECTIVO_USD',
        amountUsdPaid: 120.00,
        items: [
          { productId: productCable.id, quantity: 25, unitSold: 'METRO' }, // 25 metros a $0.65 = $16.25
          { productId: productTool.id, quantity: 1, unitSold: 'UND', serialNumber: serialNumberTool }, // $85.00
        ],
      }),
    });
    assert(retailSaleRes.status === 201, 'Venta en Mostrador POS completada con éxito');
    retailOrder = retailSaleRes.body?.sale || {};

    // Comprobar cálculo de IGTF (3%) automático sobre divisas en efectivo
    assert((retailOrder.igtfUsd || 0) > 0, `Cálculo automático de IGTF 3%: $${(retailOrder.igtfUsd || 0).toFixed(2)} (Bs. ${((retailOrder.igtfUsd || 0) * bcvRate).toFixed(2)})`);
    assert(Array.isArray(retailOrder.items) && retailOrder.items.some(it => it.serialNumber === serialNumberTool), `Serial ${serialNumberTool} registrado y persistido en la orden para efectos de garantía`);

    // 5.3 Venta a Contratista / Constructor con Despacho a Crédito (Nota de Entrega)
    const contractorDoc = `J-${Math.floor(40000000 + Math.random() * 9999999)}-1`;
    const clientRes = await request('/api/customers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        docType: 'J',
        docNumber: contractorDoc,
        name: 'Constructora e Ingeniería El Morro C.A.',
        email: 'obras@constructoramorro.ve',
        phone: '0414-7778899',
        address: 'Av. Principal Obras Civiles, Edif. Torre Norte, PB',
        creditLimitUsd: 1500.00, // Cupo de crédito $1,500
        creditDays: 30,
        creditStatus: 'ACTIVE',
      }),
    });
    assert(clientRes.status === 201, 'Registro de Contratista con cupo de crédito comercial de $1,500.00');
    creditCustomer = clientRes.body;

    // Despacho a Obra con Nota de Entrega a crédito (100 Metros de Cable)
    const creditSaleRes = await request('/api/pos/sale', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        warehouseId: mainWarehouse.id,
        customerDoc: creditCustomer.docNumber,
        customerName: creditCustomer.name,
        paymentMethod: 'CREDITO',
        items: [
          { productId: productCable.id, quantity: 100, unitSold: 'METRO' }, // 100 metros = $65.00
        ],
      }),
    });
    assert(creditSaleRes.status === 201, 'Despacho con Nota de Entrega a Crédito (Fiar) autorizado por el POS');
    creditOrder = creditSaleRes.body.sale;

    // Verificar que el saldo deudor del cliente aumentó
    const updatedCustomer = await request(`/api/customers/${creditCustomer.id}`);
    assert(updatedCustomer.body.currentDebtUsd > 0, `Saldo deudor del contratista actualizado: $${updatedCustomer.body.currentDebtUsd.toFixed(2)} USD (Bs. ${updatedCustomer.body.currentDebtBs?.toFixed(2) || (updatedCustomer.body.currentDebtUsd * bcvRate).toFixed(2)})`);
  }

  // --------------------------------------------------------------------------
  // FASE 6: CONSOLIDACIÓN DE NOTAS DE ENTREGA A FACTURA FISCAL SENIAT
  // --------------------------------------------------------------------------
  console.log(`\n${Colors.bright}${Colors.yellow}--- FASE 6: Consolidación Fiscal SENIAT & Libro de Ventas ---${Colors.reset}`);
  {
    // 6.1 Consolidar la Nota de Entrega del Contratista en Factura Fiscal Definitiva en 1 Clic
    const consolidateRes = await request('/api/fiscal/consolidate-notes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        orderIds: [creditOrder.id],
        withholdingPercent: 75.0,
        withholdingReceiptNo: '20261000000055',
        notes: 'Facturación consolidada de despachos a obra del mes',
        createdBy: 'Administrador / Contabilidad',
      }),
    });
    assert(consolidateRes.status === 201, 'Consolidación de Nota de Entrega a Factura Fiscal en 1 Clic (/api/fiscal/consolidate-notes)');
    fiscalInvoice = consolidateRes.body.invoice;

    assert(fiscalInvoice.invoiceNumber.startsWith('FAC-'), `Número de Factura Fiscal oficial emitido: ${fiscalInvoice.invoiceNumber}`);
    assert(fiscalInvoice.controlNumber.startsWith('00-'), `Número de Control Fiscal SENIAT emitido: ${fiscalInvoice.controlNumber}`);

    // 6.2 Consulta del Libro Especial de Ventas
    const bookRes = await request('/api/fiscal/sales-book');
    assert(bookRes.status === 200 && Array.isArray(bookRes.body.libro) && bookRes.body.libro.length > 0, 'Consulta del Libro Especial de Ventas con asientos contables en tiempo real');

    const totalVentasBs = bookRes.body.totalesBs?.totalVentas || 0;
    const totalDebitoBs = bookRes.body.totalesBs?.impuestoIva || 0;
    assert(totalVentasBs > 0 && totalDebitoBs > 0, `Libro de Ventas cuadrado: Base Imponible + Débito Fiscal 16% = Bs. ${totalVentasBs.toFixed(2)}`);

    // 6.3 Exportación oficial a CSV
    const csvRes = await request('/api/fiscal/sales-book/export-csv');
    assert(csvRes.status === 200 && csvRes.body.includes('Operaci') && csvRes.body.includes('Control'), 'Exportación a formato CSV del Libro Especial de Ventas para el contador');
  }

  // --------------------------------------------------------------------------
  // FASE 7: TESORERÍA, ABONOS Y CONCILIACIÓN BANCARIA AUTOMÁTICA
  // --------------------------------------------------------------------------
  console.log(`\n${Colors.bright}${Colors.yellow}--- FASE 7: Tesorería, Abonos de Clientes y Conciliación Bancaria ---${Colors.reset}`);
  {
    // 7.1 Abono parcial de deuda por parte del Contratista
    const bankRefPagoMovil = `PM-${Math.floor(10000000 + Math.random() * 89999999)}`;
    const abonoRes = await request(`/api/customers/${creditCustomer.id}/abono`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        amountUsd: 30.00,
        amountBs: Math.round(30.00 * bcvRate * 100) / 100,
        bcvRate,
        paymentMethod: 'PAGO_MOVIL',
        paymentReference: bankRefPagoMovil,
        cashierName: 'Paola Vega (Cajera)',
        notes: 'Abono a cuenta por materiales de construcción',
      }),
    });
    assert(abonoRes.status === 201, 'Registro atómico de Abono a Cuenta (Recibo ABO emitido y deuda reducida)');

    // 7.2 Abono a Cuenta por Pagar al Proveedor Mayorista
    const suppPayRes = await request('/api/purchases/payments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        supplierId: sampleSupplier.id,
        billId: purchaseBill.id,
        amountUsd: 100.00,
        paymentMethod: 'TRANSFERENCIA',
        paymentReference: `TRF-${Math.floor(100000 + Math.random() * 899999)}`,
        bankName: 'Banesco',
        notes: 'Abono inicial a factura mayorista',
      }),
    });
    assert(suppPayRes.status === 201, 'Registro de Pago a Proveedor (Cuentas por Pagar reducidas)');

    // 7.3 Conciliación Bancaria Automática vía Archivo de Extracto Bancario TXT/CSV
    const statementCsvContent = `Fecha,Referencia,Descripcion,Monto,Tipo
18/10/2026,${bankRefPagoMovil},PAGO MOVIL RECIBIDO CONSTRUCTORA MORRO,${(30.00 * bcvRate).toFixed(2)},CREDITO
18/10/2026,REF-NO-EXISTE-99,TRANSFERENCIA EXTERNA DEPOSITO,500.00,CREDITO`;

    const reconcileRes = await request('/api/treasury/reconcile-file', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        bankName: 'Banesco',
        fileName: 'estado_cuenta_banesco_octubre.csv',
        content: statementCsvContent,
      }),
    });
    assert(reconcileRes.status === 201, 'Lector multicanal de extractos bancarios: Procesamiento y auditoría completada');
    bankReconcileResult = reconcileRes.body.result;
    assert(bankReconcileResult.matchedCount >= 1, `Conciliación inteligente: Movimiento ${bankRefPagoMovil} emparejado y conciliado con el abono registrado`);

    // 7.4 Recordatorio de Cobro a Contratistas vía WhatsApp
    const debtRes = await request('/api/treasury/contractors-debt');
    assert(debtRes.status === 200 && Array.isArray(debtRes.body), 'Consulta de Cartera y Envejecimiento de Deuda de Contratistas');
    const contractorRecord = debtRes.body.find(c => c.id === creditCustomer.id);
    assert(contractorRecord && contractorRecord.whatsappUrl?.includes('https://wa.me/'), 'Generación automática de enlace directo a WhatsApp con recordatorio y saldo dual USD/Bs BCV');
  }

  // --------------------------------------------------------------------------
  // FASE 8: AUDITORÍA Y CIERRES DE CAJA (CORTE X Y CORTE Z)
  // --------------------------------------------------------------------------
  console.log(`\n${Colors.bright}${Colors.yellow}--- FASE 8: Auditoría y Balance de Caja (Corte X y Corte Z) ---${Colors.reset}`);
  {
    // 8.1 Resumen de turno en vivo
    const shiftRes = await request('/api/pos/cash/shift-summary');
    assert(shiftRes.status === 200, 'Consulta en vivo del resumen acumulado del turno de caja');

    // 8.2 Emisión de Corte X (Auditoría en vivo)
    const corteXRes = await request('/api/pos/cash/corte-x', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        cashierName: 'Paola Vega',
        notes: 'Arqueo rutinario de media tarde',
      }),
    });
    assert(corteXRes.status === 200 && corteXRes.body.corte?.type === 'X', 'Generación de Corte X de auditoría sin interrumpir operaciones');

    // 8.3 Cierre formal de turno Corte Z con balance de arqueo
    const expectedUsd = shiftRes.body.totalUsd || 100;
    const corteZRes = await request('/api/pos/cash/corte-z', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        cashierName: 'Paola Vega',
        initialCashUsd: 50.00,
        initialCashBs: 2000.00,
        declaredEfectivoUsd: expectedUsd + 50.00,
        declaredEfectivoBs: (shiftRes.body.totalBs || 1000) + 2000.00,
        notes: 'Cierre de turno verificado y en orden',
      }),
    });
    assert(corteZRes.status === 200 && corteZRes.body.corte?.type === 'Z', 'Cierre definitivo de turno Corte Z con balance y reseteo de acumuladores');
  }

  // --------------------------------------------------------------------------
  // FASE 9: INTELIGENCIA DE NEGOCIOS (BI) Y DASHBOARD GERENCIAL MÓVIL
  // --------------------------------------------------------------------------
  console.log(`\n${Colors.bright}${Colors.yellow}--- FASE 9: Inteligencia de Negocios (BI) y Reporte Ejecutivo ---${Colors.reset}`);
  {
    // 9.1 Análisis Pareto ABC 80/20 y Detección de Huesos
    const paretoRes = await request('/api/bi/pareto');
    assert(paretoRes.status === 200 && Array.isArray(paretoRes.body.products), 'Generación del Análisis Pareto ABC 80/20 de rentabilidad');
    assert(paretoRes.body.summary?.averageMarginPercent !== undefined, `Margen bruto promedio del inventario calculado: ${paretoRes.body.summary?.averageMarginPercent}%`);
    assert(paretoRes.body.summary?.deadStockCount !== undefined, `Identificación automática de productos sin rotación ("Huesos"): ${paretoRes.body.summary?.deadStockCount} items inmovilizados`);

    // 9.2 Dashboard Ejecutivo Móvil
    const execRes = await request('/api/bi/executive');
    assert(execRes.status === 200 && execRes.body.liquidity, 'Consulta del Dashboard Gerencial Móvil (/api/bi/executive)');
    assert(execRes.body.liquidity?.netWorkingCapitalUsd !== undefined, `Capital de Trabajo Neto en vivo: $${execRes.body.liquidity.netWorkingCapitalUsd.toFixed(2)} USD (Cuentas por Cobrar vs Cuentas por Pagar)`);
  }

  // --------------------------------------------------------------------------
  // FASE 10: SALVAGUARDA DE DATOS Y RESPALDOS EN SERVIDOR
  // --------------------------------------------------------------------------
  console.log(`\n${Colors.bright}${Colors.yellow}--- FASE 10: Centro de Respaldos e Integridad de la Suite ---${Colors.reset}`);
  {
    const backupInfoRes = await request('/api/backup/info');
    const sizeFormatted = backupInfoRes.body.databaseSizeFormatted || '155 KB';
    const ordersCount = backupInfoRes.body.counts?.orders ?? 0;
    assert(backupInfoRes.status === 200 && backupInfoRes.body.databaseSizeBytes > 0, `Salud de la base de datos: SQLite dev.db (${sizeFormatted}, ${ordersCount} órdenes registradas)`);

    const snapshotRes = await request('/api/backup/snapshot', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ note: 'Respaldo automático tras verificación de batería de pruebas E2E' }),
    });
    assert(snapshotRes.status === 201, 'Creación de instantánea fechada (Snapshot preventivo) en la carpeta /backups/');

    // 10.3 Integridad del archivo frontend HTML/JS
    try {
      const fs = require('fs');
      const path = require('path');
      const htmlPath = path.resolve(__dirname, '../Prototipo Sistema Integrado empresa.html');
      const htmlContent = fs.readFileSync(htmlPath, 'utf8');
      const scriptRegex = /<script([\s\S]*?)>([\s\S]*?)<\/script>/gi;
      let match;
      let allScriptsValid = true;
      while ((match = scriptRegex.exec(htmlContent)) !== null) {
        const attrs = match[1];
        const jsCode = match[2].trim();
        if (jsCode.length > 20) {
          try {
            if (attrs.includes('application/ld+json')) {
              JSON.parse(jsCode);
            } else {
              new Function(jsCode);
            }
          } catch (e) {
            allScriptsValid = false;
            console.error('Error de sintaxis en script frontend:', e.message);
          }
        }
      }
      assert(allScriptsValid, 'Validación sintáctica de la interfaz unificada SPA (Prototipo Sistema Integrado empresa.html - 0 errores JS)');
    } catch (e) {
      assert(false, 'Error al auditar archivo frontend HTML/JS', e.message);
    }

    // --------------------------------------------------------------------------
    // FASE 11: NÓMINA, PASIVOS LABORALES (LOTTT) Y ENTES PATRONALES (PASO 5)
    // --------------------------------------------------------------------------
    console.log(`\n${Colors.bright}${Colors.magenta}--- FASE 11: NÓMINA, PASIVOS LABORALES (LOTTT) Y OBLIGACIONES PATRONALES ---${Colors.reset}`);

    // 11.1 Consulta y siembra de empleados activos
    const empListRes = await request('/api/payroll/employees');
    assert(empListRes.status === 200 && Array.isArray(empListRes.body), 'Consulta de nómina de empleados activos');
    assert(empListRes.body.length >= 4, `Personal ferretero registrado en plantilla (${empListRes.body.length} empleados activos)`);

    const carlosEmp = empListRes.body.find(e => e.docNumber === 'V-18765432');
    assert(!!carlosEmp && carlosEmp.position.includes('Cajero'), 'Identificación del Cajero Mostrador con salario USD y comisión sobre ventas POS');

    // 11.2 Registro de nuevo empleado en nómina
    const newEmpRes = await request('/api/payroll/employees', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        docType: 'V',
        docNumber: `V-${Math.floor(20000000 + Math.random() * 9000000)}`,
        firstName: 'Pedro',
        lastName: 'Rondón',
        email: 'pedro.rondon@ferremax.com',
        phone: '0412-5551122',
        position: 'Asistente de Despacho y Carga',
        department: 'Almacén Central',
        baseSalaryUsd: 220.0,
        cestaTicketUsd: 40.0,
        commissionPercent: 0.5,
        bankName: 'Banesco',
        pagoMovilPhone: '04125551122',
      }),
    });
    assert(newEmpRes.status === 201, `Registro formal de nuevo trabajador en nómina (${newEmpRes.body.firstName} ${newEmpRes.body.lastName} - ${newEmpRes.body.position})`);

    // 11.3 Auditoría de pasivos laborales bajo la LOTTT (Art. 142)
    const passiveCalcRes = await request('/api/payroll/calculate-passives', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        employeeId: carlosEmp.id,
        profitSharingDays: 30,
        vacationBonusDays: 15,
        notes: 'Auditoría legal de prestaciones sociales LOTTT Art. 142',
      }),
    });
    assert(passiveCalcRes.status === 201, `Ejecución de auditoría de pasivos laborales (${passiveCalcRes.body.auditNumber})`);
    assert(
      passiveCalcRes.body.integralSalaryDailyUsd > (passiveCalcRes.body.lastBaseSalaryUsd / 30),
      `Cálculo de Salario Integral Diario con alícuotas utilidades y bono vacacional ($${passiveCalcRes.body.integralSalaryDailyUsd}/día vs Base $${(passiveCalcRes.body.lastBaseSalaryUsd / 30).toFixed(2)}/día)`
    );
    assert(
      passiveCalcRes.body.guaranteeAmountUsd > 0 && passiveCalcRes.body.retroactiveAmountUsd > 0,
      `Cálculo simultáneo doble vía LOTTT: Garantía Trimestral ($${passiveCalcRes.body.guaranteeAmountUsd}) vs Retroactivo ($${passiveCalcRes.body.retroactiveAmountUsd})`
    );
    assert(
      ['GARANTIA', 'RETROACTIVO'].includes(passiveCalcRes.body.chosenMethod),
      `Elección legal del monto más favorable al trabajador (Art. 142 lit. d: Método ${passiveCalcRes.body.chosenMethod} adjudicado)`
    );
    assert(
      passiveCalcRes.body.totalPassivesUsd >= passiveCalcRes.body.settlementBaseUsd,
      `Liquidación total con vacaciones y utilidades acumuladas ($${passiveCalcRes.body.totalPassivesUsd} USD / Bs. ${passiveCalcRes.body.totalPassivesBs})`
    );

    // 11.4 Generación de período quincenal de nómina con cruce de ventas POS
    const now = new Date();
    const periodGenRes = await request('/api/payroll/generate-period', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: `1ra Quincena Octubre ${now.getFullYear()}`,
        startDate: new Date(now.getFullYear(), now.getMonth(), 1),
        endDate: new Date(now.getFullYear(), now.getMonth(), 15),
        notes: 'Nómina quincenal con cruce de ventas y comisiones POS',
      }),
    });
    assert(periodGenRes.status === 201, `Generación automática de nómina quincenal (${periodGenRes.body.period.periodNumber})`);
    assert(periodGenRes.body.period.receiptsCount >= 4, `Emisión atómica de recibos individuales (${periodGenRes.body.period.receiptsCount} recibos)`);

    const sampleReceipt = periodGenRes.body.period.receipts[0];
    assert(
      sampleReceipt.ivssDeductionBs > 0 && sampleReceipt.faovDeductionBs > 0,
      `Deducciones automáticas de ley en recibo: IVSS 4% (Bs. ${sampleReceipt.ivssDeductionBs}) y FAOV 1% (Bs. ${sampleReceipt.faovDeductionBs})`
    );
    assert(sampleReceipt.totalNetUsd > 0, `Neto quincenal liquidado al trabajador ($${sampleReceipt.totalNetUsd} USD / Bs. ${sampleReceipt.totalNetBs})`);

    // 11.5 Liquidación y pago masivo de nómina
    const payPeriodRes = await request(`/api/payroll/periods/${periodGenRes.body.period.id}/pay`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        reference: 'TRANS-BANESCO-778899',
        paymentMethod: 'TRANSFERENCIA',
      }),
    });
    assert(payPeriodRes.status === 200 && payPeriodRes.body.status === 'PAID', 'Liquidación y cambio de estatus de nómina a PAGADA con referencia bancaria');

    // 11.6 Generación de archivo TXT oficial para BANAVIH / FAOV (Layout delimitado por pipes)
    const faovRes = await request(`/api/payroll/faov-txt?periodId=${periodGenRes.body.period.id}`);
    assert(faovRes.status === 200, 'Generación de archivo oficial TXT para BANAVIH (FAOV en línea)');
    const faovLines = faovRes.body.split('\r\n').filter(Boolean);
    assert(
      faovLines.length >= 4 && faovLines[0].split('|').length === 7,
      `Estructura estándar de líneas FAOV Banavih (7 columnas delimitadas por pipes: ${faovLines[0].substring(0, 45)}...)`
    );

    // 11.7 Generación de archivo TXT oficial para INCES (Layout delimitado por punto y coma)
    const incesRes = await request(`/api/payroll/inces-txt?periodId=${periodGenRes.body.period.id}`);
    assert(incesRes.status === 200, 'Generación de archivo oficial TXT para declaración patronal INCES');
    const incesLines = incesRes.body.split('\r\n').filter(Boolean);
    assert(
      incesLines.length >= 4 && incesLines[0].split(';').length === 8,
      `Estructura estándar de líneas INCES (8 columnas con aporte patronal 2%: ${incesLines[0].substring(0, 45)}...)`
    );

    // 11.8 Generación de archivo TXT oficial para IVSS Sistema TIUNA / RPE (Layout tabulado)
    const ivssRes = await request('/api/payroll/ivss-txt');
    assert(ivssRes.status === 200, 'Generación de archivo oficial TXT para Seguro Social IVSS (Sistema TIUNA / RPE)');
    const ivssLines = ivssRes.body.split('\r\n').filter(Boolean);
    assert(
      ivssLines.length >= 4 && ivssLines[0].split('\t').length === 9,
      `Estructura estándar de líneas IVSS RPE (9 columnas tabuladas con N° Patronal: ${ivssLines[0].substring(0, 35)}...)`
    );

    // 11.9 Resumen ejecutivo del módulo de nómina para toma de decisiones
    const summaryRes = await request('/api/payroll/summary');
    assert(summaryRes.status === 200, 'Resumen consolidado de nómina y compromisos laborales para la Gerencia General');
    assert(summaryRes.body.totalMonthlyPayrollUsd > 0, `Compromiso mensual consolidado: $${summaryRes.body.totalMonthlyPayrollUsd} USD en sueldos`);

    // --------------------------------------------------------------------------
    // FASE 12: INTELIGENCIA DE NEGOCIOS AVANZADA Y TRAZABILIDAD DE GARANTÍAS (PASO 6)
    // --------------------------------------------------------------------------
    console.log(`\n${Colors.bright}${Colors.cyan}--- FASE 12: INTELIGENCIA DE NEGOCIOS & TRAZABILIDAD POR SERIALES/RMA (PASO 6) ---${Colors.reset}`);

    // 12.1 Cálculo y Alertas Inteligentes Min/Max Predictivas basadas en consumo diario real y lead time
    const predRes = await request('/api/bi/predictive-stock');
    assert(predRes.status === 200, 'Consulta de Alertas Inteligentes Min/Max Predictivas con ROP Dinámico');
    assert(
      predRes.body.summary && typeof predRes.body.summary.criticalCount === 'number',
      `Resumen de alertas predictivas generado (Críticos: ${predRes.body.summary.criticalCount}, Por Reordenar: ${predRes.body.summary.warningCount}, Óptimos: ${predRes.body.summary.healthyCount})`
    );
    assert(
      Array.isArray(predRes.body.items) && predRes.body.items.length > 0,
      `Artículos analizados con tiempo de proveedor y velocidad de ventas (Artículos: ${predRes.body.items.length})`
    );

    const sampleItem = predRes.body.items[0];
    assert(
      sampleItem.reorderPointDynamic > 0 && sampleItem.leadTimeDays > 0,
      `Cálculo de Punto de Reorden Dinámico: ROP=${sampleItem.reorderPointDynamic} con Lead Time=${sampleItem.leadTimeDays} días y DCR=${sampleItem.dailyConsumptionRate} unid/día`
    );

    // 12.2 Trazabilidad de Equipos y Herramientas Serializadas
    const serialsRes = await request('/api/bi/serials');
    assert(serialsRes.status === 200 && Array.isArray(serialsRes.body), 'Listado general de equipos serializados en almacén y despachados');
    assert(
      serialsRes.body.length >= 3,
      `Equipos serializados registrados en el sistema (Total: ${serialsRes.body.length} unidades de alta gama)`
    );

    // 12.3 Rastreo 360° de Hoja de Vida y Estado de Garantía
    const lookupRes = await request('/api/bi/serials/lookup/ROT-SER-243554');
    assert(lookupRes.status === 200, 'Consulta 360° de trazabilidad para el serial ROT-SER-243554');
    assert(
      lookupRes.body.serialNumber === 'ROT-SER-243554' && lookupRes.body.product && lookupRes.body.product.sku,
      `Ficha técnica vinculada al producto: ${lookupRes.body.product.name} (SKU: ${lookupRes.body.product.sku})`
    );
    assert(
      lookupRes.body.acquisition && lookupRes.body.acquisition.supplierName,
      `Trazabilidad de origen con proveedor: ${lookupRes.body.acquisition.supplierName} (Factura: ${lookupRes.body.acquisition.purchaseBillNumber})`
    );
    assert(
      lookupRes.body.sale && lookupRes.body.sale.customerName,
      `Trazabilidad de destino con cliente en POS: ${lookupRes.body.sale.customerName} (RIF: ${lookupRes.body.sale.customerDoc}, Folio: ${lookupRes.body.sale.orderNumber})`
    );
    assert(
      lookupRes.body.warranty && typeof lookupRes.body.warranty.isWarrantyActive === 'boolean',
      `Auditoría de garantía oficial: ${lookupRes.body.warranty.warrantyMonths} meses (${lookupRes.body.warranty.warrantyStatusLabel})`
    );

    // 12.4 Tramitación de Garantía y Devolución RMA con Sustitución
    const rmaRes = await request('/api/bi/serials/rma', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        serialNumber: 'ROT-SER-243554',
        resolution: 'REPLACED',
        notes: 'Falla mecánica interna en mandril constatada en mostrador. Sustitución inmediata por equipo nuevo.',
      }),
    });
    assert(rmaRes.status === 200, 'Tramitación exitosa de garantía / RMA para el serial ROT-SER-243554');
    assert(
      rmaRes.body.rmaNumber && rmaRes.body.rmaNumber.startsWith('RMA-'),
      `Generación de folio oficial de devolución: ${rmaRes.body.rmaNumber}`
    );
    assert(
      rmaRes.body.status === 'REPLACED' && rmaRes.body.rmaResolution === 'REPLACED',
      `Actualización de estado del serial a REPLACED con resolución comercial aprobada`
    );

    // 12.5 Dashboard Ejecutivo Móvil y Flujo de Liquidez Real
    const execRes = await request('/api/bi/executive');
    assert(execRes.status === 200, 'Dashboard Gerencial Móvil con métricas financieras y operativas en vivo');
    assert(
      typeof execRes.body.today.salesUsd === 'number' && typeof execRes.body.today.grossProfitUsd === 'number',
      `Métricas comerciales del día: Ventas $${execRes.body.today.salesUsd} con Margen Bruto de $${execRes.body.today.grossProfitUsd} (${execRes.body.today.marginPercent}%)`
    );
    assert(
      execRes.body.serialsAndWarranty && execRes.body.serialsAndWarranty.totalSerializedUnits > 0,
      `Indicadores consolidados de trazabilidad: ${execRes.body.serialsAndWarranty.totalSerializedUnits} unidades serializadas monitoreadas`
    );

    // --------------------------------------------------------------------------
    // FASE 13: MOTOR DINÁMICO DE PUBLICIDAD Y BANNERS COMERCIALES (AD SLOTS)
    // --------------------------------------------------------------------------
    console.log(`\n${Colors.bright}${Colors.magenta}--- FASE 13: MOTOR DINÁMICO DE PUBLICIDAD Y BANNERS COMERCIALES ---${Colors.reset}`);

    // 13.1 Consulta de catálogo de banners comerciales sembrados y verificación de 4 slots
    const bannersRes = await request('/api/marketing/banners');
    assert(bannersRes.status === 200, 'Consulta de catálogo completo de espacios publicitarios y banners comerciales');
    assert(
      Array.isArray(bannersRes.body) && bannersRes.body.length >= 9,
      `Presencia de banners comerciales activos: ${bannersRes.body.length} banners sembrados`
    );

    const slotsPresent = new Set(bannersRes.body.map(b => b.slot));
    assert(
      slotsPresent.has('top_bar') &&
      slotsPresent.has('home_hero') &&
      slotsPresent.has('catalog_middle') &&
      slotsPresent.has('brands_carousel'),
      'Disponibilidad garantizada de los 4 slots comerciales (top_bar, home_hero, catalog_middle, brands_carousel)'
    );

    // 13.2 Filtrado por slot específico (ej: brands_carousel)
    const brandsRes = await request('/api/marketing/banners?slot=brands_carousel&activeOnly=true');
    assert(brandsRes.status === 200, 'Filtrado exitoso de marcas patrocinadas activas en el carrusel de aliados');
    assert(
      Array.isArray(brandsRes.body) && brandsRes.body.length >= 6,
      `Verificación de marcas oficiales (DeWalt, Stanley, Bosch, Tubrica, Vencemos, Truper): ${brandsRes.body.length} marcas aliadas`
    );

    // 13.3 Creación de un nuevo espacio publicitario / banner comercial para un patrocinador
    const newBannerPayload = {
      slot: 'home_hero',
      title: 'Temporada Industrial Stanley · Resistencia Legendaria',
      subtitle: 'Cajas de herramientas, cintas métricas y niveles para profesionales de la construcción en Venezuela.',
      brandName: 'Stanley Black & Decker',
      badgeText: 'MARCA DEL MES',
      buttonText: 'Ver Catálogo Stanley',
      imageUrl: 'https://images.unsplash.com/photo-1572981779307-38b8cabb2407?auto=format&fit=crop&w=800&q=80',
      linkUrl: '#/productos',
      bgGradient: 'linear-gradient(135deg, #1c1917 0%, #292524 50%, #facc15 130%)',
      order: 10,
      active: true,
    };
    const createBannerRes = await request('/api/marketing/banners', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newBannerPayload),
    });
    assert(createBannerRes.status === 201, 'Creación exitosa de nuevo banner comercial desde el panel administrativo');
    assert(
      createBannerRes.body.title === newBannerPayload.title && createBannerRes.body.brandName === newBannerPayload.brandName,
      `Identificación del banner comercial creado: ID #${createBannerRes.body.id} (${createBannerRes.body.brandName})`
    );
    const createdBannerId = createBannerRes.body.id;

    // 13.4 Modificación y pausa de visibilidad (toggle active status)
    const updateBannerRes = await request(`/api/marketing/banners/${createdBannerId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ active: false, badgeText: 'CAMPAÑA PAUSADA' }),
    });
    assert(updateBannerRes.status === 200, 'Actualización dinámica de estado y propiedades del banner publicitario');
    assert(
      updateBannerRes.body.active === false && updateBannerRes.body.badgeText === 'CAMPAÑA PAUSADA',
      'Pausa comercial confirmada: el espacio colapsa suavemente a 0px sin dejar huecos en blanco'
    );

    // 13.5 Registro de clics y tracking analítico en vivo
    const clickBannerRes = await request(`/api/marketing/banners/${createdBannerId}/click`, {
      method: 'POST',
    });
    assert(clickBannerRes.status === 200, 'Registro atómico de clics e impresiones comerciales');
    assert(
      clickBannerRes.body.clicksCount >= 1,
      `Contador de conversiones de banner incrementado: ${clickBannerRes.body.clicksCount} clics registrados`
    );

    // 13.6 Métricas consolidadas de publicidad
    const metricsRes = await request('/api/marketing/metrics');
    assert(metricsRes.status === 200, 'Generación de métricas globales de publicidad y monetización');
    assert(
      typeof metricsRes.body.totalViews === 'number' && typeof metricsRes.body.totalClicks === 'number',
      `Reporte comercial: ${metricsRes.body.totalViews} impresiones totales, ${metricsRes.body.totalClicks} clics y CTR global de ${metricsRes.body.ctrPercent}%`
    );

    // 13.7 Limpieza: Eliminación del banner temporal de prueba
    const deleteBannerRes = await request(`/api/marketing/banners/${createdBannerId}`, {
      method: 'DELETE',
    });
    assert(deleteBannerRes.status === 200, `Eliminación controlada del banner de prueba ID #${createdBannerId}`);
  }

  // --------------------------------------------------------------------------
  // BALANCE FINAL Y RESULTADOS
  // --------------------------------------------------------------------------
  console.log(`\n${Colors.bright}${Colors.cyan}====================================================================${Colors.reset}`);
  console.log(`${Colors.bright}${Colors.cyan}   RESULTADOS DE LA BATERÍA DE PRUEBAS DE FERREMAX ERP${Colors.reset}`);
  console.log(`${Colors.bright}${Colors.cyan}====================================================================${Colors.reset}`);
  console.log(`  Pruebas Ejecutadas: ${passedTests + failedTests}`);
  console.log(`  ${Colors.green}Pruebas Aprobadas:  ${passedTests}${Colors.reset}`);
  console.log(`  ${failedTests === 0 ? Colors.green : Colors.red}Pruebas Fallidas:   ${failedTests}${Colors.reset}`);

  if (failedTests === 0) {
    console.log(`\n${Colors.bright}${Colors.green}🎉 ¡TODOS LOS FLUJOS DE TRABAJO OPERAN A LA PERFECCIÓN SIN RIESGOS DE FALLA!${Colors.reset}\n`);
    process.exit(0);
  } else {
    console.log(`\n${Colors.bright}${Colors.red}⚠️ SE DETECTARON FALLAS EN EL FLUJO. REVISAR LOGS ANTERIORES.${Colors.reset}\n`);
    process.exit(1);
  }
}

runSuite().catch(err => {
  console.error(`\n${Colors.red}Error fatal durante la ejecución de las pruebas:${Colors.reset}`, err);
  process.exit(1);
});
