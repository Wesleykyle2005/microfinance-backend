/**
 * Reports Service
 * Lógica de negocio para generación de reportes
 */

const { repositoriesContainer } = require('../infrastructure/container/repositories.container');
const ExcelJS = require('exceljs');
const PDFDocument = require('pdfkit');
const moment = require('moment-timezone');
const Decimal = require('decimal.js');

/**
 * Configuración de zona horaria
 */
const TIMEZONE = 'America/Managua';

/**
 * REPORTE 1: Resumen de Cartera (Excel)
 * Obtiene todos los préstamos activos con detalles completos
 */
class ReportsService {
    constructor() {
        this.reportsRepository = repositoriesContainer.reportsRepository;
    }

    _buildCarteraWhereClause(filters = {}) {
        const { month, year, status } = filters;

        const whereClause = {
            statusLoan: status ? status : { in: ['ACTIVE', 'PAID_OFF'] },
        };

        if (month && year) {
            const startDate = new Date(year, month - 1, 1);
            const endDate = new Date(year, month, 0, 23, 59, 59);

            whereClause.OR = [
                {
                    disbursementDate: {
                        gte: startDate,
                        lte: endDate,
                    },
                },
                {
                    createdAt: {
                        gte: startDate,
                        lte: endDate,
                    },
                },
            ];
        }

        return whereClause;
    }

    async getCarteraOverview(filters = {}) {
        const whereClause = this._buildCarteraWhereClause(filters);

        const [totalLoans, totals, breakdownByStatus, overdueLoans] = await Promise.all([
            this.reportsRepository.countLoans({ where: whereClause }),
            this.reportsRepository.aggregateLoans({
                where: whereClause,
                _sum: {
                    principalAmount: true,
                    totalAmount: true,
                    remainingBalance: true,
                },
            }),
            this.reportsRepository.groupByLoans({
                by: ['statusLoan'],
                where: whereClause,
                _count: { _all: true },
                _sum: {
                    totalAmount: true,
                    remainingBalance: true,
                },
            }),
            this.reportsRepository.countLoans({
                where: {
                    ...whereClause,
                    paymentSchedules: {
                        some: {
                            status: 'OVERDUE',
                        },
                    },
                },
            }),
        ]);

        return {
            totalLoans,
            overdueLoans,
            totals: {
                principalAmount: Number(totals._sum.principalAmount || 0),
                totalAmount: Number(totals._sum.totalAmount || 0),
                remainingBalance: Number(totals._sum.remainingBalance || 0),
            },
            breakdownByStatus: breakdownByStatus.map((row) => ({
                status: row.statusLoan,
                count: row._count._all,
                totalAmount: Number(row._sum.totalAmount || 0),
                remainingBalance: Number(row._sum.remainingBalance || 0),
            })),
        };
    }

    async getCarteraLoansLight(filters = {}) {
        const {
            page = 1,
            limit = 20,
            month,
            year,
            status,
            search,
        } = filters;

        const whereClause = this._buildCarteraWhereClause({ month, year, status });

        if (search && String(search).trim() !== '') {
            const value = String(search).trim();
            whereClause.AND = [
                ...(whereClause.AND || []),
                {
                    OR: [
                        { folio: { contains: value, mode: 'insensitive' } },
                        { client: { fullName: { contains: value, mode: 'insensitive' } } },
                        { client: { identificationNumber: { contains: value, mode: 'insensitive' } } },
                    ],
                },
            ];
        }

        const pageNum = Math.max(1, parseInt(page, 10) || 1);
        const pageSize = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
        const skip = (pageNum - 1) * pageSize;

        const [loans, total] = await Promise.all([
            this.reportsRepository.findManyLoans({
                where: whereClause,
                skip,
                take: pageSize,
                orderBy: { createdAt: 'desc' },
                select: {
                    id: true,
                    folio: true,
                    statusLoan: true,
                    principalAmount: true,
                    totalAmount: true,
                    remainingBalance: true,
                    disbursementDate: true,
                    maturityDate: true,
                    client: {
                        select: {
                            id: true,
                            fullName: true,
                            identificationNumber: true,
                            category: {
                                select: {
                                    id: true,
                                    name: true,
                                    displayName: true,
                                },
                            },
                        },
                    },
                    paymentSchedules: {
                        select: {
                            status: true,
                            dueDate: true,
                        },
                        orderBy: {
                            paymentNumber: 'asc',
                        },
                    },
                    payments: {
                        where: {
                            status: 'CONFIRMED',
                        },
                        select: {
                            principalPaid: true,
                            interestPaid: true,
                            lateFeePaid: true,
                        },
                    },
                },
            }),
            this.reportsRepository.countLoans({ where: whereClause }),
        ]);

        const data = loans.map((loan) => this._processLoanForCartera(loan));

        return {
            data,
            meta: {
                total,
                page: pageNum,
                limit: pageSize,
                lastPage: Math.max(1, Math.ceil(total / pageSize)),
                hasNextPage: pageNum < Math.max(1, Math.ceil(total / pageSize)),
                hasPrevPage: pageNum > 1,
                from: total === 0 ? 0 : skip + 1,
                to: Math.min(skip + pageSize, total),
            },
        };
    }

    async getCarteraInstallmentsByLoan(loanId, { onlyOpen = false } = {}) {
        return this.reportsRepository.findManyPaymentSchedules({
            where: {
                loanId,
                ...(onlyOpen
                    ? {
                        status: {
                            in: ['PENDING', 'PARTIAL', 'OVERDUE'],
                        },
                    }
                    : {}),
            },
            orderBy: { dueDate: 'asc' },
            select: {
                id: true,
                paymentNumber: true,
                dueDate: true,
                principalDueAmount: true,
                interestAmount: true,
                lateFeeAmount: true,
                totalDue: true,
                paidAmount: true,
                remainingAmount: true,
                status: true,
                paidDate: true,
            },
        });
    }

