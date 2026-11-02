import { prisma } from '../prisma';
import { BcvService } from './bcv.service';

export class FiscalService {
  /**
   * Obtiene la siguiente numeración correlativa de factura fiscal y número de control
   */
  static async getNextFiscalNumbers(): Promise<{ invoiceNumber: string; controlNumber: string }> {
    const count = await prisma.invoice.count();
    const nextSeq = count + 1001;
    const invoiceNumber = `FAC-${String(nextSeq).padStart(8, '0')}`;
    const controlNumber = `00-${String(nextSeq).padStart(7, '0')}`;
    return { invoiceNumber, controlNumber };
  }

  /**
   * Crea una Factura Fiscal SENIAT cumpliendo la normativa tributaria venezolana
   */
  static async createInvoice(data: {
    customerId?: string;
    customerName: string;
    customerDoc: string; // V-..., J-..., G-..., E-...
    customerAddress?: string;
    customerPhone?: string;
    paymentMethod?: string;
    paymentReference?: string;
    items: Array<{
      productId?: string;
      productName: string;
      quantity: number;
      unit?: string;
      priceUsd: number;
      taxable?: boolean;
      serialNumber?: string;
    }>;
    withholdingPercent?: number; // 75 o 100 si es Agente de Retención
    withholdingReceiptNo?: string;
    sourceDeliveryNotes?: string[];
    notes?: string;
    createdBy?: string;
  }) {
    const rateData = await BcvService.getCurrentRate();
    const bcvRate = rateData.rate;

    const { invoiceNumber, controlNumber } = await this.getNextFiscalNumbers();

    // Cálculos tributarios en USD y Bolívares
    let exemptUsd = 0;
    let taxableUsd = 0;

    const formattedItems = data.items.map((it) => {
      const unit = it.unit || 'UND';
      const isTaxable = it.taxable !== false;
      const subtotalUsd = Math.round(it.quantity * it.priceUsd * 100) / 100;
      const priceBs = Math.round(it.priceUsd * bcvRate * 100) / 100;
      const subtotalBs = Math.round(subtotalUsd * bcvRate * 100) / 100;

      if (isTaxable) {
        taxableUsd += subtotalUsd;
      } else {
        exemptUsd += subtotalUsd;
      }

      return {
        productId: it.productId,
        productName: it.productName,
        quantity: it.quantity,
        unit,
        priceUsd: it.priceUsd,
        priceBs,
        taxable: isTaxable,
        subtotalUsd,
        subtotalBs,
        serialNumber: it.serialNumber || null,
      };
    });

    exemptUsd = Math.round(exemptUsd * 100) / 100;
    taxableUsd = Math.round(taxableUsd * 100) / 100;
    const subtotalUsd = Math.round((exemptUsd + taxableUsd) * 100) / 100;

    // IVA 16%
    const taxUsd = Math.round(taxableUsd * 0.16 * 100) / 100;

    // IGTF 3% si el pago es en divisas / efectivo USD
    const isForeignCurrency =
      data.paymentMethod === 'EFECTIVO_USD' ||
      data.paymentMethod === 'ZELLE' ||
      data.paymentMethod === 'Efectivo USD';
    const igtfUsd = isForeignCurrency ? Math.round((subtotalUsd + taxUsd) * 0.03 * 100) / 100 : 0;

    const totalUsd = Math.round((subtotalUsd + taxUsd + igtfUsd) * 100) / 100;

    // Equivalentes oficiales en Bolívares a tasa BCV
    const subtotalBs = Math.round(subtotalUsd * bcvRate * 100) / 100;
    const exemptBs = Math.round(exemptUsd * bcvRate * 100) / 100;
    const taxableBs = Math.round(taxableUsd * bcvRate * 100) / 100;
    const taxBs = Math.round(taxUsd * bcvRate * 100) / 100;
    const igtfBs = Math.round(igtfUsd * bcvRate * 100) / 100;
    const totalBs = Math.round(totalUsd * bcvRate * 100) / 100;

    // Retención de IVA (75% o 100%) si el comprador es Contribuyente Especial
    const whPercent = Number(data.withholdingPercent || 0);
    const withholdingTaxBs = whPercent > 0 ? Math.round(taxBs * (whPercent / 100) * 100) / 100 : 0;

    const sourceNotesStr = data.sourceDeliveryNotes && data.sourceDeliveryNotes.length
      ? data.sourceDeliveryNotes.join(', ')
      : null;

    // Crear factura en base de datos
    const invoice = await prisma.invoice.create({
      data: {
        invoiceNumber,
        controlNumber,
        invoiceType: 'FACTURA',
        customerId: data.customerId,
        customerName: data.customerName,
        customerDoc: data.customerDoc,
        customerAddress: data.customerAddress || 'Caracas, Venezuela',
        customerPhone: data.customerPhone,
        subtotalUsd,
        exemptUsd,
        taxableUsd,
        taxUsd,
        igtfUsd,
        totalUsd,
        bcvRate,
        subtotalBs,
        exemptBs,
        taxableBs,
        taxBs,
        igtfBs,
        totalBs,
        withholdingPercent: whPercent,
        withholdingTaxBs,
        withholdingReceiptNo: data.withholdingReceiptNo || null,
        paymentMethod: data.paymentMethod || 'PAGO_MOVIL',
        paymentReference: data.paymentReference,
        status: 'ISSUED',
        sourceDeliveryNotes: sourceNotesStr,
        createdBy: data.createdBy || 'Facturación FerreMax',
        notes: data.notes || (sourceNotesStr ? `Consolidación de notas: ${sourceNotesStr}` : 'Factura Fiscal SENIAT'),
        items: {
          create: formattedItems,
        },
      },
      include: {
        items: true,
      },
    });

    // Si proviene de órdenes / notas de entrega, marcarlas como facturadas
    if (data.sourceDeliveryNotes && data.sourceDeliveryNotes.length) {
      await prisma.order.updateMany({
        where: {
          orderNumber: { in: data.sourceDeliveryNotes },
        },
        data: {
          fiscalStatus: 'INVOICED',
          invoiceId: invoice.id,
        },
      });
    }

    return invoice;
  }

