import fs from 'fs';
import path from 'path';
import { prisma } from '../prisma';
import { AuthService } from './auth.service';

export interface PurgeTestDataOptions {
  userId: string;
  adminPassword: string;
  scope: 'OPERATIONS_ONLY' | 'FULL_FACTORY_RESET';
  deleteTestCustomers?: boolean;
  resetStockToZero?: boolean;
  note?: string;
}

export interface PurgeResult {
  success: boolean;
  message: string;
  scope: string;
  snapshotName: string;
  deletedCounts: {
    orders: number;
    orderItems: number;
    creditPayments: number;
    cashCloses: number;
    customersReset?: number;
    customersDeleted?: number;
    productsDeleted?: number;
    categoriesDeleted?: number;
  };
  timestamp: string;
}

export interface DatabaseStats {
  databasePath: string;
  databaseSizeBytes: number;
  databaseSizeFormatted: string;
  lastModified: string;
  counts: {
    products: number;
    categories: number;
    customers: number;
    creditPayments: number;
    orders: number;
    orderItems: number;
    cashCloses: number;
    settings: number;
    users: number;
    roles: number;
  };
  serverSnapshots: Array<{
    fileName: string;
    sizeFormatted: string;
    sizeBytes: number;
    createdAt: string;
    note?: string;
  }>;
}

export class BackupService {
  /**
   * Obtiene la ruta física del archivo SQLite dev.db
   */
  public static getDatabasePath(): string {
    // 1. Si DATABASE_URL está definido explícitamente (ej: file:/app/data/dev.db)
    if (process.env.DATABASE_URL && process.env.DATABASE_URL.startsWith('file:')) {
      const rawPath = process.env.DATABASE_URL.replace(/^file:/, '');
      const cleanPath = path.isAbsolute(rawPath) ? rawPath : path.resolve(process.cwd(), rawPath);
      if (fs.existsSync(cleanPath)) {
        return cleanPath;
      }
    }

    const candidates = [
      path.resolve(__dirname, '../../prisma/dev.db'),
      path.resolve(process.cwd(), 'prisma/dev.db'),
      path.resolve(process.cwd(), 'backend/prisma/dev.db'),
      '/app/data/dev.db',
      path.resolve(__dirname, '../../../data/dev.db'),
      path.resolve(process.cwd(), 'data/dev.db'),
    ];

    for (const p of candidates) {
      if (fs.existsSync(p)) {
        return p;
      }
    }

    if (process.env.DATABASE_URL && process.env.DATABASE_URL.startsWith('file:')) {
      const rawPath = process.env.DATABASE_URL.replace(/^file:/, '');
      return path.isAbsolute(rawPath) ? rawPath : path.resolve(process.cwd(), rawPath);
    }

    return candidates[0];
  }

  /**
   * Directorio local para guardar snapshots del servidor
   */
  public static getBackupsDir(): string {
    if (process.env.BACKUPS_DIR) {
      if (!fs.existsSync(process.env.BACKUPS_DIR)) {
        fs.mkdirSync(process.env.BACKUPS_DIR, { recursive: true });
      }
      return process.env.BACKUPS_DIR;
    }

    const dir = path.resolve(__dirname, '../../../backups');
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    return dir;
  }

  /**
   * Da formato legible a un tamaño en bytes (KB, MB, GB)
   */
  private static formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  /**
   * Obtiene estadísticas y métricas en vivo de la base de datos
   */
  public static async getDatabaseStats(): Promise<DatabaseStats> {
    const dbPath = this.getDatabasePath();
    let sizeBytes = 0;
    let lastModified = new Date().toISOString();

    if (fs.existsSync(dbPath)) {
      const stat = fs.statSync(dbPath);
      sizeBytes = stat.size;
      lastModified = stat.mtime.toISOString();
    }

    // Conteos de registros de todas las tablas principales
    const [
      products,
      categories,
      customers,
      creditPayments,
      orders,
      orderItems,
      cashCloses,
      settings,
      users,
      roles,
    ] = await Promise.all([
      prisma.product.count(),
      prisma.category.count(),
      prisma.customer.count(),
      prisma.creditPayment.count(),
      prisma.order.count(),
      prisma.orderItem.count(),
      prisma.cashClose.count(),
      prisma.storeSetting.count(),
      prisma.user.count(),
      prisma.role.count(),
    ]);

    // Listar snapshots en el servidor
    const backupsDir = this.getBackupsDir();
    const files = fs.readdirSync(backupsDir);
    const serverSnapshots: DatabaseStats['serverSnapshots'] = [];

    for (const file of files) {
      if (file.endsWith('.db')) {
        const filePath = path.join(backupsDir, file);
        const fileStat = fs.statSync(filePath);
        let note: string | undefined;

        // Verificar si existe archivo .meta.json adjunto
        const metaPath = path.join(backupsDir, file.replace(/\.db$/, '.meta.json'));
        if (fs.existsSync(metaPath)) {
          try {
            const metaContent = JSON.parse(fs.readFileSync(metaPath, 'utf8'));
            note = metaContent.note;
          } catch {
            // Ignorar error de lectura de metadatos opcionales
          }
        }

        serverSnapshots.push({
          fileName: file,
          sizeBytes: fileStat.size,
          sizeFormatted: this.formatBytes(fileStat.size),
          createdAt: fileStat.mtime.toISOString(),
          note,
        });
      }
    }

    // Ordenar snapshots: el más reciente primero
    serverSnapshots.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    return {
      databasePath: dbPath,
      databaseSizeBytes: sizeBytes,
      databaseSizeFormatted: this.formatBytes(sizeBytes),
      lastModified,
      counts: {
        products,
        categories,
        customers,
        creditPayments,
        orders,
        orderItems,
        cashCloses,
        settings,
        users,
        roles,
      },
      serverSnapshots,
    };
  }