    async getCarteraPaymentsByLoan(loanId, { page = 1, limit = 20, includePending = false } = {}) {
        const pageNum = Math.max(1, parseInt(page, 10) || 1);
        const pageSize = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
        const skip = (pageNum - 1) * pageSize;

        const where = {
            loanId,
            ...(includePending ? {} : { status: 'CONFIRMED' }),
        };

        const [payments, total] = await Promise.all([
            this.reportsRepository.findManyPayments({
                where,
                skip,
                take: pageSize,
                orderBy: { paymentDate: 'desc' },
                select: {
                    id: true,
                    amount: true,
                    principalPaid: true,
                    interestPaid: true,
                    lateFeePaid: true,
                    paymentDate: true,
                    paymentMethod: true,
                    receiptFolio: true,
                    status: true,
                    createdAt: true,
                },
            }),
            this.reportsRepository.countPayments({ where }),
        ]);

        return {
            data: payments,
            meta: {
                total,
                page: pageNum,
                limit: pageSize,
                lastPage: Math.max(1, Math.ceil(total / pageSize)),
            },
        };
    }

    async getMoraOverview() {
        const [overdueInstallments, overdueLoans, overdueClients, overdueAmounts] = await Promise.all([
            this.reportsRepository.countPaymentSchedules({
                where: { status: 'OVERDUE' },
            }),
            this.reportsRepository.countLoans({
                where: {
                    statusLoan: 'ACTIVE',
                    paymentSchedules: {
                        some: { status: 'OVERDUE' },
                    },
                },
            }),
            this.reportsRepository.countClients({
                where: {
                    loans: {
                        some: {
                            statusLoan: 'ACTIVE',
                            paymentSchedules: {
                                some: { status: 'OVERDUE' },
                            },
                        },
                    },
                },
            }),
            this.reportsRepository.aggregatePaymentSchedules({
                where: { status: 'OVERDUE' },
                _sum: {
                    lateFeeAmount: true,
                    totalDue: true,
                    remainingAmount: true,
                },
            }),
        ]);

        return {
            overdueInstallments,
            overdueLoans,
            overdueClients,
            totals: {
                lateFeeAmount: Number(overdueAmounts._sum.lateFeeAmount || 0),
                totalDue: Number(overdueAmounts._sum.totalDue || 0),
                remainingAmount: Number(overdueAmounts._sum.remainingAmount || 0),
            },
        };
    }

    async getMoraLoansLight({ page = 1, limit = 20 } = {}) {
        const pageNum = Math.max(1, parseInt(page, 10) || 1);
        const pageSize = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
        const skip = (pageNum - 1) * pageSize;

        const where = {
            statusLoan: 'ACTIVE',
            paymentSchedules: {
                some: {
                    status: 'OVERDUE',
                },
            },
        };

        const [loans, total] = await Promise.all([
            this.reportsRepository.findManyLoans({
                where,
                skip,
                take: pageSize,
                orderBy: { createdAt: 'desc' },
                select: {
                    id: true,
                    folio: true,
                    totalAmount: true,
                    remainingBalance: true,
                    client: {
                        select: {
                            id: true,
                            fullName: true,
                            identificationNumber: true,
                            phoneNumber: true,
                        },
                    },
                    paymentSchedules: {
                        where: {
                            status: 'OVERDUE',
                        },
                        orderBy: {
                            dueDate: 'asc',
                        },
                        take: 1,
                        select: {
                            dueDate: true,
                            lateFeeAmount: true,
                            totalDue: true,
                        },
                    },
                },
            }),
            this.reportsRepository.countLoans({ where }),
        ]);

        const today = moment().tz(TIMEZONE).startOf('day');

        return {
            data: loans.map((loan) => {
                const firstOverdue = loan.paymentSchedules[0];
                const daysOverdue = firstOverdue
                    ? Math.max(0, today.diff(moment(firstOverdue.dueDate).tz(TIMEZONE).startOf('day'), 'days'))
                    : 0;

                return {
                    id: loan.id,
                    folio: loan.folio,
                    totalAmount: loan.totalAmount,
                    remainingBalance: loan.remainingBalance,
                    client: loan.client,
                    oldestOverdue: firstOverdue || null,
                    daysOverdue,
                    priority: daysOverdue > 30 ? 'ALTA' : daysOverdue > 15 ? 'MEDIA' : 'BAJA',
                };
            }),
            meta: {
                total,
                page: pageNum,
                limit: pageSize,
                lastPage: Math.max(1, Math.ceil(total / pageSize)),
            },
        };
    }

    /**
     * Obtiene datos de cartera completa o filtrada por fecha
     * @param {Object} filters - Filtros opcionales (month, year, status)
     * @returns {Promise<Array>} Array de préstamos con datos agregados
     */
    async getCarteraData(filters = {}) {
        const whereClause = this._buildCarteraWhereClause(filters);

        // Query principal con todas las relaciones necesarias
        const loans = await this.reportsRepository.findManyLoans({
            where: whereClause,
            include: {
                client: {
                    include: {
                        category: true,
                    },
                },
                paymentSchedules: {
                    select: {
                        status: true,
                        dueDate: true,
                        totalDue: true,
                    },
                    orderBy: {
                        dueDate: 'asc',
                    },
                },
                payments: {
                    where: {
                        status: 'CONFIRMED',
                    },
                    orderBy: {
                        paymentDate: 'desc',
                    },
                },
            },
            orderBy: {
                createdAt: 'desc',
            },
        });

        // Procesar cada préstamo para agregar campos calculados
        const processedLoans = loans.map((loan) =>
            this._processLoanForCartera(loan)
        );

        return processedLoans;
    }

