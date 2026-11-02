import { prisma } from '../prisma';
import { BcvService } from './bcv.service';

export interface ParetoProduct {
  id: string;
  sku: string;
  name: string;
  category: string;
  stock: number;
  unit: string;
  costUsd: number;
  priceUsd: number;
  stockValueUsd: number;
  unitsSold: number;
  revenueUsd: number;
  revenueBs: number;
  totalCostUsd: number;
  grossProfitUsd: number;
  grossProfitBs: number;
  marginPercent: number;
  profitSharePercent: number;
  cumulativeProfitPercent: number;
  paretoClass: 'A' | 'B' | 'C';
  isDeadStock: boolean;
  strategicAction: string;
}

export interface ParetoSummary {
  totalProducts: number;
  classACount: number;
  classBCount: number;
  classCCount: number;
  deadStockCount: number;
  deadStockValueUsd: number;
  totalRevenueUsd: number;
  totalRevenueBs: number;
  totalGrossProfitUsd: number;
  totalGrossProfitBs: number;
  averageMarginPercent: number;
  bcvRate: number;
}

export interface PredictiveStockItem {
  id: string;
  sku: string;
  name: string;
  category: string;
  unit: string;
  currentStock: number;
  minStockStatic: number;
  leadTimeDays: number;
  dailyConsumptionRate: number; // Unidades vendidas por día (velocidad de consumo real)
  reorderPointDynamic: number;  // Punto de reorden inteligente (Demora proveedor + Stock seguridad)
  daysOfStockRemaining: number; // Días de inventario restantes antes de quiebre
  riskStatus: 'CRITICAL_DEPLETED' | 'WARNING_REORDER_NOW' | 'HEALTHY' | 'OVERSTOCKED';
  suggestedOrderQty: number;    // Cantidad sugerida a pedir para cubrir 30 días + demora
  unitCostUsd: number;
  estimatedInvestmentUsd: number;
  estimatedInvestmentBs: number;
  supplierRecommended?: string;
}

export interface PredictiveStockSummary {
  totalProductsAudited: number;
  criticalCount: number;
  warningCount: number;
  healthyCount: number;
  overstockedCount: number;
  totalInvestmentNeededUsd: number;
  totalInvestmentNeededBs: number;
  bcvRate: number;
}

