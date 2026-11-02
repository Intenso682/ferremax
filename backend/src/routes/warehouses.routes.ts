import { Router, Request, Response } from 'express';
import { prisma } from '../prisma';
import { WarehouseService } from '../services/warehouse.service';
import { requireAuth, requireRole } from '../middleware/auth.middleware';

export const warehousesRouter = Router();

// 1. Listar todos los almacenes con métricas consolidadas
warehousesRouter.get('/', async (_req: Request, res: Response): Promise<void> => {
  try {
    const list = await WarehouseService.getWarehouses();
    res.json(list);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Error al listar almacenes' });
  }
});

// 2. Obtener inventario detallado de un almacén específico
warehousesRouter.get('/:id/inventory', async (req: Request, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;
    const inv = await WarehouseService.getWarehouseInventory(id);
    res.json(inv);
  } catch (error: any) {
    res.status(404).json({ error: error.message || 'Error al obtener inventario del almacén' });
  }
});

// 3. Crear nuevo depósito o almacén
warehousesRouter.post('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const { code, name, location, isDefault } = req.body;
    if (!code || !name) {
      res.status(400).json({ error: 'Código y nombre del almacén son obligatorios' });
      return;
    }

    const cleanCode = code.trim().toUpperCase().replace(/[^A-Z0-9_-]/g, '');

    const existing = await prisma.warehouse.findUnique({ where: { code: cleanCode } });
    if (existing) {
      res.status(400).json({ error: `Ya existe un almacén con el código "${cleanCode}"` });
      return;
    }

    // Si se marca como default, desmarcar otros
    if (isDefault) {
      await prisma.warehouse.updateMany({ data: { isDefault: false } });
    }

    const warehouse = await prisma.warehouse.create({
      data: {
        code: cleanCode,
        name: name.trim(),
        location: location ? location.trim() : null,
        isDefault: Boolean(isDefault),
        active: true,
      },
    });

    res.status(201).json(warehouse);
  } catch (error: any) {
    res.status(400).json({ error: error.message || 'Error al crear almacén' });
  }
});

// 4. Actualizar almacén
warehousesRouter.put('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;
    const { name, location, isDefault, active } = req.body;

    if (isDefault) {
      await prisma.warehouse.updateMany({
        where: { id: { not: id } },
        data: { isDefault: false },
      });
    }

    const updated = await prisma.warehouse.update({
      where: { id },
      data: {
        ...(name && { name: name.trim() }),
        ...(location !== undefined && { location: location ? location.trim() : null }),
        ...(isDefault !== undefined && { isDefault: Boolean(isDefault) }),
        ...(active !== undefined && { active: Boolean(active) }),
      },
    });

    res.json(updated);
  } catch (error: any) {
    res.status(400).json({ error: error.message || 'Error al actualizar almacén' });
  }
});

// 5. Historial de traslados entre almacenes
warehousesRouter.get('/transfers/history', async (req: Request, res: Response): Promise<void> => {
  try {
    const limit = Number(req.query.limit) || 50;
    const transfers = await WarehouseService.getTransfers(limit);
    res.json(transfers);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Error al obtener historial de traslados' });
  }
});

// 6. Ejecutar un traslado atómico de mercancía entre depósitos
warehousesRouter.post('/transfers', async (req: Request, res: Response): Promise<void> => {
  try {
    const { fromWarehouseId, toWarehouseId, notes, userCreated, items } = req.body;

    const transfer = await WarehouseService.createTransfer({
      fromWarehouseId,
      toWarehouseId,
      notes,
      userCreated,
      items,
    });

    res.status(201).json({
      message: `Traslado ${transfer.transferNumber} ejecutado y registrado con éxito`,
      transfer,
    });
  } catch (error: any) {
    res.status(400).json({ error: error.message || 'Error al ejecutar traslado de mercancía' });
  }
});

// 7. Consulta individual de comprobante de traslado
warehousesRouter.get('/transfers/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;
    const transfer = await prisma.stockTransfer.findFirst({
      where: {
        OR: [{ id }, { transferNumber: id }],
      },
      include: {
        fromWarehouse: true,
        toWarehouse: true,
        items: true,
      },
    });

    if (!transfer) {
      res.status(404).json({ error: 'Comprobante de traslado no encontrado' });
      return;
    }

    res.json(transfer);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Error al consultar traslado' });
  }
});