  /**
   * Consolida múltiples Notas de Entrega / Órdenes en una sola Factura Fiscal SENIAT
   */
  static async consolidateDeliveryNotes(data: {
    orderIds: string[];
    withholdingPercent?: number;
    withholdingReceiptNo?: string;
    createdBy?: string;
    notes?: string;
  }) {
    if (!data.orderIds || !data.orderIds.length) {
      throw new Error('Debes seleccionar al menos una nota de entrega u orden para consolidar.');
    }

    const orders = await prisma.order.findMany({
      where: {
        id: { in: data.orderIds },
      },
      include: {
        items: true,
      },
    });

    if (!orders.length) {
      throw new Error('No se encontraron las órdenes especificadas.');
    }

    // Tomar datos del cliente de la primera orden
    const firstOrder = orders[0];
    const customerDoc = firstOrder.customerDoc;
    const customerName = firstOrder.customerName;
    const customerPhone = firstOrder.customerPhone || undefined;
    const customerId = firstOrder.customerId || undefined;

    // Consolidar todos los ítems de las órdenes seleccionadas
    const aggregatedItems: Array<{
      productId?: string;
      productName: string;
      quantity: number;
      unit: string;
      priceUsd: number;
      taxable: boolean;
      serialNumber?: string;
    }> = [];

    orders.forEach((o) => {
      o.items.forEach((it) => {
        aggregatedItems.push({
          productId: it.productId,
          productName: it.productName,
          quantity: it.quantity,
          unit: it.unitSold || 'UND',
          priceUsd: it.priceUsd,
          taxable: true,
          serialNumber: it.serialNumber || undefined,
        });
      });
    });

    const deliveryNoteFolios = orders.map((o) => o.orderNumber);

    return this.createInvoice({
      customerId,
      customerName,
      customerDoc,
      customerPhone,
      items: aggregatedItems,
      sourceDeliveryNotes: deliveryNoteFolios,
      withholdingPercent: data.withholdingPercent,
      withholdingReceiptNo: data.withholdingReceiptNo,
      notes: data.notes || `Consolidación mensual de despachos: ${deliveryNoteFolios.join(', ')}`,
      createdBy: data.createdBy,
      paymentMethod: firstOrder.paymentMethod,
    });
  }

