import { Router, Request, Response } from 'express';
import { BiService } from '../services/bi.service';
import { prisma } from '../prisma';

export const biRouter = Router();

/**
 * GET /api/bi/pareto
 * Retorna análisis ABC de productos 80/20 con identificación de productos estrella y huesos
 */
biRouter.get('/pareto', async (_req: Request, res: Response) => {
  try {
    const analysis = await BiService.getParetoAnalysis();
    return res.json(analysis);
  } catch (error: any) {
    console.error('Error generando análisis Pareto:', error);
    return res.status(500).json({ error: 'Error interno al generar análisis Pareto', details: error.message });
  }
});

/**
 * GET /api/bi/executive
 * Dashboard gerencial móvil con margen de ganancia diario y capital de trabajo
 */
biRouter.get('/executive', async (_req: Request, res: Response) => {
  try {
    const dashboard = await BiService.getExecutiveDashboard();
    return res.json(dashboard);
  } catch (error: any) {
    console.error('Error generando dashboard ejecutivo:', error);
    return res.status(500).json({ error: 'Error interno al generar dashboard ejecutivo', details: error.message });
  }
});

/**
 * GET /api/bi/predictive-stock
 * Análisis inteligente de reposición (Min/Max dinámico basado en ventas reales y demora del proveedor)
 */
biRouter.get('/predictive-stock', async (_req: Request, res: Response) => {
  try {
    const analysis = await BiService.getPredictiveStockAnalysis();
    return res.json(analysis);
  } catch (error: any) {
    console.error('Error generando análisis predictivo de stock:', error);
    return res.status(500).json({ error: 'Error al calcular alertas de inventario', details: error.message });
  }
});

/**
 * GET /api/bi/serials
 * Listado de seriales registrados y estado de garantía
 */
biRouter.get('/serials', async (req: Request, res: Response) => {
  try {
    const status = req.query.status as string | undefined;
    const search = req.query.search as string | undefined;
    const serials = await BiService.listSerials({ status, search });
    return res.json(serials);
  } catch (error: any) {
    console.error('Error listando seriales:', error);
    return res.status(500).json({ error: 'Error al consultar seriales', details: error.message });
  }
});

/**
 * GET /api/bi/serials/lookup/:serialNumber
 * Consulta 360° de trazabilidad de un serial (Adquisición, Venta, Cliente, Garantía)
 */
biRouter.get('/serials/lookup/:serialNumber', async (req: Request, res: Response) => {
  try {
    const serialNumber = req.params.serialNumber as string;
    const record = await BiService.lookupSerial(serialNumber);
    if (!record) {
      return res.status(404).json({ error: `El serial '${serialNumber}' no está registrado en el inventario.` });
    }
    return res.json(record);
  } catch (error: any) {
    console.error('Error consultando serial:', error);
    return res.status(500).json({ error: 'Error al rastrear serial', details: error.message });
  }
});

/**
 * POST /api/bi/serials/rma
 * Tramitación de garantía o devolución (RMA)
 */
biRouter.post('/serials/rma', async (req: Request, res: Response) => {
  try {
    const { serialNumber, resolution, notes } = req.body;
    if (!serialNumber || !resolution) {
      return res.status(400).json({ error: 'Número de serial y resolución son obligatorios.' });
    }
    const updated = await BiService.processRma({
      serialNumber,
      resolution,
      notes,
    });
    return res.status(200).json(updated);
  } catch (error: any) {
    console.error('Error procesando RMA:', error);
    return res.status(400).json({ error: error.message || 'Error al tramitar garantía RMA' });
  }
});

/**
 * POST /api/bi/serials
 * Registro manual de número de serie en almacén
 */
biRouter.post('/serials', async (req: Request, res: Response) => {
  try {
    const { serialNumber, productId, lotNumber, supplierName, notes } = req.body;
    if (!serialNumber || !productId) {
      return res.status(400).json({ error: 'Serial y productId son obligatorios.' });
    }

    const prod = await prisma.product.findUnique({ where: { id: productId } });
    if (!prod) return res.status(404).json({ error: 'Producto no encontrado' });

    const newSerial = await prisma.productSerial.create({
      data: {
        serialNumber: String(serialNumber).trim().toUpperCase(),
        productId,
        lotNumber: lotNumber || null,
        supplierName: supplierName || null,
        warrantyMonths: prod.warrantyMonths || 12,
        status: 'IN_STOCK',
        notes: notes || 'Registrado en almacén',
      },
      include: { product: true },
    });

    return res.status(201).json(newSerial);
  } catch (error: any) {
    console.error('Error registrando serial:', error);
    return res.status(400).json({ error: error.message || 'Error al registrar número de serie' });
  }
});
