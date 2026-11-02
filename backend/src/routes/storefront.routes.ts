import { Router, Request, Response } from 'express';
import { prisma } from '../prisma';
import { BcvService } from '../services/bcv.service';
import { config } from '../config';
import { SettingsService } from '../services/settings.service';

export const storefrontRouter = Router();

// 1. Catálogo público con precios en USD y en Bs calculados a la tasa BCV oficial
storefrontRouter.get('/catalog', async (req: Request, res: Response): Promise<void> => {
  try {
    const { category, search, featured } = req.query;
    const { rate: bcvRate, updatedAt: rateDate } = await BcvService.getCurrentRate();

    const where: any = { active: true };

    if (category && typeof category === 'string') {
      where.category = { slug: category };
    }

    if (search && typeof search === 'string') {
      where.OR = [
        { name: { contains: search } },
        { description: { contains: search } },
      ];
    }

    if (featured === 'true') {
      where.featured = true;
    }

    const products = await prisma.product.findMany({
      where,
      include: {
        category: { select: { id: true, name: true, slug: true } },
      },
      orderBy: [{ featured: 'desc' }, { name: 'asc' }],
    });

    // Mapeo con precios duales calculados al momento
    const formattedProducts = products.map((p) => {
      const priceBs = Math.round(p.priceUsd * bcvRate * 100) / 100;
      let parsedImages: string[] = [];
      if (p.images) {
        try { parsedImages = JSON.parse(p.images); } catch { parsedImages = [p.images]; }
      } else if (p.imageUrl) {
        parsedImages = [p.imageUrl];
      }
      return {
        id: p.id,
        sku: p.sku,
        name: p.name,
        slug: p.slug,
        description: p.description,
        priceUsd: p.priceUsd,
        priceBs,
        inStock: p.stock > 0,
        stockAvailable: p.stock,
        imageUrl: p.imageUrl || (parsedImages.length > 0 ? parsedImages[0] : null),
        images: parsedImages,
        category: p.category,
        featured: p.featured,
        costUsd: p.costUsd,
        minStock: p.minStock,
        unit: p.unit || 'UND',
        purchaseUnit: p.purchaseUnit || 'UND',
        unitRatio: Number(p.unitRatio || 1.0),
        hasSerial: Boolean(p.hasSerial),
        warrantyMonths: Number(p.warrantyMonths || 0),
        location: p.location || null,
      };
    });

    res.json({
      meta: {
        bcvRate,
        rateDate,
        total: formattedProducts.length,
      },
      products: formattedProducts,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Error al cargar catálogo de la tienda' });
  }
});

// 2. Ficha detallada de un producto por su slug
storefrontRouter.get('/product/:slug', async (req: Request, res: Response): Promise<void> => {
  try {
    const slug = String(req.params.slug);
    const { rate: bcvRate } = await BcvService.getCurrentRate();

    const product = await prisma.product.findFirst({
      where: { slug, active: true },
      include: { category: true },
    });

    if (!product) {
      res.status(404).json({ error: 'Producto no encontrado' });
      return;
    }

    const priceBs = Math.round(product.priceUsd * bcvRate * 100) / 100;
    let parsedImages: string[] = [];
    if (product.images) {
      try { parsedImages = JSON.parse(product.images); } catch { parsedImages = [product.images]; }
    } else if (product.imageUrl) {
      parsedImages = [product.imageUrl];
    }

    res.json({
      ...product,
      images: parsedImages,
      imageUrl: product.imageUrl || (parsedImages.length > 0 ? parsedImages[0] : null),
      priceBs,
      bcvRate,
      inStock: product.stock > 0,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Error al obtener producto' });
  }
});

// 3. Configuración pública de la tienda (datos dinámicos para Pago Móvil, transferencia, tasa BCV, contacto, impuestos)
storefrontRouter.get('/config', async (_req: Request, res: Response): Promise<void> => {
  try {
    const { rate: bcvRate, updatedAt: rateDate } = await BcvService.getCurrentRate();
    await SettingsService.ensureDefaults();
    const settingsMap = await SettingsService.getAll();
    const ivaPercent = await SettingsService.getIvaPercent();
    const igtfPercent = await SettingsService.getIgtfPercent();

    res.json({
      storeName: settingsMap['STORE_NAME'] || config.storeName,
      storeSlogan: settingsMap['STORE_SLOGAN'] || 'Ferretería Industrial & Materiales',
      logoUrl: settingsMap['STORE_LOGO_URL'] || '',
      colorPrimary: settingsMap['COLOR_PRIMARY'] || '#0f766e',
      colorSecondary: settingsMap['COLOR_SECONDARY'] || '#0284c7',
      storeRif: settingsMap['STORE_RIF'] || 'J-50123456-7',
      address: settingsMap['STORE_ADDRESS'] || 'Av. Francisco de Miranda, Caracas, Venezuela',
      phone: settingsMap['STORE_PHONE'] || '+58 414 1234567',
      email: settingsMap['STORE_EMAIL'] || 'ventas@ferremax.ve',
      schedule: settingsMap['STORE_SCHEDULE'] || 'Lunes a Sábado: 8:00 AM - 5:00 PM',
      bannerText: settingsMap['STORE_BANNER_TEXT'] || '¡Envíos rápidos a toda la Gran Caracas! Tasa oficial BCV actualizada en tiempo real.',
      bcvRate,
      rateDate,
      ivaPercent,
      igtfPercent,
      pagoMovil: {
        banco: settingsMap['PM_BANCO'] || 'Banesco (0134)',
        telefono: settingsMap['PM_TELEFONO'] || '0414-1234567',
        rif: settingsMap['PM_RIF'] || 'J-50123456-7',
        titular: settingsMap['PM_TITULAR'] || settingsMap['STORE_NAME'] || config.storeName,
      },
      transferencia: {
        banco: settingsMap['TRANSFER_BANCO'] || 'Banesco Banco Universal',
        cuenta: settingsMap['TRANSFER_CUENTA'] || '0134-0123-45-0001234567',
        rif: settingsMap['TRANSFER_RIF'] || settingsMap['STORE_RIF'] || 'J-50123456-7',
        titular: settingsMap['TRANSFER_TITULAR'] || settingsMap['STORE_NAME'] || config.storeName,
      },
      zelle: {
        email: settingsMap['ZELLE_EMAIL'] || 'pagos@ferremax.ve',
        titular: settingsMap['ZELLE_TITULAR'] || 'FerreMax Corp',
      },
      delivery: {
        basePriceUsd: parseFloat(settingsMap['DELIVERY_BASE_PRICE'] || '3.0') || 3.0,
        freeOverUsd: parseFloat(settingsMap['DELIVERY_FREE_OVER'] || '50.0') || 50.0,
      },
      deliveryZones: [
        { name: 'Retiro en Tienda (Gratis)', priceUsd: 0 },
        { name: 'Delivery Casco Central', priceUsd: parseFloat(settingsMap['DELIVERY_BASE_PRICE'] || '3.0') || 3.0 },
        { name: 'Delivery Zonas Aledañas', priceUsd: (parseFloat(settingsMap['DELIVERY_BASE_PRICE'] || '3.0') || 3.0) + 2.0 },
      ],
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Error al cargar configuración de la tienda' });
  }
});

// 4. Checkout público de la tienda online con reserva atómica de existencias
storefrontRouter.post('/checkout', async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      items, // array de { productId, quantity }
      customer, // { name, docNumber, docType, phone, email }
      deliveryType, // 'PICKUP' o 'DELIVERY'
      deliveryAddress,
      paymentMethod, // 'PAGO_MOVIL', 'ZELLE', 'EFECTIVO_USD', 'EFECTIVO_BS'
      paymentReference,
      notes,
    } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      res.status(400).json({ error: 'El carrito no contiene productos' });
      return;
    }

    if (!customer?.name || !customer?.docNumber) {
      res.status(400).json({ error: 'Nombre y Cédula/RIF del cliente son obligatorios' });
      return;
    }

    const { rate: bcvRate } = await BcvService.getCurrentRate();

    // Transacción atómica de creación de orden y descuento de stock
    const result = await prisma.$transaction(async (tx) => {
      // 1. Validar productos y stock
      const productIds = items.map((i: any) => i.productId);
      const dbProducts = await tx.product.findMany({
        where: { id: { in: productIds }, active: true },
      });

      if (dbProducts.length !== items.length) {
        throw new Error('Uno o más productos del carrito no existen o ya no están activos');
      }

      let subtotalUsd = 0;
      const orderItemsData: any[] = [];

      for (const item of items) {
        const prod = dbProducts.find((p) => p.id === item.productId)!;
        const qty = Number(item.quantity || 1);

        if (prod.stock < qty) {
          throw new Error(`Stock insuficiente para "${prod.name}". Disponible: ${prod.stock}`);
        }

        const itemSubtotal = prod.priceUsd * qty;
        subtotalUsd += itemSubtotal;

        const priceBs = Math.round(prod.priceUsd * bcvRate * 100) / 100;

        orderItemsData.push({
          productId: prod.id,
          productName: prod.name,
          quantity: qty,
          priceUsd: prod.priceUsd,
          priceBs,
          subtotalUsd: Math.round(itemSubtotal * 100) / 100,
        });

        // Descontar inventario inmediatamente
        await tx.product.update({
          where: { id: prod.id },
          data: { stock: prod.stock - qty },
        });
      }

      // 2. Cálculos fiscales dinámicos desde la configuración del backend
      const ivaPercent = await SettingsService.getIvaPercent();
      const igtfPercent = await SettingsService.getIgtfPercent();
      const taxUsd = Math.round(subtotalUsd * (ivaPercent / 100) * 100) / 100;
      
      // IGTF dinámico solo si el pago es en divisas / Zelle / efectivo divisa
      const appliesIgtf = paymentMethod === 'EFECTIVO_USD' || paymentMethod === 'ZELLE';
      const igtfUsd = appliesIgtf
        ? Math.round((subtotalUsd + taxUsd) * (igtfPercent / 100) * 100) / 100
        : 0;

      const totalUsd = Math.round((subtotalUsd + taxUsd + igtfUsd) * 100) / 100;
      const totalBs = Math.round(totalUsd * bcvRate * 100) / 100;

      // 3. Crear o actualizar ficha de cliente
      const customerDoc = `${customer.docType || 'V'}-${customer.docNumber}`;
      let customerRecord = await tx.customer.findUnique({
        where: { docNumber: customerDoc },
      });

      if (!customerRecord) {
        customerRecord = await tx.customer.create({
          data: {
            docType: customer.docType || 'V',
            docNumber: customerDoc,
            name: customer.name,
            phone: customer.phone || null,
            email: customer.email || null,
            address: deliveryAddress || null,
          },
        });
      }

      // 4. Generar número correlativo de orden (FM-XXXX)
      const count = await tx.order.count();
      const orderNumber = `FM-${(1001 + count).toString()}`;

      // 5. Crear la orden
      const order = await tx.order.create({
        data: {
          orderNumber,
          customerId: customerRecord.id,
          customerName: customer.name,
          customerDoc,
          customerPhone: customer.phone || null,
          customerEmail: customer.email || null,
          channel: 'STOREFRONT',
          status: 'PENDING_PAYMENT',
          subtotalUsd,
          taxUsd,
          igtfUsd,
          totalUsd,
          bcvRate,
          totalBs,
          paymentMethod: paymentMethod || 'PAGO_MOVIL',
          paymentReference: paymentReference || null,
          deliveryType: deliveryType || 'PICKUP',
          deliveryAddress: deliveryAddress || null,
          notes: notes || null,
          items: {
            create: orderItemsData,
          },
        },
        include: { items: true },
      });

      return order;
    });

    res.status(201).json({
      message: 'Pedido recibido con éxito',
      order: result,
      whatsappInstructions: `Hola, realicé el pedido #${result.orderNumber} en FerreMax por un monto de Bs. ${result.totalBs} ($${result.totalUsd}). Adjunto mi referencia: ${paymentReference || 'Pendiente'}`,
    });
  } catch (error: any) {
    res.status(400).json({ error: error.message || 'Error al procesar el pedido' });
  }
});

// 5. Consulta y seguimiento de orden pública
storefrontRouter.get('/track/:orderNumber', async (req: Request, res: Response): Promise<void> => {
  try {
    const orderNumber = String(req.params.orderNumber);
    const order = await prisma.order.findUnique({
      where: { orderNumber },
      include: { items: true },
    });

    if (!order) {
      res.status(404).json({ error: 'Pedido no encontrado' });
      return;
    }

    res.json(order);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Error al consultar pedido' });
  }
});