  /**
   * Genera el Libro Especial de Ventas SENIAT en tiempo real
   */
  static async getSalesBook(params?: { startDate?: string; endDate?: string }) {
    const where: any = {};
    if (params?.startDate || params?.endDate) {
      where.createdAt = {};
      if (params.startDate) where.createdAt.gte = new Date(params.startDate);
      if (params.endDate) where.createdAt.lte = new Date(params.endDate);
    }

    const invoices = await prisma.invoice.findMany({
      where,
      include: {
        items: true,
      },
      orderBy: { createdAt: 'asc' },
    });

    // Formatear filas oficiales con las columnas del SENIAT
    let opIndex = 1;
    let sumTotalVentasBs = 0;
    let sumExentoBs = 0;
    let sumBaseImponibleBs = 0;
    let sumIvaBs = 0;
    let sumIgtfBs = 0;
    let sumIvaRetenidoBs = 0;

    let sumTotalVentasUsd = 0;
    let sumIgtfUsd = 0;

    const rows = invoices.map((inv) => {
      sumTotalVentasBs += inv.totalBs;
      sumExentoBs += inv.exemptBs;
      sumBaseImponibleBs += inv.taxableBs;
      sumIvaBs += inv.taxBs;
      sumIgtfBs += inv.igtfBs;
      sumIvaRetenidoBs += inv.withholdingTaxBs;

      sumTotalVentasUsd += inv.totalUsd;
      sumIgtfUsd += inv.igtfUsd;

      const dateObj = new Date(inv.createdAt);
      const day = String(dateObj.getDate()).padStart(2, '0');
      const month = String(dateObj.getMonth() + 1).padStart(2, '0');
      const year = dateObj.getFullYear();
      const fechaStr = `${day}/${month}/${year}`;

      return {
        operacion: opIndex++,
        fecha: fechaStr,
        rifCliente: inv.customerDoc,
        nombreCliente: inv.customerName,
        numeroFactura: inv.invoiceNumber,
        numeroControl: inv.controlNumber,
        tipoDocumento: '01-FACTURA',
        facturaAfectada: inv.affectedInvoiceNumber || '—',
        comprobanteRetencion: inv.withholdingReceiptNo || '—',
        tasaBcv: inv.bcvRate,
        
        // Cifras en Bolívares
        totalVentasBs: inv.totalBs,
        ventasExentasBs: inv.exemptBs,
        baseImponibleBs: inv.taxableBs,
        alicuota: '16%',
        impuestoIvaBs: inv.taxBs,
        igtfPercibidoBs: inv.igtfBs,
        ivaRetenidoBs: inv.withholdingTaxBs,

        // Cifras en USD
        totalVentasUsd: inv.totalUsd,
        igtfUsd: inv.igtfUsd,
        metodoPago: inv.paymentMethod,
        notasDespacho: inv.sourceDeliveryNotes || 'Venta directa',
      };
    });

    return {
      periodo: {
        totalDocumentos: invoices.length,
        tasaPromedioBcv: invoices.length ? (invoices.reduce((a, b) => a + b.bcvRate, 0) / invoices.length).toFixed(2) : '880.12',
      },
      totalesBs: {
        totalVentas: Math.round(sumTotalVentasBs * 100) / 100,
        ventasExentas: Math.round(sumExentoBs * 100) / 100,
        baseImponible: Math.round(sumBaseImponibleBs * 100) / 100,
        impuestoIva: Math.round(sumIvaBs * 100) / 100,
        igtfPercibido: Math.round(sumIgtfBs * 100) / 100,
        ivaRetenido: Math.round(sumIvaRetenidoBs * 100) / 100,
      },
      totalesUsd: {
        totalVentas: Math.round(sumTotalVentasUsd * 100) / 100,
        igtfPercibido: Math.round(sumIgtfUsd * 100) / 100,
      },
      libro: rows,
    };
  }

  /**
   * Genera texto CSV descargable para contabilidad y portal SENIAT
   */
  static async exportSalesBookCSV(params?: { startDate?: string; endDate?: string }): Promise<string> {
    const book = await this.getSalesBook(params);
    const headers = [
      'Nro Operación',
      'Fecha',
      'RIF Cliente',
      'Razón Social',
      'Nro Factura',
      'Nro Control',
      'Nro Factura Afectada',
      'Nro Comprobante Retención',
      'Tasa BCV',
      'Total Ventas Incluyendo IVA (Bs)',
      'Ventas Exentas (Bs)',
      'Base Imponible (Bs)',
      'Alícuota IVA',
      'Impuesto IVA Causado (Bs)',
      'IGTF 3% Percibido (Bs)',
      'IVA Retenido por Comprador (Bs)',
      'Total USD ($)',
      'Notas de Entrega Consolidadas',
    ];

    const lines = [headers.join(';')];

    book.libro.forEach((r) => {
      lines.push([
        r.operacion,
        r.fecha,
        `"${r.rifCliente}"`,
        `"${r.nombreCliente.replace(/"/g, '""')}"`,
        r.numeroFactura,
        r.numeroControl,
        r.facturaAfectada,
        r.comprobanteRetencion,
        r.tasaBcv.toFixed(2),
        r.totalVentasBs.toFixed(2),
        r.ventasExentasBs.toFixed(2),
        r.baseImponibleBs.toFixed(2),
        r.alicuota,
        r.impuestoIvaBs.toFixed(2),
        r.igtfPercibidoBs.toFixed(2),
        r.ivaRetenidoBs.toFixed(2),
        r.totalVentasUsd.toFixed(2),
        `"${r.notasDespacho}"`,
      ].join(';'));
    });

    // Línea de totales
    lines.push([
      'TOTALES GENERALES',
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      book.totalesBs.totalVentas.toFixed(2),
      book.totalesBs.ventasExentas.toFixed(2),
      book.totalesBs.baseImponible.toFixed(2),
      '16%',
      book.totalesBs.impuestoIva.toFixed(2),
      book.totalesBs.igtfPercibido.toFixed(2),
      book.totalesBs.ivaRetenido.toFixed(2),
      book.totalesUsd.totalVentas.toFixed(2),
      '',
    ].join(';'));

    return lines.join('\r\n');
  }

