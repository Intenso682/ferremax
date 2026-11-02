import { Router, Request, Response } from 'express';
import { BackupService } from '../services/backup.service';
import { requireAuth, requireRole, AuthenticatedRequest } from '../middleware/auth.middleware';
import fs from 'fs';
import path from 'path';

export const backupRouter = Router();

/**
 * Obtener estadísticas y resumen de la base de datos
 */
backupRouter.get('/info', async (_req: Request, res: Response) => {
  try {
    const stats = await BackupService.getDatabaseStats();
    res.json(stats);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Error al obtener información de respaldo' });
  }
});

/**
 * Descarga directa de 1 clic del archivo dev.db SQLite
 */
backupRouter.get('/download', async (_req: Request, res: Response) => {
  try {
    const dbPath = BackupService.getDatabasePath();
    if (!fs.existsSync(dbPath)) {
      res.status(404).json({ error: 'El archivo de base de datos no fue encontrado en el servidor' });
      return;
    }

    const now = new Date();
    const dateStr = now.toISOString().slice(0, 10);
    const timeStr = now.toTimeString().slice(0, 5).replace(':', '');
    const downloadName = `FerreMax_Respaldo_${dateStr}_${timeStr}.db`;

    res.setHeader('Content-Disposition', `attachment; filename="${downloadName}"`);
    res.setHeader('Content-Type', 'application/x-sqlite3');

    const fileStream = fs.createReadStream(dbPath);
    fileStream.pipe(res);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Error al descargar la base de datos' });
  }
});

/**
 * Descarga de volcado universal estructurado en JSON
 */
backupRouter.get('/download-json', async (_req: Request, res: Response) => {
  try {
    const dump = await BackupService.exportAllToJson();
    const now = new Date();
    const dateStr = now.toISOString().slice(0, 10);
    const downloadName = `FerreMax_Dump_Datos_${dateStr}.json`;

    res.setHeader('Content-Disposition', `attachment; filename="${downloadName}"`);
    res.setHeader('Content-Type', 'application/json; charset=utf-8');

    res.send(JSON.stringify(dump, null, 2));
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Error al exportar datos a JSON' });
  }
});

/**
 * Crear snapshot fechado en el servidor
 */
backupRouter.post('/snapshot', async (req: Request, res: Response) => {
  try {
    const { note } = req.body || {};
    const result = await BackupService.createSnapshot(note);
    const updatedStats = await BackupService.getDatabaseStats();

    res.status(201).json({
      message: 'Copia de seguridad instantánea creada con éxito en el servidor.',
      snapshot: result,
      stats: updatedStats,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Error al crear snapshot en servidor' });
  }
});

/**
 * Descargar un snapshot específico del servidor
 */
backupRouter.get('/snapshots/:fileName', (req: Request, res: Response) => {
  try {
    const fileName = String(req.params.fileName);
    // Sanitizar nombre de archivo para evitar Directory Traversal
    const safeName = path.basename(fileName);
    const backupsDir = BackupService.getBackupsDir();
    const filePath = path.join(backupsDir, safeName);

    if (!fs.existsSync(filePath)) {
      res.status(404).json({ error: 'El archivo de respaldo solicitado no existe.' });
      return;
    }

    res.setHeader('Content-Disposition', `attachment; filename="${safeName}"`);
    res.setHeader('Content-Type', 'application/x-sqlite3');

    const fileStream = fs.createReadStream(filePath);
    fileStream.pipe(res);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Error al descargar el snapshot' });
  }
});

/**
 * Restaurar la base de datos a partir de un snapshot existente en el servidor
 */
backupRouter.post('/restore-snapshot', async (req: Request, res: Response) => {
  try {
    const { fileName } = req.body || {};
    if (!fileName) {
      res.status(400).json({ error: 'Debe especificar el nombre del archivo de respaldo a restaurar.' });
      return;
    }

    const safeName = path.basename(fileName);
    const result = await BackupService.restoreSnapshot(safeName);

    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Error al restaurar la base de datos' });
  }
});

/**
 * Restaurar la base de datos a partir de un archivo subido (en base64)
 */
backupRouter.post('/restore-upload', async (req: Request, res: Response) => {
  try {
    const { base64Data } = req.body || {};
    if (!base64Data) {
      res.status(400).json({ error: 'Debe proporcionar los datos del archivo en formato base64.' });
      return;
    }

    // Remover posible prefijo data:...;base64,
    const cleanBase64 = base64Data.replace(/^data:[^;]+;base64,/, '');
    const buffer = Buffer.from(cleanBase64, 'base64');

    const result = await BackupService.restoreFromBuffer(buffer);
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Error al procesar y restaurar el archivo de respaldo' });
  }
});

/**
 * Puesta a Cero de Operaciones de Prueba (Segura con Snapshot previo y contraseña)
 */
backupRouter.post('/reset-operations', requireAuth, requireRole(['ADMIN']), async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { adminPassword, scope, deleteTestCustomers, resetStockToZero, note } = req.body || {};

    if (!adminPassword) {
      res.status(400).json({ error: 'Debe ingresar la contraseña de administrador para autorizar la puesta a cero.' });
      return;
    }

    if (!req.user?.userId) {
      res.status(401).json({ error: 'Sesión no válida o token expirado.' });
      return;
    }

    const result = await BackupService.purgeTestData({
      userId: req.user.userId,
      adminPassword,
      scope: scope || 'OPERATIONS_ONLY',
      deleteTestCustomers: Boolean(deleteTestCustomers),
      resetStockToZero: Boolean(resetStockToZero),
      note,
    });

    res.json(result);
  } catch (error: any) {
    res.status(400).json({ error: error.message || 'Error al ejecutar la puesta a cero.' });
  }
});

