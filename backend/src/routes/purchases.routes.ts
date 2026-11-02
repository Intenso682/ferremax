import { Router, Request, Response } from 'express';
import { PurchasesService } from '../services/purchases.service';
import { prisma } from '../prisma';

export const purchasesRouter = Router();

// Listar proveedores
purchasesRouter.get('/suppliers', async (req: Request, res: Response): Promise<void> => {
  try {
    const suppliers = await PurchasesService.getSuppliers();
    res.json(suppliers);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Error al listar proveedores' });
  }
});

// Crear proveedor
purchasesRouter.post('/suppliers', async (req: Request, res: Response): Promise<void> => {
  try {
    const { rif, name, email, phone, address, contactPerson, creditDays, bankAccounts } = req.body;
    if (!rif || !name) {
      res.status(400).json({ error: 'El RIF y la Razón Social son obligatorios' });
      return;
    }

    const supplier = await PurchasesService.createSupplier({
      rif,
      name,
      email,
      phone,
      address,
      contactPerson,
      creditDays: creditDays !== undefined ? Number(creditDays) : undefined,
      bankAccounts,
    });
    res.status(201).json(supplier);
  } catch (error: any) {
    res.status(400).json({ error: error.message || 'Error al crear proveedor' });
  }
});

// Listar facturas de compra
purchasesRouter.get('/bills', async (req: Request, res: Response): Promise<void> => {
  try {
    const bills = await prisma.purchaseBill.findMany({
      include: {
        items: true,
        payments: true,
      },
      orderBy: { createdAt: 'desc' },
    });
    res.json(bills);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Error al listar facturas de compra' });
  }
});

// Registrar factura de compra con recepción de mercancía y retenciones
purchasesRouter.post('/bills', async (req: Request, res: Response): Promise<void> => {
  try {
    const { supplierId, billNumber, items } = req.body;
    if (!supplierId || !billNumber || !Array.isArray(items) || items.length === 0) {
      res.status(400).json({ error: 'Faltan campos obligatorios: supplierId, billNumber, o items' });
      return;
    }

    const bill = await PurchasesService.createPurchaseBill(req.body);
    res.status(201).json({
      message: 'Factura de compra registrada y stock ingresado al almacén',
      bill,
    });
  } catch (error: any) {
    res.status(400).json({ error: error.message || 'Error al registrar compra' });
  }
});

// Registrar abono o pago a proveedor
purchasesRouter.post('/payments', async (req: Request, res: Response): Promise<void> => {
  try {
    const { supplierId, amountUsd, paymentMethod } = req.body;
    if (!supplierId || !amountUsd || !paymentMethod) {
      res.status(400).json({ error: 'Faltan campos obligatorios: supplierId, amountUsd, o paymentMethod' });
      return;
    }

    const payment = await PurchasesService.registerPayment({
      supplierId,
      billId: req.body.billId,
      amountUsd: Number(amountUsd),
      paymentMethod,
      paymentReference: req.body.paymentReference,
      bankName: req.body.bankName,
      notes: req.body.notes,
    });

    res.status(201).json({
      message: 'Pago a proveedor procesado con éxito',
      payment,
    });
  } catch (error: any) {
    res.status(400).json({ error: error.message || 'Error al procesar pago' });
  }
});

// Descargar archivo TXT oficial para el portal del SENIAT (Retenciones de IVA a proveedores)
purchasesRouter.get('/seniat-iva-txt', async (req: Request, res: Response): Promise<void> => {
  try {
    const txtContent = await PurchasesService.generateSeniatIvaTxt();
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="Retenciones_IVA_SENIAT_${new Date().toISOString().slice(0, 7)}.txt"`);
    res.send(txtContent);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Error al generar TXT para SENIAT' });
  }
});
