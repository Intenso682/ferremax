import { prisma } from '../prisma';
import { BcvService } from './bcv.service';

export interface CreateEmployeeDTO {
  docType?: string;
  docNumber: string;
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  position: string;
  department: string;
  hireDate?: string | Date;
  terminationDate?: string | Date | null;
  contractType?: string;
  baseSalaryUsd: number;
  cestaTicketUsd?: number;
  commissionPercent?: number;
  bankName?: string;
  accountNumber?: string;
  pagoMovilPhone?: string;
}

export interface CalculatePassiveParams {
  employeeId: string;
  asOfDate?: string | Date;
  profitSharingDays?: number; // Días de utilidades anuales (mínimo 30 según LOTTT Art. 131)
  vacationBonusDays?: number; // Días de bono vacacional base (mínimo 15 según LOTTT Art. 192)
  notes?: string;
}

export interface GeneratePayrollParams {
  title: string;
  periodNumber?: string;
  periodType?: 'QUINCENAL' | 'MENSUAL' | 'ESPECIAL';
  startDate: string | Date;
  endDate: string | Date;
  notes?: string;
}

export class PayrollService {
  /**
   * Garantiza la existencia de empleados de prueba con cargos ferreteros
   */
  static async ensureDefaultEmployees() {
    const count = await prisma.employee.count();
    if (count > 0) return;

    const defaults: CreateEmployeeDTO[] = [
      {
        docType: 'V',
        docNumber: 'V-18765432',
        firstName: 'Carlos',
        lastName: 'Pérez',
        email: 'carlos.caja@ferremax.com',
        phone: '0414-1234567',
        position: 'Cajero Principal Mostrador',
        department: 'Ventas y Caja',
        hireDate: new Date('2023-01-15'),
        baseSalaryUsd: 250.0,
        cestaTicketUsd: 40.0,
        commissionPercent: 1.5,
        bankName: 'Banesco',
        accountNumber: '01340123456789012345',
        pagoMovilPhone: '04141234567',
      },
      {
        docType: 'V',
        docNumber: 'V-20123456',
        firstName: 'Marianny',
        lastName: 'Rodríguez',
        email: 'marianny.ventas@ferremax.com',
        phone: '0412-9876543',
        position: 'Asesora de Ventas Técnicas',
        department: 'Ventas',
        hireDate: new Date('2022-06-01'),
        baseSalaryUsd: 220.0,
        cestaTicketUsd: 40.0,
        commissionPercent: 2.0,
        bankName: 'Mercantil',
        accountNumber: '01050123456789012345',
        pagoMovilPhone: '04129876543',
      },
      {
        docType: 'V',
        docNumber: 'V-15890123',
        firstName: 'José Gregorio',
        lastName: 'Hernández',
        email: 'jose.almacen@ferremax.com',
        phone: '0424-5554321',
        position: 'Jefe de Almacén y Control de Mermas',
        department: 'Almacén Central',
        hireDate: new Date('2021-03-10'),
        baseSalaryUsd: 300.0,
        cestaTicketUsd: 40.0,
        commissionPercent: 0.0,
        bankName: 'Banco Provincial',
        accountNumber: '01080123456789012345',
        pagoMovilPhone: '04245554321',
      },
      {
        docType: 'V',
        docNumber: 'V-14567890',
        firstName: 'Elena',
        lastName: 'Castillo',
        email: 'elena.contabilidad@ferremax.com',
        phone: '0416-7778899',
        position: 'Gerente de Administración y Tributos',
        department: 'Administración',
        hireDate: new Date('2020-02-01'),
        baseSalaryUsd: 450.0,
        cestaTicketUsd: 40.0,
        commissionPercent: 0.0,
        bankName: 'BNC',
        accountNumber: '01910123456789012345',
        pagoMovilPhone: '04167778899',
      },
    ];

    for (const emp of defaults) {
      await prisma.employee.create({
        data: {
          docType: emp.docType || 'V',
          docNumber: emp.docNumber,
          firstName: emp.firstName,
          lastName: emp.lastName,
          email: emp.email,
          phone: emp.phone,
          position: emp.position,
          department: emp.department,
          hireDate: emp.hireDate ? new Date(emp.hireDate) : new Date(),
          baseSalaryUsd: emp.baseSalaryUsd,
          cestaTicketUsd: emp.cestaTicketUsd ?? 40.0,
          commissionPercent: emp.commissionPercent ?? 0.0,
          bankName: emp.bankName,
          accountNumber: emp.accountNumber,
          pagoMovilPhone: emp.pagoMovilPhone,
          active: true,
        },
      });
    }
  }

