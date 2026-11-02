import { prisma } from '../prisma';

export interface RawCatalogItem {
  sku?: string;
  name?: string;
  category?: string;
  priceUsd?: string | number;
  costUsd?: string | number;
  stock?: string | number;
  minStock?: string | number;
  barcode?: string;
  description?: string;
  imageUrl?: string;
  images?: string | string[];
  featured?: boolean | string;
  [key: string]: any;
}

export interface ValidatedCatalogItem {
  rowIndex: number;
  raw: RawCatalogItem;
  status: 'VALID' | 'WARNING' | 'ERROR';
  action: 'CREATE' | 'UPDATE';
  sku: string;
  name: string;
  categoryName: string;
  categoryId?: string | null;
  willCreateCategory: boolean;
  priceUsd: number;
  costUsd: number;
  stock: number;
  minStock: number;
  barcode?: string | null;
  description?: string | null;
  imageUrl?: string | null;
  images?: string[];
  featured: boolean;
  errors: string[];
  warnings: string[];
}

export interface ValidationSummary {
  total: number;
  validCount: number;
  warningCount: number;
  errorCount: number;
  canImport: boolean;
  items: ValidatedCatalogItem[];
  categoriesToCreate: string[];
}

export interface ImportOptions {
  strategy?: 'upsert' | 'create_only';
  skipErrors?: boolean;
}

export interface ImportResult {
  success: boolean;
  totalProcessed: number;
  createdCount: number;
  updatedCount: number;
  skippedCount: number;
  errorCount: number;
  categoriesCreated: string[];
  errors: { row: number; sku?: string; error: string }[];
}

export class CatalogService {
  /**
   * Parser RFC-4180 de CSV con soporte para delimitadores automáticos (, ; \t),
   * manejo de comillas escapadas (""), saltos de línea y eliminación de BOM UTF-8.
   */
  static parseCsv(csvText: string): { headers: string[]; rows: Record<string, string>[] } {
    if (!csvText) return { headers: [], rows: [] };

    // Remover UTF-8 BOM si existe
    let text = csvText.replace(/^\uFEFF/, '').trim();
    if (!text) return { headers: [], rows: [] };

    // Detectar separador en la primera línea
    const firstLine = text.split(/\r\n|\n|\r/)[0];
    let delimiter = ',';
    const semicolons = (firstLine.match(/;/g) || []).length;
    const commas = (firstLine.match(/,/g) || []).length;
    const tabs = (firstLine.match(/\t/g) || []).length;

    if (semicolons > commas && semicolons > tabs) {
      delimiter = ';';
    } else if (tabs > commas && tabs > semicolons) {
      delimiter = '\t';
    }

    // Tokenizador consciente de comillas
    const lines: string[][] = [];
    let currentField = '';
    let currentRecord: string[] = [];
    let inQuotes = false;

    for (let i = 0; i < text.length; i++) {
      const char = text[i];
      const nextChar = text[i + 1];

      if (char === '"') {
        if (inQuotes && nextChar === '"') {
          // Comilla escapada ("") dentro de comillas
          currentField += '"';
          i++;
        } else {
          // Abrir o cerrar comillas
          inQuotes = !inQuotes;
        }
      } else if (char === delimiter && !inQuotes) {
        currentRecord.push(currentField.trim());
        currentField = '';
      } else if ((char === '\r' || char === '\n') && !inQuotes) {
        if (char === '\r' && nextChar === '\n') {
          i++; // consumir \n de \r\n
        }
        currentRecord.push(currentField.trim());
        currentField = '';
        if (currentRecord.some(f => f.length > 0)) {
          lines.push(currentRecord);
        }
        currentRecord = [];
      } else {
        currentField += char;
      }
    }

    if (currentField.length > 0 || currentRecord.length > 0) {
      currentRecord.push(currentField.trim());
      if (currentRecord.some(f => f.length > 0)) {
        lines.push(currentRecord);
      }
    }

    if (lines.length === 0) return { headers: [], rows: [] };

    const rawHeaders = lines[0].map(h => h.trim());
    const rows: Record<string, string>[] = [];

    for (let r = 1; r < lines.length; r++) {
      const line = lines[r];
      // Ignorar filas totalmente vacías
      if (line.every(c => !c.trim())) continue;

      const rowObj: Record<string, string> = {};
      for (let h = 0; h < rawHeaders.length; h++) {
        const headerKey = rawHeaders[h];
        rowObj[headerKey] = line[h] !== undefined ? line[h].trim() : '';
      }
      rows.push(rowObj);
    }

    return { headers: rawHeaders, rows };
  }