export class BiService {
  /**
   * Genera el análisis de Pareto ABC (80/20) sobre el inventario y ventas
   */
  static async getParetoAnalysis(): Promise<{ summary: ParetoSummary; products: ParetoProduct[] }> {
    const rateData = await BcvService.getCurrentRate();
    const bcvRate = rateData.rate;

    const products = await prisma.product.findMany({
      include: {
        category: true,
        orderItems: {
          include: {
            order: true,
          },
        },
      },
    });

    // Calcular ventas y ganancias por producto
    const productStats = products.map((p) => {
      const validItems = p.orderItems.filter(
        (it) => it.order.status !== 'CANCELLED'
      );

      const unitsSold = validItems.reduce((acc, it) => acc + (it.quantity || 0), 0);
      const revenueUsd = validItems.reduce((acc, it) => acc + (it.subtotalUsd || 0), 0);
      const totalCostUsd = unitsSold * (p.costUsd || p.priceUsd * 0.7);
      const grossProfitUsd = revenueUsd - totalCostUsd;
      const marginPercent = revenueUsd > 0 ? (grossProfitUsd / revenueUsd) * 100 : 0;
      const stockValueUsd = (p.stock || 0) * (p.costUsd || p.priceUsd * 0.7);

      return {
        id: p.id,
        sku: p.sku,
        name: p.name,
        category: p.category ? p.category.name : 'General',
        stock: p.stock || 0,
        unit: p.unit || 'UND',
        costUsd: Math.round((p.costUsd || p.priceUsd * 0.7) * 100) / 100,
        priceUsd: p.priceUsd,
        stockValueUsd: Math.round(stockValueUsd * 100) / 100,
        unitsSold: Math.round(unitsSold * 100) / 100,
        revenueUsd: Math.round(revenueUsd * 100) / 100,
        revenueBs: Math.round(revenueUsd * bcvRate * 100) / 100,
        totalCostUsd: Math.round(totalCostUsd * 100) / 100,
        grossProfitUsd: Math.round(grossProfitUsd * 100) / 100,
        grossProfitBs: Math.round(grossProfitUsd * bcvRate * 100) / 100,
        marginPercent: Math.round(marginPercent * 10) / 10,
        isDeadStock: (p.stock || 0) > 0 && unitsSold === 0,
      };
    });

    // Ordenar de mayor a menor ganancia bruta
    productStats.sort((a, b) => b.grossProfitUsd - a.grossProfitUsd);

    const totalGrossProfitUsd = productStats.reduce(
      (acc, p) => acc + Math.max(0, p.grossProfitUsd),
      0
    );
    const totalRevenueUsd = productStats.reduce((acc, p) => acc + p.revenueUsd, 0);

    let cumulativeProfit = 0;
    const paretoProducts: ParetoProduct[] = productStats.map((p) => {
      const profitUsd = Math.max(0, p.grossProfitUsd);
      const profitSharePercent = totalGrossProfitUsd > 0 ? (profitUsd / totalGrossProfitUsd) * 100 : 0;
      cumulativeProfit += profitSharePercent;

      let paretoClass: 'A' | 'B' | 'C' = 'C';
      let strategicAction = 'Mantener stock bajo demanda y revisar rotación';

      if (cumulativeProfit <= 80 || profitSharePercent >= 5) {
        paretoClass = 'A';
        strategicAction = 'Estrella del negocio (Top 20%): Garantizar stock 100%, negociar mejores precios con fábrica';
      } else if (cumulativeProfit <= 95) {
        paretoClass = 'B';
        strategicAction = 'Rotación intermedia: Control estándar de reposición periódica';
      } else {
        paretoClass = 'C';
        if (p.isDeadStock) {
          strategicAction = 'Hueso / Inventario Inmovilizado: Rematar, armar combos o devolver al proveedor';
        } else {
          strategicAction = 'Baja rotación: Mantener mínimo stock de seguridad';
        }
      }

      return {
        ...p,
        profitSharePercent: Math.round(profitSharePercent * 10) / 10,
        cumulativeProfitPercent: Math.min(100, Math.round(cumulativeProfit * 10) / 10),
        paretoClass,
        strategicAction,
      };
    });

    const deadStockItems = paretoProducts.filter((p) => p.isDeadStock);
    const deadStockValueUsd = deadStockItems.reduce((acc, p) => acc + p.stockValueUsd, 0);

    const summary: ParetoSummary = {
      totalProducts: paretoProducts.length,
      classACount: paretoProducts.filter((p) => p.paretoClass === 'A').length,
      classBCount: paretoProducts.filter((p) => p.paretoClass === 'B').length,
      classCCount: paretoProducts.filter((p) => p.paretoClass === 'C').length,
      deadStockCount: deadStockItems.length,
      deadStockValueUsd: Math.round(deadStockValueUsd * 100) / 100,
      totalRevenueUsd: Math.round(totalRevenueUsd * 100) / 100,
      totalRevenueBs: Math.round(totalRevenueUsd * bcvRate * 100) / 100,
      totalGrossProfitUsd: Math.round(totalGrossProfitUsd * 100) / 100,
      totalGrossProfitBs: Math.round(totalGrossProfitUsd * bcvRate * 100) / 100,
      averageMarginPercent:
        totalRevenueUsd > 0
          ? Math.round((totalGrossProfitUsd / totalRevenueUsd) * 1000) / 10
          : 0,
      bcvRate,
    };

    return { summary, products: paretoProducts };
  }

  // =========================================================================
  // ALERTAS INTELIGENTES PREDICTIVAS (MIN/MAX DINÁMICO & TIEMPO DE PROVEEDOR)
  // =========================================================================

