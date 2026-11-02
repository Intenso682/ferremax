import { prisma } from '../prisma';
import { BcvService } from './bcv.service';

export class CustomerService {
  /**
   * Obtiene todos los clientes con opciones de búsqueda y filtro de deuda
   */
  static async getAll(params?: { search?: string; withDebtOnly?: boolean; limit?: number }) {
    const search = params?.search?.trim() || '';
    const withDebtOnly = params?.withDebtOnly || false;
    const limit = params?.limit || 100;

    const where: any = {};

    if (search) {
      where.OR = [
        { name: { contains: search } },
        { docNumber: { contains: search } },
        { email: { contains: search } },
        { phone: { contains: search } },
      ];
    }

    if (withDebtOnly) {
      where.currentDebtUsd = { gt: 0.01 };
    }

    const customers = await prisma.customer.findMany({
      where,
      take: limit,
      orderBy: [
        { currentDebtUsd: 'desc' },
        { updatedAt: 'desc' },
      ],
      include: {
        _count: {
          select: {
            orders: true,
            creditPayments: true,
          },
        },
      },
    });

    const bcvInfo = await BcvService.getCurrentRate();
    const rate = bcvInfo.rate;

    return customers.map((c: any) => ({
      ...c,
      currentDebtBs: Math.round(c.currentDebtUsd * rate * 100) / 100,
      availableCreditUsd: Math.max(0, Math.round((c.creditLimitUsd - c.currentDebtUsd) * 100) / 100),
      availableCreditBs: Math.max(0, Math.round((c.creditLimitUsd - c.currentDebtUsd) * rate * 100) / 100),
      bcvRate: rate,
    }));
  }

