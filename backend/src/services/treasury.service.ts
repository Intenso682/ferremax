import { prisma } from '../prisma';
import { BcvService } from './bcv.service';

export interface ParsedBankTx {
  date: Date;
  reference: string;
  description: string;
  amountBs: number;
  type: 'CREDIT' | 'DEBIT';
}

export interface ReconcileResult {
  importId: string;
  importNumber: string;
  bankName: string;
  totalTransactions: number;
  matchedCount: number;
  unmatchedCount: number;
  totalCreditBs: number;
  totalDebitBs: number;
  reconciledAmountBs: number;
  transactions: any[];
}

export class TreasuryService {
  /**
   * Parsea estados de cuenta de bancos venezolanos (Banesco, Mercantil, Provincial, BNC o CSV genérico)
   */
  static parseStatement(content: string, bankType: string = 'GENERIC'): ParsedBankTx[] {
    const lines = content.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
    const results: ParsedBankTx[] = [];

    for (const line of lines) {
      // Ignorar cabeceras típicas
      const lower = line.toLowerCase();
      if (
        lower.includes('fecha') ||
        lower.includes('referencia') ||
        lower.includes('descripcion') ||
        lower.includes('saldo') ||
        lower.startsWith('---')
      ) {
        continue;
      }

      // Separadores: coma, punto y coma, tabulador o pipes
      let parts: string[] = [];
      if (line.includes('\t')) {
        parts = line.split('\t');
      } else if (line.includes(';')) {
        parts = line.split(';');
      } else if (line.includes('|')) {
        parts = line.split('|');
      } else if (line.includes(',')) {
        parts = line.split(',');
      } else {
        // Fallback por espacios múltiples
        parts = line.split(/\s{2,}/);
      }

      parts = parts.map((p) => p.replace(/^["']|["']$/g, '').trim());
      if (parts.length < 3) continue;

      let date = new Date();
      let reference = '';
      let description = '';
      let amountBs = 0;
      let type: 'CREDIT' | 'DEBIT' = 'CREDIT';

      // Parser inteligente según banco o formato estándar
      // Formato típico 1: Fecha | Referencia | Descripción | Monto
      // Formato típico 2: Fecha | Referencia | Descripción | Cargo | Abono
      const dateStr = parts[0];
      const parsedDate = this.parseDate(dateStr);
      if (parsedDate) date = parsedDate;

      reference = parts[1] ? parts[1].replace(/\D/g, '') || parts[1] : `REF-${Date.now()}`;
      description = parts[2] || 'Movimiento bancario';

      if (parts.length >= 5) {
        // Cargo y Abono en columnas separadas
        const debitStr = this.cleanNumber(parts[3]);
        const creditStr = this.cleanNumber(parts[4]);

        if (creditStr > 0) {
          amountBs = creditStr;
          type = 'CREDIT';
        } else if (debitStr > 0) {
          amountBs = debitStr;
          type = 'DEBIT';
        }
      } else {
        // Una sola columna de monto
        const rawMonto = this.cleanNumber(parts[3] || parts[parts.length - 1]);
        amountBs = Math.abs(rawMonto);
        type = rawMonto >= 0 && !lower.includes('debito') && !lower.includes('cargo') ? 'CREDIT' : 'DEBIT';
      }

      if (amountBs > 0) {
        results.push({
          date,
          reference: reference || `REF-${Math.floor(Math.random() * 899999 + 100000)}`,
          description,
          amountBs: Math.round(amountBs * 100) / 100,
          type,
        });
      }
    }

    return results;
  }

  private static parseDate(dateStr: string): Date | null {
    if (!dateStr) return null;
    const parts = dateStr.split(/[\/\-\.]/);
    if (parts.length === 3) {
      let day = parseInt(parts[0], 10);
      let month = parseInt(parts[1], 10) - 1;
      let year = parseInt(parts[2], 10);
      if (year < 100) year += 2000;
      if (parts[0].length === 4) {
        // YYYY-MM-DD
        year = parseInt(parts[0], 10);
        month = parseInt(parts[1], 10) - 1;
        day = parseInt(parts[2], 10);
      }
      const d = new Date(year, month, day);
      if (!isNaN(d.getTime())) return d;
    }
    const direct = new Date(dateStr);
    return isNaN(direct.getTime()) ? null : direct;
  }

  private static cleanNumber(val: string): number {
    if (!val) return 0;
    let s = val.trim().replace(/\$/g, '').replace(/Bs\.?/gi, '').trim();
    // Manejo de formato 1.234,56 o 1234.56
    if (s.includes(',') && s.includes('.')) {
      if (s.indexOf('.') < s.indexOf(',')) {
        // 1.234,56
        s = s.replace(/\./g, '').replace(',', '.');
      } else {
        // 1,234.56
        s = s.replace(/,/g, '');
      }
    } else if (s.includes(',')) {
      s = s.replace(',', '.');
    }
    const n = parseFloat(s);
    return isNaN(n) ? 0 : n;
  }

  /**
   * Ejecuta la conciliación automática cruzando transacciones bancarias con órdenes POS
   */
  static async reconcileStatement(
    bankName: string,
    fileName: string,
    content: string
  ): Promise<ReconcileResult> {
    const parsedTxs = this.parseStatement(content, bankTypeFromBank(bankName));

    const count = await prisma.bankStatementImport.count();
    const importNumber = `CONC-${1001 + count}`;

    let totalCreditBs = 0;
    let totalDebitBs = 0;
    let matchedCount = 0;
    let reconciledAmountBs = 0;

    // Crear registro de importación
    const importRecord = await prisma.bankStatementImport.create({
      data: {
        importNumber,
        bankName,
        fileName,
        totalTransactions: parsedTxs.length,
      },
    });

    const txRecords = [];

    // Traer órdenes del sistema para conciliar
    const orders = await prisma.order.findMany({
      where: {
        status: { in: ['PAID', 'DELIVERED'] },
      },
      select: {
        id: true,
        orderNumber: true,
        totalBs: true,
        paymentReference: true,
        createdAt: true,
        customerName: true,
      },
    });

    // Traer abonos a crédito del sistema para conciliar
    const creditPayments = await prisma.creditPayment.findMany({
      include: { customer: true },
    });

    for (const tx of parsedTxs) {
      if (tx.type === 'CREDIT') totalCreditBs += tx.amountBs;
      else totalDebitBs += tx.amountBs;

      // Buscar coincidencia:
      // 1. Coincidencia por número de referencia bancaria exacto o sufijo numérico en órdenes POS
      let matchedOrder = orders.find((o) => {
        if (!o.paymentReference || !tx.reference) return false;
        const refOrd = o.paymentReference.replace(/\D/g, '').trim();
        const refTx = tx.reference.replace(/\D/g, '').trim();
        return (
          refOrd === refTx ||
          (refTx.length >= 4 && refOrd.endsWith(refTx)) ||
          (refOrd.length >= 4 && refTx.endsWith(refOrd))
        );
      });

      // 2. Coincidencia por referencia en abonos de clientes (Cuentas por Cobrar)
      let matchedPayment = null;
      if (!matchedOrder) {
        matchedPayment = creditPayments.find((p) => {
          if (!p.paymentReference || !tx.reference) return false;
          const refPay = p.paymentReference.replace(/\D/g, '').trim();
          const refTx = tx.reference.replace(/\D/g, '').trim();
          return (
            refPay === refTx ||
            (refTx.length >= 4 && refPay.endsWith(refTx)) ||
            (refPay.length >= 4 && refTx.endsWith(refPay))
          );
        });
      }

      // 3. Coincidencia por monto exacto en Bs (+/- 1 Bs) si no hubo match por ref
      if (!matchedOrder && !matchedPayment && tx.type === 'CREDIT') {
        matchedOrder = orders.find((o) => {
          return Math.abs(o.totalBs - tx.amountBs) < 1.0;
        });
        if (!matchedOrder) {
          matchedPayment = creditPayments.find((p) => {
            return Math.abs((p.amountBs || 0) - tx.amountBs) < 1.0;
          });
        }
      }

      let status = 'UNMATCHED';
      let matchedOrderId: string | null = null;
      let matchedOrderNumber: string | null = null;
      let notes = 'Transacción bancaria sin registrar en ventas';

      if (matchedOrder) {
        status = 'RECONCILED';
        matchedOrderId = matchedOrder.id;
        matchedOrderNumber = matchedOrder.orderNumber;
        notes = `Conciliado con Pedido POS: ${matchedOrder.orderNumber} (${matchedOrder.customerName})`;
        matchedCount++;
        reconciledAmountBs += tx.amountBs;
      } else if (matchedPayment) {
        status = 'RECONCILED';
        matchedOrderId = matchedPayment.id;
        matchedOrderNumber = matchedPayment.receiptNumber;
        notes = `Conciliado con Abono: ${matchedPayment.receiptNumber} (${matchedPayment.customer?.name || 'Cliente'})`;
        matchedCount++;
        reconciledAmountBs += tx.amountBs;
      }

      const rec = await prisma.bankTransaction.create({
        data: {
          importId: importRecord.id,
          date: tx.date,
          reference: tx.reference,
          description: tx.description,
          amountBs: tx.amountBs,
          type: tx.type,
          status,
          matchedOrderId,
          matchedOrderNumber,
          notes,
        },
      });

      txRecords.push(rec);
    }

    // Actualizar import record con totales
    await prisma.bankStatementImport.update({
      where: { id: importRecord.id },
      data: {
        matchedCount,
        unmatchedCount: parsedTxs.length - matchedCount,
        totalCreditBs: Math.round(totalCreditBs * 100) / 100,
        totalDebitBs: Math.round(totalDebitBs * 100) / 100,
        reconciledAmountBs: Math.round(reconciledAmountBs * 100) / 100,
        status: matchedCount === parsedTxs.length ? 'COMPLETED' : 'PARTIAL',
      },
    });

    return {
      importId: importRecord.id,
      importNumber,
      bankName,
      totalTransactions: parsedTxs.length,
      matchedCount,
      unmatchedCount: parsedTxs.length - matchedCount,
      totalCreditBs: Math.round(totalCreditBs * 100) / 100,
      totalDebitBs: Math.round(totalDebitBs * 100) / 100,
      reconciledAmountBs: Math.round(reconciledAmountBs * 100) / 100,
      transactions: txRecords,
    };
  }

  /**
   * Obtiene la cartera de constructores y clientes a crédito con recordatorios automáticos de WhatsApp
   */
  static async getContractorsDebt() {
    const rateData = await BcvService.getCurrentRate();
    const bcvRate = rateData.rate;

    const customers = await prisma.customer.findMany({
      where: {
        currentDebtUsd: { gt: 0 },
      },
      include: {
        orders: {
          where: {
            paymentMethod: 'CREDITO',
            status: { not: 'CANCELLED' },
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    return customers.map((c) => {
      const debtUsd = c.currentDebtUsd || 0;
      const debtBs = Math.round(debtUsd * bcvRate * 100) / 100;
      const limitUsd = c.creditLimitUsd || 0;
      const availableUsd = Math.max(0, limitUsd - debtUsd);
      const fullDoc = `${c.docType}-${c.docNumber}`;

      // Limpiar teléfono para WhatsApp (formato internacional VE +58)
      let rawPhone = (c.phone || '').replace(/\D/g, '');
      if (rawPhone.startsWith('0')) rawPhone = '58' + rawPhone.slice(1);
      if (!rawPhone.startsWith('58') && rawPhone.length === 10) rawPhone = '58' + rawPhone;

      const folios = c.orders.map((o) => o.orderNumber).slice(0, 3).join(', ');

      const message = `Estimado/a *${c.name}*, un cordial saludo desde *FerreMax* 🛠️.\n\nLe contactamos para informarle que presenta un saldo pendiente por compras/materiales de *$ ${debtUsd.toFixed(2)}* (equivalente a *Bs. ${debtBs.toLocaleString('es-VE', { minimumFractionDigits: 2 })}* calculados a la tasa oficial BCV: Bs. ${bcvRate.toFixed(2)}).\n\n📄 Despachos asociados: ${folios || 'Facturación corriente'}.\n\nPara su comodidad puede realizar su pago por Pago Móvil o Transferencia a nuestras cuentas jurídicas autorizadas.\n\nAgradecemos su pronta confirmación enviándonos el comprobante por este mismo medio. ¡Feliz día!`;

      const whatsappUrl = rawPhone
        ? `https://wa.me/${rawPhone}?text=${encodeURIComponent(message)}`
        : null;

      return {
        id: c.id,
        name: c.name,
        doc: fullDoc,
        phone: c.phone,
        email: c.email,
        creditLimitUsd: limitUsd,
        currentDebtUsd: Math.round(debtUsd * 100) / 100,
        currentDebtBs: debtBs,
        availableCreditUsd: Math.round(availableUsd * 100) / 100,
        creditDays: c.creditDays || 15,
        overdueCount: c.orders.length,
        pendingFolios: folios,
        whatsappUrl,
        messagePreview: message,
      };
    });
  }

  /**
   * Retorna el historial de conciliaciones
   */
  static async getImportsHistory() {
    return prisma.bankStatementImport.findMany({
      include: {
        transactions: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });
  }
}

function bankTypeFromBank(name: string): string {
  const n = (name || '').toLowerCase();
  if (n.includes('banesco')) return 'BANESCO';
  if (n.includes('mercantil')) return 'MERCANTIL';
  if (n.includes('provincial') || n.includes('bbva')) return 'PROVINCIAL';
  if (n.includes('bnc')) return 'BNC';
  return 'GENERIC';
}