  /**
   * Calcula el estado predictivo de reposición de inventario basado en la velocidad
   * de ventas real del POS y el tiempo de respuesta (Lead Time) del proveedor.
   */
  static async getPredictiveStockAnalysis(): Promise<{ summary: PredictiveStockSummary; items: PredictiveStockItem[] }> {
    const rateData = await BcvService.getCurrentRate();
    const bcvRate = rateData.rate;

    const products = await prisma.product.findMany({
      where: { active: true },
      include: {
        category: true,
        orderItems: {
          include: { order: true },
        },
      },
    });

    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    let criticalCount = 0;
    let warningCount = 0;
    let healthyCount = 0;
    let overstockedCount = 0;
    let totalInvestmentNeededUsd = 0;

    const items: PredictiveStockItem[] = products.map((p) => {
      // 1. Filtrar ventas de los últimos 30 días
      const recentSales = p.orderItems.filter(
        (it) => it.order.status !== 'CANCELLED' && new Date(it.order.createdAt) >= thirtyDaysAgo
      );

      const unitsSold30d = recentSales.reduce((acc, it) => acc + (it.quantity || 0), 0);
      
      // Velocidad de consumo diario (DCR)
      const dcr = Number((unitsSold30d / 30).toFixed(2));
      const leadTime = p.leadTimeDays || 7;
      const safetyBufferDays = 5; // Días de amortiguación para contingencias de despacho

      // Punto de Reorden Dinámico (ROP) = (Consumo Diario * Lead Time) + Stock de Seguridad
      const effectiveDcr = dcr > 0 ? dcr : 0.2; // Tasa mínima si no hubo ventas para productos esenciales
      const reorderPointDynamic = Math.ceil((effectiveDcr * leadTime) + (effectiveDcr * safetyBufferDays));

      // Días de inventario restantes antes de quiebre
      const daysRemaining = dcr > 0 ? Math.round(p.stock / dcr) : (p.stock > 0 ? 999 : 0);

      // Clasificación de Riesgo
      let riskStatus: 'CRITICAL_DEPLETED' | 'WARNING_REORDER_NOW' | 'HEALTHY' | 'OVERSTOCKED' = 'HEALTHY';
      if (p.stock <= 0 || daysRemaining <= 3) {
        riskStatus = 'CRITICAL_DEPLETED';
        criticalCount++;
      } else if (p.stock <= reorderPointDynamic) {
        riskStatus = 'WARNING_REORDER_NOW';
        warningCount++;
      } else if (daysRemaining > 90 && p.stock > 10) {
        riskStatus = 'OVERSTOCKED';
        overstockedCount++;
      } else {
        riskStatus = 'HEALTHY';
        healthyCount++;
      }

      // Cantidad sugerida a pedir (Cubre demanda de reposición + 30 días de cobertura meta)
      const targetCoverDays = 30 + leadTime;
      const targetStock = Math.ceil(effectiveDcr * targetCoverDays);
      const suggestedOrderQty = (riskStatus === 'CRITICAL_DEPLETED' || riskStatus === 'WARNING_REORDER_NOW')
        ? Math.max(1, targetStock - Math.floor(p.stock))
        : 0;

      const unitCostUsd = p.costUsd > 0 ? p.costUsd : Number((p.priceUsd * 0.7).toFixed(2));
      const estimatedInvestmentUsd = Number((suggestedOrderQty * unitCostUsd).toFixed(2));
      const estimatedInvestmentBs = Number((estimatedInvestmentUsd * bcvRate).toFixed(2));

      if (suggestedOrderQty > 0) {
        totalInvestmentNeededUsd += estimatedInvestmentUsd;
      }

      return {
        id: p.id,
        sku: p.sku,
        name: p.name,
        category: p.category ? p.category.name : 'General',
        unit: p.unit || 'UND',
        currentStock: p.stock,
        minStockStatic: p.minStock,
        leadTimeDays: leadTime,
        dailyConsumptionRate: dcr,
        reorderPointDynamic,
        daysOfStockRemaining: daysRemaining,
        riskStatus,
        suggestedOrderQty,
        unitCostUsd,
        estimatedInvestmentUsd,
        estimatedInvestmentBs,
      };
    });

    // Ordenar por prioridad: Críticos primero, luego advertencias, luego saludables
    const statusOrder: Record<string, number> = {
      CRITICAL_DEPLETED: 1,
      WARNING_REORDER_NOW: 2,
      OVERSTOCKED: 3,
      HEALTHY: 4,
    };
    items.sort((a, b) => (statusOrder[a.riskStatus] || 99) - (statusOrder[b.riskStatus] || 99));

    const totalInvestmentNeededBs = Number((totalInvestmentNeededUsd * bcvRate).toFixed(2));

    const summary: PredictiveStockSummary = {
      totalProductsAudited: items.length,
      criticalCount,
      warningCount,
      healthyCount,
      overstockedCount,
      totalInvestmentNeededUsd: Number(totalInvestmentNeededUsd.toFixed(2)),
      totalInvestmentNeededBs,
      bcvRate,
    };

    return { summary, items };
  }

