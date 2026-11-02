import { prisma } from '../prisma';
import { BcvService } from './bcv.service';

export class PurchasesService {
  /**
   * Listar todos los proveedores
   */
  static async getSuppliers() {
    return prisma.supplier.findMany({
      include: {
        bills: {
          select: {
            id: true,
            billNumber: true,
            totalUsd: true,
            status: true,
            dueDate: true,
          },
        },
      },
      orderBy: { name: 'asc' },
    });
  }

  /**
   * Crear nuevo proveedor
   */
  static async createSupplier(data: {
    rif: string;
    name: string;
    email?: string;
    phone?: string;
    address?: string;
    contactPerson?: string;
    creditDays?: number;
    bankAccounts?: string;
  }) {
    return prisma.supplier.create({
      data: {
        rif: data.rif.toUpperCase().trim(),
        name: data.name.trim(),
        email: data.email,
        phone: data.phone,
        address: data.address,
        contactPerson: data.contactPerson,
        creditDays: data.creditDays || 30,
        bankAccounts: data.bankAccounts,
      },
    });
  }

  /**
   * Registrar Factura de Compra / Recepción de Mercancía Mayorista
   * Desglosa fletes/aduanas (SUNDDE), calcula retenciones SENIAT e ingresa al inventario
   */
  static async createPurchaseBill(data: {
    supplierId: string;
    billNumber: string;
    controlNumber?: string;
    targetWarehouseId?: string; // Por defecto Galpón Central
    invoiceDate?: Date;
    dueDate?: Date;
    items: Array<{
      productId?: string;
      productName: string;
      purchaseUnit: string; // ROLLO, CAJA, GALON, etc.
      quantity: number;
      unitCostUsd: number;
      unitRatio?: number; // Factor multiplicador a unidad base
    }>;
    freightCostUsd?: number;
    customsCostUsd?: number;
    otherCostsUsd?: number;
    ivaWithholdingPercent?: number; // 75% o 100%
    islrWithholdingPercent?: number; // e.g. 2% o 3%
    notes?: string;
  }) {
    const supplier = await prisma.supplier.findUnique({
      where: { id: data.supplierId },
    });
    if (!supplier) throw new Error('Proveedor no encontrado');

    const rateData = await BcvService.getCurrentRate();
    const bcvRate = rateData.rate;

    // Determinar almacén de destino (por defecto CENTRAL o TIENDA)
    let warehouse = null;
    if (data.targetWarehouseId) {
      warehouse = await prisma.warehouse.findUnique({ where: { id: data.targetWarehouseId } });
    }
    if (!warehouse) {
      warehouse = (await prisma.warehouse.findFirst({ where: { code: 'CENTRAL' } })) ||
        (await prisma.warehouse.findFirst({ where: { isDefault: true } })) ||
        (await prisma.warehouse.findFirst());
    }

    let subtotalUsd = 0;
    const itemsFormatted = [];

    for (const item of data.items) {
      let prodName = item.productName;
      if (!prodName && item.productId) {
        const p = await prisma.product.findUnique({ where: { id: item.productId } });
        if (p) prodName = p.name;
      }
      if (!prodName) prodName = 'Material ferretero';

      const unitRatio = Number(item.unitRatio || 1.0);
      const lineCostUsd = Math.round(item.quantity * item.unitCostUsd * 100) / 100;
      const lineCostBs = Math.round(lineCostUsd * bcvRate * 100) / 100;
      const baseQtyAdded = Math.round(item.quantity * unitRatio * 100) / 100;

      subtotalUsd += lineCostUsd;

      itemsFormatted.push({
        productId: item.productId || null,
        productName: prodName,
        purchaseUnit: item.purchaseUnit || 'UND',
        quantity: item.quantity,
        unitCostUsd: item.unitCostUsd,
        unitCostBs: Math.round(item.unitCostUsd * bcvRate * 100) / 100,
        subtotalUsd: lineCostUsd,
        subtotalBs: lineCostBs,
        unitRatio,
        baseQtyAdded,
      });

      // Incrementar stock en el almacén de destino
      if (item.productId && warehouse) {
        await prisma.warehouseStock.upsert({
          where: {
            warehouseId_productId: {
              warehouseId: warehouse.id,
              productId: item.productId,
            },
          },
          update: {
            stock: { increment: baseQtyAdded },
          },
          create: {
            warehouseId: warehouse.id,
            productId: item.productId,
            stock: baseQtyAdded,
          },
        });

        // Si el almacén es el default (TIENDA), reflejar también en Product.stock
        if (warehouse.isDefault) {
          await prisma.product.update({
            where: { id: item.productId },
            data: { stock: { increment: baseQtyAdded } },
          });
        }
      }
    }

    subtotalUsd = Math.round(subtotalUsd * 100) / 100;
    const taxUsd = Math.round(subtotalUsd * 0.16 * 100) / 100;
    const totalUsd = Math.round((subtotalUsd + taxUsd) * 100) / 100;

    const subtotalBs = Math.round(subtotalUsd * bcvRate * 100) / 100;
    const taxBs = Math.round(taxUsd * bcvRate * 100) / 100;
    const totalBs = Math.round(totalUsd * bcvRate * 100) / 100;

    // Retenciones SENIAT que FerreMax aplica
    const ivaWhPct = data.ivaWithholdingPercent !== undefined ? data.ivaWithholdingPercent : 75.0;
    const ivaWithholdingBs = Math.round(taxBs * (ivaWhPct / 100) * 100) / 100;

    const islrWhPct = data.islrWithholdingPercent || 0.0;
    const islrWithholdingBs = Math.round(subtotalBs * (islrWhPct / 100) * 100) / 100;

    // Número de Comprobante de Retención correlativo
    const billCount = await prisma.purchaseBill.count();
    const withholdingReceiptNo = `${new Date().getFullYear()}${String(new Date().getMonth() + 1).padStart(2, '0')}${String(billCount + 1001).padStart(8, '0')}`;

    // Fecha de vencimiento
    const invDate = data.invoiceDate ? new Date(data.invoiceDate) : new Date();
    const days = supplier.creditDays || 30;
    const dueDate = data.dueDate ? new Date(data.dueDate) : new Date(invDate.getTime() + days * 86400000);

    const bill = await prisma.purchaseBill.create({
      data: {
        billNumber: data.billNumber.trim(),
        controlNumber: data.controlNumber ? data.controlNumber.trim() : null,
        supplierId: supplier.id,
        supplierName: supplier.name,
        supplierRif: supplier.rif,
        targetWarehouseId: warehouse ? warehouse.id : null,
        invoiceDate: invDate,
        dueDate,
        subtotalUsd,
        taxUsd,
        totalUsd,
        bcvRate,
        subtotalBs,
        taxBs,
        totalBs,
        ivaWithholdingPercent: ivaWhPct,
        ivaWithholdingBs,
        withholdingReceiptNo,
        islrWithholdingPercent: islrWhPct,
        islrWithholdingBs,
        freightCostUsd: data.freightCostUsd || 0.0,
        customsCostUsd: data.customsCostUsd || 0.0,
        otherCostsUsd: data.otherCostsUsd || 0.0,
        status: 'PENDING',
        notes: data.notes,
        items: {
          create: itemsFormatted,
        },
      },
      include: {
        items: true,
      },
    });

    // Actualizar deuda con el proveedor
    await prisma.supplier.update({
      where: { id: supplier.id },
      data: {
        currentDebtUsd: { increment: totalUsd },
      },
    });

    return bill;
  }

