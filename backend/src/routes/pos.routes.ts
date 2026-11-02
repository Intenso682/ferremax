import { Router, Request, Response } from 'express';
import { prisma } from '../prisma';
import { BcvService } from '../services/bcv.service';
import { config } from '../config';
import { SettingsService } from '../services/settings.service';
import { CashService } from '../services/cash.service';
import { AuthenticatedRequest } from '../middleware/auth.middleware';

export const posRouter = Router();

// Cobro rápido en mostrador (POS) con soporte multimoneda y recibo electrónico digital
posRouter.post('/sale', async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      items, // array de { productId, quantity }
      customerDoc, // Cédula o RIF
      customerName,
      paymentMethod, // 'PAGO_MOVIL', 'EFECTIVO_USD', 'EFECTIVO_BS', 'PUNTO_DEBITO', 'MIXTO'
      amountUsdPaid,
      amountBsPaid,
      paymentReference,
    } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      res.status(400).json({ error: 'Debe agregar al menos un producto' });
      return;
    }

    const { rate: bcvRate } = await BcvService.getCurrentRate();

    const saleResult = await prisma.$transaction(async (tx) => {
      // 1. Obtener y verificar productos
      const productIds = items.map((i: any) => i.productId);
      const dbProducts = await tx.product.findMany({
        where: { id: { in: productIds }, active: true },
      });

      if (dbProducts.length !== items.length) {
        throw new Error('Uno o más productos no existen');
      }

      let subtotalUsd = 0;
      const orderItemsData: any[] = [];

      // Almacén de despacho
      const requestedWarehouseId = req.body.warehouseId;
      const activeWarehouse = requestedWarehouseId
        ? await tx.warehouse.findUnique({ where: { id: requestedWarehouseId } })
        : await tx.warehouse.findFirst({ where: { isDefault: true } }) || await tx.warehouse.findFirst();

      for (const item of items) {
        const prod = dbProducts.find((p) => p.id === item.productId)!;
        const qty = Number(item.quantity || 1);
        const unitSold = (item.unitSold || prod.unit || 'UND').trim().toUpperCase();

        // Conversión de unidades si se vende en unidad de compra mayorista
        const isPurchaseUnit = unitSold === (prod.purchaseUnit || '').toUpperCase() && prod.unitRatio > 1;
        const effectiveStockQty = isPurchaseUnit ? qty * prod.unitRatio : qty;

        // Validación de serial para garantías
        if (prod.hasSerial && !item.serialNumber) {
          throw new Error(`El producto "${prod.name}" requiere el registro obligatorio del número de serial para efectos de garantía.`);
        }

        if (prod.stock < effectiveStockQty) {
          throw new Error(`Stock insuficiente para "${prod.name}". Disponible: ${prod.stock} ${prod.unit}, Solicitado: ${effectiveStockQty} ${prod.unit}`);
        }

        const itemPriceUsd = isPurchaseUnit ? (prod.priceUsd * prod.unitRatio) : prod.priceUsd;
        const itemSubtotal = itemPriceUsd * qty;
        subtotalUsd += itemSubtotal;

        const priceBs = Math.round(itemPriceUsd * bcvRate * 100) / 100;

        orderItemsData.push({
          productId: prod.id,
          productName: prod.name,
          quantity: qty,
          unitSold,
          serialNumber: item.serialNumber ? String(item.serialNumber).trim().toUpperCase() : null,
          priceUsd: itemPriceUsd,
          priceBs,
          subtotalUsd: Math.round(itemSubtotal * 100) / 100,
        });

        // Descontar existencias de forma inmediata en Product
        await tx.product.update({
          where: { id: prod.id },
          data: { stock: Math.max(0, prod.stock - effectiveStockQty) },
        });

        // Descontar existencias en el almacén de despacho si existe
        if (activeWarehouse) {
          const whStock = await tx.warehouseStock.findUnique({
            where: {
              warehouseId_productId: {
                warehouseId: activeWarehouse.id,
                productId: prod.id,
              },
            },
          });
          if (whStock) {
            await tx.warehouseStock.update({
              where: { id: whStock.id },
              data: { stock: Math.max(0, whStock.stock - effectiveStockQty) },
            });
          }
        }
      }

      // 2. Cálculos fiscales dinámicos desde la configuración del backend
      const ivaPercent = await SettingsService.getIvaPercent();
      const igtfPercent = await SettingsService.getIgtfPercent();
      const taxUsd = Math.round(subtotalUsd * (ivaPercent / 100) * 100) / 100;
      
      // IGTF dinámico si se paga en divisas en efectivo
      const isDivisaPayment = paymentMethod === 'EFECTIVO_USD' || (paymentMethod === 'MIXTO' && (amountUsdPaid || 0) > 0);
      const divisaBase = paymentMethod === 'EFECTIVO_USD' ? (subtotalUsd + taxUsd) : (amountUsdPaid || 0);
      const igtfUsd = isDivisaPayment
        ? Math.round(divisaBase * (igtfPercent / 100) * 100) / 100
        : 0;

      const totalUsd = Math.round((subtotalUsd + taxUsd + igtfUsd) * 100) / 100;
      const totalBs = Math.round(totalUsd * bcvRate * 100) / 100;

      // 3. Cliente
      const finalDoc = customerDoc || 'V-00000000';
      const finalName = customerName || 'CLIENTE MOSTRADOR';

      let customerRecord = await tx.customer.findUnique({
        where: { docNumber: finalDoc },
      });

      if (!customerRecord) {
        customerRecord = await tx.customer.create({
          data: {
            docType: finalDoc.split('-')[0] || 'V',
            docNumber: finalDoc,
            name: finalName,
          },
        });
      }

      // 4. Correlativo de venta
      const count = await tx.order.count();
      const orderNumber = `POS-${(1001 + count).toString()}`;

      // 5. Verificar si es venta a crédito comercial
      const isCredit = paymentMethod === 'CREDITO' || paymentMethod === 'CREDITO_COMERCIAL';
      if (isCredit) {
        if (customerRecord.creditStatus === 'BLOCKED') {
          throw new Error(`El crédito del cliente ${finalName} se encuentra bloqueado.`);
        }
        if (customerRecord.creditLimitUsd <= 0) {
          throw new Error(`El cliente ${finalName} (${finalDoc}) no tiene cupo de crédito comercial autorizado.`);
        }
        if (customerRecord.currentDebtUsd + totalUsd > customerRecord.creditLimitUsd) {
          const available = Math.max(0, customerRecord.creditLimitUsd - customerRecord.currentDebtUsd);
          throw new Error(`Límite de crédito excedido. Disponible: $${available.toFixed(2)}, Total venta: $${totalUsd.toFixed(2)}`);
        }
      }

      // 6. Crear la venta (PAGADA o A CRÉDITO)
      const order = await tx.order.create({
        data: {
          orderNumber,
          customerId: customerRecord.id,
          customerName: finalName,
          customerDoc: finalDoc,
          channel: 'POS',
          status: isCredit ? 'ON_CREDIT' : 'PAID',
          subtotalUsd,
          taxUsd,
          igtfUsd,
          totalUsd,
          bcvRate,
          totalBs,
          paymentMethod: paymentMethod || 'EFECTIVO_BS',
          paymentReference: paymentReference || null,
          deliveryType: 'PICKUP',
          notes: isCredit ? 'Venta a Crédito Comercial · Saldo a cuenta' : `Cobrado por: ${(req as any).user?.name || 'Caja'}`,
          items: {
            create: orderItemsData,
          },
        },
        include: { items: true },
      });

      // 7. Si hay productos con serial, activar la trazabilidad y garantía en ProductSerial
      for (const it of orderItemsData) {
        if (it.serialNumber) {
          const prod = await tx.product.findUnique({ where: { id: it.productId } });
          const warrantyMonths = prod?.warrantyMonths || 12;
          const soldAt = new Date();
          const warrantyExpiresAt = new Date(soldAt);
          warrantyExpiresAt.setMonth(warrantyExpiresAt.getMonth() + warrantyMonths);

          await tx.productSerial.upsert({
            where: { serialNumber: it.serialNumber },
            update: {
              status: 'SOLD',
              orderId: order.id,
              orderNumber: order.orderNumber,
              customerName: finalName,
              customerDoc: finalDoc,
              soldAt,
              salePriceUsd: it.priceUsd,
              warrantyMonths,
              warrantyExpiresAt,
            },
            create: {
              serialNumber: it.serialNumber,
              productId: it.productId,
              status: 'SOLD',
              orderId: order.id,
              orderNumber: order.orderNumber,
              customerName: finalName,
              customerDoc: finalDoc,
              soldAt,
              salePriceUsd: it.priceUsd,
              warrantyMonths,
              warrantyExpiresAt,
              notes: 'Vendido en caja mostrador POS',
            },
          });
        }
      }

      if (isCredit) {
        await tx.customer.update({
          where: { id: customerRecord.id },
          data: {
            currentDebtUsd: Math.round((customerRecord.currentDebtUsd + totalUsd) * 100) / 100,
          },
        });
      }

      return order;
    });

    const currentStoreName = await SettingsService.get('STORE_NAME', config.storeName);
    const currentStoreRif = await SettingsService.get('STORE_RIF', config.storeRif);
    const currentStoreAddress = await SettingsService.get('STORE_ADDRESS', config.storeAddress);
    const currentStorePhone = await SettingsService.get('STORE_PHONE', config.storePhone);

    res.status(201).json({
      message: 'Venta registrada con éxito',
      sale: saleResult,
      receipt: {
        storeName: currentStoreName,
        storeRif: currentStoreRif,
        storeAddress: currentStoreAddress,
        storePhone: currentStorePhone,
        folio: saleResult.orderNumber,
        date: saleResult.createdAt,
        customerName: saleResult.customerName,
        customerDoc: saleResult.customerDoc,
        paymentMethod: saleResult.paymentMethod,
        paymentReference: saleResult.paymentReference,
        bcvRate: saleResult.bcvRate,
        subtotalUsd: saleResult.subtotalUsd,
        subtotalBs: Math.round(saleResult.subtotalUsd * saleResult.bcvRate * 100) / 100,
        ivaUsd: saleResult.taxUsd,
        ivaBs: Math.round(saleResult.taxUsd * saleResult.bcvRate * 100) / 100,
        igtfUsd: saleResult.igtfUsd,
        igtfBs: Math.round(saleResult.igtfUsd * saleResult.bcvRate * 100) / 100,
        totalUsd: saleResult.totalUsd,
        totalBs: saleResult.totalBs,
        items: saleResult.items,
      },
    });
  } catch (error: any) {
    res.status(400).json({ error: error.message || 'Error al procesar cobro en mostrador' });
  }
});

