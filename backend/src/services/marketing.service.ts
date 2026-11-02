import { prisma } from '../prisma';

export interface CreateBannerDTO {
  slot: 'top_bar' | 'home_hero' | 'catalog_middle' | 'brands_carousel';
  title: string;
  subtitle?: string;
  brandName?: string;
  badgeText?: string;
  imageUrl?: string;
  linkUrl?: string;
  buttonText?: string;
  bgGradient?: string;
  active?: boolean;
  order?: number;
  startDate?: Date;
  endDate?: Date;
}

export const SAMPLE_BANNERS: CreateBannerDTO[] = [
  // 1. Cinta Superior de Anuncios
  {
    slot: 'top_bar',
    title: '🚚 ¡Envíos Rápidos a toda la Gran Caracas! Entregas el mismo día por compras mayores a $50.',
    subtitle: 'Despacho directo desde tienda o galpón',
    brandName: 'FerreMax Express',
    badgeText: 'DESPACHO EXPRESS',
    linkUrl: '#/productos',
    buttonText: 'Ver Condiciones',
    bgGradient: 'linear-gradient(90deg, #0f766e, #0284c7)',
    active: true,
    order: 1,
  },
  // 2. Mega Banner Principal de Portada (Patrocinador Premium)
  {
    slot: 'home_hero',
    title: 'Mes Oficial DeWalt · Potencia y Rendimiento Industrial',
    subtitle: 'Taladros percutores, rotomartillos y esmeriles inalámbricos 20V Max con 12 meses de garantía oficial y servicio técnico garantizado.',
    brandName: 'DeWalt',
    badgeText: '⭐ MARCA PATROCINADA DEL MES',
    imageUrl: 'https://images.unsplash.com/photo-1504148455328-c376907d081c?auto=format&fit=crop&w=1200&q=80',
    linkUrl: '#/productos?q=dewalt',
    buttonText: 'Explorar Herramientas DeWalt',
    bgGradient: 'linear-gradient(135deg, rgba(217, 119, 6, 0.95), rgba(180, 83, 9, 0.92))',
    active: true,
    order: 1,
  },
  // 3. Banner Intermedio en Catálogo de Productos
  {
    slot: 'catalog_middle',
    title: 'Tuberías y Conexiones Tubrica · Cero Fugas y Máxima Presión',
    subtitle: 'Sistemas de tuberías PVC para aguas blancas, servidas y electricidad con 15% de descuento directo en caja por compras al mayor.',
    brandName: 'Tubrica',
    badgeText: 'PATROCINADO POR TUBRICA',
    imageUrl: 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=1200&q=80',
    linkUrl: '#/productos?cat=plomeria',
    buttonText: 'Ver Catálogo Tubrica',
    bgGradient: 'linear-gradient(135deg, #0284c7, #0369a1)',
    active: true,
    order: 1,
  },
  // 4. Marcas Aliadas Oficiales (Cintillo de Fabricantes)
  {
    slot: 'brands_carousel',
    title: 'DeWalt Industrial',
    subtitle: 'Herramientas Eléctricas & Percutores',
    brandName: 'DeWalt',
    badgeText: 'OFICIAL',
    linkUrl: '#/productos?q=dewalt',
    buttonText: 'Ver Productos',
    imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e0/DeWalt_Logo.svg/320px-DeWalt_Logo.svg.png',
    active: true,
    order: 1,
  },
  {
    slot: 'brands_carousel',
    title: 'Stanley Herramientas',
    subtitle: 'Cintas Métricas & Herramientas Manuales',
    brandName: 'Stanley',
    badgeText: 'OFICIAL',
    linkUrl: '#/productos?q=stanley',
    buttonText: 'Ver Productos',
    imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/7/7b/Stanley_Logo.svg/320px-Stanley_Logo.svg.png',
    active: true,
    order: 2,
  },
  {
    slot: 'brands_carousel',
    title: 'Bosch Professional',
    subtitle: 'Discos, Brocas & Maquinaria',
    brandName: 'Bosch',
    badgeText: 'OFICIAL',
    linkUrl: '#/productos?q=bosch',
    buttonText: 'Ver Productos',
    imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/16/Bosch-logo.svg/320px-Bosch-logo.svg.png',
    active: true,
    order: 3,
  },
  {
    slot: 'brands_carousel',
    title: 'Tubrica PVC',
    subtitle: 'Tuberías y Conexiones de Presión',
    brandName: 'Tubrica',
    badgeText: 'OFICIAL',
    linkUrl: '#/productos?cat=plomeria',
    buttonText: 'Ver Productos',
    imageUrl: 'https://tubrica.com/wp-content/uploads/2021/04/Logo-Tubrica.png',
    active: true,
    order: 4,
  },
  {
    slot: 'brands_carousel',
    title: 'Cemento Vencemos',
    subtitle: 'Construcción, Cemento & Pegas',
    brandName: 'Vencemos',
    badgeText: 'OFICIAL',
    linkUrl: '#/productos?cat=construccion',
    buttonText: 'Ver Productos',
    imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/d/d4/Cemex_logo.svg/320px-Cemex_logo.svg.png',
    active: true,
    order: 5,
  },
  {
    slot: 'brands_carousel',
    title: 'Truper Profesional',
    subtitle: 'Ferretería & Construcción',
    brandName: 'Truper',
    badgeText: 'OFICIAL',
    linkUrl: '#/productos?q=truper',
    buttonText: 'Ver Productos',
    imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c5/Logo_Truper.svg/320px-Logo_Truper.svg.png',
    active: true,
    order: 6,
  },
];