  /**
   * Registrar Abono / Pago a Proveedor
   */
  static async registerPayment(data: {
    supplierId: string;
    billId?: string;
    amountUsd: number;
    paymentMethod: string;
    paymentReference?: string;
    bankName?: string;
    notes?: string;
  }) {
    const supplier = await prisma.supplier.findUnique({ where: { id: data.supplierId } });
    if (!supplier) throw new Error('Proveedor no encontrado');

    const rateData = await BcvService.getCurrentRate();
    const bcvRate = rateData.rate;
    const amountBs = Math.round(data.amountUsd * bcvRate * 100) / 100;

    const count = await prisma.supplierPayment.count();
    const paymentNumber = `PAG-${1001 + count}`;

    const payment = await prisma.supplierPayment.create({
      data: {
        paymentNumber,
        supplierId: supplier.id,
        billId: data.billId || null,
        amountUsd: data.amountUsd,
        amountBs,
        bcvRate,
        paymentMethod: data.paymentMethod,
        paymentReference: data.paymentReference,
        bankName: data.bankName,
        notes: data.notes,
      },
    });

    // Rebajar deuda del proveedor
    const newDebt = Math.max(0, Math.round((supplier.currentDebtUsd - data.amountUsd) * 100) / 100);
    await prisma.supplier.update({
      where: { id: supplier.id },
      data: { currentDebtUsd: newDebt },
    });

    // Si el pago está atado a una factura de compra específica, actualizar su estado
    if (data.billId) {
      const bill = await prisma.purchaseBill.findUnique({ where: { id: data.billId } });
      if (bill) {
        const totalPaid = Math.round((bill.paidAmountUsd + data.amountUsd) * 100) / 100;
        const newStatus = totalPaid >= bill.totalUsd ? 'PAID' : 'PARTIAL';
        await prisma.purchaseBill.update({
          where: { id: data.billId },
          data: {
            paidAmountUsd: totalPaid,
            status: newStatus,
          },
        });
      }
    }

    return payment;
  }