// =========================================================================
// GESTIÓN DE CAJA: RESUMEN DE TURNO, CORTE X Y CORTE Z
// =========================================================================

// 1. Resumen en vivo del turno actual (Ventas acumuladas desde el último Corte Z)
posRouter.get('/cash/shift-summary', async (_req: Request, res: Response): Promise<void> => {
  try {
    const summary = await CashService.getCurrentShiftSummary();
    res.json(summary);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Error al obtener resumen del turno de caja' });
  }
});

// 2. Generar Corte X (Auditoría parcial en cualquier momento sin cerrar caja)
posRouter.post('/cash/corte-x', async (req: Request, res: Response): Promise<void> => {
  try {
    const { cashierName, notes } = req.body;
    const corteX = await CashService.generateCorteX(cashierName, notes);
    res.json({
      message: 'Corte X de auditoría generado con éxito',
      corte: corteX,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Error al generar Corte X' });
  }
});

// 3. Generar Corte Z (Cierre definitivo de turno con arqueo físico y balance)
posRouter.post('/cash/corte-z', async (req: Request, res: Response): Promise<void> => {
  try {
    const corteZ = await CashService.generateCorteZ(req.body);
    res.json({
      message: 'Corte Z registrado con éxito. Turno cerrado.',
      corte: corteZ,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Error al procesar Corte Z' });
  }
});

// 4. Historial de Cierres de Caja para auditoría gerencial
posRouter.get('/cash/history', async (req: Request, res: Response): Promise<void> => {
  try {
    const { limit, type, search } = req.query;
    const history = await CashService.getHistory({
      limit: limit ? Number(limit) : 50,
      type: type as string,
      search: search as string,
    });
    res.json(history);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Error al obtener historial de cortes de caja' });
  }
});

// 5. Consulta individual de un Corte de Caja específico
posRouter.get('/cash/history/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const corte = await CashService.getById(String(id));
    if (!corte) {
      res.status(404).json({ error: 'Corte de caja no encontrado' });
      return;
    }
    res.json(corte);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Error al obtener detalle del corte de caja' });
  }
});

