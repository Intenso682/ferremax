import { Router, Response } from 'express';
import { BcvService } from '../services/bcv.service';
import { requireAuth, requireRole, AuthenticatedRequest } from '../middleware/auth.middleware';

export const ratesRouter = Router();

// Endpoint público para consultar la tasa oficial actual
ratesRouter.get('/bcv', async (_req, res): Promise<void> => {
  try {
    const rateData = await BcvService.getCurrentRate();
    res.json(rateData);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Error al obtener tasa BCV' });
  }
});

// Forzar sincronización desde fuentes oficiales
ratesRouter.post('/bcv/sync', requireAuth, requireRole(['ADMIN']), async (_req, res): Promise<void> => {
  try {
    const rateData = await BcvService.syncWithBcv();
    res.json(rateData);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Error al sincronizar con BCV' });
  }
});

// Ajuste manual de la tasa por parte del administrador
ratesRouter.post('/bcv/manual', requireAuth, requireRole(['ADMIN']), async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { rate } = req.body;
    if (!rate || typeof rate !== 'number') {
      res.status(400).json({ error: 'Parámetro rate requerido y debe ser un número' });
      return;
    }

    const result = await BcvService.setManualRate(rate);
    res.json(result);
  } catch (error: any) {
    res.status(400).json({ error: error.message || 'Error al fijar tasa manual' });
  }
});
