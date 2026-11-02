import { Router } from 'express';
import { prisma } from '../prisma';
import { requireAuth, requireRole } from '../middleware/auth.middleware';
import fs from 'fs';
import path from 'path';
import { CatalogService } from '../services/catalog.service';

export const productsRouter = Router();

const UPLOADS_DIR = path.resolve(__dirname, '../../../uploads/products');

function ensureUploadsDir() {
  if (!fs.existsSync(UPLOADS_DIR)) {
    fs.mkdirSync(UPLOADS_DIR, { recursive: true });
  }
}

function formatProduct(p: any) {
  let imagesList: string[] = [];
  if (p.images) {
    try {
      imagesList = JSON.parse(p.images);
    } catch {
      imagesList = [p.images];
    }
  } else if (p.imageUrl) {
    imagesList = [p.imageUrl];
  }
  return {
    ...p,
    images: imagesList,
    imageUrl: p.imageUrl || (imagesList.length > 0 ? imagesList[0] : null),
  };
}

// Subir y almacenar hasta 3 imágenes reales de producto (comprimidas en cliente)
productsRouter.post('/upload-images', async (req, res): Promise<void> => {
  try {
    const { images } = req.body;
    if (!images || !Array.isArray(images)) {
      res.status(400).json({ error: 'Se requiere un arreglo "images" con las fotos a cargar' });
      return;
    }

    if (images.length > 3) {
      res.status(400).json({ error: 'Solo se permite un máximo de 3 imágenes por producto' });
      return;
    }

    ensureUploadsDir();
    const savedUrls: string[] = [];

    for (let i = 0; i < images.length; i++) {
      const item = images[i];
      if (typeof item !== 'string' || !item.trim()) continue;

      // Si ya es una URL existente en el servidor o externa, mantenerla
      if (!item.startsWith('data:image/')) {
        savedUrls.push(item);
        continue;
      }

      // Procesar data URL en base64
      const matches = item.match(/^data:image\/([a-zA-Z0-9+.-]+);base64,(.+)$/);
      if (!matches) {
        continue;
      }

      let ext = matches[1].toLowerCase();
      if (ext === 'jpeg') ext = 'jpg';
      if (ext === 'svg+xml') ext = 'svg';

      const base64Data = matches[2];
      const buffer = Buffer.from(base64Data, 'base64');

      const fileName = `prod-${Date.now()}-${i + 1}-${Math.random().toString(36).substring(2, 7)}.${ext}`;
      const filePath = path.join(UPLOADS_DIR, fileName);

      fs.writeFileSync(filePath, buffer);
      savedUrls.push(`/uploads/products/${fileName}`);
    }

    res.json({ urls: savedUrls });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Error al procesar y guardar imágenes' });
  }
});

// =========================================================================
// MÓDULO DE CARGA Y VALIDACIÓN DE CATÁLOGOS MASIVOS
// =========================================================================

// 1. Descargar plantilla CSV oficial con ejemplos para ferreterías
productsRouter.get('/template-csv', (_req, res) => {
  try {
    const csvContent = CatalogService.getCsvTemplate();
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="plantilla_catalogo_ferremax.csv"');
    res.send(csvContent);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Error al generar plantilla CSV' });
  }
});

