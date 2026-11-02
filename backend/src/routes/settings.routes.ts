import { Router, Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import { prisma } from '../prisma';
import { SettingsService, DEFAULT_SETTINGS } from '../services/settings.service';

export const settingsRouter = Router();

// 1. Obtener todas las configuraciones del sistema (como mapa clave-valor y lista detallada)
settingsRouter.get('/', async (_req: Request, res: Response): Promise<void> => {
  try {
    await SettingsService.ensureDefaults();
    const settingsMap = await SettingsService.getAll();
    const settingsList = await prisma.storeSetting.findMany({
      orderBy: { key: 'asc' },
    });

    res.json({
      settings: settingsMap,
      list: settingsList,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Error al obtener configuraciones' });
  }
});

// 2. Actualizar o crear una configuración individual
settingsRouter.post('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const { key, value, description } = req.body;
    if (!key || value === undefined) {
      res.status(400).json({ error: 'key y value son obligatorios' });
      return;
    }

    const updated = await prisma.storeSetting.upsert({
      where: { key },
      update: {
        value: String(value),
        ...(description && { description }),
      },
      create: {
        key,
        value: String(value),
        description: description || DEFAULT_SETTINGS[key]?.description || null,
      },
    });

    res.json(updated);
  } catch (error: any) {
    res.status(400).json({ error: error.message || 'Error al guardar configuración' });
  }
});

// 3. Guardado masivo de múltiples configuraciones (Ajustes de tienda, IVA, IGTF, Pago Móvil, etc.)
settingsRouter.put('/bulk', async (req: Request, res: Response): Promise<void> => {
  try {
    const { settings } = req.body;
    if (!settings || typeof settings !== 'object') {
      res.status(400).json({ error: 'Objeto settings es requerido' });
      return;
    }

    const updatedMap = await SettingsService.updateBulk(settings);
    res.json({
      message: 'Configuraciones actualizadas exitosamente',
      settings: updatedMap,
    });
  } catch (error: any) {
    res.status(400).json({ error: error.message || 'Error al actualizar configuraciones' });
  }
});

// 4. Restaurar configuraciones predeterminadas
settingsRouter.post('/reset-defaults', async (_req: Request, res: Response): Promise<void> => {
  try {
    for (const [key, item] of Object.entries(DEFAULT_SETTINGS)) {
      await prisma.storeSetting.upsert({
        where: { key },
        update: { value: item.value },
        create: { key, value: item.value, description: item.description },
      });
    }
    const current = await SettingsService.getAll();
    res.json({
      message: 'Configuraciones restablecidas a los valores por defecto',
      settings: current,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Error al restablecer configuraciones' });
  }
});

// 5. Carga y almacenamiento del logotipo de la empresa (White-label Branding)
settingsRouter.post('/upload-logo', async (req: Request, res: Response): Promise<void> => {
  try {
    const { imageBase64, fileName } = req.body;
    if (!imageBase64) {
      res.status(400).json({ error: 'imageBase64 es requerido' });
      return;
    }

    const BRANDING_DIR = path.resolve(__dirname, '../../../uploads/branding');
    if (!fs.existsSync(BRANDING_DIR)) {
      fs.mkdirSync(BRANDING_DIR, { recursive: true });
    }

    let ext = 'png';
    let cleanBase64 = imageBase64;
    const matches = imageBase64.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
    if (matches && matches.length === 3) {
      const mime = matches[1];
      ext = mime.split('/')[1] || 'png';
      if (ext === 'svg+xml') ext = 'svg';
      cleanBase64 = matches[2];
    } else if (fileName && fileName.includes('.')) {
      ext = fileName.split('.').pop() || 'png';
    }

    const safeName = `logo_${Date.now()}.${ext}`;
    const filePath = path.join(BRANDING_DIR, safeName);
    fs.writeFileSync(filePath, Buffer.from(cleanBase64, 'base64'));

    const logoUrl = `/uploads/branding/${safeName}`;

    // Actualizar STORE_LOGO_URL en la base de datos SQLite
    await prisma.storeSetting.upsert({
      where: { key: 'STORE_LOGO_URL' },
      update: { value: logoUrl },
      create: {
        key: 'STORE_LOGO_URL',
        value: logoUrl,
        description: 'Ruta o URL del logotipo comercial de la empresa',
      },
    });

    res.json({
      success: true,
      logoUrl,
      message: 'Logotipo actualizado exitosamente en el servidor',
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Error al procesar y guardar logotipo' });
  }
});