export class MarketingService {
  /**
   * Si no existen banners, siembra los banners por defecto de marcas patrocinadoras
   */
  static async ensureDefaultBanners(): Promise<void> {
    try {
      const count = await prisma.adBanner.count();
      if (count === 0) {
        for (const item of SAMPLE_BANNERS) {
          await prisma.adBanner.create({
            data: {
              slot: item.slot,
              title: item.title,
              subtitle: item.subtitle,
              brandName: item.brandName,
              badgeText: item.badgeText,
              imageUrl: item.imageUrl,
              linkUrl: item.linkUrl,
              buttonText: item.buttonText || 'Ver Catálogo',
              bgGradient: item.bgGradient,
              active: item.active !== undefined ? item.active : true,
              order: item.order || 0,
            },
          });
        }
        console.log(`[Marketing]: Se han sembrado ${SAMPLE_BANNERS.length} banners comerciales y marcas patrocinadoras iniciales.`);
      }
    } catch (err: any) {
      console.error('Error al sembrar banners por defecto:', err.message);
    }
  }

  /**
   * Lista todos los banners publicitarios, con filtro opcional por slot y activo
   */
  static async getBanners(slot?: string, activeOnly = false) {
    await this.ensureDefaultBanners();
    const where: any = {};
    if (slot) where.slot = slot;
    if (activeOnly) where.active = true;

    return prisma.adBanner.findMany({
      where,
      orderBy: [{ order: 'asc' }, { createdAt: 'desc' }],
    });
  }

  /**
   * Obtiene un banner por ID
   */
  static async getBannerById(id: string) {
    return prisma.adBanner.findUnique({ where: { id } });
  }

  /**
   * Crea un nuevo espacio / banner publicitario
   */
  static async createBanner(data: CreateBannerDTO) {
    return prisma.adBanner.create({
      data: {
        slot: data.slot,
        title: data.title,
        subtitle: data.subtitle,
        brandName: data.brandName,
        badgeText: data.badgeText,
        imageUrl: data.imageUrl,
        linkUrl: data.linkUrl,
        buttonText: data.buttonText || 'Ver Catálogo',
        bgGradient: data.bgGradient,
        active: data.active !== undefined ? data.active : true,
        order: data.order || 0,
        startDate: data.startDate,
        endDate: data.endDate,
      },
    });
  }

  /**
   * Actualiza un banner existente
   */
  static async updateBanner(id: string, data: Partial<CreateBannerDTO>) {
    return prisma.adBanner.update({
      where: { id },
      data,
    });
  }

  /**
   * Elimina un banner publicitario
   */
  static async deleteBanner(id: string) {
    return prisma.adBanner.delete({ where: { id } });
  }

  /**
   * Registra un clic publicitario para analíticas comerciales del anunciante
   */
  static async trackClick(id: string) {
    return prisma.adBanner.update({
      where: { id },
      data: {
        clicksCount: { increment: 1 },
      },
    });
  }

  /**
   * Registra una impresión visual de banner
   */
  static async trackView(id: string) {
    return prisma.adBanner.update({
      where: { id },
      data: {
        viewsCount: { increment: 1 },
      },
    });
  }

  /**
   * Métricas y resumen ejecutivo de publicidad para la gerencia
   */
  static async getMarketingMetrics() {
    await this.ensureDefaultBanners();
    const allBanners = await prisma.adBanner.findMany();
    const activeBanners = allBanners.filter((b) => b.active);
    const totalViews = allBanners.reduce((acc, b) => acc + (b.viewsCount || 0), 0);
    const totalClicks = allBanners.reduce((acc, b) => acc + (b.clicksCount || 0), 0);

    const ctrPercent = totalViews > 0 ? Number(((totalClicks / totalViews) * 100).toFixed(2)) : 0;

    return {
      totalBanners: allBanners.length,
      activeBannersCount: activeBanners.length,
      inactiveBannersCount: allBanners.length - activeBanners.length,
      totalViews,
      totalClicks,
      ctrPercent,
      slotsSummary: {
        topBar: allBanners.filter((b) => b.slot === 'top_bar').length,
        homeHero: allBanners.filter((b) => b.slot === 'home_hero').length,
        catalogMiddle: allBanners.filter((b) => b.slot === 'catalog_middle').length,
        brandsCarousel: allBanners.filter((b) => b.slot === 'brands_carousel').length,
      },
    };
  }
}