  /**
   * Crea una copia instantánea local en el servidor (Snapshot fechado)
   */
  public static async createSnapshot(note?: string): Promise<{ fileName: string; filePath: string; sizeFormatted: string }> {
    const dbPath = this.getDatabasePath();
    if (!fs.existsSync(dbPath)) {
      throw new Error(`El archivo de base de datos no existe en: ${dbPath}`);
    }

    const backupsDir = this.getBackupsDir();
    const now = new Date();
    const timestamp = now.toISOString().replace(/[-:T.]/g, '').slice(0, 14); // YYYYMMDDHHmmss
    const fileName = `ferremax_backup_${timestamp}.db`;
    const targetPath = path.join(backupsDir, fileName);

    // Intentar VACUUM INTO para snapshot sin bloqueo si SQLite lo soporta
    let vacuumSuccess = false;
    try {
      // Escapar barras invertidas en Windows
      const normalizedTarget = targetPath.replace(/\\/g, '/');
      await prisma.$queryRawUnsafe(`VACUUM INTO '${normalizedTarget}'`);
      vacuumSuccess = true;
    } catch {
      vacuumSuccess = false;
    }

    // Fallback: copia física si VACUUM INTO no está disponible
    if (!vacuumSuccess || !fs.existsSync(targetPath)) {
      fs.copyFileSync(dbPath, targetPath);
    }

    const stat = fs.statSync(targetPath);

    // Guardar metadatos asociados
    const metaPath = path.join(backupsDir, `ferremax_backup_${timestamp}.meta.json`);
    const stats = await this.getDatabaseStats();
    fs.writeFileSync(
      metaPath,
      JSON.stringify(
        {
          fileName,
          createdAt: now.toISOString(),
          sizeBytes: stat.size,
          note: note || 'Respaldo manual desde panel administrativo',
          counts: stats.counts,
        },
        null,
        2
      ),
      'utf8'
    );

    // Poda preventiva: conservar los 20 respaldos más recientes para no saturar disco
    this.pruneOldSnapshots(20);

    return {
      fileName,
      filePath: targetPath,
      sizeFormatted: this.formatBytes(stat.size),
    };
  }

  /**
   * Elimina snapshots antiguos si superan el límite máximo
   */
  private static pruneOldSnapshots(maxKeep: number = 20) {
    try {
      const backupsDir = this.getBackupsDir();
      const files = fs.readdirSync(backupsDir).filter((f) => f.endsWith('.db'));
      if (files.length <= maxKeep) return;

      const fileStats = files.map((file) => ({
        file,
        mtime: fs.statSync(path.join(backupsDir, file)).mtime.getTime(),
      }));

      fileStats.sort((a, b) => b.mtime - a.mtime);
      const toDelete = fileStats.slice(maxKeep);

      for (const item of toDelete) {
        const p = path.join(backupsDir, item.file);
        if (fs.existsSync(p)) fs.unlinkSync(p);
        const meta = path.join(backupsDir, item.file.replace(/\.db$/, '.meta.json'));
        if (fs.existsSync(meta)) fs.unlinkSync(meta);
      }
    } catch (e) {
      console.warn('[BackupService] Error durante poda de snapshots:', e);
    }
  }