  // =========================================================================
  // TRAZABILIDAD TOTAL DE SERIALES, LOTES Y GESTIÓN DE GARANTÍAS (RMA)
  // =========================================================================

  /**
   * Garantiza la existencia de seriales de prueba para herramientas con garantía
   */
  static async ensureSampleSerials() {
    const count = await prisma.productSerial.count();
    if (count > 0) return;

    // Buscar o crear productos que requieran serial
    const rotomartillo = await prisma.product.findFirst({
      where: {
        OR: [
          { sku: { contains: 'ROT' } },
          { name: { contains: 'Rotomartillo' } },
          { hasSerial: true },
        ],
      },
    });

    if (rotomartillo) {
      const now = new Date();
      const expDate = new Date(now);
      expDate.setMonth(expDate.getMonth() + (rotomartillo.warrantyMonths || 12));

      await prisma.productSerial.createMany({
        data: [
          {
            serialNumber: 'ROT-SER-243554',
            productId: rotomartillo.id,
            lotNumber: 'LOTE-2026-03',
            status: 'SOLD',
            customerName: 'Constructora Los Andes, C.A.',
            customerDoc: 'J-30981245-2',
            orderNumber: 'POS-1002',
            soldAt: new Date(now.getTime() - 15 * 24 * 60 * 60 * 1000), // Vendido hace 15 días
            warrantyMonths: rotomartillo.warrantyMonths || 12,
            warrantyExpiresAt: expDate,
            salePriceUsd: rotomartillo.priceUsd,
            supplierName: 'Distribuidora Ferretera Industrial, C.A.',
            purchaseBillNumber: 'FAC-PROV-9901',
            notes: 'Equipo vendido con 12 meses de garantía oficial',
          },
          {
            serialNumber: 'ROT-SER-243555',
            productId: rotomartillo.id,
            lotNumber: 'LOTE-2026-03',
            status: 'IN_STOCK',
            warrantyMonths: rotomartillo.warrantyMonths || 12,
            supplierName: 'Distribuidora Ferretera Industrial, C.A.',
            purchaseBillNumber: 'FAC-PROV-9901',
            notes: 'En exhibición y stock en Tienda Principal',
          },
          {
            serialNumber: 'GEN-HY-987112',
            productId: rotomartillo.id,
            lotNumber: 'LOTE-GEN-2026',
            status: 'IN_STOCK',
            warrantyMonths: 24,
            supplierName: 'Importadora Industrial del Caribe, S.A.',
            notes: 'Planta Eléctrica en almacén central con 24 meses de garantía',
          },
        ],
      });
    }
  }

