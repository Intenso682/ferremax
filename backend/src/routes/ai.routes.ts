import { Router, Response } from 'express';
import { GeminiService } from '../services/gemini.service';
import { requireAuth, requireRole, AuthenticatedRequest } from '../middleware/auth.middleware';

export const aiRouter = Router();

/**
 * GET /api/ai/status
 * Devuelve el estado de la integración de Gemini (configurado o no, modelo, clave enmascarada)
 */
aiRouter.get('/status', async (_req, res: Response): Promise<void> => {
  try {
    const status = await GeminiService.getStatus();
    res.json(status);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Error al obtener estado de Gemini' });
  }
});

/**
 * POST /api/ai/config
 * Guarda la clave de API de Gemini en la base de datos (StoreSetting)
 * Solo administradores
 */
aiRouter.post('/config', requireAuth, requireRole(['ADMIN']), async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { apiKey, model } = req.body;
    if (apiKey !== undefined) {
      if (typeof apiKey !== 'string') {
        res.status(400).json({ error: 'El campo "apiKey" debe ser una cadena' });
        return;
      }
      await GeminiService.setApiKey(apiKey);
    }

    if (model && typeof model === 'string') {
      await GeminiService.setModel(model);
    }

    const status = await GeminiService.getStatus();
    res.json({
      message: 'Configuración de Google Gemini guardada con éxito',
      ...status,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Error al guardar la configuración de Gemini' });
  }
});

/**
 * POST /api/ai/test
 * Prueba la conectividad con Gemini (acepta apiKey opcional para probar antes de guardar)
 */
aiRouter.post('/test', requireAuth, requireRole(['ADMIN']), async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { apiKey } = req.body;
    const result = await GeminiService.testConnection(apiKey);
    if (!result.success) {
      res.status(400).json(result);
      return;
    }
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message || 'Error al probar conexión con Gemini' });
  }
});

/**
 * POST /api/ai/generate-product
 * Asistente de redacción para nuevos productos en el panel de inventario
 * Accesible para Admin y Almacén
 */
aiRouter.post('/generate-product', requireAuth, requireRole(['ADMIN', 'WAREHOUSE']), async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { name, category, brand, features } = req.body;
    if (!name || typeof name !== 'string' || name.trim().length < 3) {
      res.status(400).json({ error: 'Se requiere el nombre del producto (mínimo 3 caracteres) para generar el contenido' });
      return;
    }

    const key = await GeminiService.getApiKey();
    if (!key) {
      res.status(422).json({
        error: 'GEMINI_NOT_CONFIGURED',
        message: 'No se ha configurado la clave de API de Google Gemini en el sistema. Puedes configurarla en el módulo de Ajustes.',
      });
      return;
    }

    const result = await GeminiService.generateProductCopy({
      name: name.trim(),
      category,
      brand,
      features,
    });

    res.json(result);
  } catch (error: any) {
    res.status(500).json({
      error: 'GEMINI_GENERATION_FAILED',
      message: error.message || 'Error al generar la descripción con Gemini',
    });
  }
});

/**
 * POST /api/ai/admin-query
 * Asistente de soporte y consulta técnica para el administrador
 */
aiRouter.post('/admin-query', requireAuth, requireRole(['ADMIN']), async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { prompt, context } = req.body;
    if (!prompt || typeof prompt !== 'string' || prompt.trim().length < 3) {
      res.status(400).json({ error: 'La pregunta o consulta no puede estar vacía' });
      return;
    }

    const key = await GeminiService.getApiKey();
    if (!key) {
      res.status(422).json({
        error: 'GEMINI_NOT_CONFIGURED',
        message: 'No se ha configurado la clave de API de Google Gemini en el sistema.',
      });
      return;
    }

    const result = await GeminiService.adminAssistant({
      prompt: prompt.trim(),
      context,
    });

    res.json(result);
  } catch (error: any) {
    res.status(500).json({
      error: 'GEMINI_QUERY_FAILED',
      message: error.message || 'Error al consultar al asistente Gemini',
    });
  }
});

/**
 * POST /api/ai/help-copilot
 * Copiloto de ayuda operativa paso a paso para cualquier usuario autenticado (Cajero, Almacén, etc.)
 */
aiRouter.post('/help-copilot', requireAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { question, currentScreen } = req.body;
    if (!question || typeof question !== 'string' || question.trim().length < 2) {
      res.status(400).json({ error: 'La pregunta no puede estar vacía' });
      return;
    }

    const userRole = (req as any).user?.role || 'CASHIER';

    const result = await GeminiService.helpCopilot({
      question: question.trim(),
      role: userRole,
      currentScreen,
    });

    res.json(result);
  } catch (error: any) {
    res.status(500).json({
      error: 'HELP_COPILOT_FAILED',
      message: error.message || 'Error al consultar el copiloto de ayuda',
    });
  }
});

