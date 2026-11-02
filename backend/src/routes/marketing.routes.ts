import { Router, Request, Response } from 'express';
import { MarketingService } from '../services/marketing.service';

export const marketingRouter = Router();

/**
 * GET /api/marketing/banners
 * Lista de banners publicitarios y marcas patrocinadoras
 */
marketingRouter.get('/banners', async (req: Request, res: Response) => {
  try {
    const slot = req.query.slot as string | undefined;
    const activeOnly = req.query.activeOnly === 'true' || req.query.activeOnly === '1';
    const banners = await MarketingService.getBanners(slot, activeOnly);
    res.json(banners);
  } catch (error: any) {
    console.error('Error listando banners:', error);
    res.status(500).json({ error: error.message || 'Error al consultar banners publicitarios' });
  }
});

/**
 * GET /api/marketing/banners/:id
 * Detalle de un banner específico
 */
marketingRouter.get('/banners/:id', async (req: Request, res: Response) => {
  try {
    const banner = await MarketingService.getBannerById(req.params.id as string);
    if (!banner) {
      res.status(404).json({ error: 'Banner publicitario no encontrado' });
      return;
    }
    res.json(banner);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Error al obtener banner' });
  }
});

/**
 * POST /api/marketing/banners
 * Creación de un nuevo banner o espacio patrocinado
 */
marketingRouter.post('/banners', async (req: Request, res: Response) => {
  try {
    const { slot, title, subtitle, brandName, badgeText, imageUrl, linkUrl, buttonText, bgGradient, active, order } = req.body;
    if (!slot || !title) {
      res.status(400).json({ error: 'El slot publicitario y el título del banner son obligatorios.' });
      return;
    }

    const created = await MarketingService.createBanner({
      slot,
      title,
      subtitle,
      brandName,
      badgeText,
      imageUrl,
      linkUrl,
      buttonText,
      bgGradient,
      active: active !== undefined ? Boolean(active) : true,
      order: order ? Number(order) : 0,
    });

    res.status(201).json(created);
  } catch (error: any) {
    console.error('Error creando banner:', error);
    res.status(400).json({ error: error.message || 'Error al crear banner publicitario' });
  }
});

/**
 * PUT /api/marketing/banners/:id
 * Actualización de banner (contenido, imagen, enlace o estado activo/inactivo)
 */
marketingRouter.put('/banners/:id', async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const updated = await MarketingService.updateBanner(id, req.body);
    res.json(updated);
  } catch (error: any) {
    console.error('Error actualizando banner:', error);
    res.status(400).json({ error: error.message || 'Error al actualizar banner' });
  }
});

/**
 * DELETE /api/marketing/banners/:id
 * Eliminación de banner publicitario
 */
marketingRouter.delete('/banners/:id', async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    await MarketingService.deleteBanner(id);
    res.json({ success: true, message: 'Banner publicitario eliminado con éxito.' });
  } catch (error: any) {
    res.status(400).json({ error: error.message || 'Error al eliminar banner' });
  }
});

/**
 * POST /api/marketing/banners/:id/click
 * Registro analítico de clic sobre el anuncio
 */
marketingRouter.post('/banners/:id/click', async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const tracked = await MarketingService.trackClick(id);
    res.json({ success: true, clicksCount: tracked.clicksCount });
  } catch (error: any) {
    res.status(400).json({ error: error.message || 'Error al registrar clic' });
  }
});

/**
 * GET /api/marketing/metrics
 * Métricas comerciales de publicidad
 */
marketingRouter.get('/metrics', async (_req: Request, res: Response) => {
  try {
    const metrics = await MarketingService.getMarketingMetrics();
    res.json(metrics);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Error al obtener métricas de publicidad' });
  }
});