    /**
     * Procesa un préstamo individual para el reporte de cartera
     * @private
     */
    _processLoanForCartera(loan) {
        // Calcular total pagado (suma de todos los pagos confirmados)
        const totalPagado = loan.payments.reduce((sum, payment) => {
            const principal = new Decimal(payment.principalPaid || 0);
            const interest = new Decimal(payment.interestPaid || 0);
            const lateFee = new Decimal(payment.lateFeePaid || 0);
            return sum.plus(principal).plus(interest).plus(lateFee);
        }, new Decimal(0));

        // Contar cuotas pagadas y totales
        const cuotasPagadas = loan.paymentSchedules.filter(
            (ps) => ps.status === 'PAID'
        ).length;
        const cuotasTotales = loan.paymentSchedules.length;

        // Encontrar próximo vencimiento (primera cuota PENDING o OVERDUE)
        const proximaCuota = loan.paymentSchedules.find(
            (ps) => ps.status === 'PENDING' || ps.status === 'OVERDUE'
        );

        const proximoVencimiento = proximaCuota
            ? moment(proximaCuota.dueDate).tz(TIMEZONE).format('DD/MMM/YY')
            : 'N/A';

        // Calcular días en mora (máximo de cuotas vencidas)
        const today = moment().tz(TIMEZONE).startOf('day');
        const diasEnMora = loan.paymentSchedules.reduce((max, ps) => {
            if (ps.status !== 'OVERDUE') return max;
            const days = today.diff(moment(ps.dueDate).tz(TIMEZONE).startOf('day'), 'days');
            return Math.max(max, Math.max(0, days));
        }, 0);

        // Calcular saldo pendiente
        const saldoPendiente = loan.remainingBalance
            ? new Decimal(loan.remainingBalance)
            : new Decimal(loan.totalAmount).minus(totalPagado);

        return {
            cliente: loan.client.fullName,
            cedula: loan.client.identificationNumber || 'N/A',
            categoria: loan.client.category.name,
            folio: loan.folio,
            capital: new Decimal(loan.principalAmount),
            totalAdeudado: new Decimal(loan.totalAmount),
            totalPagado: totalPagado,
            saldoPendiente: saldoPendiente,
            cuotasPagadas: cuotasPagadas,
            cuotasTotales: cuotasTotales,
            estado: loan.statusLoan,
            proximoVencimiento: proximoVencimiento,
            diasEnMora: diasEnMora,
            // Metadata adicional
            disbursementDate: loan.disbursementDate,
            maturityDate: loan.maturityDate,
        };
    }

    /**
     * Genera archivo Excel del reporte de cartera
     * @param {Array} data - Array de préstamos procesados
     * @param {Object} metadata - Información adicional (mes, año, etc.)
     * @returns {Promise<Buffer>} Buffer del archivo Excel
     */
    async generateCarteraExcel(data, metadata = {}) {
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Resumen de Cartera');

        // Metadatos del reporte
        const { month, year } = metadata;
        const reportDate = month && year
            ? moment().month(month - 1).year(year).format('MMMM YYYY')
            : moment().tz(TIMEZONE).format('MMMM YYYY');

        // Título del reporte (fila 1)
        worksheet.mergeCells('A1:M1');
        const titleCell = worksheet.getCell('A1');
        titleCell.value = `RESUMEN DE CARTERA - ${reportDate.toUpperCase()}`;
        titleCell.font = { size: 16, bold: true, color: { argb: 'FFFFFFFF' } };
        titleCell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FF0070C0' },
        };
        titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
        worksheet.getRow(1).height = 30;

        // Información de generación (fila 2)
        worksheet.mergeCells('A2:M2');
        const infoCell = worksheet.getCell('A2');
        infoCell.value = `Generado el: ${moment().tz(TIMEZONE).format('DD/MM/YYYY HH:mm')}`;
        infoCell.font = { size: 10, italic: true };
        infoCell.alignment = { horizontal: 'right' };
        worksheet.getRow(2).height = 20;

        // Espacio
        worksheet.addRow([]);

        // Definir anchos de columnas (sin auto-generar headers)
        worksheet.getColumn(1).width = 30; // Cliente
        worksheet.getColumn(2).width = 18; // Cédula
        worksheet.getColumn(3).width = 12; // Categoría
        worksheet.getColumn(4).width = 18; // Folio
        worksheet.getColumn(5).width = 14; // Capital
        worksheet.getColumn(6).width = 15; // Total Adeudado
        worksheet.getColumn(7).width = 15; // Total Pagado
        worksheet.getColumn(8).width = 16; // Saldo Pendiente
        worksheet.getColumn(9).width = 14; // Cuotas Pagadas
        worksheet.getColumn(10).width = 14; // Cuotas Totales
        worksheet.getColumn(11).width = 12; // Estado
        worksheet.getColumn(12).width = 16; // Próximo Venc.
        worksheet.getColumn(13).width = 13; // Días en Mora

        // Crear manualmente la fila de headers en la fila 4
        const headerRow = worksheet.getRow(4);
        headerRow.values = [
            'Cliente',
            'Cédula',
            'Categoría',
            'Folio',
            'Capital',
            'Total Adeudado',
            'Total Pagado',
            'Saldo Pendiente',
            'Cuotas Pagadas',
            'Cuotas Totales',
            'Estado',
            'Próximo Venc.',
            'Días en Mora',
        ];

