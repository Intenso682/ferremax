import { prisma } from '../prisma';

export interface TransferItemInput {
  productId: string;
  quantity: number;
  unit?: string;
}

export interface CreateTransferInput {
  fromWarehouseId: string;
  toWarehouseId: string;
  notes?: string;
  userCreated?: string;
  items: TransferItemInput[];
}

export class WarehouseService {
  /**
   * Garantiza la existencia de los 3 almacenes predeterminados de una ferretería
   * y sincroniza las existencias de productos en el almacén principal.
   */
  static async ensureDefaultWarehouses(): Promise<void> {
    try {
      const count = await prisma.warehouse.count();
      if (count === 0) {
        // 1. Crear almacenes por defecto
        const tienda = await prisma.warehouse.create({
          data: {
            code: 'TIENDA',
            name: 'Tienda & Mostrador Principal',
            location: 'Salón Comercial - Mostrador',
            isDefault: true,
            active: true,
          },
        });

        const central = await prisma.warehouse.create({
          data: {
            code: 'CENTRAL',
            name: 'Almacén Central / Galpón',
            location: 'Galpón Mayorista A-1',
            isDefault: false,
            active: true,
          },
        });

        await prisma.warehouse.create({
          data: {
            code: 'PATIO',
            name: 'Patio de Materiales Pesados',
            location: 'Patio Exterior / Cemento y Cabillas',
            isDefault: false,
            active: true,
          },
        });

        // 2. Asociar existencias de productos existentes al almacén principal
        const products = await prisma.product.findMany();
        for (const prod of products) {
          await prisma.warehouseStock.create({
            data: {
              warehouseId: tienda.id,
              productId: prod.id,
              stock: prod.stock,
              minStock: prod.minStock,
            },
          });

          // Stock de reserva en almacén central
          await prisma.warehouseStock.create({
            data: {
              warehouseId: central.id,
              productId: prod.id,
              stock: Math.round(prod.stock * 1.5),
              minStock: prod.minStock,
            },
          });
        }

        // 3. Enriquecer productos de muestra con unidades ferreteras y seriales de garantía
        await this.enrichSampleProducts();
      } else {
        // Asegurar que productos nuevos tengan su registro en el almacén default
        const defaultWh = await prisma.warehouse.findFirst({ where: { isDefault: true } }) 
          || await prisma.warehouse.findFirst();
        
        if (defaultWh) {
          const products = await prisma.product.findMany();
          for (const prod of products) {
            const exists = await prisma.warehouseStock.findUnique({
              where: {
                warehouseId_productId: {
                  warehouseId: defaultWh.id,
                  productId: prod.id,
                },
              },
            });
            if (!exists) {
              await prisma.warehouseStock.create({
                data: {
                  warehouseId: defaultWh.id,
                  productId: prod.id,
                  stock: prod.stock,
                  minStock: prod.minStock,
                },
              });
            }
          }
        }
      }
    } catch (err: any) {
      console.error('Error al inicializar almacenes predeterminados:', err.message);
    }
  }

