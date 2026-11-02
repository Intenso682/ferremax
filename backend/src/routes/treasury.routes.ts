import { Router, Request, Response } from 'express';
import { TreasuryService } from '../services/treasury.service';

export const treasuryRouter = Router();

/**
 * POST /api/treasury/reconcile-file
 * Carga y conciliación automática de estados de cuenta bancarios (TXT o CSV)
 */
treasuryRouter.post('/reconcile-file', async (req: Request, res: Response) => {
  try {
    const { bankName, fileName, content } = req.body;

    if (!content || typeof content !== 'string') {
      return res.status(400).json({ error: 'El contenido del archivo bancario es obligatorio' });
    }

    const result = await TreasuryService.reconcileStatement(
      bankName || 'Banesco',
      fileName || 'estado_cuenta.csv',
      content
    );

    return res.status(201).json({
      message: `Conciliación ${result.importNumber} completada. ${result.matchedCount} de ${result.totalTransactions} movimientos conciliados.`,
      result,
    });
  } catch (error: any) {
    console.error('Error en conciliación bancaria:', error);
    return res.status(500).json({ error: 'Error procesando conciliación bancaria', details: error.message });
  }
});

/**
 * GET /api/treasury/history
 * Historial de importaciones y conciliaciones bancarias
 */
treasuryRouter.get('/history', async (_req: Request, res: Response) => {
  try {
    const history = await TreasuryService.getImportsHistory();
    return res.json(history);
  } catch (error: any) {
    console.error('Error obteniendo historial de conciliación:', error);
    return res.status(500).json({ error: 'Error al consultar historial', details: error.message });
  }
});

/**
 * GET /api/treasury/contractors-debt
 * Cuentas por cobrar a contratistas con generación de enlaces directos a WhatsApp
 */
treasuryRouter.get('/contractors-debt', async (_req: Request, res: Response) => {
  try {
    const contractors = await TreasuryService.getContractorsDebt();
    return res.json(contractors);
  } catch (error: any) {
    console.error('Error obteniendo cartera de constructores:', error);
    return res.status(500).json({ error: 'Error al consultar cartera', details: error.message });
  }
});