        // Estilo del header (fila 4)
        headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 };
        headerRow.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FF0070C0' },
        };
        headerRow.alignment = { horizontal: 'center', vertical: 'middle' };
        headerRow.height = 25;

        // Agregar bordes al header
        headerRow.eachCell((cell) => {
            cell.border = {
                top: { style: 'thin' },
                left: { style: 'thin' },
                bottom: { style: 'thin' },
                right: { style: 'thin' },
            };
        });

        // Agregar datos
        data.forEach((loan, index) => {
            const row = worksheet.addRow([
                loan.cliente,
                loan.cedula,
                loan.categoria,
                loan.folio,
                parseFloat(loan.capital.toString()),
                parseFloat(loan.totalAdeudado.toString()),
                parseFloat(loan.totalPagado.toString()),
                parseFloat(loan.saldoPendiente.toString()),
                `${loan.cuotasPagadas}/${loan.cuotasTotales}`,
                '', // Columna vacía (ya la usamos para cuotas)
                loan.estado,
                loan.proximoVencimiento,
                loan.diasEnMora,
            ]);

            // Aplicar formato de moneda a columnas de dinero (columnas 5-8)
            [5, 6, 7, 8].forEach((colNum) => {
                const cell = row.getCell(colNum);
                cell.numFmt = '"C$"#,##0.00';
            });

            // Formato para cuotas (columna 9 - ya tiene el formato correcto)
            const cuotasCell = row.getCell(9);
            cuotasCell.alignment = { horizontal: 'center' };

            // Formato condicional para estado (columna 11)
            const estadoCell = row.getCell(11);
            estadoCell.alignment = { horizontal: 'center' };
            if (loan.estado === 'ACTIVE') {
                estadoCell.fill = {
                    type: 'pattern',
                    pattern: 'solid',
                    fgColor: { argb: 'FFD4EDDA' }, // Verde claro
                };
            } else if (loan.estado === 'PAID_OFF') {
                estadoCell.fill = {
                    type: 'pattern',
                    pattern: 'solid',
                    fgColor: { argb: 'FFD1ECF1' }, // Azul claro
                };
            }

            // Formato condicional para días en mora (columna 13)
            const moraCell = row.getCell(13);
            moraCell.alignment = { horizontal: 'center' };
            if (loan.diasEnMora > 0) {
                moraCell.fill = {
                    type: 'pattern',
                    pattern: 'solid',
                    fgColor: { argb: 'FFF8D7DA' }, // Rojo claro
                };
                moraCell.font = { bold: true, color: { argb: 'FF721C24' } };
            }

            // Bordes para todas las celdas
            row.eachCell((cell) => {
                cell.border = {
                    top: { style: 'thin', color: { argb: 'FFD3D3D3' } },
                    left: { style: 'thin', color: { argb: 'FFD3D3D3' } },
                    bottom: { style: 'thin', color: { argb: 'FFD3D3D3' } },
                    right: { style: 'thin', color: { argb: 'FFD3D3D3' } },
                };
            });

            // Alternar color de fondo (zebra) - excepto columnas con formato condicional
            if (index % 2 === 0) {
                row.eachCell((cell, colNumber) => {
                    if (![11, 13].includes(colNumber)) {
                        cell.fill = {
                            type: 'pattern',
                            pattern: 'solid',
                            fgColor: { argb: 'FFF9F9F9' },
                        };
                    }
                });
            }
        });

        // Agregar fila de totales
        const lastRow = worksheet.rowCount;
        worksheet.addRow([]); // Espacio

        const totalsRow = worksheet.addRow([
            'TOTALES',
            '',
            '',
            '',
            { formula: `SUM(E5:E${lastRow})` },    // Capital
            { formula: `SUM(F5:F${lastRow})` },    // Total Adeudado
            { formula: `SUM(G5:G${lastRow})` },    // Total Pagado
            { formula: `SUM(H5:H${lastRow})` },    // Saldo Pendiente
            '',
            '',
            '',
            '',
            '',
        ]);

        // Estilo de fila de totales
        totalsRow.font = { bold: true, size: 12 };
        totalsRow.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFE7E6E6' },
        };

        // Formato de moneda para totales (columnas 5-8)
        [5, 6, 7, 8].forEach((colNum) => {
            const cell = totalsRow.getCell(colNum);
            cell.numFmt = '"C$"#,##0.00';
        });

        // Bordes dobles para totales
        totalsRow.eachCell((cell) => {
            cell.border = {
                top: { style: 'double' },
                bottom: { style: 'double' },
            };
        });

        // Auto-ajustar altura de filas
        worksheet.eachRow((row, rowNumber) => {
            if (rowNumber > 4) {
                row.height = 20;
            }
        });

        // Generar buffer del archivo
        const buffer = await workbook.xlsx.writeBuffer();
        return buffer;
    }

    /**
    * REPORTE 2: Clientes en Mora (Excel)
     * Obtiene préstamos con cuotas vencidas
     */
    async getMoraData(filters = {}) {
        // Query para encontrar préstamos con cuotas en mora
        const loansWithMora = await this.reportsRepository.findManyLoans({
            where: {
                statusLoan: 'ACTIVE',
                paymentSchedules: {
                    some: {
                        status: 'OVERDUE',
                    },
                },
            },
            include: {
                client: {
                    include: {
                        category: true,
                    },
                },
                paymentSchedules: {
                    where: {
                        status: 'OVERDUE',
                    },
                    select: {
                        dueDate: true,
                        lateFeeAmount: true,
                        totalDue: true,
                    },
                    orderBy: {
                        dueDate: 'asc',
                    },
                },
            },
            orderBy: {
                createdAt: 'desc',
            },
        });

        // Procesar cada préstamo en mora
        const processedMora = loansWithMora.map((loan) => {
            const cuotaVencida = loan.paymentSchedules[0]; // Primera cuota vencida (más antigua)

            const diasAtraso = Math.max(
                0,
                moment().tz(TIMEZONE).startOf('day').diff(
                    moment(cuotaVencida.dueDate).tz(TIMEZONE).startOf('day'),
                    'days'
                )
            );

            const moraAcumulada = cuotaVencida.lateFeeAmount
                ? new Decimal(cuotaVencida.lateFeeAmount)
                : new Decimal(0);

            return {
                cliente: loan.client.fullName,
                cedula: loan.client.identificationNumber || 'N/A',
                telefono: loan.client.phoneNumber || 'N/A',
                categoria: loan.client.category.name,
                folio: loan.folio,
                cuotaVencida: moment(cuotaVencida.dueDate).tz(TIMEZONE).format('DD/MMM/YY'),
                montoVencido: new Decimal(cuotaVencida.totalDue),
                diasAtraso: diasAtraso,
                moraAcumulada: moraAcumulada,
                totalAdeudado: new Decimal(loan.totalAmount),
                saldoPendiente: loan.remainingBalance
                    ? new Decimal(loan.remainingBalance)
                    : new Decimal(0),
                // Prioridad (a más días, más prioridad)
                prioridad: diasAtraso > 30 ? 'ALTA' : diasAtraso > 15 ? 'MEDIA' : 'BAJA',
            };
        });

        // Ordenar por días de atraso (descendente) - los más atrasados primero
        processedMora.sort((a, b) => b.diasAtraso - a.diasAtraso);

        return processedMora;
    }

    /**
     * Genera Excel de clientes en mora
     */
    async generateMoraExcel(data) {
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Clientes en Mora');

        // Título
        worksheet.mergeCells('A1:L1');
        const titleCell = worksheet.getCell('A1');
        titleCell.value = `CLIENTES EN MORA - ${moment().tz(TIMEZONE).format('DD/MM/YYYY')}`;
        titleCell.font = { size: 16, bold: true, color: { argb: 'FFFFFFFF' } };
        titleCell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFDC3545' }, // Rojo
        };
        titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
        worksheet.getRow(1).height = 30;

        // Info
        worksheet.mergeCells('A2:L2');
        const infoCell = worksheet.getCell('A2');
        infoCell.value = `Total de clientes en mora: ${data.length}`;
        infoCell.font = { size: 11, bold: true };
        infoCell.alignment = { horizontal: 'center' };
        worksheet.getRow(2).height = 20;

        worksheet.addRow([]);

        // Definir anchos de columnas
        worksheet.getColumn(1).width = 12;  // Prioridad
        worksheet.getColumn(2).width = 30;  // Cliente
        worksheet.getColumn(3).width = 18;  // Cédula
        worksheet.getColumn(4).width = 16;  // Teléfono
        worksheet.getColumn(5).width = 12;  // Categoría
        worksheet.getColumn(6).width = 18;  // Folio
        worksheet.getColumn(7).width = 16;  // Cuota Vencida
        worksheet.getColumn(8).width = 15;  // Monto Vencido
        worksheet.getColumn(9).width = 14;  // Días de Atraso
        worksheet.getColumn(10).width = 15; // Mora Acumulada
        worksheet.getColumn(11).width = 15; // Total Adeudado
        worksheet.getColumn(12).width = 16; // Saldo Pendiente

        // Crear headers manualmente en fila 4
        const headerRow = worksheet.getRow(4);
        headerRow.values = [
            'Prioridad',
            'Cliente',
            'Cédula',
            'Teléfono',
            'Categoría',
            'Folio',
            'Cuota Vencida',
            'Monto Vencido',
            'Días de Atraso',
            'Mora Acumulada',
            'Total Adeudado',
            'Saldo Pendiente',
        ];

        // Header
        headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 };
        headerRow.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFDC3545' },
        };
        headerRow.alignment = { horizontal: 'center', vertical: 'middle' };
        headerRow.height = 25;

        headerRow.eachCell((cell) => {
            cell.border = {
                top: { style: 'thin' },
                left: { style: 'thin' },
                bottom: { style: 'thin' },
                right: { style: 'thin' },
            };
        });

        // Datos
        data.forEach((item) => {
            const row = worksheet.addRow([
                item.prioridad,
                item.cliente,
                item.cedula,
                item.telefono,
                item.categoria,
                item.folio,
                item.cuotaVencida,
                parseFloat(item.montoVencido.toString()),
                item.diasAtraso,
                parseFloat(item.moraAcumulada.toString()),
                parseFloat(item.totalAdeudado.toString()),
                parseFloat(item.saldoPendiente.toString()),
            ]);

            // Formato moneda (columnas 8, 10, 11, 12)
            [8, 10, 11, 12].forEach((colNum) => {
                row.getCell(colNum).numFmt = '"C$"#,##0.00';
            });

            // Formato prioridad (columna 1)
            const prioridadCell = row.getCell(1);
            prioridadCell.alignment = { horizontal: 'center' };
            prioridadCell.font = { bold: true };

            if (item.prioridad === 'ALTA') {
                prioridadCell.fill = {
                    type: 'pattern',
                    pattern: 'solid',
                    fgColor: { argb: 'FFDC3545' },
                };
                prioridadCell.font = { ...prioridadCell.font, color: { argb: 'FFFFFFFF' } };
            } else if (item.prioridad === 'MEDIA') {
                prioridadCell.fill = {
                    type: 'pattern',
                    pattern: 'solid',
                    fgColor: { argb: 'FFFFC107' },
                };
            } else {
                prioridadCell.fill = {
                    type: 'pattern',
                    pattern: 'solid',
                    fgColor: { argb: 'FFFFEAA7' },
                };
            }

            // Días de atraso destacado (columna 9)
            const diasCell = row.getCell(9);
            diasCell.alignment = { horizontal: 'center' };
            if (item.diasAtraso > 30) {
                diasCell.font = { bold: true, color: { argb: 'FFDC3545' } };
            }

            // Bordes
            row.eachCell((cell) => {
                cell.border = {
                    top: { style: 'thin', color: { argb: 'FFD3D3D3' } },
                    left: { style: 'thin', color: { argb: 'FFD3D3D3' } },
                    bottom: { style: 'thin', color: { argb: 'FFD3D3D3' } },
                    right: { style: 'thin', color: { argb: 'FFD3D3D3' } },
                };
            });
        });

        return await workbook.xlsx.writeBuffer();
    }

    /**
    * REPORTE 3: Balance Mensual (Excel)
     * Obtiene el balance mensual desde BalanceSnapshot
     */
    async getBalanceData(month, year) {
        const monthNum = parseInt(month, 10);
        const yearNum = parseInt(year, 10);

        // Buscar snapshot existente
        const snapshot = await this.reportsRepository.findUniqueBalanceSnapshot({
            where: {
                month_year: {
                    month: monthNum,
                    year: yearNum,
                }
            },
            include: {
                generator: true, // Usuario que generó el balance
            },
        });

        if (!snapshot) {
            throw new Error(`No existe balance generado para ${month}/${year}`);
        }

        // Calcular indicadores adicionales para el mes
        const startDate = new Date(yearNum, monthNum - 1, 1);
        const endDate = new Date(yearNum, monthNum, 0, 23, 59, 59);

        const [activeLoans, completedInMonth, overdueLoanCount, overdueSchedules] = await Promise.all([
            this.reportsRepository.countLoans({
                where: {
                    statusLoan: 'ACTIVE',
                    disbursementDate: {
                        lte: endDate,
                    },
                },
            }),
            this.reportsRepository.countLoans({
                where: {
                    statusLoan: 'PAID_OFF',
                    maturityDate: {
                        gte: startDate,
                        lte: endDate,
                    },
                },
            }),
            this.reportsRepository.countLoans({
                where: {
                    statusLoan: 'ACTIVE',
                    paymentSchedules: {
                        some: {
                            status: 'OVERDUE',
                        },
                    },
                    disbursementDate: {
                        lte: endDate,
                    },
                },
            }),
            this.reportsRepository.findManyPaymentSchedules({
                where: {
                    status: 'OVERDUE',
                    loan: {
                        statusLoan: 'ACTIVE',
                        disbursementDate: {
                            lte: endDate,
                        },
                    },
                },
                select: {
                    dueDate: true,
                },
            })
        ]);

        const endOfPeriodDay = moment(endDate).tz(TIMEZONE).startOf('day');
        const totalDaysOverdue = overdueSchedules.reduce((sum, schedule) => {
            const days = endOfPeriodDay.diff(moment(schedule.dueDate).tz(TIMEZONE).startOf('day'), 'days');
            return sum + Math.max(0, days);
        }, 0);
        const overdueCount = overdueSchedules.length;

        const avgMoraDays = overdueCount > 0 ? Math.round(totalDaysOverdue / overdueCount) : 0;

        // Calcular tasa de recuperación
        const totalExpected = new Decimal(snapshot.totalPrincipalRecovered)
            .plus(snapshot.totalInterestCollected)
            .plus(snapshot.totalLateFeesCollected);
        
        const totalOutstanding = new Decimal(snapshot.totalPrincipalOutstanding);
        const recoveryRate = totalOutstanding.greaterThan(0)
            ? totalExpected.dividedBy(totalExpected.plus(totalOutstanding)).times(100).toFixed(1)
            : '100.0';

        return {
            snapshot,
            indicators: {
                activeLoans,
                completedInMonth,
                overdueLoanCount,
                recoveryRate: parseFloat(recoveryRate),
                avgMoraDays,
            },
        };
    }

    /**
     * Genera archivo Excel del balance mensual
     */
    async generateBalanceExcel(data, month, year) {
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Balance Mensual');

        const monthName = moment().month(month - 1).year(year).format('MMMM YYYY');

        // === TÍTULO PRINCIPAL ===
        worksheet.mergeCells('A1:B1');
        const titleCell = worksheet.getCell('A1');
        titleCell.value = `BALANCE MENSUAL - ${monthName.toUpperCase()}`;
        titleCell.font = { size: 16, bold: true, color: { argb: 'FFFFFFFF' } };
        titleCell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FF2E7D32' }, // Verde oscuro
        };
        titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
        worksheet.getRow(1).height = 30;

        // === METADATA ===
        worksheet.mergeCells('A2:B2');
        const infoCell = worksheet.getCell('A2');
        infoCell.value = `Generado el: ${moment().tz(TIMEZONE).format('DD/MM/YYYY HH:mm')}`;
        infoCell.font = { size: 10, italic: true };
        infoCell.alignment = { horizontal: 'right' };
        worksheet.getRow(2).height = 20;

        worksheet.addRow([]); // Espacio

        // === SECCIÓN 1: RESUMEN EJECUTIVO ===
        const section1Row = worksheet.addRow(['RESUMEN EJECUTIVO']);
        section1Row.font = { size: 12, bold: true, color: { argb: 'FF2E7D32' } };
        worksheet.mergeCells(`A${section1Row.number}:B${section1Row.number}`);
        section1Row.height = 25;

        // Headers
        const headerRow1 = worksheet.getRow(worksheet.rowCount + 1);
        headerRow1.values = ['Concepto', 'Monto (C$)'];
        headerRow1.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 };
        headerRow1.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FF388E3C' },
        };
        headerRow1.alignment = { horizontal: 'center', vertical: 'middle' };
        headerRow1.height = 22;

        // Datos del resumen
        const addDataRow = (label, value) => {
            const row = worksheet.addRow([label, parseFloat(value.toString())]);
            row.getCell(2).numFmt = '"C$"#,##0.00';
            row.eachCell((cell) => {
                cell.border = {
                    top: { style: 'thin', color: { argb: 'FFD3D3D3' } },
                    left: { style: 'thin', color: { argb: 'FFD3D3D3' } },
                    bottom: { style: 'thin', color: { argb: 'FFD3D3D3' } },
                    right: { style: 'thin', color: { argb: 'FFD3D3D3' } },
                };
            });
            return row;
        };

        addDataRow('Capital en Circulación', data.snapshot.totalPrincipalOutstanding);
        addDataRow('Capital Recuperado', data.snapshot.totalPrincipalRecovered);
        addDataRow('Intereses Cobrados', data.snapshot.totalInterestCollected);
        addDataRow('Moras Cobradas', data.snapshot.totalLateFeesCollected);

        // Total ingresos
        const totalIngresos = new Decimal(data.snapshot.totalInterestCollected)
            .plus(data.snapshot.totalLateFeesCollected);
        
        const totalRow = worksheet.addRow(['TOTAL INGRESOS', totalIngresos.toNumber()]);
        totalRow.font = { bold: true, size: 12 };
        totalRow.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFE8F5E9' },
        };
        totalRow.getCell(2).numFmt = '"C$"#,##0.00';
        totalRow.eachCell((cell) => {
            cell.border = {
                top: { style: 'double' },
                bottom: { style: 'double' },
            };
        });

        worksheet.addRow([]); // Espacio

        // === SECCIÓN 2: DISTRIBUCIÓN 70/30 ===
        const section2Row = worksheet.addRow(['DISTRIBUCIÓN DE GANANCIAS (70/30)']);
        section2Row.font = { size: 12, bold: true, color: { argb: 'FF1565C0' } };
        worksheet.mergeCells(`A${section2Row.number}:B${section2Row.number}`);
        section2Row.height = 25;

        const headerRow2 = worksheet.getRow(worksheet.rowCount + 1);
        headerRow2.values = ['Beneficiario', 'Monto (C$)'];
        headerRow2.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 };
        headerRow2.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FF1976D2' },
        };
        headerRow2.alignment = { horizontal: 'center', vertical: 'middle' };
        headerRow2.height = 22;

        // Inversionista
        const investorRow = worksheet.addRow(['Inversionista (70%)', parseFloat(data.snapshot.investorShare)]);
        investorRow.getCell(2).numFmt = '"C$"#,##0.00';
        investorRow.getCell(1).fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFC8E6C9' }, // Verde claro
        };
        investorRow.getCell(1).font = { bold: true };
        investorRow.eachCell((cell) => {
            cell.border = {
                top: { style: 'thin', color: { argb: 'FFD3D3D3' } },
                left: { style: 'thin', color: { argb: 'FFD3D3D3' } },
                bottom: { style: 'thin', color: { argb: 'FFD3D3D3' } },
                right: { style: 'thin', color: { argb: 'FFD3D3D3' } },
            };
        });

        // Admin
        const adminRow = worksheet.addRow(['Administrador (30%)', parseFloat(data.snapshot.adminShare)]);
        adminRow.getCell(2).numFmt = '"C$"#,##0.00';
        adminRow.getCell(1).fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFBBDEFB' }, // Azul claro
        };
        adminRow.getCell(1).font = { bold: true };
        adminRow.eachCell((cell) => {
            cell.border = {
                top: { style: 'thin', color: { argb: 'FFD3D3D3' } },
                left: { style: 'thin', color: { argb: 'FFD3D3D3' } },
                bottom: { style: 'thin', color: { argb: 'FFD3D3D3' } },
                right: { style: 'thin', color: { argb: 'FFD3D3D3' } },
            };
        });

        // Total distribuido
        const totalDistRow = worksheet.addRow(['TOTAL DISTRIBUIDO', totalIngresos.toNumber()]);
        totalDistRow.font = { bold: true, size: 12 };
        totalDistRow.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFE3F2FD' },
        };
        totalDistRow.getCell(2).numFmt = '"C$"#,##0.00';
        totalDistRow.eachCell((cell) => {
            cell.border = {
                top: { style: 'double' },
                bottom: { style: 'double' },
            };
        });

        worksheet.addRow([]); // Espacio

        // === SECCIÓN 3: INDICADORES DE GESTIÓN ===
        const section3Row = worksheet.addRow(['INDICADORES DE GESTIÓN']);
        section3Row.font = { size: 12, bold: true, color: { argb: 'FFF57C00' } };
        worksheet.mergeCells(`A${section3Row.number}:B${section3Row.number}`);
        section3Row.height = 25;

        const headerRow3 = worksheet.getRow(worksheet.rowCount + 1);
        headerRow3.values = ['Indicador', 'Valor'];
        headerRow3.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 };
        headerRow3.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFFB8C00' },
        };
        headerRow3.alignment = { horizontal: 'center', vertical: 'middle' };
        headerRow3.height = 22;

        // Indicadores
        const indicators = [
            ['Tasa de Recuperación', `${data.indicators.recoveryRate}%`],
            ['Préstamos Activos', data.indicators.activeLoans],
            ['Préstamos Completados', data.indicators.completedInMonth],
            ['Clientes en Mora', data.indicators.overdueLoanCount],
            ['Días Promedio de Mora', data.indicators.avgMoraDays === 0 ? 'N/A' : `${data.indicators.avgMoraDays} días`],
        ];

        indicators.forEach(([label, value]) => {
            const row = worksheet.addRow([label, value]);
            row.alignment = { horizontal: 'left', vertical: 'middle' };
            row.eachCell((cell) => {
                cell.border = {
                    top: { style: 'thin', color: { argb: 'FFD3D3D3' } },
                    left: { style: 'thin', color: { argb: 'FFD3D3D3' } },
                    bottom: { style: 'thin', color: { argb: 'FFD3D3D3' } },
                    right: { style: 'thin', color: { argb: 'FFD3D3D3' } },
                };
            });
        });

        // Ajustar anchos de columnas
        worksheet.getColumn(1).width = 35;
        worksheet.getColumn(2).width = 20;

        // Alinear segunda columna al centro
        worksheet.getColumn(2).alignment = { horizontal: 'right', vertical: 'middle' };

        return await workbook.xlsx.writeBuffer();
    }

    _buildPdfBuffer(populateDocument) {
        return new Promise((resolve, reject) => {
            const doc = new PDFDocument({ margin: 40, size: 'A4' });
            const chunks = [];

            doc.on('data', (chunk) => chunks.push(chunk));
            doc.on('end', () => resolve(Buffer.concat(chunks)));
            doc.on('error', reject);

            populateDocument(doc);
            doc.end();
        });
    }

    async generateBalancePdf(data, month, year) {
        const monthName = moment().month(month - 1).year(year).format('MMMM YYYY');

        return this._buildPdfBuffer((doc) => {
            doc.fontSize(18).text(`BALANCE MENSUAL - ${monthName.toUpperCase()}`, { align: 'center' });
            doc.moveDown(0.5);
            doc.fontSize(10).fillColor('gray').text(`Generado: ${moment().tz(TIMEZONE).format('DD/MM/YYYY HH:mm')}`, { align: 'right' });
            doc.fillColor('black');
            doc.moveDown();

            doc.fontSize(13).text('Resumen Ejecutivo');
            doc.moveDown(0.5);

            const rows = [
                ['Capital en circulación', `C$ ${new Decimal(data.snapshot.totalPrincipalOutstanding || 0).toFixed(2)}`],
                ['Capital recuperado', `C$ ${new Decimal(data.snapshot.totalPrincipalRecovered || 0).toFixed(2)}`],
                ['Intereses cobrados', `C$ ${new Decimal(data.snapshot.totalInterestCollected || 0).toFixed(2)}`],
                ['Moras cobradas', `C$ ${new Decimal(data.snapshot.totalLateFeesCollected || 0).toFixed(2)}`],
                ['Inversionista', `C$ ${new Decimal(data.snapshot.investorShare || 0).toFixed(2)}`],
                ['Administrador', `C$ ${new Decimal(data.snapshot.adminShare || 0).toFixed(2)}`],
                ['Tasa de recuperación', `${data.indicators.recoveryRate}%`],
                ['Préstamos activos', `${data.indicators.activeLoans}`],
                ['Préstamos completados', `${data.indicators.completedInMonth}`],
                ['Préstamos en mora', `${data.indicators.overdueLoanCount}`],
                ['Días promedio de mora', `${data.indicators.avgMoraDays}`],
            ];

            rows.forEach(([label, value]) => {
                doc.fontSize(11).text(`${label}:`, { continued: true }).font('Helvetica-Bold').text(` ${value}`);
                doc.font('Helvetica');
            });

            doc.moveDown();
            doc.fontSize(9).fillColor('gray').text('Documento generado automáticamente por el sistema de microfinanzas.');
        });
    }

    async getClienteEstadoCuentaData(clientId) {
        const client = await this.reportsRepository.findUniqueClient({
            where: { id: clientId },
            include: {
                category: true,
                loans: {
                    orderBy: { createdAt: 'desc' },
                    include: {
                        paymentSchedules: {
                            orderBy: { paymentNumber: 'asc' }
                        },
                        payments: {
                            where: { status: 'CONFIRMED' },
                            orderBy: { paymentDate: 'desc' }
                        }
                    }
                }
            }
        });

        if (!client) {
            throw new Error('CLIENT_NOT_FOUND');
        }

        const totals = client.loans.reduce((acc, loan) => {
            const principal = new Decimal(loan.principalAmount || 0);
            const total = new Decimal(loan.totalAmount || 0);
            const remaining = new Decimal(loan.remainingBalance || 0);
            const paid = loan.payments.reduce((sum, payment) => {
                return sum
                    .plus(new Decimal(payment.principalPaid || 0))
                    .plus(new Decimal(payment.interestPaid || 0))
                    .plus(new Decimal(payment.lateFeePaid || 0));
            }, new Decimal(0));

            acc.principal = acc.principal.plus(principal);
            acc.total = acc.total.plus(total);
            acc.paid = acc.paid.plus(paid);
            acc.remaining = acc.remaining.plus(remaining);
            return acc;
        }, {
            principal: new Decimal(0),
            total: new Decimal(0),
            paid: new Decimal(0),
            remaining: new Decimal(0)
        });

        return { client, totals };
    }

    async generateClienteEstadoCuentaPdf(payload) {
        const { client, totals } = payload;

        return this._buildPdfBuffer((doc) => {
            doc.fontSize(16).text('ESTADO DE CUENTA DEL CLIENTE', { align: 'center' });
            doc.moveDown(0.5);
            doc.fontSize(10).fillColor('gray').text(`Generado: ${moment().tz(TIMEZONE).format('DD/MM/YYYY HH:mm')}`, { align: 'right' });
            doc.fillColor('black');
            doc.moveDown();

            doc.fontSize(12).text(`Cliente: ${client.fullName}`);
            doc.fontSize(11).text(`Identificación: ${client.identificationNumber || 'N/A'}`);
            doc.fontSize(11).text(`Categoría: ${client.category?.displayName || client.category?.name || 'N/A'}`);
            doc.fontSize(11).text(`Teléfono: ${client.phoneNumber || 'N/A'}`);
            doc.moveDown();

            doc.fontSize(12).text('Resumen acumulado');
            doc.fontSize(11).text(`Capital prestado: C$ ${totals.principal.toFixed(2)}`);
            doc.fontSize(11).text(`Total adeudado histórico: C$ ${totals.total.toFixed(2)}`);
            doc.fontSize(11).text(`Total pagado: C$ ${totals.paid.toFixed(2)}`);
            doc.fontSize(11).text(`Saldo pendiente actual: C$ ${totals.remaining.toFixed(2)}`);
            doc.moveDown();

            doc.fontSize(12).text('Préstamos');
            if (client.loans.length === 0) {
                doc.fontSize(10).text('Sin préstamos registrados.');
            }

            client.loans.forEach((loan, index) => {
                const overdueCount = loan.paymentSchedules.filter((item) => item.status === 'OVERDUE').length;
                const paidCount = loan.paymentSchedules.filter((item) => item.status === 'PAID').length;

                doc.moveDown(0.5);
                doc.fontSize(11).font('Helvetica-Bold').text(`${index + 1}. ${loan.folio} (${loan.statusLoan})`);
                doc.font('Helvetica');
                doc.fontSize(10).text(`Capital: C$ ${new Decimal(loan.principalAmount || 0).toFixed(2)} | Total: C$ ${new Decimal(loan.totalAmount || 0).toFixed(2)} | Saldo: C$ ${new Decimal(loan.remainingBalance || 0).toFixed(2)}`);
                doc.fontSize(10).text(`Cuotas pagadas: ${paidCount}/${loan.paymentSchedules.length} | Cuotas en mora: ${overdueCount}`);
                doc.fontSize(10).text(`Desembolso: ${loan.disbursementDate ? moment(loan.disbursementDate).tz(TIMEZONE).format('DD/MM/YYYY') : 'N/A'} | Vencimiento: ${loan.maturityDate ? moment(loan.maturityDate).tz(TIMEZONE).format('DD/MM/YYYY') : 'N/A'}`);
            });
        });
    }

    async getReciboPagoData(paymentId) {
        const payment = await this.reportsRepository.findUniquePayment({
            where: { id: paymentId },
            include: {
                creator: {
                    select: {
                        id: true,
                        email: true,
                        role: true
                    }
                },
                loan: {
                    include: {
                        client: {
                            select: {
                                id: true,
                                fullName: true,
                                identificationNumber: true,
                                phoneNumber: true
                            }
                        }
                    }
                }
            }
        });

        if (!payment) {
            throw new Error('PAYMENT_NOT_FOUND');
        }

        return payment;
    }

    async generateReciboPagoPdf(payment) {
        return this._buildPdfBuffer((doc) => {
            doc.fontSize(18).text('RECIBO DE PAGO', { align: 'center' });
            doc.moveDown(0.5);
            doc.fontSize(10).fillColor('gray').text(`Generado: ${moment().tz(TIMEZONE).format('DD/MM/YYYY HH:mm')}`, { align: 'right' });
            doc.fillColor('black');
            doc.moveDown();

            doc.fontSize(11).text(`Folio recibo: ${payment.receiptFolio || payment.id}`);
            doc.fontSize(11).text(`Fecha de pago: ${moment(payment.paymentDate).tz(TIMEZONE).format('DD/MM/YYYY HH:mm')}`);
            doc.fontSize(11).text(`Método: ${payment.paymentMethod}`);
            doc.fontSize(11).text(`Estado: ${payment.status}`);
            doc.moveDown();

            doc.fontSize(12).text('Cliente y préstamo');
            doc.fontSize(11).text(`Cliente: ${payment.loan?.client?.fullName || 'N/A'}`);
            doc.fontSize(11).text(`Identificación: ${payment.loan?.client?.identificationNumber || 'N/A'}`);
            doc.fontSize(11).text(`Préstamo: ${payment.loan?.folio || 'N/A'}`);
            doc.moveDown();

            doc.fontSize(12).text('Desglose del pago');
            doc.fontSize(11).text(`Monto total: C$ ${new Decimal(payment.amount || 0).toFixed(2)}`);
            doc.fontSize(11).text(`Capital pagado: C$ ${new Decimal(payment.principalPaid || 0).toFixed(2)}`);
            doc.fontSize(11).text(`Interés pagado: C$ ${new Decimal(payment.interestPaid || 0).toFixed(2)}`);
            doc.fontSize(11).text(`Mora pagada: C$ ${new Decimal(payment.lateFeePaid || 0).toFixed(2)}`);

            if (payment.notes) {
                doc.moveDown();
                doc.fontSize(11).text(`Notas: ${payment.notes}`);
            }

            doc.moveDown();
            doc.fontSize(10).fillColor('gray').text(`Registrado por: ${payment.creator?.email || 'Sistema'}`);
        });
    }
}

module.exports = new ReportsService();