  /**
   * Consulta completa del historial de vida de un número de serie (Rastreo 360°)
   */
  static async lookupSerial(serialNumber: string) {
    await this.ensureSampleSerials();
    const cleanSerial = serialNumber.trim().toUpperCase();

    const serial = await prisma.productSerial.findUnique({
      where: { serialNumber: cleanSerial },
      include: {
        product: {
          include: { category: true },
        },
      },
    });

    if (!serial) return null;

    const now = new Date();
    const isSold = serial.status === 'SOLD' || !!serial.soldAt;
    let isWarrantyActive = false;
    let daysRemaining = 0;

    if (serial.warrantyExpiresAt) {
      isWarrantyActive = now <= new Date(serial.warrantyExpiresAt);
      const diffMs = new Date(serial.warrantyExpiresAt).getTime() - now.getTime();
      daysRemaining = Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
    }

    return {
      serialNumber: serial.serialNumber,
      status: serial.status,
      lotNumber: serial.lotNumber || 'LOTE-GENERAL',
      product: {
        id: serial.product.id,
        name: serial.product.name,
        sku: serial.product.sku,
        category: serial.product.category?.name || 'General',
        priceUsd: serial.product.priceUsd,
      },
      warranty: {
        warrantyMonths: serial.warrantyMonths,
        warrantyExpiresAt: serial.warrantyExpiresAt,
        isWarrantyActive,
        daysRemaining,
        warrantyStatusLabel: !isSold
          ? 'NO ACTIVADA (EQUIPO EN STOCK)'
          : isWarrantyActive
          ? `VIGENTE (${daysRemaining} DÍAS RESTANTES)`
          : 'EXPIRADA',
      },
      sale: isSold
        ? {
            customerName: serial.customerName || 'Cliente Mostrador',
            customerDoc: serial.customerDoc || 'No registrado',
            orderNumber: serial.orderNumber || 'POS-DIRECTO',
            soldAt: serial.soldAt,
            salePriceUsd: serial.salePriceUsd,
          }
        : null,
      acquisition: {
        supplierName: serial.supplierName || 'Proveedor Mayorista Registrado',
        purchaseBillNumber: serial.purchaseBillNumber || 'FAC-PROV-DIRECTA',
        receivedAt: serial.receivedAt,
      },
      rma: serial.rmaNumber
        ? {
            rmaNumber: serial.rmaNumber,
            rmaStatus: serial.rmaStatus,
            rmaDate: serial.rmaDate,
            rmaResolution: serial.rmaResolution,
            rmaNotes: serial.rmaNotes,
          }
        : null,
      notes: serial.notes,
    };
  }