  /**
   * Exporta todas las tablas a un archivo JSON estructurado (Dump universal)
   */
  public static async exportAllToJson(): Promise<Record<string, any>> {
    const [
      products,
      categories,
      customers,
      creditPayments,
      orders,
      orderItems,
      cashCloses,
      settings,
      users,
      roles,
    ] = await Promise.all([
      prisma.product.findMany({ include: { category: true } }),
      prisma.category.findMany(),
      prisma.customer.findMany({ include: { creditPayments: true } }),
      prisma.creditPayment.findMany(),
      prisma.order.findMany({ include: { items: true } }),
      prisma.orderItem.findMany(),
      prisma.cashClose.findMany(),
      prisma.storeSetting.findMany(),
      prisma.user.findMany({
        select: {
          id: true,
          email: true,
          name: true,
          phone: true,
          role: true,
          active: true,
          createdAt: true,
          updatedAt: true,
        },
      }),
      prisma.role.findMany(),
    ]);

    return {
      metadata: {
        system: 'FerreMax White-Label Core-Business Suite',
        version: 'v1.9',
        exportedAt: new Date().toISOString(),
        totalRecords:
          products.length +
          categories.length +
          customers.length +
          creditPayments.length +
          orders.length +
          cashCloses.length +
          settings.length +
          users.length,
      },
      tables: {
        settings,
        categories,
        products,
        customers,
        creditPayments,
        orders,
        orderItems,
        cashCloses,
        roles,
        users,
      },
    };
  }

  /**
   * Restaura la base de datos a partir de un snapshot local del servidor
   */
  public static async restoreSnapshot(fileName: string): Promise<{ success: boolean; message: string }> {
    const backupsDir = this.getBackupsDir();
    const snapshotPath = path.join(backupsDir, fileName);

    if (!fs.existsSync(snapshotPath)) {
      throw new Error(`El archivo de respaldo "${fileName}" no existe en el servidor.`);
    }

    const currentDbPath = this.getDatabasePath();

    // 1. Respaldo de seguridad previo obligatorio (por si el usuario quiere arrepentirse)
    if (fs.existsSync(currentDbPath)) {
      const preRestoreName = `pre_restore_safety_${Date.now()}.db`;
      fs.copyFileSync(currentDbPath, path.join(backupsDir, preRestoreName));
    }

    // 2. Desconectar Prisma momentáneamente
    await prisma.$disconnect();

    // 3. Reemplazar dev.db con el snapshot
    fs.copyFileSync(snapshotPath, currentDbPath);

    // 4. Reconectar Prisma
    await prisma.$connect();

    return {
      success: true,
      message: `Base de datos restaurada con éxito a partir de "${fileName}". Se generó un respaldo previo de seguridad.`,
    };
  }

  /**
   * Restaura la base de datos a partir de un Buffer cargado por el usuario
   */
  public static async restoreFromBuffer(buffer: Buffer): Promise<{ success: boolean; message: string }> {
    if (!buffer || buffer.length < 100) {
      throw new Error('El archivo proporcionado no es un archivo válido de base de datos SQLite.');
    }

    // Verificar cabecera mágica de SQLite: "SQLite format 3\0"
    const header = buffer.subarray(0, 16).toString('utf8');
    if (!header.startsWith('SQLite format 3')) {
      throw new Error('El archivo subido no tiene la estructura de una base de datos SQLite válida.');
    }

    const backupsDir = this.getBackupsDir();
    const currentDbPath = this.getDatabasePath();

    // Respaldo de seguridad previo
    if (fs.existsSync(currentDbPath)) {
      const preRestoreName = `pre_upload_safety_${Date.now()}.db`;
      fs.copyFileSync(currentDbPath, path.join(backupsDir, preRestoreName));
    }

    // Desconectar y sobrescribir
    await prisma.$disconnect();
    fs.writeFileSync(currentDbPath, buffer);
    await prisma.$connect();

    return {
      success: true,
      message: 'Base de datos restaurada exitosamente desde el archivo cargado.',
    };
  }

