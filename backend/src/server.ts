import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import { config } from './config';
import { authRouter } from './routes/auth.routes';
import { ratesRouter } from './routes/rates.routes';
import { categoriesRouter } from './routes/categories.routes';
import { productsRouter } from './routes/products.routes';
import { storefrontRouter } from './routes/storefront.routes';
import { ordersRouter } from './routes/orders.routes';
import { posRouter } from './routes/pos.routes';
import { settingsRouter } from './routes/settings.routes';
import { usersRouter } from './routes/users.routes';
import { customersRouter } from './routes/customers.routes';
import { aiRouter } from './routes/ai.routes';
import { backupRouter } from './routes/backup.routes';
import { warehousesRouter } from './routes/warehouses.routes';
import { fiscalRouter } from './routes/fiscal.routes';
import { purchasesRouter } from './routes/purchases.routes';
import { biRouter } from './routes/bi.routes';
import { treasuryRouter } from './routes/treasury.routes';
import { payrollRouter } from './routes/payroll.routes';
import { marketingRouter } from './routes/marketing.routes';
import { BcvService } from './services/bcv.service';
import { SettingsService } from './services/settings.service';
import { RolesService } from './services/roles.service';
import { CustomerService } from './services/customer.service';
import { WarehouseService } from './services/warehouse.service';
import { FiscalService } from './services/fiscal.service';
import { PurchasesService } from './services/purchases.service';
import { PayrollService } from './services/payroll.service';
import { MarketingService } from './services/marketing.service';

import path from 'path';

import fs from 'fs';

const findProjectRoot = (): string => {
  if (process.env.PROJECT_ROOT && fs.existsSync(process.env.PROJECT_ROOT)) {
    return path.resolve(process.env.PROJECT_ROOT);
  }
  const candidate1 = path.resolve(__dirname, '../../');
  if (fs.existsSync(path.join(candidate1, 'Prototipo Sistema Integrado empresa.html'))) {
    return candidate1;
  }
  const candidate2 = path.resolve(process.cwd());
  if (fs.existsSync(path.join(candidate2, 'Prototipo Sistema Integrado empresa.html'))) {
    return candidate2;
  }
  const candidate3 = path.resolve(__dirname, '../');
  if (fs.existsSync(path.join(candidate3, 'Prototipo Sistema Integrado empresa.html'))) {
    return candidate3;
  }
  return candidate1;
};

const PROJECT_ROOT = findProjectRoot();
const app = express();

// Middlewares globales y CORS total (incluye soporte para file:// y null origin)
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
    return;
  }
  next();
});
app.use(cors({ origin: '*' }));
app.use(express.json({ limit: '10mb' }));
app.use(express.text({ limit: '10mb', type: ['text/*', 'application/csv'] }));

// Servir la aplicación web estática directamente en http://localhost:4000
app.use(express.static(PROJECT_ROOT));
app.use('/uploads', express.static(path.join(PROJECT_ROOT, 'uploads')));

// Ruta principal abre el sistema completo
app.get('/', (_req: Request, res: Response) => {
  res.sendFile(path.join(PROJECT_ROOT, 'Prototipo Sistema Integrado empresa.html'));
});

// Healthcheck y status
app.get('/health', async (_req: Request, res: Response) => {
  try {
    const rate = await BcvService.getCurrentRate();
    res.json({
      status: 'online',
      service: 'FerreMax Backend API',
      timestamp: new Date(),
      bcvRate: rate.rate,
      bcvSource: rate.source,
    });
  } catch {
    res.json({
      status: 'online',
      service: 'FerreMax Backend API',
      timestamp: new Date(),
    });
  }
});

// Enrutador de la API
app.use('/api/auth', authRouter);
app.use('/api/rates', ratesRouter);
app.use('/api/categories', categoriesRouter);
app.use('/api/products', productsRouter);
app.use('/api/storefront', storefrontRouter);
app.use('/api/orders', ordersRouter);
app.use('/api/pos', posRouter);
app.use('/api/customers', customersRouter);
app.use('/api/warehouses', warehousesRouter);
app.use('/api/fiscal', fiscalRouter);
app.use('/api/purchases', purchasesRouter);
app.use('/api/bi', biRouter);
app.use('/api/treasury', treasuryRouter);
app.use('/api/payroll', payrollRouter);
app.use('/api/marketing', marketingRouter);
app.use('/api/settings', settingsRouter);
app.use('/api/users', usersRouter);
app.use('/api/ai', aiRouter);
app.use('/api/backup', backupRouter);

// Manejo de rutas no encontradas (404)
app.use((_req: Request, res: Response) => {
  res.status(404).json({ error: 'Ruta no encontrada en la API de FerreMax' });
});

// Manejo global de errores (500)
app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  console.error('[API Error]:', err);
  res.status(500).json({
    error: 'Error interno del servidor',
    message: err.message || 'Ocurrió un error inesperado',
  });
});

// Iniciar servidor (escuchando en 0.0.0.0 para acceso local y móvil en red WiFi)
app.listen(config.port, '0.0.0.0', async () => {
  // Asegurar configuraciones predeterminadas, roles, clientes, almacenes, datos fiscales, compras y nómina LOTTT
  await SettingsService.ensureDefaults();
  await RolesService.ensureDefaultRoles();
  await CustomerService.ensureDefaultCustomers();
  await WarehouseService.ensureDefaultWarehouses();
  await FiscalService.ensureSampleData();
  await PurchasesService.ensureSampleData();
  await PayrollService.ensureDefaultEmployees();
  await MarketingService.ensureDefaultBanners();
  const activeBcv = await BcvService.getCurrentRate();

  console.log(`=========================================`);
  console.log(`🚀 FerreMax Backend API está en línea`);
  console.log(`💵 Tasa Oficial BCV: Bs. ${activeBcv.rate} / USD (${activeBcv.source})`);
  console.log(`📡 Puerto: http://localhost:${config.port}`);
  console.log(`🩺 Health: http://localhost:${config.port}/health`);
  console.log(`🛒 Tienda: http://localhost:${config.port}/api/storefront/catalog`);
  console.log(`🏢 Almacenes: http://localhost:${config.port}/api/warehouses`);
  console.log(`🧾 Fiscal SENIAT: http://localhost:${config.port}/api/fiscal/sales-book`);
  console.log(`📦 Compras/Proveedores: http://localhost:${config.port}/api/purchases/suppliers`);
  console.log(`💼 Nómina & LOTTT: http://localhost:${config.port}/api/payroll/summary`);
  console.log(`👥 Personal: http://localhost:${config.port}/api/payroll/employees`);
  console.log(`💳 Clientes: http://localhost:${config.port}/api/customers`);
  console.log(`⚙️  Ajustes: http://localhost:${config.port}/api/settings`);
  console.log(`=========================================`);
});
