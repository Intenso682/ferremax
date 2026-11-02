import { prisma } from '../prisma';
import { BcvService } from './bcv.service';
import { SettingsService } from './settings.service';
import { config } from '../config';

export interface ShiftSummary {
  lastCloseDate: Date | null;
  currentDate: Date;
  salesCount: number;
  totalSalesUsd: number;
  totalSalesBs: number;
  totalIvaUsd: number;
  totalIgtfUsd: number;
  bcvRate: number;
  breakdown: {
    efectivoUsd: { totalUsd: number; totalBs: number; count: number };
    efectivoBs: { totalUsd: number; totalBs: number; count: number };
    pagoMovil: { totalUsd: number; totalBs: number; count: number };
    puntoDebito: { totalUsd: number; totalBs: number; count: number };
    transferencia: { totalUsd: number; totalBs: number; count: number };
    zelle: { totalUsd: number; totalBs: number; count: number };
  };
  orders: any[];
}

export interface DeclaredCashInput {
  cashierName?: string;
  initialCashUsd?: number;
  initialCashBs?: number;
  declaredEfectivoUsd?: number;
  declaredEfectivoBs?: number;
  declaredPagoMovilBs?: number;
  declaredPuntoBs?: number;
  notes?: string;
}

export class CashService {
  private static tableEnsured = false;