  /**
   * Puesta a Cero de Operaciones de Prueba (Reset Seguro con Snapshot previo)
   */
  public static async purgeTestData(options: PurgeTestDataOptions): Promise<PurgeResult> {
    // 1. Validar identidad y permisos del usuario Administrador
    const user = await prisma.user.findUnique({
      where: { id: options.userId },
    });

    if (!user || user.role !== 'ADMIN') {
      throw new Error('Acceso denegado: solo un usuario con rol de Administrador puede autorizar la puesta a cero.');
    }

    // 2. Verificar contraseña del Administrador
    const isPasswordValid = await AuthService.verifyPassword(options.adminPassword, user.passwordHash);
    if (!isPasswordValid) {
      throw new Error('Contraseña de administrador incorrecta. Operación cancelada por seguridad.');
    }

    // 3. Crear Snapshot de Seguridad preventivo obligatorio
    const snapshotNote = options.note || (
      options.scope === 'FULL_FACTORY_RESET'
        ? 'Respaldo preventivo antes de Reinicio de Fábrica Total'
        : 'Respaldo preventivo antes de Puesta a Cero de Operaciones de Prueba'
    );
    const snapshotResult = await this.createSnapshot(snapshotNote);

    // 4. Ejecutar purgado según el alcance (scope)
    let deletedCounts: PurgeResult['deletedCounts'] = {
      orders: 0,
      orderItems: 0,
      creditPayments: 0,
      cashCloses: 0,
    };

    if (options.scope === 'OPERATIONS_ONLY') {
      const ordersCount = await prisma.order.count();
      const orderItemsCount = await prisma.orderItem.count();
      const creditPaymentsCount = await prisma.creditPayment.count();
      const cashClosesCount = await prisma.cashClose.count();
      const customersCount = await prisma.customer.count();

      await prisma.$transaction(async (tx) => {
        // Borrar renglones y órdenes
        await tx.orderItem.deleteMany({});
        await tx.order.deleteMany({});

        // Borrar abonos
        await tx.creditPayment.deleteMany({});

        // Borrar cortes de caja X y Z
        await tx.cashClose.deleteMany({});

        // Resetear deudas de clientes a 0.00
        await tx.customer.updateMany({
          data: {
            currentDebtUsd: 0.0,
          },
        });

        // Si se solicitó borrar clientes de prueba
        if (options.deleteTestCustomers) {
          await tx.customer.deleteMany({});
        }

        // Si se solicitó resetear existencias a 0
        if (options.resetStockToZero) {
          await tx.product.updateMany({
            data: {
              stock: 0,
            },
          });
        }
      });

      // Compactar base de datos SQLite
      try {
        await prisma.$executeRawUnsafe('VACUUM;');
      } catch (e) {
        console.warn('Advertencia al ejecutar VACUUM:', e);
      }

      deletedCounts = {
        orders: ordersCount,
        orderItems: orderItemsCount,
        creditPayments: creditPaymentsCount,
        cashCloses: cashClosesCount,
        customersReset: customersCount,
        customersDeleted: options.deleteTestCustomers ? customersCount : 0,
      };

      return {
        success: true,
        message: 'Puesta a cero de operaciones completada exitosamente. Se preservaron la configuración corporativa, cuentas bancarias y productos.',
        scope: options.scope,
        snapshotName: snapshotResult.fileName,
        deletedCounts,
        timestamp: new Date().toISOString(),
      };
    } else {
      // FULL_FACTORY_RESET
      const ordersCount = await prisma.order.count();
      const orderItemsCount = await prisma.orderItem.count();
      const creditPaymentsCount = await prisma.creditPayment.count();
      const cashClosesCount = await prisma.cashClose.count();
      const productsCount = await prisma.product.count();
      const categoriesCount = await prisma.category.count();
      const customersCount = await prisma.customer.count();

      await prisma.$transaction(async (tx) => {
        await tx.orderItem.deleteMany({});
        await tx.order.deleteMany({});
        await tx.creditPayment.deleteMany({});
        await tx.cashClose.deleteMany({});
        await tx.product.deleteMany({});
        await tx.category.deleteMany({});
        await tx.customer.deleteMany({});
        // Eliminar usuarios excepto el actual administrador
        await tx.user.deleteMany({
          where: {
            id: { not: user.id },
          },
        });
      });

      try {
        await prisma.$executeRawUnsafe('VACUUM;');
      } catch (e) {
        console.warn('Advertencia al ejecutar VACUUM:', e);
      }

      deletedCounts = {
        orders: ordersCount,
        orderItems: orderItemsCount,
        creditPayments: creditPaymentsCount,
        cashCloses: cashClosesCount,
        customersDeleted: customersCount,
        productsDeleted: productsCount,
        categoriesDeleted: categoriesCount,
      };

      return {
        success: true,
        message: 'Reinicio total de fábrica completado. La base de datos ha quedado en su estado inicial virgen.',
        scope: options.scope,
        snapshotName: snapshotResult.fileName,
        deletedCounts,
        timestamp: new Date().toISOString(),
      };
    }
  }
}