  /**
   * Enriquecer productos emblemáticos con factores de conversión de unidades y seriales
   */
  static async enrichSampleProducts(): Promise<void> {
    try {
      const products = await prisma.product.findMany();
      for (const p of products) {
        const lowerName = p.name.toLowerCase();
        let updateData: any = null;

        if (lowerName.includes('cable') || lowerName.includes('thhn') || lowerName.includes('manguera')) {
          updateData = {
            unit: 'METRO',
            purchaseUnit: 'ROLLO',
            unitRatio: 100.0,
            location: 'Pasillo 2 - Riel Eléctrico',
          };
        } else if (lowerName.includes('tornillo') || lowerName.includes('clavo') || lowerName.includes('remache')) {
          updateData = {
            unit: 'UND',
            purchaseUnit: 'CAJA',
            unitRatio: 500.0,
            location: 'Pasillo 1 - Gavetero C-14',
          };
        } else if (lowerName.includes('pintura') || lowerName.includes('esmalte') || lowerName.includes('solvente')) {
          updateData = {
            unit: 'LITRO',
            purchaseUnit: 'GALON',
            unitRatio: 3.785,
            location: 'Pasillo 4 - Estantería Pinturas',
          };
        } else if (lowerName.includes('cemento') || lowerName.includes('pego') || lowerName.includes('arena')) {
          updateData = {
            unit: 'SACO',
            purchaseUnit: 'PALETA',
            unitRatio: 40.0,
            location: 'Patio de Materiales - Bahía 3',
          };
        } else if (lowerName.includes('taladro') || lowerName.includes('esmeril') || lowerName.includes('sierra') || lowerName.includes('generador') || lowerName.includes('bomba')) {
          updateData = {
            unit: 'UND',
            purchaseUnit: 'UND',
            unitRatio: 1.0,
            hasSerial: true,
            warrantyMonths: lowerName.includes('generador') ? 24 : 12,
            location: 'Vitrina 1 - Herramientas Eléctricas',
          };
        }

        if (updateData) {
          await prisma.product.update({
            where: { id: p.id },
            data: updateData,
          });
        }
      }
    } catch (err: any) {
      console.warn('Aviso al enriquecer productos:', err.message);
    }
  }

  /**
   * Obtener todos los almacenes con resumen de productos y existencias totales
   */
  static async getWarehouses(): Promise<any[]> {
    const warehouses = await prisma.warehouse.findMany({
      include: {
        stocks: {
          select: {
            stock: true,
            minStock: true,
          },
        },
      },
      orderBy: [{ isDefault: 'desc' }, { name: 'asc' }],
    });

    return warehouses.map((w) => {
      const totalStock = w.stocks.reduce((acc, curr) => acc + curr.stock, 0);
      const lowStockCount = w.stocks.filter((s) => s.stock <= s.minStock).length;
      return {
        id: w.id,
        code: w.code,
        name: w.name,
        location: w.location,
        isDefault: w.isDefault,
        active: w.active,
        totalItems: w.stocks.length,
        totalStock: Math.round(totalStock * 100) / 100,
        lowStockCount,
        createdAt: w.createdAt,
      };
    });
  }

  /**
   * Obtener existencias detalladas de productos por almacén
   */
  static async getWarehouseInventory(warehouseId: string): Promise<any> {
    const warehouse = await prisma.warehouse.findUnique({
      where: { id: warehouseId },
    });

    if (!warehouse) {
      throw new Error('Almacén no encontrado');
    }

    const stocks = await prisma.warehouseStock.findMany({
      where: { warehouseId },
      include: {
        product: {
          select: {
            id: true,
            sku: true,
            barcode: true,
            name: true,
            priceUsd: true,
            costUsd: true,
            unit: true,
            purchaseUnit: true,
            unitRatio: true,
            hasSerial: true,
            warrantyMonths: true,
            location: true,
            imageUrl: true,
            category: { select: { name: true } },
          },
        },
      },
      orderBy: { product: { name: 'asc' } },
    });

    return {
      warehouse,
      items: stocks.map((s) => {
        const purchaseUnitsEquiv = s.product.unitRatio > 1 
          ? (s.stock / s.product.unitRatio).toFixed(2)
          : null;

        return {
          stockId: s.id,
          productId: s.product.id,
          sku: s.product.sku,
          barcode: s.product.barcode,
          name: s.product.name,
          categoryName: s.product.category?.name || 'General',
          priceUsd: s.product.priceUsd,
          costUsd: s.product.costUsd,
          stock: s.stock,
          minStock: s.minStock,
          unit: s.product.unit,
          purchaseUnit: s.product.purchaseUnit,
          unitRatio: s.product.unitRatio,
          purchaseUnitsEquiv,
          hasSerial: s.product.hasSerial,
          warrantyMonths: s.product.warrantyMonths,
          location: s.product.location,
          isLow: s.stock <= s.minStock,
        };
      }),
    };
  }