// 2. Exportar catálogo completo de la base de datos como CSV compatible
productsRouter.get('/export-csv', async (_req, res) => {
  try {
    const csvContent = await CatalogService.exportToCsv();
    const dateStr = new Date().toISOString().slice(0, 10);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="catalogo_ferremax_${dateStr}.csv"`);
    res.send(csvContent);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Error al exportar catálogo a CSV' });
  }
});

// 3. Validar lote de productos antes de importar (Auditoría previa / Dry run)
productsRouter.post('/bulk-validate', async (req, res): Promise<void> => {
  try {
    let rawItems: any[] = [];
    const { csvText, items } = req.body;

    if (csvText && typeof csvText === 'string') {
      const parsed = CatalogService.parseCsv(csvText);
      rawItems = parsed.rows.map(row => CatalogService.normalizeRow(row));
    } else if (Array.isArray(items)) {
      rawItems = items.map(item => CatalogService.normalizeRow(item));
    } else if (typeof req.body === 'string') {
      const parsed = CatalogService.parseCsv(req.body);
      rawItems = parsed.rows.map(row => CatalogService.normalizeRow(row));
    } else {
      res.status(400).json({ error: 'Se requiere "csvText" o una lista "items" para validar' });
      return;
    }

    if (rawItems.length === 0) {
      res.status(400).json({ error: 'El archivo o lote no contiene filas válidas de productos' });
      return;
    }

    const validation = await CatalogService.validateCatalog(rawItems);
    res.json(validation);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Error en validación de catálogo' });
  }
});

// 4. Importar lote masivo de productos validados
productsRouter.post('/bulk-import', async (req, res): Promise<void> => {
  try {
    const { items, csvText, strategy = 'upsert', skipErrors = true } = req.body;

    let validatedItems = items;

    if (!validatedItems && csvText) {
      const parsed = CatalogService.parseCsv(csvText);
      const raw = parsed.rows.map(r => CatalogService.normalizeRow(r));
      const val = await CatalogService.validateCatalog(raw);
      validatedItems = val.items;
    }

    if (!Array.isArray(validatedItems) || validatedItems.length === 0) {
      res.status(400).json({ error: 'No se recibieron productos válidos para importar' });
      return;
    }

    const result = await CatalogService.importCatalog(validatedItems, {
      strategy,
      skipErrors: Boolean(skipErrors),
    });

    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Error al ejecutar importación de catálogo' });
  }
});

// Listado de productos para gestión en backoffice (con búsqueda y filtros)
productsRouter.get('/', async (req, res): Promise<void> => {
  try {
    const { search, categoryId, lowStock, active } = req.query;

    const where: any = {};

    if (search && typeof search === 'string') {
      where.OR = [
        { name: { contains: search } },
        { sku: { contains: search } },
        { barcode: { contains: search } },
      ];
    }

    if (categoryId && typeof categoryId === 'string') {
      where.categoryId = categoryId;
    }

    if (active !== undefined) {
      where.active = active === 'true';
    }

    const products = await prisma.product.findMany({
      where,
      include: {
        category: {
          select: { id: true, name: true, slug: true },
        },
      },
      orderBy: { updatedAt: 'desc' },
    });

    // Filtro en memoria para stock bajo (stock <= minStock)
    const filtered = lowStock === 'true'
      ? products.filter(p => p.stock <= p.minStock)
      : products;

    res.json(filtered.map(formatProduct));
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Error al obtener productos' });
  }
});

// Búsqueda rápida por código de barras (ideal para el escáner del mostrador POS)
productsRouter.get('/barcode/:barcode', async (req, res): Promise<void> => {
  try {
    const { barcode } = req.params;
    const product = await prisma.product.findFirst({
      where: {
        OR: [
          { barcode },
          { sku: barcode },
        ],
        active: true,
      },
      include: { category: true },
    });

    if (!product) {
      res.status(404).json({ error: 'Producto no encontrado con ese código' });
      return;
    }

    res.json(formatProduct(product));
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Error en búsqueda por código de barras' });
  }
});

// Detalle de un producto por ID
productsRouter.get('/:id', async (req, res): Promise<void> => {
  try {
    const { id } = req.params;
    const product = await prisma.product.findUnique({
      where: { id },
      include: { category: true },
    });

    if (!product) {
      res.status(404).json({ error: 'Producto no encontrado' });
      return;
    }

    res.json(formatProduct(product));
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Error al obtener producto' });
  }
});

// Crear producto con soporte para imágenes reales (hasta 3)
productsRouter.post('/', async (req, res): Promise<void> => {
  try {
    const {
      name, sku, barcode, description, priceUsd, costUsd, stock, minStock,
      categoryId, imageUrl, images, featured,
      unit, purchaseUnit, unitRatio, hasSerial, warrantyMonths, location,
    } = req.body;

    if (!name || priceUsd === undefined) {
      res.status(400).json({ error: 'Nombre y precio en USD son obligatorios' });
      return;
    }

    const cleanSku = sku || `SKU-${Date.now().toString(36).toUpperCase()}`;
    const slug = name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') + '-' + cleanSku.toLowerCase();

    // Procesar imágenes (límite estricto de 3)
    let imagesArr: string[] = [];
    if (Array.isArray(images)) {
      imagesArr = images.slice(0, 3);
    } else if (typeof images === 'string') {
      try { imagesArr = JSON.parse(images).slice(0, 3); } catch { imagesArr = [images]; }
    } else if (imageUrl) {
      imagesArr = [imageUrl];
    }

    const finalImageUrl = imageUrl || (imagesArr.length > 0 ? imagesArr[0] : null);
    const finalImagesJson = imagesArr.length > 0 ? JSON.stringify(imagesArr) : null;

    const product = await prisma.product.create({
      data: {
        name,
        slug,
        sku: cleanSku,
        barcode: barcode || null,
        description: description || null,
        priceUsd: Number(priceUsd),
        costUsd: Number(costUsd || 0),
        stock: Number(stock || 0),
        minStock: Number(minStock || 5),
        unit: (unit || 'UND').trim().toUpperCase(),
        purchaseUnit: (purchaseUnit || unit || 'UND').trim().toUpperCase(),
        unitRatio: Number(unitRatio || 1.0),
        hasSerial: Boolean(hasSerial),
        warrantyMonths: Number(warrantyMonths || 0),
        location: location ? location.trim() : null,
        categoryId: categoryId || null,
        imageUrl: finalImageUrl,
        images: finalImagesJson,
        featured: Boolean(featured),
      },
      include: { category: true },
    });

    res.status(201).json(formatProduct(product));
  } catch (error: any) {
    res.status(400).json({ error: error.message || 'Error al crear producto' });
  }
});

// Actualizar producto y/o existencias con soporte para imágenes
productsRouter.put('/:id', async (req, res): Promise<void> => {
  try {
    const { id } = req.params;
    const {
      name, sku, barcode, description, priceUsd, costUsd, stock, minStock,
      categoryId, imageUrl, images, featured, active,
      unit, purchaseUnit, unitRatio, hasSerial, warrantyMonths, location,
    } = req.body;

    let updateImages: string | undefined = undefined;
    let updateImageUrl: string | undefined = imageUrl;

    if (images !== undefined) {
      let imagesArr: string[] = [];
      if (Array.isArray(images)) {
        imagesArr = images.slice(0, 3);
      } else if (typeof images === 'string') {
        try { imagesArr = JSON.parse(images).slice(0, 3); } catch { imagesArr = [images]; }
      }
      updateImages = JSON.stringify(imagesArr);
      if (!updateImageUrl && imagesArr.length > 0) {
        updateImageUrl = imagesArr[0];
      }
    }

    const updated = await prisma.product.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(sku && { sku }),
        ...(barcode !== undefined && { barcode }),
        ...(description !== undefined && { description }),
        ...(priceUsd !== undefined && { priceUsd: Number(priceUsd) }),
        ...(costUsd !== undefined && { costUsd: Number(costUsd) }),
        ...(stock !== undefined && { stock: Number(stock) }),
        ...(minStock !== undefined && { minStock: Number(minStock) }),
        ...(unit !== undefined && { unit: unit.trim().toUpperCase() }),
        ...(purchaseUnit !== undefined && { purchaseUnit: purchaseUnit.trim().toUpperCase() }),
        ...(unitRatio !== undefined && { unitRatio: Number(unitRatio) }),
        ...(hasSerial !== undefined && { hasSerial: Boolean(hasSerial) }),
        ...(warrantyMonths !== undefined && { warrantyMonths: Number(warrantyMonths) }),
        ...(location !== undefined && { location: location ? location.trim() : null }),
        ...(categoryId !== undefined && { categoryId }),
        ...(updateImageUrl !== undefined && { imageUrl: updateImageUrl }),
        ...(updateImages !== undefined && { images: updateImages }),
        ...(featured !== undefined && { featured: Boolean(featured) }),
        ...(active !== undefined && { active: Boolean(active) }),
      },
      include: { category: true },
    });

    res.json(formatProduct(updated));
  } catch (error: any) {
    res.status(400).json({ error: error.message || 'Error al actualizar producto' });
  }
});

// Desactivar / archivar producto
productsRouter.delete('/:id', async (req, res): Promise<void> => {
  try {
    const { id } = req.params;
    const archived = await prisma.product.update({
      where: { id },
      data: { active: false },
    });
    res.json({ message: 'Producto archivado con éxito', id: archived.id });
  } catch (error: any) {
    res.status(400).json({ error: error.message || 'Error al archivar producto' });
  }
});
