import { Router, Request, Response } from 'express';
import { FiscalService } from '../services/fiscal.service';
import { prisma } from '../prisma';

export const fiscalRouter = Router();

// Listar todas las facturas fiscales emitidas
fiscalRouter.get('/invoices', async (req: Request, res: Response): Promise<void> => {
  try {
    const invoices = await prisma.invoice.findMany({
      include: {
        items: true,
      },
      orderBy: { createdAt: 'desc' },
    });
    res.json(invoices);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Error al listar facturas fiscales' });
  }
});

// Detalle de una factura fiscal
fiscalRouter.get('/invoices/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const invoice = await prisma.invoice.findUnique({
      where: { id: req.params.id as string },
      include: {
        items: true,
      },
    });
    if (!invoice) {
      res.status(404).json({ error: 'Factura no encontrada' });
      return;
    }
    res.json(invoice);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Error al obtener factura fiscal' });
  }
});

// Emisión directa de factura fiscal
fiscalRouter.post('/invoices', async (req: Request, res: Response): Promise<void> => {
  try {
    const { customerName, customerDoc, items } = req.body;
    if (!customerName || !customerDoc || !Array.isArray(items) || items.length === 0) {
      res.status(400).json({ error: 'Faltan campos obligatorios: customerName, customerDoc, o items' });
      return;
    }

    const invoice = await FiscalService.createInvoice(req.body);
    res.status(201).json(invoice);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Error al emitir factura fiscal' });
  }
});

// Listar notas de entrega u órdenes pendientes de facturación fiscal
fiscalRouter.get('/pending-notes', async (req: Request, res: Response): Promise<void> => {
  try {
    const { customerDoc } = req.query;
    const where: any = {
      fiscalStatus: 'PENDING',
    };
    if (customerDoc && typeof customerDoc === 'string') {
      where.customerDoc = customerDoc;
    }

    const pendingOrders = await prisma.order.findMany({
      where,
      include: {
        items: true,
      },
      orderBy: { createdAt: 'desc' },
    });
    res.json(pendingOrders);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Error al listar notas pendientes' });
  }
});

// Consolidación de Notas de Entrega a Factura Fiscal en 1 Clic
fiscalRouter.post('/consolidate-notes', async (req: Request, res: Response): Promise<void> => {
  try {
    const { orderIds, withholdingPercent, withholdingReceiptNo, notes, createdBy } = req.body;
    if (!Array.isArray(orderIds) || orderIds.length === 0) {
      res.status(400).json({ error: 'Debes enviar un arreglo de orderIds con al menos 1 orden' });
      return;
    }

    const invoice = await FiscalService.consolidateDeliveryNotes({
      orderIds,
      withholdingPercent: withholdingPercent ? Number(withholdingPercent) : undefined,
      withholdingReceiptNo,
      notes,
      createdBy,
    });

    res.status(201).json({
      message: 'Notas de entrega consolidadas con éxito en Factura Fiscal',
      invoice,
    });
  } catch (error: any) {
    res.status(400).json({ error: error.message || 'Error al consolidar notas de entrega' });
  }
});

// Libro Especial de Ventas SENIAT (JSON estructurado)
fiscalRouter.get('/sales-book', async (req: Request, res: Response): Promise<void> => {
  try {
    const { startDate, endDate } = req.query;
    const book = await FiscalService.getSalesBook({
      startDate: typeof startDate === 'string' ? startDate : undefined,
      endDate: typeof endDate === 'string' ? endDate : undefined,
    });
    res.json(book);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Error al generar Libro de Ventas SENIAT' });
  }
});

// Exportación del Libro de Ventas en formato CSV oficial para contadores y SENIAT
fiscalRouter.get('/sales-book/export-csv', async (req: Request, res: Response): Promise<void> => {
  try {
    const { startDate, endDate } = req.query;
    const csvContent = await FiscalService.exportSalesBookCSV({
      startDate: typeof startDate === 'string' ? startDate : undefined,
      endDate: typeof endDate === 'string' ? endDate : undefined,
    });

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="Libro_Ventas_SENIAT_${new Date().toISOString().slice(0, 10)}.csv"`);
    res.send(csvContent);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Error al exportar Libro de Ventas CSV' });
  }
});