  /**
   * Crear un traslado atómico y auditable entre almacenes
   */
  static async createTransfer(input: CreateTransferInput): Promise<any> {
    const { fromWarehouseId, toWarehouseId, notes, userCreated = 'Administrador', items } = input;

    if (!fromWarehouseId || !toWarehouseId) {
      throw new Error('Debe especificar el almacén de origen y el almacén de destino');
    }

    if (fromWarehouseId === toWarehouseId) {
      throw new Error('El almacén de origen y destino no pueden ser el mismo');
    }

    if (!items || items.length === 0) {
      throw new Error('Debe incluir al menos un producto en el traslado');
    }

    const result = await prisma.$transaction(async (tx) => {
      // 1. Validar almacenes
      const fromWh = await tx.warehouse.findUnique({ where: { id: fromWarehouseId } });
      const toWh = await tx.warehouse.findUnique({ where: { id: toWarehouseId } });

      if (!fromWh || !toWh) {
        throw new Error('Almacén de origen o destino no válido');
      }

      // 2. Correlativo de traslado
      const transferCount = await tx.stockTransfer.count();
      const transferNumber = `TR-${(1001 + transferCount).toString()}`;

      // 3. Validar existencias y procesar items
      const transferItemsData: any[] = [];

      for (const it of items) {
        const qty = Number(it.quantity);
        if (qty <= 0) {
          throw new Error('La cantidad a transferir debe ser mayor a cero');
        }

        const prod = await tx.product.findUnique({ where: { id: it.productId } });
        if (!prod) {
          throw new Error(`Producto con ID ${it.productId} no existe`);
        }

        // Buscar stock en almacén origen
        const sourceStock = await tx.warehouseStock.findUnique({
          where: {
            warehouseId_productId: {
              warehouseId: fromWarehouseId,
              productId: it.productId,
            },
          },
        });

        const currentSourceStock = sourceStock ? sourceStock.stock : 0;
        if (currentSourceStock < qty) {
          throw new Error(`Stock insuficiente en "${fromWh.name}" para "${prod.name}". Disponible: ${currentSourceStock} ${prod.unit}, Requerido: ${qty} ${prod.unit}`);
        }

        // Descontar en origen
        await tx.warehouseStock.update({
          where: { id: sourceStock!.id },
          data: { stock: currentSourceStock - qty },
        });

        // Sumar o crear en destino
        const targetStock = await tx.warehouseStock.findUnique({
          where: {
            warehouseId_productId: {
              warehouseId: toWarehouseId,
              productId: it.productId,
            },
          },
        });

        if (targetStock) {
          await tx.warehouseStock.update({
            where: { id: targetStock.id },
            data: { stock: targetStock.stock + qty },
          });
        } else {
          await tx.warehouseStock.create({
            data: {
              warehouseId: toWarehouseId,
              productId: it.productId,
              stock: qty,
              minStock: prod.minStock,
            },
          });
        }

        // Si el traslado involucra el almacén default (el stock consolidado se mantiene igual),
        // pero aseguramos que el inventario maestro de Product refleje la tienda principal
        if (fromWh.isDefault) {
          await tx.product.update({
            where: { id: prod.id },
            data: { stock: Math.max(0, prod.stock - qty) },
          });
        } else if (toWh.isDefault) {
          await tx.product.update({
            where: { id: prod.id },
            data: { stock: prod.stock + qty },
          });
        }

        transferItemsData.push({
          productId: prod.id,
          productName: prod.name,
          quantity: qty,
          unit: it.unit || prod.unit,
        });
      }

      // 4. Crear registro maestro de traslado
      const transfer = await tx.stockTransfer.create({
        data: {
          transferNumber,
          fromWarehouseId,
          toWarehouseId,
          status: 'COMPLETED',
          notes: notes || null,
          userCreated,
          items: {
            create: transferItemsData,
          },
        },
        include: {
          fromWarehouse: true,
          toWarehouse: true,
          items: true,
        },
      });

      return transfer;
    });

    return result;
  }

  /**
   * Obtener historial de traslados con paginación y búsqueda
   */
  static async getTransfers(limit = 50): Promise<any[]> {
    return prisma.stockTransfer.findMany({
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        fromWarehouse: { select: { id: true, code: true, name: true } },
        toWarehouse: { select: { id: true, code: true, name: true } },
        items: true,
      },
    });
  }
}