  /**
   * Obtiene lista de empleados activos
   */
  static async getEmployees(includeInactive = false) {
    await this.ensureDefaultEmployees();
    return prisma.employee.findMany({
      where: includeInactive ? {} : { active: true },
      orderBy: { firstName: 'asc' },
    });
  }

  /**
   * Obtiene un empleado por ID
   */
  static async getEmployeeById(id: string) {
    return prisma.employee.findUnique({
      where: { id },
      include: {
        receipts: { orderBy: { createdAt: 'desc' }, take: 5 },
        passiveAudits: { orderBy: { calculationDate: 'desc' }, take: 5 },
      },
    });
  }

  /**
   * Crea un nuevo empleado
   */
  static async createEmployee(dto: CreateEmployeeDTO) {
    return prisma.employee.create({
      data: {
        docType: dto.docType || 'V',
        docNumber: dto.docNumber,
        firstName: dto.firstName,
        lastName: dto.lastName,
        email: dto.email,
        phone: dto.phone,
        position: dto.position,
        department: dto.department,
        hireDate: dto.hireDate ? new Date(dto.hireDate) : new Date(),
        terminationDate: dto.terminationDate ? new Date(dto.terminationDate) : null,
        contractType: dto.contractType || 'INDEFINIDO',
        baseSalaryUsd: Number(dto.baseSalaryUsd),
        cestaTicketUsd: dto.cestaTicketUsd !== undefined ? Number(dto.cestaTicketUsd) : 40.0,
        commissionPercent: dto.commissionPercent !== undefined ? Number(dto.commissionPercent) : 0.0,
        bankName: dto.bankName,
        accountNumber: dto.accountNumber,
        pagoMovilPhone: dto.pagoMovilPhone,
        active: true,
      },
    });
  }

  /**
   * Actualiza los datos de un empleado
   */
  static async updateEmployee(id: string, dto: Partial<CreateEmployeeDTO> & { active?: boolean }) {
    return prisma.employee.update({
      where: { id },
      data: {
        ...(dto.firstName && { firstName: dto.firstName }),
        ...(dto.lastName && { lastName: dto.lastName }),
        ...(dto.docNumber && { docNumber: dto.docNumber }),
        ...(dto.docType && { docType: dto.docType }),
        ...(dto.email !== undefined && { email: dto.email }),
        ...(dto.phone !== undefined && { phone: dto.phone }),
        ...(dto.position && { position: dto.position }),
        ...(dto.department && { department: dto.department }),
        ...(dto.hireDate && { hireDate: new Date(dto.hireDate) }),
        ...(dto.terminationDate !== undefined && {
          terminationDate: dto.terminationDate ? new Date(dto.terminationDate) : null,
        }),
        ...(dto.baseSalaryUsd !== undefined && { baseSalaryUsd: Number(dto.baseSalaryUsd) }),
        ...(dto.cestaTicketUsd !== undefined && { cestaTicketUsd: Number(dto.cestaTicketUsd) }),
        ...(dto.commissionPercent !== undefined && { commissionPercent: Number(dto.commissionPercent) }),
        ...(dto.bankName !== undefined && { bankName: dto.bankName }),
        ...(dto.accountNumber !== undefined && { accountNumber: dto.accountNumber }),
        ...(dto.pagoMovilPhone !== undefined && { pagoMovilPhone: dto.pagoMovilPhone }),
        ...(dto.active !== undefined && { active: dto.active }),
      },
    });
  }

