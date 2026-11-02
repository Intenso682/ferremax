import { Router, Request, Response } from 'express';
import { PayrollService } from '../services/payroll.service';

const router = Router();

// =========================================================================
// RUTAS DE EMPLEADOS Y PERSONAL
// =========================================================================

// Listar empleados
router.get('/employees', async (req: Request, res: Response) => {
  try {
    const includeInactive = req.query.includeInactive === 'true';
    const employees = await PayrollService.getEmployees(includeInactive);
    res.json(employees);
  } catch (error: any) {
    res.status(500).json({ error: 'Error al obtener empleados', message: error.message });
  }
});

// Obtener empleado por ID
router.get('/employees/:id', async (req: Request, res: Response) => {
  try {
    const emp = await PayrollService.getEmployeeById(req.params.id as string);
    if (!emp) return res.status(404).json({ error: 'Empleado no encontrado' });
    res.json(emp);
  } catch (error: any) {
    res.status(500).json({ error: 'Error al obtener empleado', message: error.message });
  }
});

// Crear nuevo empleado
router.post('/employees', async (req: Request, res: Response) => {
  try {
    const emp = await PayrollService.createEmployee(req.body);
    res.status(201).json(emp);
  } catch (error: any) {
    res.status(400).json({ error: 'Error al registrar empleado', message: error.message });
  }
});

// Actualizar empleado
router.put('/employees/:id', async (req: Request, res: Response) => {
  try {
    const emp = await PayrollService.updateEmployee(req.params.id as string, req.body);
    res.json(emp);
  } catch (error: any) {
    res.status(400).json({ error: 'Error al actualizar empleado', message: error.message });
  }
});

// =========================================================================
// RUTAS DE PASIVOS LABORALES Y LIQUIDACIONES (LOTTT ART. 142)
// =========================================================================

// Calcular auditoría de pasivos laborales (Garantía Trimestral vs Retroactivo)
router.post('/calculate-passives', async (req: Request, res: Response) => {
  try {
    const audit = await PayrollService.calculateLaborPassives(req.body);
    res.status(201).json(audit);
  } catch (error: any) {
    res.status(400).json({ error: 'Error al calcular pasivos laborales LOTTT', message: error.message });
  }
});

// Listar auditorías de pasivos
router.get('/passive-audits', async (req: Request, res: Response) => {
  try {
    const employeeId = req.query.employeeId as string | undefined;
    const audits = await PayrollService.getLaborPassiveAudits(employeeId);
    res.json(audits);
  } catch (error: any) {
    res.status(500).json({ error: 'Error al obtener auditorías de pasivos', message: error.message });
  }
});

// =========================================================================
// RUTAS DE NÓMINA QUINCENAL Y RECIBOS
// =========================================================================

// Generar período quincenal de nómina con cruce de ventas POS
router.post('/generate-period', async (req: Request, res: Response) => {
  try {
    const result = await PayrollService.generatePayrollPeriod(req.body);
    res.status(201).json(result);
  } catch (error: any) {
    res.status(400).json({ error: 'Error al generar período de nómina', message: error.message });
  }
});

// Listar períodos de nómina
router.get('/periods', async (_req: Request, res: Response) => {
  try {
    const periods = await PayrollService.getPayrollPeriods();
    res.json(periods);
  } catch (error: any) {
    res.status(500).json({ error: 'Error al obtener períodos de nómina', message: error.message });
  }
});

// Marcar período como pagado
router.post('/periods/:id/pay', async (req: Request, res: Response) => {
  try {
    const { reference, paymentMethod } = req.body;
    const period = await PayrollService.markPeriodPaid(req.params.id as string, reference || `TRANS-${Date.now()}`, paymentMethod);
    res.json(period);
  } catch (error: any) {
    res.status(400).json({ error: 'Error al procesar pago de nómina', message: error.message });
  }
});

// =========================================================================
// RUTAS DE EXPORTACIÓN TXT PARA ENTES PATRONALES (FAOV, INCES, IVSS)
// =========================================================================

// Exportar TXT Banavih FAOV
router.get('/faov-txt', async (req: Request, res: Response) => {
  try {
    const periodId = req.query.periodId as string | undefined;
    const result = await PayrollService.generateFaovTxt(periodId);
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${result.fileName}"`);
    res.send(result.content);
  } catch (error: any) {
    res.status(400).json({ error: 'Error al generar TXT de FAOV', message: error.message });
  }
});

// Exportar TXT INCES
router.get('/inces-txt', async (req: Request, res: Response) => {
  try {
    const periodId = req.query.periodId as string | undefined;
    const result = await PayrollService.generateIncesTxt(periodId);
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${result.fileName}"`);
    res.send(result.content);
  } catch (error: any) {
    res.status(400).json({ error: 'Error al generar TXT de INCES', message: error.message });
  }
});

// Exportar TXT IVSS TIUNA / RPE
router.get('/ivss-txt', async (_req: Request, res: Response) => {
  try {
    const result = await PayrollService.generateIvssTiunaTxt();
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${result.fileName}"`);
    res.send(result.content);
  } catch (error: any) {
    res.status(400).json({ error: 'Error al generar TXT de IVSS', message: error.message });
  }
});

// Resumen del módulo de nómina para Dashboard
router.get('/summary', async (_req: Request, res: Response) => {
  try {
    const summary = await PayrollService.getSummaryStats();
    res.json(summary);
  } catch (error: any) {
    res.status(500).json({ error: 'Error al obtener resumen de nómina', message: error.message });
  }
});

export const payrollRouter = router;