  /**
   * Carga inicial de datos de prueba para facturación y notas de entrega si la base de datos está vacía
   */
  static async ensureSampleData() {
    const invCount = await prisma.invoice.count();
    if (invCount === 0) {
      const rateData = await BcvService.getCurrentRate();
      const bcvRate = rateData.rate;

      // Crear factura 1
      await this.createInvoice({
        customerName: 'Constructora Los Andes, C.A.',
        customerDoc: 'J-30981245-2',
        customerAddress: 'Av. Libertador, Edif. Torre Polar, Piso 4, Caracas',
        paymentMethod: 'TRANSFERENCIA',
        items: [
          { productName: 'Cable THHN N° 12 600V 90°C', quantity: 200, unit: 'METRO', priceUsd: 0.95 },
          { productName: 'Taladro Percutor Inalámbrico 20V Max', quantity: 2, unit: 'UND', priceUsd: 139.99, serialNumber: 'DW-2026-98124' },
        ],
        withholdingPercent: 75,
        withholdingReceiptNo: '20261000000041',
        notes: 'Facturación directa de suministros para Obra El Rosal',
      });

      // Crear factura 2 (Efectivo Divisas con IGTF 3%)
      await this.createInvoice({
        customerName: 'Inversiones y Multiservicios Caracas, S.A.',
        customerDoc: 'J-41235678-9',
        customerAddress: 'Calle El Recreo, Sabana Grande',
        paymentMethod: 'EFECTIVO_USD',
        items: [
          { productName: 'Pintura Caucho Profesional Blanco', quantity: 15, unit: 'LITRO', priceUsd: 6.50 },
          { productName: 'Tornillo Drywall Punta Fina 6x1', quantity: 1000, unit: 'UND', priceUsd: 0.05 },
        ],
        notes: 'Venta de mostrador con IGTF 3% en divisas efectivo',
      });

      // Crear 2 órdenes tipo Nota de Entrega para demostrar consolidación
      const orderCount = await prisma.order.count();
      const prodCable = await prisma.product.findFirst({ where: { sku: { contains: 'CBL' } } });
      const prodTaladro = await prisma.product.findFirst({ where: { sku: { contains: 'TDL' } } });

      if (prodCable && prodTaladro) {
        // Nota de Entrega 1
        await prisma.order.create({
          data: {
            orderNumber: `NE-${1001 + orderCount}`,
            customerName: 'Constructora Los Andes, C.A.',
            customerDoc: 'J-30981245-2',
            customerPhone: '0414-9876543',
            status: 'DELIVERED',
            channel: 'DELIVERY_NOTE',
            isDeliveryNote: true,
            fiscalStatus: 'PENDING',
            subtotalUsd: 150.0,
            taxUsd: 24.0,
            totalUsd: 174.0,
            bcvRate,
            totalBs: Math.round(174.0 * bcvRate * 100) / 100,
            paymentMethod: 'CREDITO',
            notes: 'Despacho semanal a Obra Las Mercedes - Guía 041',
            items: {
              create: [
                {
                  productId: prodCable.id,
                  productName: prodCable.name,
                  quantity: 150,
                  unitSold: 'METRO',
                  priceUsd: 1.0,
                  priceBs: Math.round(1.0 * bcvRate * 100) / 100,
                  subtotalUsd: 150.0,
                },
              ],
            },
          },
        });

        // Nota de Entrega 2
        await prisma.order.create({
          data: {
            orderNumber: `NE-${1002 + orderCount}`,
            customerName: 'Constructora Los Andes, C.A.',
            customerDoc: 'J-30981245-2',
            customerPhone: '0414-9876543',
            status: 'DELIVERED',
            channel: 'DELIVERY_NOTE',
            isDeliveryNote: true,
            fiscalStatus: 'PENDING',
            subtotalUsd: 279.98,
            taxUsd: 44.80,
            totalUsd: 324.78,
            bcvRate,
            totalBs: Math.round(324.78 * bcvRate * 100) / 100,
            paymentMethod: 'CREDITO',
            notes: 'Despacho de herramientas a Obra Las Mercedes - Guía 042',
            items: {
              create: [
                {
                  productId: prodTaladro.id,
                  productName: prodTaladro.name,
                  quantity: 2,
                  unitSold: 'UND',
                  priceUsd: 139.99,
                  priceBs: Math.round(139.99 * bcvRate * 100) / 100,
                  subtotalUsd: 279.98,
                  serialNumber: 'DW-2026-98125',
                },
              ],
            },
          },
        });
      }
    }
  }
}
