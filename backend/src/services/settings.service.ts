import { prisma } from '../prisma';
import { config } from '../config';

export const DEFAULT_SETTINGS: Record<string, { value: string; description: string }> = {
  STORE_NAME: { value: 'FerreMax Venezuela, C.A.', description: 'Razón social y nombre comercial' },
  STORE_RIF: { value: 'J-50123456-7', description: 'Número de RIF de la empresa' },
  STORE_ADDRESS: { value: 'Av. Francisco de Miranda, Edif. FerreMax, Chacao, Caracas', description: 'Dirección física y fiscal' },
  STORE_PHONE: { value: '+58 414 1234567', description: 'Teléfono comercial y WhatsApp de atención' },
  STORE_EMAIL: { value: 'ventas@ferremax.ve', description: 'Correo electrónico de contacto' },
  IVA_PERCENT: { value: '16', description: 'Porcentaje de Impuesto al Valor Agregado (IVA %)' },
  IGTF_PERCENT: { value: '3', description: 'Porcentaje de Impuesto a las Grandes Transacciones Financieras en divisas (IGTF %)' },
  PM_BANCO: { value: 'Banesco (0134)', description: 'Banco receptor de Pago Móvil' },
  PM_TELEFONO: { value: '0414-1234567', description: 'Teléfono celular afiliado a Pago Móvil' },
  PM_RIF: { value: 'J-50123456-7', description: 'Cédula o RIF para Pago Móvil' },
  PM_TITULAR: { value: 'FerreMax Venezuela, C.A.', description: 'Titular de la cuenta Pago Móvil' },
  TRANSFER_BANCO: { value: 'Banesco Banco Universal', description: 'Banco para transferencias nacionales en Bolívares' },
  TRANSFER_CUENTA: { value: '0134-0123-45-0001234567', description: 'Número de cuenta bancaria nacional (20 dígitos)' },
  TRANSFER_RIF: { value: 'J-50123456-7', description: 'RIF titular de la cuenta bancaria' },
  TRANSFER_TITULAR: { value: 'FerreMax Venezuela, C.A.', description: 'Titular de la cuenta bancaria' },
  ZELLE_EMAIL: { value: 'pagos@ferremax.ve', description: 'Correo electrónico receptor de Zelle' },
  ZELLE_TITULAR: { value: 'FerreMax Corp', description: 'Titular de la cuenta Zelle' },
  DELIVERY_BASE_PRICE: { value: '3.0', description: 'Costo base de delivery en USD' },
  DELIVERY_FREE_OVER: { value: '50.0', description: 'Monto mínimo en USD para delivery gratis' },
  STORE_BANNER_TEXT: { value: '¡Envíos rápidos a toda la Gran Caracas! Tasa oficial BCV actualizada en tiempo real.', description: 'Aviso promocional superior en la tienda online' },
  STORE_SCHEDULE: { value: 'Lunes a Sábado: 8:00 AM - 5:00 PM', description: 'Horario de atención al público' },
  STORE_SLOGAN: { value: 'Ferretería Industrial & Materiales', description: 'Eslogan o subtítulo comercial de la empresa' },
  STORE_LOGO_URL: { value: '', description: 'Ruta o URL del logotipo comercial de la empresa' },
  COLOR_PRIMARY: { value: '#0f766e', description: 'Color primario institucional de la marca (Hex)' },
  COLOR_SECONDARY: { value: '#0284c7', description: 'Color secundario institucional de la marca (Hex)' },
};

export class SettingsService {
  // Asegurar que los ajustes por defecto existan en la BD
  static async ensureDefaults(): Promise<void> {
    try {
      for (const [key, item] of Object.entries(DEFAULT_SETTINGS)) {
        await prisma.storeSetting.upsert({
          where: { key },
          update: {},
          create: {
            key,
            value: item.value,
            description: item.description,
          },
        });
      }
    } catch (err) {
      console.error('Error al asegurar configuraciones predeterminadas:', err);
    }
  }

  // Obtener todos los ajustes en un diccionario clave-valor
  static async getAll(): Promise<Record<string, string>> {
    const list = await prisma.storeSetting.findMany();
    const map: Record<string, string> = {};
    for (const item of list) {
      map[item.key] = item.value;
    }
    // Llenar faltantes con defaults
    for (const [key, item] of Object.entries(DEFAULT_SETTINGS)) {
      if (map[key] === undefined) {
        map[key] = item.value;
      }
    }
    return map;
  }

  // Obtener un ajuste específico con valor por defecto
  static async get(key: string, fallback?: string): Promise<string> {
    const found = await prisma.storeSetting.findUnique({ where: { key } });
    if (found) return found.value;
    if (fallback !== undefined) return fallback;
    if (DEFAULT_SETTINGS[key]) return DEFAULT_SETTINGS[key].value;
    return '';
  }

  // Obtener IVA numérico actual
  static async getIvaPercent(): Promise<number> {
    const val = await this.get('IVA_PERCENT', String(config.ivaPercent));
    const num = parseFloat(val);
    return isNaN(num) ? config.ivaPercent : num;
  }

  // Obtener IGTF numérico actual
  static async getIgtfPercent(): Promise<number> {
    const val = await this.get('IGTF_PERCENT', String(config.igtfPercent));
    const num = parseFloat(val);
    return isNaN(num) ? config.igtfPercent : num;
  }

  // Actualizar múltiples configuraciones a la vez
  static async updateBulk(entries: Record<string, any>): Promise<Record<string, string>> {
    for (const [key, val] of Object.entries(entries)) {
      if (val !== undefined && val !== null) {
        await prisma.storeSetting.upsert({
          where: { key },
          update: { value: String(val) },
          create: {
            key,
            value: String(val),
            description: DEFAULT_SETTINGS[key]?.description || null,
          },
        });
      }
    }
    return this.getAll();
  }
}