  // =========================================================================
  // MOTOR DE CÁLCULO DE PASIVOS LABORALES Y PRESTACIONES BAJO LA LOTTT
  // =========================================================================

  /**
   * Calcula el Salario Integral y el doble régimen de Prestaciones Sociales (LOTTT Art. 142)
   * Comparando Garantía Trimestral vs. Cálculo Retroactivo al Cese
   */
  static async calculateLaborPassives(params: CalculatePassiveParams) {
    const employee = await prisma.employee.findUnique({
      where: { id: params.employeeId },
    });
    if (!employee) throw new Error('Empleado no encontrado');

    const rateObj = await BcvService.getCurrentRate();
    const bcvRate = rateObj.rate;

    const calcDate = params.asOfDate ? new Date(params.asOfDate) : new Date();
    const hireDate = new Date(employee.hireDate);

    // 1. Antigüedad en días, meses y años
    const diffTime = Math.max(0, calcDate.getTime() - hireDate.getTime());
    const totalDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    const totalMonths = Math.floor(totalDays / 30.4375);
    const yearsOfService = Number((totalDays / 365.25).toFixed(2));
    const fullYears = Math.floor(totalDays / 365.25);
    const remainingDaysAfterYears = totalDays - fullYears * 365;

    // 2. Salario Base Diario
    const lastBaseSalaryUsd = employee.baseSalaryUsd;
    const lastBaseSalaryBs = Number((lastBaseSalaryUsd * bcvRate).toFixed(2));
    const dailyBaseUsd = lastBaseSalaryUsd / 30;
    const dailyBaseBs = lastBaseSalaryBs / 30;

    // 3. Días de Utilidades y Bono Vacacional (LOTTT Arts. 131 y 192)
    // Utilidades legales: mínimo 30 días, hasta 120 días
    const profitSharingDays = params.profitSharingDays || 30;
    // Bono vacacional: 15 días base + 1 día por año de servicio (tope 30 días)
    const vacationBonusDays = Math.min(30, (params.vacationBonusDays || 15) + Math.max(0, fullYears - 1));

    // 4. Alícuotas para Salario Integral (LOTTT Art. 122)
    // Alícuota Diaria Utilidades = (Días Utilidades / 360) * Salario Diario Base
    const alicuotaUtilidadesUsd = (profitSharingDays / 360) * dailyBaseUsd;
    const alicuotaUtilidadesBs = (profitSharingDays / 360) * dailyBaseBs;

    // Alícuota Diaria Bono Vacacional = (Días Bono Vac / 360) * Salario Diario Base
    const alicuotaVacacionalUsd = (vacationBonusDays / 360) * dailyBaseUsd;
    const alicuotaVacacionalBs = (vacationBonusDays / 360) * dailyBaseBs;

    // Salario Integral Diario
    const integralSalaryDailyUsd = Number(
      (dailyBaseUsd + alicuotaUtilidadesUsd + alicuotaVacacionalUsd).toFixed(4)
    );
    const integralSalaryDailyBs = Number(
      (dailyBaseBs + alicuotaUtilidadesBs + alicuotaVacacionalBs).toFixed(4)
    );

    // 5. RÉGIMEN A: Garantía de Prestaciones (Art. 142 lit. a y b)
    // - 15 días de salario integral por cada trimestre (fracción > 3 meses da derecho a 15 días)
    const trimestres = Math.floor(totalMonths / 3);
    const guaranteeBaseDays = trimestres * 15;
    // - Días adicionales (Art. 142 lit. b): 2 días por año a partir del 2do año, acumulables hasta 30 días
    const additionalDays = fullYears >= 2 ? Math.min(30, (fullYears - 1) * 2) : 0;
    const guaranteeDays = guaranteeBaseDays + additionalDays;
    const guaranteeAmountUsd = Number((guaranteeDays * integralSalaryDailyUsd).toFixed(2));
    const guaranteeAmountBs = Number((guaranteeAmountUsd * bcvRate).toFixed(2));

    // 6. RÉGIMEN B: Cálculo Retroactivo al Término (Art. 142 lit. c)
    // - 30 días por cada año de servicio o fracción superior a 6 meses
    const hasMoreThanSixMonthsFraction = remainingDaysAfterYears >= 180 ? 1 : 0;
    const retroactiveYearsEffective = fullYears + hasMoreThanSixMonthsFraction;
    const retroactiveDays = retroactiveYearsEffective * 30;
    const retroactiveAmountUsd = Number((retroactiveDays * integralSalaryDailyUsd).toFixed(2));
    const retroactiveAmountBs = Number((retroactiveAmountUsd * bcvRate).toFixed(2));

    // 7. Método Legal Ganador (Art. 142 lit. d: Lo más favorable al trabajador)
    const isRetroactiveHigher = retroactiveAmountUsd >= guaranteeAmountUsd;
    const chosenMethod = isRetroactiveHigher ? 'RETROACTIVO' : 'GARANTIA';
    const settlementBaseUsd = Math.max(guaranteeAmountUsd, retroactiveAmountUsd);
    const settlementBaseBs = Number((settlementBaseUsd * bcvRate).toFixed(2));

    // 8. Pasivos Adicionales Fraccionados (Vacaciones fraccionadas y Utilidades pendientes)
    // Fracción del año corriente trabajada
    const fractionOfYear = Math.min(1.0, (remainingDaysAfterYears || 30) / 365);
    const vacationDaysDue = Math.round(vacationBonusDays * fractionOfYear);
    const vacationAmountUsd = Number((vacationDaysDue * dailyBaseUsd).toFixed(2));
    const profitSharingDaysDue = Math.round(profitSharingDays * fractionOfYear);
    const profitSharingAmountUsd = Number((profitSharingDaysDue * dailyBaseUsd).toFixed(2));

    // Total Pasivo Laboral Acumulado
    const totalPassivesUsd = Number(
      (settlementBaseUsd + vacationAmountUsd + profitSharingAmountUsd).toFixed(2)
    );
    const totalPassivesBs = Number((totalPassivesUsd * bcvRate).toFixed(2));

    // Generar correlativo de auditoría PAS-xxxx
    const auditCount = await prisma.laborPassiveAudit.count();
    const auditNumber = `PAS-${1001 + auditCount}`;

    const audit = await prisma.laborPassiveAudit.create({
      data: {
        auditNumber,
        employeeId: employee.id,
        calculationDate: calcDate,
        yearsOfService,
        monthsOfService: totalMonths,
        lastBaseSalaryUsd,
        lastBaseSalaryBs,
        integralSalaryDailyUsd,
        integralSalaryDailyBs,
        guaranteeDays,
        guaranteeAmountUsd,
        guaranteeAmountBs,
        retroactiveDays,
        retroactiveAmountUsd,
        retroactiveAmountBs,
        chosenMethod,
        settlementBaseUsd,
        settlementBaseBs,
        vacationDaysDue,
        vacationAmountUsd,
        profitSharingDaysDue,
        profitSharingAmountUsd,
        totalPassivesUsd,
        totalPassivesBs,
        bcvRate,
        notes: params.notes || `Auditoría LOTTT Art. 142 (${chosenMethod === 'RETROACTIVO' ? 'Retroactivo gana' : 'Garantía trimestral gana'})`,
      },
      include: { employee: true },
    });

    return audit;
  }