  /**
   * Normaliza nombres de columnas a las propiedades esperadas del sistema
   */
  static normalizeRow(row: Record<string, any>): RawCatalogItem {
    const item: RawCatalogItem = {};

    for (const [key, val] of Object.entries(row)) {
      const k = key.toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]/g, '');

      // Mapeo flexible de encabezados
      if (/^(sku|codigo|cod|referencia|ref|code)$/.test(k)) {
        item.sku = String(val).trim();
      } else if (/^(name|nombre|producto|articulo|item|titulo)$/.test(k)) {
        item.name = String(val).trim();
      } else if (/^(category|categoria|cat|departamento|familia|rubro)$/.test(k)) {
        item.category = String(val).trim();
      } else if (/^(priceusd|precio|preciousd|precioventa|pvp|price|preciobs)$/.test(k)) {
        item.priceUsd = val;
      } else if (/^(costusd|costo|costousd|cost)$/.test(k)) {
        item.costUsd = val;
      } else if (/^(stock|existencia|cantidad|cant|qty|inventario)$/.test(k)) {
        item.stock = val;
      } else if (/^(minstock|stockminimo|minimo|reorden|min)$/.test(k)) {
        item.minStock = val;
      } else if (/^(barcode|codigobarra|codigodebarras|barra|upc|ean)$/.test(k)) {
        item.barcode = String(val).trim();
      } else if (/^(description|descripcion|detalle|desc)$/.test(k)) {
        item.description = String(val).trim();
      } else if (/^(imageurl|imagen|foto|fotourl|image|urlimagen)$/.test(k)) {
        item.imageUrl = String(val).trim();
      } else if (/^(images|imagenes|fotos)$/.test(k)) {
        item.images = val;
      } else if (/^(featured|destacado|top|promocion|oferta)$/.test(k)) {
        item.featured = val;
      }
    }

    return item;
  }

  /**
   * Valida un lote completo de productos contra la base de datos y reglas de negocio
   */
  static async validateCatalog(rawItems: RawCatalogItem[]): Promise<ValidationSummary> {
    // 1. Cargar catálogo existente de SQLite para cruce de datos
    const existingProducts = await prisma.product.findMany({
      select: { id: true, sku: true, barcode: true, name: true, categoryId: true },
    });

    const existingCategories = await prisma.category.findMany({
      select: { id: true, name: true, slug: true },
    });

    const skuMap = new Map<string, typeof existingProducts[0]>();
    const barcodeMap = new Map<string, string>(); // barcode -> sku

    existingProducts.forEach(p => {
      skuMap.set(p.sku.toUpperCase(), p);
      if (p.barcode) {
        barcodeMap.set(p.barcode, p.sku.toUpperCase());
      }
    });

    const categoryMap = new Map<string, typeof existingCategories[0]>();
    existingCategories.forEach(c => {
      categoryMap.set(c.slug.toLowerCase(), c);
      categoryMap.set(c.name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, ''), c);
    });

    // Control de unicidad interna dentro del archivo subido
    const seenBatchSkus = new Set<string>();
    const seenBatchBarcodes = new Set<string>();
    const categoriesToCreateSet = new Set<string>();

    const items: ValidatedCatalogItem[] = [];
    let validCount = 0;
    let warningCount = 0;
    let errorCount = 0;

    for (let i = 0; i < rawItems.length; i++) {
      const raw = rawItems[i];
      const errors: string[] = [];
      const warnings: string[] = [];

      // Validar SKU
      const rawSku = (raw.sku || '').trim().toUpperCase();
      let sku = rawSku;
      if (!sku) {
        errors.push('El SKU o código de producto es obligatorio');
      } else if (sku.length < 3) {
        errors.push('El SKU debe tener al menos 3 caracteres');
      } else if (seenBatchSkus.has(sku)) {
        errors.push(`El SKU "${sku}" está duplicado en este mismo lote de importación`);
      } else {
        seenBatchSkus.add(sku);
      }

      // Validar Nombre
      const name = (raw.name || '').trim();
      if (!name) {
        errors.push('El nombre del producto es obligatorio');
      } else if (name.length < 3) {
        errors.push('El nombre debe tener al menos 3 caracteres');
      }

      // Validar Precio USD
      const rawPrice = String(raw.priceUsd ?? '').replace(',', '.').replace(/[^0-9.]/g, '');
      const priceUsd = parseFloat(rawPrice);
      if (isNaN(priceUsd) || priceUsd <= 0) {
        errors.push('El precio de venta en USD debe ser un número mayor a 0');
      }

      // Validar Costo USD
      const rawCost = String(raw.costUsd ?? '').replace(',', '.').replace(/[^0-9.]/g, '');
      let costUsd = parseFloat(rawCost);
      if (isNaN(costUsd) || costUsd < 0) {
        costUsd = !isNaN(priceUsd) && priceUsd > 0 ? Math.round(priceUsd * 0.7 * 100) / 100 : 0;
        warnings.push(`Costo no especificado o inválido; se calculó automáticamente como ${costUsd} USD (70% del PVP)`);
      }

      // Validar Existencia / Stock
      const rawStock = String(raw.stock ?? '').trim();
      let stock = parseInt(rawStock, 10);
      if (isNaN(stock) || stock < 0) {
        stock = 0;
        warnings.push('Existencia (stock) no especificada o negativa; se ajustó a 0 unidades');
      }

      // Validar Stock Mínimo
      const rawMinStock = String(raw.minStock ?? '').trim();
      let minStock = parseInt(rawMinStock, 10);
      if (isNaN(minStock) || minStock < 0) {
        minStock = 5;
        warnings.push('Stock mínimo de reorden no especificado; se fijó por defecto en 5');
      }

      // Validar Código de Barras
      const barcode = (raw.barcode || '').trim() || null;
      if (barcode) {
        if (seenBatchBarcodes.has(barcode)) {
          warnings.push(`Código de barras "${barcode}" repetido en el archivo; se ignorará en esta fila para evitar colisión`);
        } else {
          seenBatchBarcodes.add(barcode);
          const ownerSku = barcodeMap.get(barcode);
          if (ownerSku && ownerSku !== sku) {
            warnings.push(`El código de barras ya pertenece al producto ${ownerSku} en la base de datos`);
          }
        }
      }

      // Validar Categoría
      const rawCategory = (raw.category || '').trim();
      let categoryName = rawCategory || 'General';
      let categoryId: string | null = null;
      let willCreateCategory = false;

      const normCat = categoryName.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      const foundCat = categoryMap.get(normCat);
      if (foundCat) {
        categoryId = foundCat.id;
        categoryName = foundCat.name;
      } else {
        willCreateCategory = true;
        categoriesToCreateSet.add(categoryName);
        warnings.push(`La categoría "${categoryName}" no existe en el sistema y se creará automáticamente`);
      }

      // Validar Fotos
      let imageUrl = (raw.imageUrl || '').trim() || null;
      let images: string[] = [];
      if (Array.isArray(raw.images)) {
        images = raw.images.slice(0, 3);
      } else if (typeof raw.images === 'string' && raw.images.trim()) {
        try {
          const parsed = JSON.parse(raw.images);
          if (Array.isArray(parsed)) images = parsed.slice(0, 3);
        } catch {
          images = [raw.images.trim()];
        }
      } else if (imageUrl) {
        images = [imageUrl];
      }
      if (!imageUrl && images.length > 0) {
        imageUrl = images[0];
      }

      // Destacado
      const featured = raw.featured === true || String(raw.featured).toLowerCase() === 'true' || String(raw.featured).toLowerCase() === 'si' || String(raw.featured).toLowerCase() === '1';

      // Acción: ¿Es producto nuevo o actualización?
      const existsInDb = sku ? skuMap.has(sku) : false;
      const action: 'CREATE' | 'UPDATE' = existsInDb ? 'UPDATE' : 'CREATE';

      // Estado general de la fila
      let status: 'VALID' | 'WARNING' | 'ERROR' = 'VALID';
      if (errors.length > 0) {
        status = 'ERROR';
        errorCount++;
      } else if (warnings.length > 0) {
        status = 'WARNING';
        warningCount++;
      } else {
        validCount++;
      }

      items.push({
        rowIndex: i + 1,
        raw,
        status,
        action,
        sku,
        name,
        categoryName,
        categoryId,
        willCreateCategory,
        priceUsd: !isNaN(priceUsd) ? priceUsd : 0,
        costUsd,
        stock,
        minStock,
        barcode,
        description: (raw.description || '').trim() || null,
        imageUrl,
        images,
        featured,
        errors,
        warnings,
      });
    }

    return {
      total: rawItems.length,
      validCount,
      warningCount,
      errorCount,
      canImport: errorCount === 0 || (validCount + warningCount > 0),
      items,
      categoriesToCreate: Array.from(categoriesToCreateSet),
    };
  }

  /**
   * Ejecuta la importación por lotes en SQLite con soporte para Upsert / Crear nuevos
   */
  static async importCatalog(items: ValidatedCatalogItem[], options: ImportOptions = {}): Promise<ImportResult> {
    const { strategy = 'upsert', skipErrors = true } = options;

    const result: ImportResult = {
      success: true,
      totalProcessed: 0,
      createdCount: 0,
      updatedCount: 0,
      skippedCount: 0,
      errorCount: 0,
      categoriesCreated: [],
      errors: [],
    };

    // 1. Filtrar los que se pueden importar
    const validItems = items.filter(it => it.status !== 'ERROR' || !skipErrors);

    if (validItems.length === 0) {
      result.success = false;
      result.errorCount = items.length;
      return result;
    }

    // 2. Resolver o crear categorías necesarias
    const categoryCache = new Map<string, string>(); // categoryName -> categoryId
    const existingCats = await prisma.category.findMany();
    existingCats.forEach(c => {
      categoryCache.set(c.name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, ''), c.id);
      categoryCache.set(c.slug.toLowerCase(), c.id);
    });

    for (const it of validItems) {
      const catKey = it.categoryName.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      if (!categoryCache.has(catKey)) {
        const slug = it.categoryName.toLowerCase()
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/(^-|-$)/g, '');

        try {
          const newCat = await prisma.category.create({
            data: {
              name: it.categoryName,
              slug: slug || `cat-${Date.now()}`,
              description: `Categoría importada de catálogo: ${it.categoryName}`,
            },
          });
          categoryCache.set(catKey, newCat.id);
          result.categoriesCreated.push(it.categoryName);
        } catch (e: any) {
          console.warn(`Error al crear categoría ${it.categoryName}:`, e.message);
        }
      }
    }

    // 3. Procesar cada producto en lotes seguros
    for (const it of validItems) {
      if (it.status === 'ERROR') {
        result.errorCount++;
        result.errors.push({ row: it.rowIndex, sku: it.sku, error: it.errors.join('; ') });
        continue;
      }

      try {
        const catKey = it.categoryName.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
        const finalCategoryId = it.categoryId || categoryCache.get(catKey) || null;

        const cleanSku = it.sku.toUpperCase();
        const slug = it.name.toLowerCase()
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/(^-|-$)/g, '') + '-' + cleanSku.toLowerCase();

        const imagesJson = it.images && it.images.length > 0 ? JSON.stringify(it.images.slice(0, 3)) : null;

        // Comprobar existencia previa
        const existing = await prisma.product.findUnique({
          where: { sku: cleanSku },
        });

        if (existing) {
          if (strategy === 'create_only') {
            result.skippedCount++;
            continue;
          }

          // Actualizar producto existente (Upsert)
          await prisma.product.update({
            where: { id: existing.id },
            data: {
              name: it.name,
              priceUsd: it.priceUsd,
              costUsd: it.costUsd,
              stock: it.stock,
              minStock: it.minStock,
              ...(it.barcode && { barcode: it.barcode }),
              ...(it.description && { description: it.description }),
              ...(it.imageUrl && { imageUrl: it.imageUrl }),
              ...(imagesJson && { images: imagesJson }),
              featured: it.featured,
              ...(finalCategoryId && { categoryId: finalCategoryId }),
              active: true,
            },
          });
          result.updatedCount++;
        } else {
          // Crear nuevo producto
          await prisma.product.create({
            data: {
              sku: cleanSku,
              name: it.name,
              slug,
              priceUsd: it.priceUsd,
              costUsd: it.costUsd,
              stock: it.stock,
              minStock: it.minStock,
              barcode: it.barcode || null,
              description: it.description || null,
              imageUrl: it.imageUrl || null,
              images: imagesJson,
              featured: it.featured,
              categoryId: finalCategoryId,
              active: true,
            },
          });
          result.createdCount++;
        }
        result.totalProcessed++;
      } catch (err: any) {
        result.errorCount++;
        result.errors.push({
          row: it.rowIndex,
          sku: it.sku,
          error: err.message || 'Error al persistir en base de datos',
        });
      }
    }

    return result;
  }

  /**
   * Genera el contenido de la plantilla CSV oficial con productos ferreteros de ejemplo
   */
  static getCsvTemplate(): string {
    const headers = [
      'sku',
      'nombre',
      'categoria',
      'precio_usd',
      'costo_usd',
      'stock',
      'stock_minimo',
      'codigo_barra',
      'descripcion',
      'destacado',
    ];

    const sampleRows = [
      ['TDL-2001', 'Taladro Percutor Inalámbrico 20V DeWalt', 'Herramientas Eléctricas', '120.00', '85.00', '15', '4', '750102030401', 'Mandril metálico 13mm, 2 baterías de litio y cargador rápido', 'SI'],
      ['DST-3200', 'Juego de Destornilladores de Precisión 32 Piezas Stanley', 'Herramienta Manual', '18.50', '11.00', '30', '6', '750102030402', 'Puntas en acero cromo-vanadio magnéticas con estuche rígido', 'NO'],
      ['CER-8040', 'Cerradura de Sobreponer Clásica Cilindro Suelto Cisa', 'Seguridad Industrial', '32.00', '21.00', '12', '3', '750102030403', 'Para puertas batientes de madera o hierro con 3 llaves de punto', 'SI'],
      ['BMP-0500', 'Bomba de Agua Periférica 1/2 HP 110V Shimge', 'Plomería', '45.00', '31.50', '8', '2', '750102030404', 'Impulsor de bronce, altura máxima 35m, ideal para tanques residenciales', 'NO'],
      ['ALC-0800', 'Alicate Universal de Presión 10 Pulgadas Vise-Grip', 'Herramienta Manual', '14.00', '8.90', '25', '5', '750102030405', 'Mordaza curva con cortador de alambre templado de alta resistencia', 'NO'],
      ['PNT-4001', 'Galón de Pintura Caucho Mate Blanco Puro VP', 'Pintura y Acabados', '22.00', '14.80', '40', '10', '750102030406', 'Excelente cubrimiento y lavabilidad para interiores y exteriores', 'SI'],
    ];

    const lines = [
      headers.join(','),
      ...sampleRows.map(r => r.map(c => `"${c.replace(/"/g, '""')}"`).join(',')),
    ];

    // Incluir BOM UTF-8 (\uFEFF) para compatibilidad total con Excel en Windows
    return '\uFEFF' + lines.join('\r\n');
  }

  /**
   * Exporta todo el catálogo de la base de datos como CSV listo para edición y reimportación
   */
  static async exportToCsv(): Promise<string> {
    const products = await prisma.product.findMany({
      where: { active: true },
      include: { category: true },
      orderBy: [{ categoryId: 'asc' }, { name: 'asc' }],
    });

    const headers = [
      'sku',
      'nombre',
      'categoria',
      'precio_usd',
      'costo_usd',
      'stock',
      'stock_minimo',
      'codigo_barra',
      'descripcion',
      'destacado',
    ];

    const rows = products.map(p => [
      p.sku,
      p.name,
      p.category ? p.category.name : 'General',
      p.priceUsd.toFixed(2),
      p.costUsd.toFixed(2),
      String(p.stock),
      String(p.minStock),
      p.barcode || '',
      p.description || '',
      p.featured ? 'SI' : 'NO',
    ]);

    const lines = [
      headers.join(','),
      ...rows.map(r => r.map(c => `"${(c || '').replace(/"/g, '""')}"`).join(',')),
    ];

    return '\uFEFF' + lines.join('\r\n');
  }
}