  /**
   * Generación de archivo TXT oficial para carga de Retenciones de IVA en el portal del SENIAT
   * Formato: RIF_AGENTE|PERIODO|FECHA|COMPROBANTE|NUM_FACTURA|NUM_CONTROL|TOTAL|BASE|RETENIDO|FACT_AFECTADA|COMPROBANTE_ANUL|EXENTO|ALICUOTA|EXPEDIENTE
   */
  static async generateSeniatIvaTxt(): Promise<string> {
    const bills = await prisma.purchaseBill.findMany({
      where: {
        ivaWithholdingBs: { gt: 0 },
      },
      orderBy: { createdAt: 'desc' },
    });

    const agentRif = 'J501234567'; // RIF FerreMax sin guiones

    const lines = bills.map((b) => {
      const d = new Date(b.invoiceDate);
      const periodo = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}`;
      const fecha = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      const supplierRifClean = b.supplierRif.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
      const numFactura = b.billNumber.replace(/[^A-Za-z0-9]/g, '');
      const numControl = (b.controlNumber || '00000000').replace(/[^A-Za-z0-9]/g, '');

      return [
        agentRif,
        periodo,
        fecha,
        'C', // Tipo de compra
        '01', // Factura
        supplierRifClean,
        numFactura,
        numControl,
        b.totalBs.toFixed(2),
        b.taxableBs.toFixed(2),
        b.ivaWithholdingBs.toFixed(2),
        '0', // Nro factura afectada
        b.withholdingReceiptNo || '0',
        b.exemptBs.toFixed(2),
        '16.00',
        '0',
      ].join('\t');
    });

    return lines.join('\r\n');
  }

  /**
   * Asegurar datos muestra para compras y cuentas por pagar
   */
  static async ensureSampleData() {
    const supCount = await prisma.supplier.count();
    if (supCount === 0) {
      const s1 = await this.createSupplier({
        rif: 'J-00045612-3',
        name: 'Conductores y Cables CABEL, C.A.',
        email: 'ventas@cabel.com.ve',
        phone: '0212-2041111',
        address: 'Zona Industrial Valencia, Edo. Carabobo',
        contactPerson: 'Ing. Eduardo Rivas',
        creditDays: 30,
        bankAccounts: 'Banesco: 0134-0012-34-1234567890 (Pago Móvil / Transferencia)',
      });

      const s2 = await this.createSupplier({
        rif: 'J-31094821-4',
        name: 'Corporación Ferretera Stanley DeWalt, S.A.',
        email: 'pedidos@stanley-dewalt.ve',
        phone: '0212-9938822',
        address: 'Boleíta Norte, Caracas',
        contactPerson: 'Lic. Mariana Soto',
        creditDays: 45,
        bankAccounts: 'Mercantil: 0105-0044-12-9876543210',
      });

      // Crear factura de compra muestra
      await this.createPurchaseBill({
        supplierId: s1.id,
        billNumber: 'FAC-89412',
        controlNumber: '00-048912',
        items: [
          {
            productName: 'Cable THHN N° 12 (Rollos de 100m)',
            purchaseUnit: 'ROLLO',
            quantity: 5,
            unitCostUsd: 75.0,
            unitRatio: 100, // 5 rollos = 500 metros
          },
        ],
        freightCostUsd: 15.0,
        notes: 'Recepción de conductores eléctricos directo desde planta en Valencia',
      });
    }
  }
}