  /**
   * Asegura que la tabla CashClose exista en SQLite de forma atómica y nativa
   */
  static async ensureTable(): Promise<void> {
    if (this.tableEnsured) return;
    try {
      await prisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS CashClose (
          id TEXT PRIMARY KEY,
          closeNumber TEXT UNIQUE,
          type TEXT DEFAULT 'Z',
          cashierName TEXT DEFAULT 'Cajero Mostrador',
          openingDate DATETIME DEFAULT CURRENT_TIMESTAMP,
          closingDate DATETIME DEFAULT CURRENT_TIMESTAMP,
          initialCashUsd REAL DEFAULT 0.0,
          initialCashBs REAL DEFAULT 0.0,
          totalSalesUsd REAL DEFAULT 0.0,
          totalSalesBs REAL DEFAULT 0.0,
          salesCount INTEGER DEFAULT 0,
          systemEfectivoUsd REAL DEFAULT 0.0,
          systemEfectivoBs REAL DEFAULT 0.0,
          systemPagoMovilBs REAL DEFAULT 0.0,
          systemPuntoBs REAL DEFAULT 0.0,
          systemTransfBs REAL DEFAULT 0.0,
          systemZelleUsd REAL DEFAULT 0.0,
          totalIvaUsd REAL DEFAULT 0.0,
          totalIgtfUsd REAL DEFAULT 0.0,
          declaredEfectivoUsd REAL DEFAULT 0.0,
          declaredEfectivoBs REAL DEFAULT 0.0,
          declaredPagoMovilBs REAL DEFAULT 0.0,
          declaredPuntoBs REAL DEFAULT 0.0,
          diffUsd REAL DEFAULT 0.0,
          diffBs REAL DEFAULT 0.0,
          bcvRate REAL,
          notes TEXT,
          createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
        );
      `);
      this.tableEnsured = true;
    } catch (err: any) {
      console.warn('Advertencia al verificar tabla CashClose:', err.message);
    }
  }

  /**
   * Obtiene el resumen del turno activo desde el último Corte Z
   */
  static async getCurrentShiftSummary(): Promise<ShiftSummary> {
    await this.ensureTable();

    // 1. Obtener la fecha del último cierre definitivo (Corte Z)
    let lastCloseDate: Date | null = null;
    try {
      const rows: any[] = await prisma.$queryRawUnsafe(`
        SELECT closingDate FROM CashClose WHERE type = 'Z' ORDER BY closingDate DESC LIMIT 1
      `);
      if (rows && rows.length > 0 && rows[0].closingDate) {
        lastCloseDate = new Date(rows[0].closingDate);
      }
    } catch {
      lastCloseDate = null;
    }

    if (!lastCloseDate) {
      // Si nunca ha habido un Corte Z, tomar inicio del día de hoy
      const startOfToday = new Date();
      startOfToday.setHours(0, 0, 0, 0);
      lastCloseDate = startOfToday;
    }

    const { rate: bcvRate } = await BcvService.getCurrentRate();

    // 2. Consultar las órdenes registradas y pagadas desde el último cierre
    const orders = await prisma.order.findMany({
      where: {
        createdAt: { gte: lastCloseDate },
        status: { in: ['PAID', 'DELIVERED', 'READY_FOR_PICKUP', 'DISPATCHED'] },
      },
      include: {
        items: true,
      },
      orderBy: { createdAt: 'asc' },
    });

    const breakdown = {
      efectivoUsd: { totalUsd: 0, totalBs: 0, count: 0 },
      efectivoBs: { totalUsd: 0, totalBs: 0, count: 0 },
      pagoMovil: { totalUsd: 0, totalBs: 0, count: 0 },
      puntoDebito: { totalUsd: 0, totalBs: 0, count: 0 },
      transferencia: { totalUsd: 0, totalBs: 0, count: 0 },
      zelle: { totalUsd: 0, totalBs: 0, count: 0 },
    };

    let totalSalesUsd = 0;
    let totalSalesBs = 0;
    let totalIvaUsd = 0;
    let totalIgtfUsd = 0;

    for (const o of orders) {
      totalSalesUsd += o.totalUsd;
      totalSalesBs += o.totalBs;
      totalIvaUsd += o.taxUsd;
      totalIgtfUsd += o.igtfUsd;

      const m = (o.paymentMethod || '').toUpperCase();

      if (m.includes('PAGO_MOVIL')) {
        breakdown.pagoMovil.totalUsd += o.totalUsd;
        breakdown.pagoMovil.totalBs += o.totalBs;
        breakdown.pagoMovil.count++;
      } else if (m.includes('PUNTO') || m.includes('DEBITO') || m.includes('TARJETA')) {
        breakdown.puntoDebito.totalUsd += o.totalUsd;
        breakdown.puntoDebito.totalBs += o.totalBs;
        breakdown.puntoDebito.count++;
      } else if (m.includes('USD') || m === 'EFECTIVO_USD' || m === 'DIVISA') {
        breakdown.efectivoUsd.totalUsd += o.totalUsd;
        breakdown.efectivoUsd.totalBs += o.totalBs;
        breakdown.efectivoUsd.count++;
      } else if (m.includes('BS') || m === 'EFECTIVO_BS' || m === 'EFECTIVO') {
        breakdown.efectivoBs.totalUsd += o.totalUsd;
        breakdown.efectivoBs.totalBs += o.totalBs;
        breakdown.efectivoBs.count++;
      } else if (m.includes('ZELLE')) {
        breakdown.zelle.totalUsd += o.totalUsd;
        breakdown.zelle.totalBs += o.totalBs;
        breakdown.zelle.count++;
      } else {
        breakdown.transferencia.totalUsd += o.totalUsd;
        breakdown.transferencia.totalBs += o.totalBs;
        breakdown.transferencia.count++;
      }
    }

    return {
      lastCloseDate,
      currentDate: new Date(),
      salesCount: orders.length,
      totalSalesUsd: Math.round(totalSalesUsd * 100) / 100,
      totalSalesBs: Math.round(totalSalesBs * 100) / 100,
      totalIvaUsd: Math.round(totalIvaUsd * 100) / 100,
      totalIgtfUsd: Math.round(totalIgtfUsd * 100) / 100,
      bcvRate,
      breakdown,
      orders,
    };
  }

  /**
   * Genera un Corte X (Auditoría parcial en cualquier momento sin cerrar caja)
   */
  static async generateCorteX(cashierName = 'Cajero Mostrador', notes?: string) {
    const summary = await this.getCurrentShiftSummary();
    const xCount = (await prisma.cashClose.count({ where: { type: 'X' } })) + 1;
    const closeNumber = `X-${(100 + xCount).toString()}`;
    const id = `x-${Date.now()}`;

    const storeName = await SettingsService.get('STORE_NAME', config.storeName);
    const storeRif = await SettingsService.get('STORE_RIF', config.storeRif);

    const record = {
      id,
      closeNumber,
      type: 'X',
      cashierName,
      openingDate: summary.lastCloseDate || new Date(),
      closingDate: new Date(),
      initialCashUsd: 0,
      initialCashBs: 0,
      totalSalesUsd: summary.totalSalesUsd,
      totalSalesBs: summary.totalSalesBs,
      salesCount: summary.salesCount,
      systemEfectivoUsd: summary.breakdown.efectivoUsd.totalUsd,
      systemEfectivoBs: summary.breakdown.efectivoBs.totalBs,
      systemPagoMovilBs: summary.breakdown.pagoMovil.totalBs,
      systemPuntoBs: summary.breakdown.puntoDebito.totalBs,
      systemTransfBs: summary.breakdown.transferencia.totalBs,
      systemZelleUsd: summary.breakdown.zelle.totalUsd,
      totalIvaUsd: summary.totalIvaUsd,
      totalIgtfUsd: summary.totalIgtfUsd,
      declaredEfectivoUsd: 0,
      declaredEfectivoBs: 0,
      declaredPagoMovilBs: 0,
      declaredPuntoBs: 0,
      diffUsd: 0,
      diffBs: 0,
      bcvRate: summary.bcvRate,
      notes: notes || 'Auditoría parcial de caja (Corte X)',
      storeName,
      storeRif,
      breakdown: summary.breakdown,
    };

    // Guardar para auditoría
    try {
      await prisma.$executeRawUnsafe(`
        INSERT INTO CashClose (
          id, closeNumber, type, cashierName, openingDate, closingDate,
          initialCashUsd, initialCashBs, totalSalesUsd, totalSalesBs, salesCount,
          systemEfectivoUsd, systemEfectivoBs, systemPagoMovilBs, systemPuntoBs, systemTransfBs, systemZelleUsd,
          totalIvaUsd, totalIgtfUsd, declaredEfectivoUsd, declaredEfectivoBs, declaredPagoMovilBs, declaredPuntoBs,
          diffUsd, diffBs, bcvRate, notes, createdAt
        ) VALUES (
          '${id}', '${closeNumber}', 'X', '${cashierName.replace(/'/g, "''")}', '${record.openingDate.toISOString()}', '${record.closingDate.toISOString()}',
          0, 0, ${summary.totalSalesUsd}, ${summary.totalSalesBs}, ${summary.salesCount},
          ${summary.breakdown.efectivoUsd.totalUsd}, ${summary.breakdown.efectivoBs.totalBs}, ${summary.breakdown.pagoMovil.totalBs}, ${summary.breakdown.puntoDebito.totalBs}, ${summary.breakdown.transferencia.totalBs}, ${summary.breakdown.zelle.totalUsd},
          ${summary.totalIvaUsd}, ${summary.totalIgtfUsd}, 0, 0, 0, 0,
          0, 0, ${summary.bcvRate}, '${(record.notes || '').replace(/'/g, "''")}', '${new Date().toISOString()}'
        )
      `);
    } catch (e: any) {
      console.warn('No se pudo persistir log de Corte X:', e.message);
    }

    return record;
  }

  /**
   * Genera el Corte Z (Cierre definitivo de turno con balance de arqueo y diferencias)
   */
  static async generateCorteZ(input: DeclaredCashInput) {
    const summary = await this.getCurrentShiftSummary();
    const zCount = (await prisma.cashClose.count({ where: { type: 'Z' } })) + 1;
    const closeNumber = `Z-${(1000 + zCount).toString()}`;
    const id = `z-${Date.now()}`;

    const cashierName = input.cashierName || 'Cajero Mostrador';
    const initialCashUsd = Number(input.initialCashUsd || 0);
    const initialCashBs = Number(input.initialCashBs || 0);

    const declaredEfectivoUsd = Number(input.declaredEfectivoUsd || 0);
    const declaredEfectivoBs = Number(input.declaredEfectivoBs || 0);
    const declaredPagoMovilBs = Number(input.declaredPagoMovilBs || summary.breakdown.pagoMovil.totalBs);
    const declaredPuntoBs = Number(input.declaredPuntoBs || summary.breakdown.puntoDebito.totalBs);

    // Sistema esperado en gaveta: Ventas en efectivo + Fondo de caja inicial
    const expectedEfectivoUsd = summary.breakdown.efectivoUsd.totalUsd + initialCashUsd;
    const expectedEfectivoBs = summary.breakdown.efectivoBs.totalBs + initialCashBs;

    const diffUsd = Math.round((declaredEfectivoUsd - expectedEfectivoUsd) * 100) / 100;
    const diffBs = Math.round((declaredEfectivoBs - expectedEfectivoBs) * 100) / 100;

    const closingDate = new Date();
    const openingDate = summary.lastCloseDate || new Date();

    const storeName = await SettingsService.get('STORE_NAME', config.storeName);
    const storeRif = await SettingsService.get('STORE_RIF', config.storeRif);

    // Persistir el cierre definitivo
    await prisma.$executeRawUnsafe(`
      INSERT INTO CashClose (
        id, closeNumber, type, cashierName, openingDate, closingDate,
        initialCashUsd, initialCashBs, totalSalesUsd, totalSalesBs, salesCount,
        systemEfectivoUsd, systemEfectivoBs, systemPagoMovilBs, systemPuntoBs, systemTransfBs, systemZelleUsd,
        totalIvaUsd, totalIgtfUsd, declaredEfectivoUsd, declaredEfectivoBs, declaredPagoMovilBs, declaredPuntoBs,
        diffUsd, diffBs, bcvRate, notes, createdAt
      ) VALUES (
        '${id}', '${closeNumber}', 'Z', '${cashierName.replace(/'/g, "''")}', '${openingDate.toISOString()}', '${closingDate.toISOString()}',
        ${initialCashUsd}, ${initialCashBs}, ${summary.totalSalesUsd}, ${summary.totalSalesBs}, ${summary.salesCount},
        ${summary.breakdown.efectivoUsd.totalUsd}, ${summary.breakdown.efectivoBs.totalBs}, ${summary.breakdown.pagoMovil.totalBs}, ${summary.breakdown.puntoDebito.totalBs}, ${summary.breakdown.transferencia.totalBs}, ${summary.breakdown.zelle.totalUsd},
        ${summary.totalIvaUsd}, ${summary.totalIgtfUsd}, ${declaredEfectivoUsd}, ${declaredEfectivoBs}, ${declaredPagoMovilBs}, ${declaredPuntoBs},
        ${diffUsd}, ${diffBs}, ${summary.bcvRate}, '${(input.notes || '').replace(/'/g, "''")}', '${new Date().toISOString()}'
      )
    `);

    return {
      id,
      closeNumber,
      type: 'Z',
      cashierName,
      openingDate,
      closingDate,
      initialCashUsd,
      initialCashBs,
      totalSalesUsd: summary.totalSalesUsd,
      totalSalesBs: summary.totalSalesBs,
      salesCount: summary.salesCount,
      totalIvaUsd: summary.totalIvaUsd,
      totalIgtfUsd: summary.totalIgtfUsd,
      bcvRate: summary.bcvRate,
      breakdown: summary.breakdown,
      declared: {
        declaredEfectivoUsd,
        declaredEfectivoBs,
        declaredPagoMovilBs,
        declaredPuntoBs,
      },
      expected: {
        expectedEfectivoUsd,
        expectedEfectivoBs,
      },
      differences: {
        diffUsd,
        diffBs,
        statusUsd: diffUsd === 0 ? 'CUADRADO' : (diffUsd > 0 ? 'SOBRANTE' : 'FALTANTE'),
        statusBs: diffBs === 0 ? 'CUADRADO' : (diffBs > 0 ? 'SOBRANTE' : 'FALTANTE'),
      },
      notes: input.notes,
      storeName,
      storeRif,
    };
  }

  /**
   * Obtiene el historial de cierres para auditoría gerencial con filtros
   */
  static async getHistory(options: { limit?: number; type?: string; search?: string } = {}) {
    await this.ensureTable();
    try {
      const limit = Number(options.limit) || 50;
      let whereClause = '1=1';
      if (options.type && options.type !== 'ALL') {
        const cleanType = options.type.toUpperCase() === 'Z' ? 'Z' : (options.type.toUpperCase() === 'X' ? 'X' : '');
        if (cleanType) whereClause += ` AND type = '${cleanType}'`;
      }
      if (options.search && options.search.trim()) {
        const cleanSearch = options.search.trim().replace(/'/g, "''");
        whereClause += ` AND (closeNumber LIKE '%${cleanSearch}%' OR cashierName LIKE '%${cleanSearch}%' OR notes LIKE '%${cleanSearch}%')`;
      }
      const rows: any[] = await prisma.$queryRawUnsafe(`
        SELECT * FROM CashClose WHERE ${whereClause} ORDER BY closingDate DESC LIMIT ${limit}
      `);
      return rows;
    } catch (e: any) {
      console.warn('Error al listar cierres de caja:', e.message);
      return [];
    }
  }

  /**
   * Obtiene un corte específico por ID o por closeNumber
   */
  static async getById(idOrNumber: string) {
    await this.ensureTable();
    try {
      const clean = (idOrNumber || '').trim().replace(/'/g, "''");
      const rows: any[] = await prisma.$queryRawUnsafe(`
        SELECT * FROM CashClose WHERE id = '${clean}' OR closeNumber = '${clean}' LIMIT 1
      `);
      return rows && rows.length > 0 ? rows[0] : null;
    } catch (e: any) {
      console.warn('Error al obtener cierre de caja por ID:', e.message);
      return null;
    }
  }
}