  /**
   * Lista todos los números de serie registrados con filtros
   */
  static async listSerials(filter?: { status?: string; search?: string }) {
    await this.ensureSampleSerials();

    const where: any = {};
    if (filter?.status) where.status = filter.status;
    if (filter?.search) {
      where.OR = [
        { serialNumber: { contains: filter.search } },
        { customerName: { contains: filter.search } },
        { customerDoc: { contains: filter.search } },
        { orderNumber: { contains: filter.search } },
      ];
    }

    return prisma.productSerial.findMany({
      where,
      include: {
        product: { select: { id: true, sku: true, name: true, priceUsd: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
  }

  /**
   * Procesa un reclamo de garantía o devolución (RMA)
   */
  static async processRma(params: {
    serialNumber: string;
    resolution: 'REPLACED' | 'REPAIRED' | 'REFUNDED' | 'REJECTED';
    notes?: string;
  }) {
    const cleanSerial = params.serialNumber.trim().toUpperCase();
    const serial = await prisma.productSerial.findUnique({
      where: { serialNumber: cleanSerial },
      include: { product: true },
    });

    if (!serial) throw new Error(`El número de serie ${cleanSerial} no está registrado en el sistema`);

    const now = new Date();
    const rmaCount = await prisma.productSerial.count({
      where: { rmaNumber: { not: null } },
    });
    const rmaNumber = `RMA-${1001 + rmaCount}`;

    // Determinar nuevo estatus del serial
    let newStatus = 'RETURNED_WARRANTY';
    if (params.resolution === 'REPLACED') newStatus = 'REPLACED';
    else if (params.resolution === 'REJECTED') newStatus = serial.status;
    else if (params.resolution === 'REFUNDED') newStatus = 'DEFECTIVE';

    const updated = await prisma.productSerial.update({
      where: { id: serial.id },
      data: {
        status: newStatus,
        rmaNumber,
        rmaStatus: params.resolution,
        rmaDate: now,
        rmaResolution: params.resolution,
        rmaNotes: params.notes || `Devolución de cliente tramitada en fecha ${now.toLocaleDateString('es-VE')}`,
      },
      include: { product: true },
    });

    return updated;
  }

  // =========================================================================
  // DASHBOARD GERENCIAL MÓVIL Y KPIS EN TIEMPO REAL
  // =========================================================================

  /**
   * Resumen ejecutivo en tiempo real para consulta gerencial desde smartphones
   */
  static async getExecutiveDashboard() {
    const rateData = await BcvService.getCurrentRate();
    const bcvRate = rateData.rate;

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const todayOrders = await prisma.order.findMany({
      where: {
        createdAt: { gte: todayStart },
        status: { not: 'CANCELLED' },
      },
      include: {
        items: true,
      },
    });

    const todaySalesUsd = todayOrders.reduce((acc, o) => acc + o.totalUsd, 0);
    const todaySalesBs = todayOrders.reduce((acc, o) => acc + o.totalBs, 0);

    // Ganancia bruta de hoy
    let todayCostUsd = 0;
    for (const o of todayOrders) {
      for (const it of o.items) {
        todayCostUsd += it.quantity * (it.priceUsd * 0.7);
      }
    }
    const todayGrossProfitUsd = todaySalesUsd - todayCostUsd;
    const todayMarginPercent = todaySalesUsd > 0 ? (todayGrossProfitUsd / todaySalesUsd) * 100 : 0;

    // Cuentas por cobrar activas
    const customersWithDebt = await prisma.customer.findMany({
      where: { currentDebtUsd: { gt: 0 } },
    });
    const totalReceivablesUsd = customersWithDebt.reduce((acc, c) => acc + (c.currentDebtUsd || 0), 0);

    // Cuentas por pagar a proveedores
    const pendingBills = await prisma.purchaseBill.findMany({
      where: { status: { not: 'PAID' } },
    });
    const totalPayablesUsd = pendingBills.reduce(
      (acc, b) => acc + Math.max(0, b.totalUsd - (b.paidAmountUsd || 0)),
      0
    );

    // Conteo de seriales bajo garantía y alertas críticas
    const totalSerializedUnits = await prisma.productSerial.count();
    const activeWarranties = await prisma.productSerial.count({
      where: {
        status: 'SOLD',
        warrantyExpiresAt: { gte: new Date() },
      },
    });

    return {
      bcvRate,
      today: {
        ordersCount: todayOrders.length,
        salesUsd: Math.round(todaySalesUsd * 100) / 100,
        salesBs: Math.round(todaySalesBs * 100) / 100,
        grossProfitUsd: Math.round(todayGrossProfitUsd * 100) / 100,
        grossProfitBs: Math.round(todayGrossProfitUsd * bcvRate * 100) / 100,
        marginPercent: Math.round(todayMarginPercent * 10) / 10,
      },
      liquidity: {
        receivablesUsd: Math.round(totalReceivablesUsd * 100) / 100,
        receivablesBs: Math.round(totalReceivablesUsd * bcvRate * 100) / 100,
        payablesUsd: Math.round(totalPayablesUsd * 100) / 100,
        payablesBs: Math.round(totalPayablesUsd * bcvRate * 100) / 100,
        netWorkingCapitalUsd: Math.round((totalReceivablesUsd - totalPayablesUsd) * 100) / 100,
      },
      serialsAndWarranty: {
        totalSerializedUnits,
        activeWarranties,
      },
    };
  }
}