  /**
   * Obtiene las auditorías de pasivos laborales
   */
  static async getLaborPassiveAudits(employeeId?: string) {
    return prisma.laborPassiveAudit.findMany({
      where: employeeId ? { employeeId } : {},
      include: { employee: true },
      orderBy: { calculationDate: 'desc' },
      take: 50,
    });
  }

  // =========================================================================
  // GENERACIÓN DE NÓMINA QUINCENAL CON CRUCE DE VENTAS POS Y DEDUCCIONES
  // =========================================================================

  /**
   * Genera el período quincenal de nómina para todos los empleados activos,
   * cruzando comisiones del POS y calculando deducciones de ley venezolana (IVSS, FAOV, INCES).
   */
  static async generatePayrollPeriod(params: GeneratePayrollParams) {
    const rateObj = await BcvService.getCurrentRate();
    const bcvRate = rateObj.rate;

    const startDate = new Date(params.startDate);
    const endDate = new Date(params.endDate);

    // Calcular ventas totales del POS en el rango para liquidación de comisiones
    const posSales = await prisma.order.findMany({
      where: {
        createdAt: { gte: startDate, lte: endDate },
        status: 'PAID',
      },
      select: { totalUsd: true, totalBs: true },
    });

    const totalPeriodSalesUsd = posSales.reduce((acc, o) => acc + (o.totalUsd || 0), 0);
    const totalPeriodSalesBs = Number((totalPeriodSalesUsd * bcvRate).toFixed(2));

    // Correlativo del período
    const periodCount = await prisma.payrollPeriod.count();
    const dateTag = `${startDate.getFullYear()}-${String(startDate.getMonth() + 1).padStart(2, '0')}`;
    const periodNumber = params.periodNumber || `NOM-${dateTag}-Q${startDate.getDate() <= 15 ? 1 : 2}-${1001 + periodCount}`;

    // Empleados activos
    const employees = await prisma.employee.findMany({
      where: { active: true },
    });

    if (employees.length === 0) {
      throw new Error('No hay empleados activos registrados para procesar la nómina');
    }

    let totalGrossUsd = 0;
    let totalGrossBs = 0;
    let totalDeductionsUsd = 0;
    let totalDeductionsBs = 0;
    let totalNetUsd = 0;
    let totalNetBs = 0;

    const receiptDataList: any[] = [];
    let receiptSequence = 1001 + (await prisma.payrollReceipt.count());

    for (const emp of employees) {
      // 1. Asignaciones quincenales (50% del mensual)
      const baseSalaryUsd = Number((emp.baseSalaryUsd / 2).toFixed(2));
      const baseSalaryBs = Number((baseSalaryUsd * bcvRate).toFixed(2));
      const cestaTicketUsd = Number(((emp.cestaTicketUsd || 40.0) / 2).toFixed(2));
      const cestaTicketBs = Number((cestaTicketUsd * bcvRate).toFixed(2));

      // 2. Comisiones por Ventas POS
      // Si el empleado tiene % de comisión asignado (ej. 1.5% o 2.0%)
      const commissionPercent = emp.commissionPercent || 0;
      const commissionsUsd = commissionPercent > 0
        ? Number(((totalPeriodSalesUsd * commissionPercent) / 100).toFixed(2))
        : 0.0;
      const commissionsBs = Number((commissionsUsd * bcvRate).toFixed(2));

      const totalGrossEmpUsd = Number((baseSalaryUsd + cestaTicketUsd + commissionsUsd).toFixed(2));
      const totalGrossEmpBs = Number((baseSalaryBs + cestaTicketBs + commissionsBs).toFixed(2));

      // 3. Deducciones de Ley (Sobre Salario Base en Bs)
      // IVSS: 4% retenido al trabajador sobre salario base
      const ivssDeductionBs = Number((baseSalaryBs * 0.04).toFixed(2));
      // FAOV: 1% retenido al trabajador sobre salario base
      const faovDeductionBs = Number((baseSalaryBs * 0.01).toFixed(2));
      // INCES: 0.5% utilidades (0 en quincena ordinaria, salvo período de utilidades)
      const incesDeductionBs = 0.0;

      const totalDeductionsEmpBs = Number((ivssDeductionBs + faovDeductionBs + incesDeductionBs).toFixed(2));
      const totalDeductionsEmpUsd = Number((totalDeductionsEmpBs / bcvRate).toFixed(2));

      // 4. Neto a Pagar
      const totalNetEmpBs = Number((totalGrossEmpBs - totalDeductionsEmpBs).toFixed(2));
      const totalNetEmpUsd = Number((totalNetEmpBs / bcvRate).toFixed(2));

      totalGrossUsd += totalGrossEmpUsd;
      totalGrossBs += totalGrossEmpBs;
      totalDeductionsUsd += totalDeductionsEmpUsd;
      totalDeductionsBs += totalDeductionsEmpBs;
      totalNetUsd += totalNetEmpUsd;
      totalNetBs += totalNetEmpBs;

      const receiptNumber = `REC-${receiptSequence++}`;

      receiptDataList.push({
        receiptNumber,
        employeeId: emp.id,
        daysWorked: 15,
        baseSalaryUsd,
        baseSalaryBs,
        cestaTicketUsd,
        cestaTicketBs,
        commissionsUsd,
        commissionsBs,
        overtimeUsd: 0.0,
        overtimeBs: 0.0,
        totalGrossUsd: totalGrossEmpUsd,
        totalGrossBs: totalGrossEmpBs,
        ivssDeductionBs,
        faovDeductionBs,
        incesDeductionBs,
        absencesDeductionBs: 0.0,
        otherDeductionsBs: 0.0,
        totalDeductionsBs: totalDeductionsEmpBs,
        totalDeductionsUsd: totalDeductionsEmpUsd,
        totalNetUsd: totalNetEmpUsd,
        totalNetBs: totalNetEmpBs,
        bcvRate,
        paymentStatus: 'PENDING',
        paymentMethod: 'TRANSFERENCIA',
        paymentReference: null,
      });
    }

    // Guardar el Período y sus Recibos en una transacción atómica
    const period = await prisma.payrollPeriod.create({
      data: {
        periodNumber,
        title: params.title,
        periodType: params.periodType || 'QUINCENAL',
        startDate,
        endDate,
        bcvRate,
        status: 'CONFIRMED',
        totalGrossUsd: Number(totalGrossUsd.toFixed(2)),
        totalGrossBs: Number(totalGrossBs.toFixed(2)),
        totalDeductionsUsd: Number(totalDeductionsUsd.toFixed(2)),
        totalDeductionsBs: Number(totalDeductionsBs.toFixed(2)),
        totalNetUsd: Number(totalNetUsd.toFixed(2)),
        totalNetBs: Number(totalNetBs.toFixed(2)),
        receiptsCount: receiptDataList.length,
        notes: params.notes || `Nómina generada con cruce POS de $${totalPeriodSalesUsd.toFixed(2)} USD en ventas`,
        receipts: {
          create: receiptDataList,
        },
      },
      include: {
        receipts: {
          include: { employee: true },
        },
      },
    });

    return {
      period,
      posSalesStats: {
        totalPeriodSalesUsd,
        totalPeriodSalesBs,
        ordersCount: posSales.length,
      },
    };
  }