  /**
   * Obtiene un cliente por su ID o Cédula/RIF
   */
  static async getById(idOrDoc: string) {
    const customer = await prisma.customer.findFirst({
      where: {
        OR: [
          { id: idOrDoc },
          { docNumber: idOrDoc },
        ],
      },
      include: {
        orders: {
          take: 20,
          orderBy: { createdAt: 'desc' },
        },
        creditPayments: {
          take: 20,
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!customer) return null;

    const bcvInfo = await BcvService.getCurrentRate();
    const rate = bcvInfo.rate;

    return {
      ...customer,
      currentDebtBs: Math.round(customer.currentDebtUsd * rate * 100) / 100,
      availableCreditUsd: Math.max(0, Math.round((customer.creditLimitUsd - customer.currentDebtUsd) * 100) / 100),
      availableCreditBs: Math.max(0, Math.round((customer.creditLimitUsd - customer.currentDebtUsd) * rate * 100) / 100),
      bcvRate: rate,
    };
  }

  /**
   * Crea o actualiza los datos de un cliente
   */
  static async createOrUpdate(data: {
    id?: string;
    docType?: string;
    docNumber: string;
    name: string;
    email?: string;
    phone?: string;
    address?: string;
    notes?: string;
    creditLimitUsd?: number;
    creditDays?: number;
    creditStatus?: string;
  }) {
    const docNumber = data.docNumber.trim().toUpperCase();
    const docType = data.docType ? data.docType.toUpperCase() : (docNumber.startsWith('J') || docNumber.startsWith('G') ? 'J' : 'V');

    const payload = {
      docType,
      docNumber,
      name: data.name.trim(),
      email: data.email?.trim() || null,
      phone: data.phone?.trim() || null,
      address: data.address?.trim() || null,
      notes: data.notes?.trim() || null,
      creditLimitUsd: data.creditLimitUsd !== undefined ? Number(data.creditLimitUsd) : 0.0,
      creditDays: data.creditDays !== undefined ? Number(data.creditDays) : 15,
      creditStatus: data.creditStatus || 'ACTIVE',
    };

    if (data.id) {
      return await prisma.customer.update({
        where: { id: data.id },
        data: payload,
      });
    }

    return await prisma.customer.upsert({
      where: { docNumber },
      update: payload,
      create: payload,
    });
  }

  /**
   * Registra un Abono (pago a cuenta) de un cliente
   */
  static async registerAbono(data: {
    customerId: string;
    amountUsd: number;
    amountBs?: number;
    bcvRate?: number;
    paymentMethod: string;
    paymentReference?: string;
    cashierName?: string;
    notes?: string;
  }) {
    const customer = await prisma.customer.findUnique({
      where: { id: data.customerId },
    });

    if (!customer) {
      throw new Error(`Cliente con ID ${data.customerId} no encontrado.`);
    }

    const bcvInfo = await BcvService.getCurrentRate();
    const rate = data.bcvRate || bcvInfo.rate;

    const amountUsd = Math.round(Number(data.amountUsd) * 100) / 100;
    if (amountUsd <= 0) {
      throw new Error('El monto del abono debe ser mayor a 0.');
    }

    const amountBs = data.amountBs ? Math.round(Number(data.amountBs) * 100) / 100 : Math.round(amountUsd * rate * 100) / 100;
    const previousDebt = customer.currentDebtUsd;
    const remainingDebt = Math.max(0, Math.round((previousDebt - amountUsd) * 100) / 100);

    // Generar correlativo de recibo de abono: ABO-1001, ABO-1002...
    const count = await prisma.creditPayment.count();
    const receiptNumber = `ABO-${1001 + count}`;

    const [payment, updatedCustomer] = await prisma.$transaction([
      prisma.creditPayment.create({
        data: {
          receiptNumber,
          customerId: customer.id,
          customerName: customer.name,
          customerDoc: customer.docNumber.startsWith(customer.docType + '-') ? customer.docNumber : `${customer.docType}-${customer.docNumber}`,
          amountUsd,
          amountBs,
          bcvRate: rate,
          paymentMethod: data.paymentMethod,
          paymentReference: data.paymentReference?.trim() || null,
          cashierName: data.cashierName || 'Cajero Mostrador',
          previousDebtUsd: previousDebt,
          remainingDebtUsd: remainingDebt,
          notes: data.notes?.trim() || null,
        },
      }),
      prisma.customer.update({
        where: { id: customer.id },
        data: {
          currentDebtUsd: remainingDebt,
        },
      }),
    ]);

    return {
      payment,
      customer: {
        ...updatedCustomer,
        currentDebtBs: Math.round(remainingDebt * rate * 100) / 100,
        availableCreditUsd: Math.max(0, Math.round((updatedCustomer.creditLimitUsd - remainingDebt) * 100) / 100),
      },
    };
  }

  /**
   * Obtiene el Estado de Cuenta completo de un cliente
   */
  static async getAccountStatement(customerId: string) {
    const customer = await this.getById(customerId);
    if (!customer) {
      throw new Error(`Cliente no encontrado`);
    }

    // Órdenes a crédito o pendientes
    const creditOrders = await prisma.order.findMany({
      where: {
        customerId: customer.id,
        OR: [
          { paymentMethod: { contains: 'CREDITO' } },
          { status: 'ON_CREDIT' },
          { status: 'PENDING_PAYMENT' },
        ],
      },
      orderBy: { createdAt: 'desc' },
    });

    // Abonos realizados
    const payments = await prisma.creditPayment.findMany({
      where: { customerId: customer.id },
      orderBy: { createdAt: 'desc' },
    });

    // Cronograma unificado ordenado por fecha
    const movements: any[] = [];

    creditOrders.forEach((o: any) => {
      movements.push({
        type: 'CARGO', // Aumenta deuda
        concept: `Venta a Crédito #${o.orderNumber}`,
        docNumber: o.orderNumber,
        date: o.createdAt,
        amountUsd: o.totalUsd,
        amountBs: o.totalBs,
        bcvRate: o.bcvRate,
        status: o.status,
      });
    });

    payments.forEach((p: any) => {
      movements.push({
        type: 'ABONO', // Reduce deuda
        concept: `Abono a Cuenta #${p.receiptNumber} (${p.paymentMethod})`,
        docNumber: p.receiptNumber,
        date: p.createdAt,
        amountUsd: p.amountUsd,
        amountBs: p.amountBs,
        bcvRate: p.bcvRate,
        reference: p.paymentReference,
        notes: p.notes,
      });
    });

    movements.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    return {
      customer,
      summary: {
        creditLimitUsd: customer.creditLimitUsd,
        currentDebtUsd: customer.currentDebtUsd,
        currentDebtBs: customer.currentDebtBs,
        availableCreditUsd: customer.availableCreditUsd,
        totalOrdersCount: creditOrders.length,
        totalPaymentsCount: payments.length,
        bcvRate: customer.bcvRate,
      },
      movements,
      payments,
      orders: creditOrders,
    };
  }

  /**
   * Resumen global de cuentas por cobrar para KPI
   */
  static async getReceivablesSummary() {
    const customersWithDebt = await prisma.customer.findMany({
      where: { currentDebtUsd: { gt: 0.01 } },
      select: {
        id: true,
        name: true,
        docNumber: true,
        currentDebtUsd: true,
        creditLimitUsd: true,
        phone: true,
      },
      orderBy: { currentDebtUsd: 'desc' },
    });

    const bcvInfo = await BcvService.getCurrentRate();
    const rate = bcvInfo.rate;

    const totalDebtUsd = Math.round(customersWithDebt.reduce((acc: number, c: any) => acc + c.currentDebtUsd, 0) * 100) / 100;
    const totalDebtBs = Math.round(totalDebtUsd * rate * 100) / 100;

    const allCustomers = await prisma.customer.aggregate({
      _sum: {
        creditLimitUsd: true,
      },
      _count: {
        id: true,
      },
    });

    const recentAbonos = await prisma.creditPayment.findMany({
      take: 10,
      orderBy: { createdAt: 'desc' },
    });

    return {
      totalDebtUsd,
      totalDebtBs,
      bcvRate: rate,
      clientsWithDebtCount: customersWithDebt.length,
      totalClientsCount: allCustomers._count.id,
      totalCreditLimitGranted: allCustomers._sum.creditLimitUsd || 0,
      topDebtors: customersWithDebt.slice(0, 5).map((c: any) => ({
        ...c,
        currentDebtBs: Math.round(c.currentDebtUsd * rate * 100) / 100,
      })),
      recentAbonos,
    };
  }

  /**
   * Historial de pagos y abonos
   */
  static async getPaymentsHistory(params?: { search?: string; customerId?: string; limit?: number }) {
    const search = params?.search?.trim() || '';
    const customerId = params?.customerId;
    const limit = params?.limit || 50;

    const where: any = {};
    if (customerId) where.customerId = customerId;
    if (search) {
      where.OR = [
        { receiptNumber: { contains: search } },
        { customerName: { contains: search } },
        { customerDoc: { contains: search } },
        { paymentReference: { contains: search } },
        { notes: { contains: search } },
      ];
    }

    return await prisma.creditPayment.findMany({
      where,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        customer: {
          select: {
            id: true,
            name: true,
            docNumber: true,
            phone: true,
            currentDebtUsd: true,
          },
        },
      },
    });
  }

  /**
   * Carga inicial de clientes de muestra venezolanos con crédito si la base está vacía
   */
  static async ensureDefaultCustomers() {
    const count = await prisma.customer.count();
    if (count > 0) return;

    const sampleCustomers = [
      {
        docType: 'V',
        docNumber: '14258963',
        name: 'Carlos Mendoza (Herrería y Estructuras)',
        email: 'carlos.mendoza@gmail.com',
        phone: '0414-2345678',
        address: 'Los Cortijos de Lourdes, Caracas',
        notes: 'Herrero de confianza. Paga quincenal.',
        creditLimitUsd: 600.0,
        currentDebtUsd: 145.50,
        creditDays: 15,
        creditStatus: 'ACTIVE',
      },
      {
        docType: 'J',
        docNumber: '40123456-7',
        name: 'Constructora & Remodelaciones Delta, C.A.',
        email: 'compras@deltaconstrucciones.ve',
        phone: '0212-9876543',
        address: 'Av. Libertador, Edif. Delta, Caracas',
        notes: 'Cliente corporativo. Facturas a 30 días.',
        creditLimitUsd: 2500.0,
        currentDebtUsd: 680.00,
        creditDays: 30,
        creditStatus: 'ACTIVE',
      },
      {
        docType: 'V',
        docNumber: '18741258',
        name: 'María Alejandra Gómez',
        email: 'maria.gomez@hotmail.com',
        phone: '0412-3456789',
        address: 'La California Norte, Caracas',
        notes: 'Compras de mostrador y hogar.',
        creditLimitUsd: 200.0,
        currentDebtUsd: 0.0,
        creditDays: 15,
        creditStatus: 'ACTIVE',
      },
      {
        docType: 'V',
        docNumber: '11987456',
        name: 'José Gregorio Hernández (Plomería y Gas)',
        email: 'plomeria.hernandez@yahoo.com',
        phone: '0424-8765432',
        address: 'El Paraíso, Caracas',
        notes: 'Plomero certificado. Frecuente.',
        creditLimitUsd: 400.0,
        currentDebtUsd: 82.20,
        creditDays: 15,
        creditStatus: 'ACTIVE',
      },
      {
        docType: 'J',
        docNumber: '50234123-1',
        name: 'Taller Mecánico e Industrial San Pedro, C.A.',
        email: 'sanpedro.taller@gmail.com',
        phone: '0416-5432109',
        address: 'Zona Industrial Boleíta Sur, Caracas',
        notes: 'Taller de tornería y soldadura.',
        creditLimitUsd: 1200.0,
        currentDebtUsd: 310.00,
        creditDays: 20,
        creditStatus: 'ACTIVE',
      },
    ];

    for (const c of sampleCustomers) {
      await prisma.customer.create({
        data: c,
      });
    }

    console.log('✅ Clientes venezolanos iniciales con crédito cargados en base de datos.');
  }
}
