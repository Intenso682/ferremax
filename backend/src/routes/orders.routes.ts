import { Router, Response } from 'express';
import { prisma } from '../prisma';
import { requireAuth, requireRole, AuthenticatedRequest } from '../middleware/auth.middleware';

export const ordersRouter = Router();

// Listado de todas las órdenes para el panel administrativo
ordersRouter.get('/', requireAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { status, channel, search } = req.query;

    const where: any = {};

    if (status && typeof status === 'string') {
      where.status = status;
    }

    if (channel && typeof channel === 'string') {
      where.channel = channel;
    }

    if (search && typeof search === 'string') {
      where.OR = [
        { orderNumber: { contains: search } },
        { customerName: { contains: search } },
        { customerDoc: { contains: search } },
        { paymentReference: { contains: search } },
      ];
    }

    const orders = await prisma.order.findMany({
      where,
      include: {
        items: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json(orders);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Error al listar órdenes' });
  }
});

// Detalle de una orden específica
ordersRouter.get('/:id', requireAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const id = String(req.params.id);
    const order = await prisma.order.findUnique({
      where: { id },
      include: {
        items: { include: { product: true } },
        customer: true,
      },
    });

    if (!order) {
      res.status(404).json({ error: 'Orden no encontrada' });
      return;
    }

    res.json(order);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Error al obtener orden' });
  }
});

// Aprobación rápida de Pago Móvil / Transferencia en 1 clic
ordersRouter.patch('/:id/verify-payment', requireAuth, requireRole(['ADMIN', 'CASHIER']), async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const id = String(req.params.id);
    const { referenceConfirmed } = req.body;

    const order = await prisma.order.findUnique({ where: { id } });
    if (!order) {
      res.status(404).json({ error: 'Orden no encontrada' });
      return;
    }

    const updated = await prisma.order.update({
      where: { id },
      data: {
        status: 'PAID',
        notes: (order.notes ? order.notes + ' | ' : '') + `Pago verificado por ${req.user?.name || 'Administración'} (Ref: ${referenceConfirmed || order.paymentReference || 'OK'})`,
      },
    });

    res.json({ message: 'Pago verificado con éxito', order: updated });
  } catch (error: any) {
    res.status(400).json({ error: error.message || 'Error al verificar pago' });
  }
});

// Cambio de estado general del pedido
ordersRouter.patch('/:id/status', requireAuth, requireRole(['ADMIN', 'CASHIER', 'WAREHOUSE']), async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const id = String(req.params.id);
    const { status, note } = req.body;

    const validStatuses = ['PENDING_PAYMENT', 'PAID', 'PREPARING', 'READY_FOR_PICKUP', 'DISPATCHED', 'DELIVERED', 'CANCELLED'];
    if (!validStatuses.includes(status)) {
      res.status(400).json({ error: 'Estado inválido' });
      return;
    }

    const order = (await prisma.order.findUnique({ where: { id }, include: { items: true } })) as any;
    if (!order) {
      res.status(404).json({ error: 'Orden no encontrada' });
      return;
    }

    // Si se cancela una orden, reintegrar el stock a los productos
    if (status === 'CANCELLED' && order.status !== 'CANCELLED') {
      await prisma.$transaction(async (tx) => {
        for (const item of order.items) {
          await tx.product.update({
            where: { id: item.productId },
            data: { stock: { increment: item.quantity } },
          });
        }
        await tx.order.update({
          where: { id },
          data: {
            status: 'CANCELLED',
            notes: (order.notes ? order.notes + ' | ' : '') + `Cancelado: ${note || 'Sin motivo'}`,
          },
        });
      });
      res.json({ message: 'Orden cancelada y stock reintegrado con éxito' });
      return;
    }

    const updated = await prisma.order.update({
      where: { id },
      data: {
        status,
        notes: note ? (order.notes ? order.notes + ' | ' : '') + note : order.notes,
      },
    });

    res.json(updated);
  } catch (error: any) {
    res.status(400).json({ error: error.message || 'Error al actualizar estado de la orden' });
  }
});