  /**
   * Obtiene todos los períodos de nómina
   */
  static async getPayrollPeriods() {
    return prisma.payrollPeriod.findMany({
      include: {
        receipts: {
          include: { employee: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Marca los recibos de un período como pagados con su número de referencia bancaria
   */
  static async markPeriodPaid(periodId: string, reference: string, paymentMethod = 'TRANSFERENCIA') {
    await prisma.payrollReceipt.updateMany({
      where: { periodId },
      data: {
        paymentStatus: 'PAID',
        paymentReference: reference,
        paymentMethod,
      },
    });

    return prisma.payrollPeriod.update({
      where: { id: periodId },
      data: { status: 'PAID' },
      include: {
        receipts: { include: { employee: true } },
      },
    });
  }

  // =========================================================================
  // GENERADORES DE ARCHIVOS TXT OFICIALES PARA ENTES PATRONALES (FAOV, INCES, IVSS)
  // =========================================================================

  /**
   * Genera el archivo oficial TXT para el Banco Nacional de Vivienda y Hábitat (FAOV / BANAVIH)
   * Aporte Patronal: 2%, Retención Trabajador: 1%
   * Layout estándar Banavih:
   * TipoDoc(V/E)|Cedula|Apellidos y Nombres|Salario Devengado Bs|Aporte Trabajador (1%)|Aporte Patrono (2%)|Fecha
   */
  static async generateFaovTxt(periodId?: string) {
    const whereClause = periodId ? { id: periodId } : {};
    const period = await prisma.payrollPeriod.findFirst({
      where: whereClause,
      include: {
        receipts: {
          include: { employee: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!period) throw new Error('No se encontró período de nómina para generar archivo FAOV');

    const lines: string[] = [];
    const dateFormatted = new Date(period.endDate).toISOString().split('T')[0];

    // Encabezado informativo o línea de control Banavih
    // Estructura de línea de detalle por empleado
    for (const rec of period.receipts) {
      const emp = rec.employee;
      const cleanDocNumber = emp.docNumber.replace(/[^0-9]/g, '');
      const fullName = `${emp.lastName} ${emp.firstName}`.toUpperCase();
      const salaryBs = rec.baseSalaryBs.toFixed(2);
      const workerContributionBs = (rec.baseSalaryBs * 0.01).toFixed(2);
      const employerContributionBs = (rec.baseSalaryBs * 0.02).toFixed(2);

      // Línea delimitada por pipes conforme a la plataforma Banavih en línea
      lines.push(`${emp.docType}|${cleanDocNumber}|${fullName}|${salaryBs}|${workerContributionBs}|${employerContributionBs}|${dateFormatted}`);
    }

    const fileContent = lines.join('\r\n');
    const fileName = `FAOV_BANAVIH_${period.periodNumber}_${dateFormatted}.txt`;

    return {
      fileName,
      mimeType: 'text/plain',
      content: fileContent,
      linesCount: lines.length,
      totalWorkerBs: period.receipts.reduce((acc, r) => acc + (r.baseSalaryBs * 0.01), 0),
      totalEmployerBs: period.receipts.reduce((acc, r) => acc + (r.baseSalaryBs * 0.02), 0),
    };
  }

  /**
   * Genera el archivo oficial TXT para el INCES
   * Contribución Patronal: 2% del total de remuneraciones pagadas trimestralmente
   * Retención Obrera: 0.5% sobre utilidades de fin de año
   * Layout estándar INCES:
   * RIF_PATRONO;PERIODO;TIPODOC;CEDULA;NOMBRE_COMPLETO;SALARIO_DEVENGADO_BS;APORTE_PATRONAL_2;RETENCION_05
   */
  static async generateIncesTxt(periodId?: string) {
    const whereClause = periodId ? { id: periodId } : {};
    const period = await prisma.payrollPeriod.findFirst({
      where: whereClause,
      include: {
        receipts: {
          include: { employee: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!period) throw new Error('No se encontró período de nómina para generar archivo INCES');

    const companyRif = 'J-50123456-7';
    const lines: string[] = [];
    const quarter = `Q${Math.floor(new Date(period.endDate).getMonth() / 3) + 1}-${new Date(period.endDate).getFullYear()}`;

    for (const rec of period.receipts) {
      const emp = rec.employee;
      const cleanDocNumber = emp.docNumber.replace(/[^0-9]/g, '');
      const fullName = `${emp.lastName} ${emp.firstName}`.toUpperCase();
      const salaryBs = rec.baseSalaryBs.toFixed(2);
      const employerContributionBs = (rec.baseSalaryBs * 0.02).toFixed(2);
      const workerRetentionBs = '0.00'; // 0.5% aplica sobre utilidades

      lines.push(`${companyRif};${quarter};${emp.docType};${cleanDocNumber};${fullName};${salaryBs};${employerContributionBs};${workerRetentionBs}`);
    }

    const fileContent = lines.join('\r\n');
    const fileName = `INCES_DECLARACION_${quarter}_${period.periodNumber}.txt`;

    return {
      fileName,
      mimeType: 'text/plain',
      content: fileContent,
      linesCount: lines.length,
      quarter,
      totalEmployerBs: period.receipts.reduce((acc, r) => acc + (r.baseSalaryBs * 0.02), 0),
    };
  }

  /**
   * Genera el archivo oficial TXT para el IVSS (Sistema TIUNA / RPE - Registro Patronal de Asegurados)
   * Cotización SSO: 4% retenido al asegurado, 9% a 11% aporte patronal
   * Layout estándar Tiuna RPE:
   * NUM_PATRONAL\tTIPO_DOC\tCEDULA\tPRIMER_APELLIDO\tSEGUNDO_APELLIDO\tPRIMER_NOMBRE\tSEGUNDO_NOMBRE\tSALARIO_DIARIO_BS\tFECHA_INGRESO
   */
  static async generateIvssTiunaTxt() {
    const employees = await prisma.employee.findMany({
      where: { active: true },
      orderBy: { docNumber: 'asc' },
    });

    const rateObj = await BcvService.getCurrentRate();
    const bcvRate = rateObj.rate;
    const patronalNumber = '991234567'; // Registro Patronal IVSS FerreMax
    const lines: string[] = [];

    for (const emp of employees) {
      const cleanDoc = emp.docNumber.replace(/[^0-9]/g, '');
      const lastNameParts = emp.lastName.split(' ');
      const firstNameParts = emp.firstName.split(' ');
      const pApellido = (lastNameParts[0] || '').toUpperCase();
      const sApellido = (lastNameParts[1] || '').toUpperCase();
      const pNombre = (firstNameParts[0] || '').toUpperCase();
      const sNombre = (firstNameParts[1] || '').toUpperCase();

      const dailySalaryBs = ((emp.baseSalaryUsd * bcvRate) / 30).toFixed(2);
      const hireFormatted = new Date(emp.hireDate).toLocaleDateString('es-VE', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      });

      // Delimitado por tabulaciones (layout estándar batch Tiuna)
      lines.push(`${patronalNumber}\t${emp.docType}\t${cleanDoc}\t${pApellido}\t${sApellido}\t${pNombre}\t${sNombre}\t${dailySalaryBs}\t${hireFormatted}`);
    }

    const fileContent = lines.join('\r\n');
    const fileName = `IVSS_TIUNA_RPE_${patronalNumber}_${new Date().toISOString().split('T')[0]}.txt`;

    return {
      fileName,
      mimeType: 'text/plain',
      content: fileContent,
      linesCount: lines.length,
      patronalNumber,
      totalEmployees: employees.length,
    };
  }

  /**
   * Resumen y estadísticas generales del módulo de Nómina para el Dashboard
   */
  static async getSummaryStats() {
    await this.ensureDefaultEmployees();
    const rateObj = await BcvService.getCurrentRate();
    const bcvRate = rateObj.rate;

    const employees = await prisma.employee.findMany({ where: { active: true } });
    const totalEmployees = employees.length;
    const totalMonthlyPayrollUsd = employees.reduce((acc, e) => acc + e.baseSalaryUsd, 0);
    const totalMonthlyCestaTicketUsd = employees.reduce((acc, e) => acc + (e.cestaTicketUsd || 40), 0);
    const totalMonthlyPayrollBs = Number(((totalMonthlyPayrollUsd + totalMonthlyCestaTicketUsd) * bcvRate).toFixed(2));

    const periodsCount = await prisma.payrollPeriod.count();
    const lastPeriod = await prisma.payrollPeriod.findFirst({
      orderBy: { createdAt: 'desc' },
      include: { receipts: true },
    });

    const auditsCount = await prisma.laborPassiveAudit.count();
    const lastAudit = await prisma.laborPassiveAudit.findFirst({
      orderBy: { calculationDate: 'desc' },
      include: { employee: true },
    });

    return {
      totalEmployees,
      totalMonthlyPayrollUsd,
      totalMonthlyCestaTicketUsd,
      totalMonthlyPayrollBs,
      bcvRate,
      periodsCount,
      lastPeriod,
      auditsCount,
      lastAudit,
    };
  }
}
