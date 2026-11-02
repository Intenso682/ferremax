import { prisma } from '../prisma';
import { AuthService } from '../services/auth.service';
import { BcvService } from '../services/bcv.service';

async function main() {
  console.log('🌱 Iniciando carga de datos iniciales (Seed)...');

  // 1. Usuarios con roles
  const adminPass = await AuthService.hashPassword('Admin1234!');
  const cashierPass = await AuthService.hashPassword('Caja1234!');
  const warehousePass = await AuthService.hashPassword('Almacen1234!');

  const admin = await prisma.user.upsert({
    where: { email: 'admin@ferremax.ve' },
    update: {},
    create: {
      email: 'admin@ferremax.ve',
      name: 'Ricardo Núñez (Administrador)',
      passwordHash: adminPass,
      role: 'ADMIN',
    },
  });

  await prisma.user.upsert({
    where: { email: 'caja1@ferremax.ve' },
    update: {},
    create: {
      email: 'caja1@ferremax.ve',
      name: 'Paola Vega (Cajera)',
      passwordHash: cashierPass,
      role: 'CASHIER',
    },
  });

  await prisma.user.upsert({
    where: { email: 'almacen@ferremax.ve' },
    update: {},
    create: {
      email: 'almacen@ferremax.ve',
      name: 'Iván Soto (Almacén)',
      passwordHash: warehousePass,
      role: 'WAREHOUSE',
    },
  });

  console.log(`✅ Usuarios creados: Admin (${admin.email}), Caja, Almacén`);

  // 2. Sincronización inicial de tasa oficial BCV (solo si no hay una tasa válida en la base de datos)
  const existingRate = await prisma.exchangeRate.findFirst({
    where: { rateBcv: { gte: 100 } },
    orderBy: { createdAt: 'desc' },
  });

  if (!existingRate) {
    try {
      const fetched = await BcvService.syncWithBcv();
      console.log(`✅ Tasa oficial BCV inicial sincronizada (${fetched.rate} Bs/USD)`);
    } catch {
      await prisma.exchangeRate.create({
        data: {
          currency: 'USD',
          rateBcv: 889.50,
          source: 'SEED_FALLBACK_BCV',
        },
      });
      console.log('✅ Tasa oficial BCV inicial registrada con fallback (889.50 Bs/USD)');
    }
  } else {
    console.log(`✅ Tasa oficial BCV ya registrada y vigente (${existingRate.rateBcv} Bs/USD)`);
  }

  // 3. Categorías
  const categoriesData = [
    { name: 'Herramientas Manuales', slug: 'herramientas-manuales', icon: 'hammer', description: 'Martillos, llaves, alicates y destornilladores' },
    { name: 'Herramientas Eléctricas', slug: 'herramientas-electricas', icon: 'zap', description: 'Taladros, esmeriles, rotomartillos y sierras' },
    { name: 'Plomería y Grifería', slug: 'plomeria', icon: 'droplet', description: 'Tuberías PVC, llaves de paso, pegamentos y bombas' },
    { name: 'Electricidad e Iluminación', slug: 'electricidad', icon: 'sun', description: 'Cables, breakers, tomacorrientes e iluminación LED' },
    { name: 'Pinturas y Adhesivos', slug: 'pinturas', icon: 'brush', description: 'Pinturas de caucho, esmaltes, brochas y silicón' },
    { name: 'Tornillería y Fijación', slug: 'tornilleria', icon: 'disc', description: 'Tornillos, clavos, ramplug y pernos de alta resistencia' },
  ];

  const catMap: Record<string, string> = {};
  for (const c of categoriesData) {
    const cat = await prisma.category.upsert({
      where: { slug: c.slug },
      update: {},
      create: c,
    });
    catMap[c.slug] = cat.id;
  }
  console.log('✅ Categorías de ferretería creadas');

  // 4. Productos de muestra con precios en USD y existencias
  const sampleProducts = [
    {
      sku: 'TAL-DEW-20V',
      barcode: '7701234567890',
      name: 'Taladro Percutor Inalámbrico 20V Max',
      slug: 'taladro-percutor-inalambrico-20v',
      description: 'Motor sin escobillas (Brushless), incluye 2 baterías de litio y maletín de transporte.',
      priceUsd: 115.0,
      costUsd: 85.0,
      stock: 14,
      minStock: 3,
      featured: true,
      categoryId: catMap['herramientas-electricas'],
      imageUrl: 'https://images.unsplash.com/photo-1504148455328-c376907d081c?auto=format&fit=crop&w=600&q=80',
    },
    {
      sku: 'MAR-FORJ-16OZ',
      barcode: '7701234567891',
      name: 'Martillo de Uña Forjado 16 oz con Mango Antivibración',
      slug: 'martillo-de-una-forjado-16oz',
      description: 'Cabeza forjada de una sola pieza en acero al carbono con mango de fibra de vidrio.',
      priceUsd: 12.5,
      costUsd: 7.2,
      stock: 45,
      minStock: 8,
      featured: true,
      categoryId: catMap['herramientas-manuales'],
      imageUrl: 'https://images.unsplash.com/photo-1586864387967-d02ef85d93e8?auto=format&fit=crop&w=600&q=80',
    },
    {
      sku: 'ESM-ANG-412',
      barcode: '7701234567892',
      name: 'Esmeril Angular 4-1/2" 850W',
      slug: 'esmeril-angular-4-1-2-850w',
      description: 'Diseño compacto y ergonómico, velocidad de 11.000 RPM con guarda de ajuste rápido.',
      priceUsd: 48.0,
      costUsd: 32.0,
      stock: 18,
      minStock: 4,
      featured: true,
      categoryId: catMap['herramientas-electricas'],
      imageUrl: 'https://images.unsplash.com/photo-1572981779307-38b8cabb2407?auto=format&fit=crop&w=600&q=80',
    },
    {
      sku: 'JUE-LLAV-COMB',
      barcode: '7701234567893',
      name: 'Juego de Llaves Combinadas 8 a 19 mm (12 Pzas)',
      slug: 'juego-de-llaves-combinadas-12-piezas',
      description: 'Fabricadas en cromo vanadio con acabado pulido espejo. Incluye estuche organizador.',
      priceUsd: 26.0,
      costUsd: 16.5,
      stock: 22,
      minStock: 5,
      featured: false,
      categoryId: catMap['herramientas-manuales'],
      imageUrl: 'https://images.unsplash.com/photo-1616401784845-180882ba9ba8?auto=format&fit=crop&w=600&q=80',
    },
    {
      sku: 'CAB-THHN-12',
      barcode: '7701234567894',
      name: 'Rollo Cable Eléctrico THHN Calibre 12 (100 mts)',
      slug: 'rollo-cable-thhn-calibre-12-100m',
      description: 'Conductor 100% cobre certificado, aislamiento termoplástico resistente al calor y humedad.',
      priceUsd: 58.0,
      costUsd: 44.0,
      stock: 30,
      minStock: 6,
      featured: true,
      categoryId: catMap['electricidad'],
      imageUrl: 'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?auto=format&fit=crop&w=600&q=80',
    },
    {
      sku: 'PIN-CAUCH-BLA',
      barcode: '7701234567895',
      name: 'Cuñete Pintura de Caucho Clase A Blanco Puro (4 Gal)',
      slug: 'cunete-pintura-caucho-clase-a-blanco',
      description: 'Excelente rendimiento y cubrimiento, lavable para interiores y exteriores.',
      priceUsd: 42.0,
      costUsd: 28.0,
      stock: 15,
      minStock: 4,
      featured: true,
      categoryId: catMap['pinturas'],
      imageUrl: 'https://images.unsplash.com/photo-1589939705384-5185137a7f0f?auto=format&fit=crop&w=600&q=80',
    },
    {
      sku: 'LLAV-PASO-PVC-12',
      barcode: '7701234567896',
      name: 'Válvula Llave de Paso PVC Compacta 1/2"',
      slug: 'valvula-llave-de-paso-pvc-1-2',
      description: 'Cierre hermético de bola con manija ergonómica tipo mariposa, resistente a la presión.',
      priceUsd: 2.5,
      costUsd: 1.1,
      stock: 120,
      minStock: 20,
      featured: false,
      categoryId: catMap['plomeria'],
      imageUrl: 'https://images.unsplash.com/photo-1607400201515-c2c41c07d307?auto=format&fit=crop&w=600&q=80',
    },
    {
      sku: 'BOM-AGUA-12HP',
      barcode: '7701234567897',
      name: 'Bomba de Agua Periférica 1/2 HP 110V',
      slug: 'bomba-de-agua-periferica-1-2-hp',
      description: 'Turbina de bronce, elevación máxima de 35 metros con caudal de 35 L/min.',
      priceUsd: 38.0,
      costUsd: 25.0,
      stock: 9,
      minStock: 2,
      featured: false,
      categoryId: catMap['plomeria'],
      imageUrl: 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=600&q=80',
    },
  ];

  for (const p of sampleProducts) {
    await prisma.product.upsert({
      where: { sku: p.sku },
      update: {},
      create: p,
    });
  }
  console.log(`✅ ${sampleProducts.length} Productos de ferretería cargados con stock e imágenes`);

  // 5. Ajustes y cuentas bancarias para Pago Móvil venezolano
  const defaultSettings = [
    { key: 'STORE_NAME', value: 'FerreMax Venezuela', description: 'Nombre comercial de la tienda' },
    { key: 'STORE_RIF', value: 'J-50123456-7', description: 'RIF de la empresa' },
    { key: 'STORE_ADDRESS', value: 'Av. Francisco de Miranda, Local FerreMax, Caracas', description: 'Dirección física' },
    { key: 'PM_BANCO', value: 'Banesco (0134)', description: 'Banco receptor de Pago Móvil' },
    { key: 'PM_TELEFONO', value: '0414-1234567', description: 'Teléfono para Pago Móvil' },
    { key: 'PM_RIF', value: 'J-50123456-7', description: 'Cédula o RIF para Pago Móvil' },
    { key: 'PM_TITULAR', value: 'FerreMax C.A.', description: 'Titular de la cuenta' },
    { key: 'WHATSAPP_PHONE', value: '+584141234567', description: 'WhatsApp de atención y confirmación de pedidos' },
    { key: 'ZELLE_EMAIL', value: 'pagos@ferremax.ve', description: 'Email para transferencias Zelle' },
    { key: 'ZELLE_TITULAR', value: 'FerreMax Corp', description: 'Titular de cuenta Zelle' },
  ];

  for (const s of defaultSettings) {
    await prisma.storeSetting.upsert({
      where: { key: s.key },
      update: {},
      create: s,
    });
  }
  console.log('✅ Configuraciones de Pago Móvil y contacto de tienda creadas');

  console.log('🎉 Seed completado exitosamente.');
}

main()
  .catch((e) => {
    console.error('❌ Error en Seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
