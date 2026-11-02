import { Router, Request, Response } from 'express';
import { CustomerService } from '../services/customer.service';

export const customersRouter = Router();

/**
 * Resumen global de Cuentas por Cobrar (KPIs)
 */
customersRouter.get('/receivables/summary', async (_req: Request, res: Response) => {
  try {
    const summary = await CustomerService.getReceivablesSummary();
    res.json(summary);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Error al obtener resumen de cuentas por cobrar' });
  }
});

/**
 * Historial de pagos y abonos
 */
customersRouter.get('/payments/history', async (req: Request, res: Response) => {
  try {
    const search = req.query.search as string;
    const customerId = req.query.customerId as string;
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 50;

    const payments = await CustomerService.getPaymentsHistory({ search, customerId, limit });
    res.json(payments);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Error al obtener historial de abonos' });
  }
});

/**
 * Lista de clientes con búsqueda y filtro de deuda
 */
customersRouter.get('/', async (req: Request, res: Response) => {
  try {
    const search = req.query.search as string;
    const withDebtOnly = req.query.withDebtOnly === 'true';
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 100;

    const customers = await CustomerService.getAll({ search, withDebtOnly, limit });
    res.json(customers);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Error al obtener lista de clientes' });
  }
});

/**
 * Detalle de un cliente
 */
customersRouter.get('/:id', async (req: Request, res: Response) => {
  try {
    const customer = await CustomerService.getById(String(req.params.id));
    if (!customer) {
      res.status(404).json({ error: 'Cliente no encontrado' });
      return;
    }
    res.json(customer);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Error al consultar cliente' });
  }
});

/**
 * Estado de cuenta de un cliente (cargos y abonos)
 */
customersRouter.get('/:id/statement', async (req: Request, res: Response) => {
  try {
    const statement = await CustomerService.getAccountStatement(String(req.params.id));
    res.json(statement);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Error al generar estado de cuenta' });
  }
});

/**
 * Crear o actualizar cliente
 */
customersRouter.post('/', async (req: Request, res: Response) => {
  try {
    const { docType, docNumber, name, email, phone, address, notes, creditLimitUsd, creditDays, creditStatus } = req.body;

    if (!docNumber || !name) {
      res.status(400).json({ error: 'Número de documento y nombre son obligatorios' });
      return;
    }

    const customer = await CustomerService.createOrUpdate({
      docType,
      docNumber,
      name,
      email,
      phone,
      address,
      notes,
      creditLimitUsd,
      creditDays,
      creditStatus,
    });

    res.status(201).json(customer);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Error al registrar cliente' });
  }
});

/**
 * Actualizar límite de crédito o estado de crédito
 */
customersRouter.put('/:id/credit', async (req: Request, res: Response) => {
  try {
    const { creditLimitUsd, creditDays, creditStatus } = req.body;

    const existing = await CustomerService.getById(String(req.params.id));
    if (!existing) {
      res.status(404).json({ error: 'Cliente no encontrado' });
      return;
    }

    const updated = await CustomerService.createOrUpdate({
      id: existing.id,
      docType: existing.docType,
      docNumber: existing.docNumber,
      name: existing.name,
      email: existing.email || undefined,
      phone: existing.phone || undefined,
      address: existing.address || undefined,
      notes: existing.notes || undefined,
      creditLimitUsd: creditLimitUsd !== undefined ? Number(creditLimitUsd) : existing.creditLimitUsd,
      creditDays: creditDays !== undefined ? Number(creditDays) : existing.creditDays,
      creditStatus: creditStatus || existing.creditStatus,
    });

    res.json(updated);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Error al actualizar crédito' });
  }
});

/**
 * Registrar un Abono (pago a cuenta)
 */
customersRouter.post('/:id/abono', async (req: Request, res: Response) => {
  try {
    const { amountUsd, amountBs, bcvRate, paymentMethod, paymentReference, cashierName, notes } = req.body;

    if (!amountUsd || Number(amountUsd) <= 0) {
      res.status(400).json({ error: 'El monto del abono en USD debe ser mayor a 0' });
      return;
    }

    if (!paymentMethod) {
      res.status(400).json({ error: 'Debe especificar el método de pago del abono' });
      return;
    }

    const result = await CustomerService.registerAbono({
      customerId: String(req.params.id),
      amountUsd: Number(amountUsd),
      amountBs: amountBs ? Number(amountBs) : undefined,
      bcvRate: bcvRate ? Number(bcvRate) : undefined,
      paymentMethod,
      paymentReference,
      cashierName,
      notes,
    });

    res.status(201).json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Error al registrar abono' });
  }
});
