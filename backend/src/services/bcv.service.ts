import { prisma } from '../prisma';
import { config } from '../config';

export class BcvService {
  /**
   * Obtiene la tasa BCV activa actual.
   * Si no hay tasa registrada para hoy, intenta sincronizar con la fuente oficial.
   */
  static async getCurrentRate(): Promise<{ rate: number; updatedAt: Date; source: string }> {
    // Buscar la última tasa que sea válida en Venezuela (tasa realista >= 100 Bs por USD)
    const latest = await prisma.exchangeRate.findFirst({
      where: {
        rateBcv: { gte: 100 },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (latest && latest.source !== 'CONFIG_DEFAULT') {
      // Si la tasa tiene menos de 6 horas, la consideramos fresca
      const sixHoursAgo = new Date(Date.now() - 6 * 60 * 60 * 1000);
      if (latest.createdAt > sixHoursAgo) {
        return {
          rate: latest.rateBcv,
          updatedAt: latest.createdAt,
          source: latest.source,
        };
      }
    }

    // Intentamos sincronizar con API oficial del BCV
    try {
      const fetched = await this.syncWithBcv();
      return fetched;
    } catch {
      // Si falla la red, devolvemos la última guardada válida
      if (latest) {
        return {
          rate: latest.rateBcv,
          updatedAt: latest.createdAt,
          source: `${latest.source} (en caché)`,
        };
      }

      // Si la BD no tiene tasa válida, guardamos la tasa por defecto actual
      const defaultRate = config.bcvDefaultRate >= 100 ? config.bcvDefaultRate : 889.50;
      const created = await prisma.exchangeRate.create({
        data: {
          rateBcv: defaultRate,
          source: 'CONFIG_DEFAULT',
        },
      });

      return {
        rate: created.rateBcv,
        updatedAt: created.createdAt,
        source: 'CONFIG_DEFAULT',
      };
    }
  }

  /**
   * Consulta el servicio de tasa oficial BCV
   */
  static async syncWithBcv(): Promise<{ rate: number; updatedAt: Date; source: string }> {
    try {
      // API pública de consulta oficial del BCV en Venezuela
      const res = await fetch('https://ve.dolarapi.com/v1/dolares/oficial', {
        headers: { 'Accept': 'application/json' },
        signal: AbortSignal.timeout(5000),
      });

      if (res.ok) {
        const data = (await res.json()) as { promedio?: number; precio?: number };
        const rate = data.promedio || data.precio;
        if (rate && rate > 0) {
          const record = await prisma.exchangeRate.create({
            data: {
              rateBcv: Number(rate),
              source: 'BCV_DOLARAPI',
            },
          });
          return { rate: record.rateBcv, updatedAt: record.createdAt, source: record.source };
        }
      }
    } catch {
      // Fallback a segunda fuente
      try {
        const res2 = await fetch('https://pydolarve.org/api/v1/dollar?page=bcv', {
          headers: { 'Accept': 'application/json' },
          signal: AbortSignal.timeout(5000),
        });
        if (res2.ok) {
          const data2 = (await res2.json()) as { monitors?: { bcv?: { price?: number } } };
          const rate2 = data2.monitors?.bcv?.price;
          if (rate2 && rate2 > 0) {
            const record = await prisma.exchangeRate.create({
              data: {
                rateBcv: Number(rate2),
                source: 'BCV_PYDOLARVE',
              },
            });
            return { rate: record.rateBcv, updatedAt: record.createdAt, source: record.source };
          }
        }
      } catch {
        // Ignorar y dejar que el llamador use la tasa en caché
      }
    }

    throw new Error('No se pudo sincronizar automáticamente la tasa BCV');
  }

  /**
   * Permite que el administrador defina o ajuste manualmente la tasa
   */
  static async setManualRate(rate: number): Promise<{ rate: number; updatedAt: Date }> {
    if (rate <= 0) {
      throw new Error('La tasa debe ser un número positivo');
    }

    const record = await prisma.exchangeRate.create({
      data: {
        rateBcv: rate,
        source: 'MANUAL_ADMIN',
      },
    });

    return { rate: record.rateBcv, updatedAt: record.createdAt };
  }
}
