/**
 * Monthly Closing Service
 * Servicio de cierre mensual con distribución 70/30
 * 
 * LÓGICA FINANCIERA CRÍTICA:
 * - Capital Recuperado (Principal): NO es ganancia, retorna al inversionista
 * - Ganancia Bruta = Interés + Mora: ESTO se reparte según porcentajes
 * - Distribución: investorSharePercentage / adminSharePercentage (ej: 70% / 30%)
 */

const { repositoriesContainer } = require('../infrastructure/container/repositories.container');
const Decimal = require('decimal.js');

class MonthlyClosingService {
    constructor() {
        this.balanceSnapshotRepository = repositoriesContainer.balanceSnapshotRepository;
        this.configRepository = repositoriesContainer.configRepository;
        this.paymentRepository = repositoriesContainer.paymentRepository;
        this.loanRepository = repositoriesContainer.loanRepository;
    }

    /**
     * Ejecutar cierre mensual contable
     * @param {Object} params
     * @param {number} params.month - Mes (1-12)
     * @param {number} params.year - Año (YYYY)
     * @param {string} params.userId - ID del usuario ejecutor
     * @returns {Promise<Object>} BalanceSnapshot creado/actualizado
     */
    async executeClosing({ month, year, userId }) {
        try {
            console.log(`[MonthlyClosing] Iniciando cierre de ${month}/${year}...`);

            // ========================================
            // 1. VALIDACIONES
            // ========================================
            this._validatePeriod(month, year);

            // ========================================
            // 2. CALCULAR RANGO DE FECHAS DEL MES
            // ========================================
            const { startDate, endDate } = this._getMonthRange(month, year);

            console.log(`[MonthlyClosing] Rango: ${startDate.toISOString()} → ${endDate.toISOString()}`);

            // ========================================
            // 3. OBTENER CONFIGURACIÓN DEL SISTEMA
            // ========================================
            const config = await this._getSystemConfig();

            const investorPercentage = new Decimal(config.investorSharePercentage);
            const adminPercentage = new Decimal(config.adminSharePercentage);

            console.log(`[MonthlyClosing] Distribución: ${investorPercentage.mul(100)}% inversionista / ${adminPercentage.mul(100)}% admin`);

            // ========================================
            // 4. OBTENER DATOS FINANCIEROS DEL PERÍODO
            // ========================================
            const financialData = await this._aggregatePayments(startDate, endDate);

            console.log(`[MonthlyClosing] Datos agregados:`, {
                principal: financialData.totalPrincipalRecovered.toString(),
                interest: financialData.totalInterestCollected.toString(),
                lateFees: financialData.totalLateFeesCollected.toString(),
                paymentsCount: financialData.paymentsCount
            });

            // ========================================
            // 5. CALCULAR DISTRIBUCIÓN 70/30
            // ========================================
            const distribution = this._calculateDistribution(
                financialData,
                investorPercentage,
                adminPercentage
            );

            console.log(`[MonthlyClosing] Distribución calculada:`, {
                grossProfit: distribution.grossProfit.toString(),
                investorShare: distribution.investorShare.toString(),
                adminShare: distribution.adminShare.toString()
            });

            // ========================================
            // 6. CALCULAR CAPITAL PENDIENTE
            // ========================================
            const totalPrincipalOutstanding = await this._calculateOutstandingPrincipal();

            console.log(`[MonthlyClosing] Capital pendiente: ${totalPrincipalOutstanding.toString()}`);

            // ========================================
            // 7. PERSISTIR SNAPSHOT (UPSERT)
            // ========================================
            const snapshot = await this.balanceSnapshotRepository.upsert({
                where: {
                    month_year: {
                        month,
                        year
                    }
                },
                update: {
                    totalPrincipalRecovered: financialData.totalPrincipalRecovered,
                    totalInterestCollected: financialData.totalInterestCollected,
                    totalLateFeesCollected: financialData.totalLateFeesCollected,
                    totalPrincipalOutstanding,
                    investorShare: distribution.investorShare,
                    adminShare: distribution.adminShare,
                    exchangeRateApplied: config.exchangeRateNioUsd,
                    generatedBy: userId,
                    generatedAt: new Date(),
                    notes: `Actualizado: ${financialData.paymentsCount} pagos procesados`
                },
                create: {
                    month,
                    year,
                    totalPrincipalRecovered: financialData.totalPrincipalRecovered,
                    totalInterestCollected: financialData.totalInterestCollected,
                    totalLateFeesCollected: financialData.totalLateFeesCollected,
                    totalPrincipalOutstanding,
                    investorShare: distribution.investorShare,
                    adminShare: distribution.adminShare,
                    exchangeRateApplied: config.exchangeRateNioUsd,
                    generatedBy: userId,
                    notes: `Creado: ${financialData.paymentsCount} pagos procesados`
                },
                include: {
                    generator: {
                        select: {
                            id: true,
                            email: true,
                            role: true
                        }
                    }
                }
            });

            console.log(`[MonthlyClosing] Snapshot ${snapshot.id} guardado correctamente`);

            // ========================================
            // 8. RETORNAR RESULTADO CON MÉTRICAS
            // ========================================
            return {
                success: true,
                snapshot,
                metrics: {
                    period: `${month}/${year}`,
                    paymentsProcessed: financialData.paymentsCount,
                    totalPrincipalRecovered: financialData.totalPrincipalRecovered.toNumber(),
                    totalInterestCollected: financialData.totalInterestCollected.toNumber(),
                    totalLateFeesCollected: financialData.totalLateFeesCollected.toNumber(),
                    grossProfit: distribution.grossProfit.toNumber(),
                    investorShare: distribution.investorShare.toNumber(),
                    adminShare: distribution.adminShare.toNumber(),
                    totalPrincipalOutstanding: totalPrincipalOutstanding.toNumber(),
                    distributionRatio: `${investorPercentage.mul(100).toFixed(0)}/${adminPercentage.mul(100).toFixed(0)}`
                }
            };

        } catch (error) {
            console.error('[MonthlyClosing] Error en cierre mensual:', error);
            throw error;
        }
    }

    /**
     * Obtener historial de cierres mensuales
     * @param {Object} params
     * @param {number} params.limit - Límite de resultados
     * @param {number} params.offset - Offset para paginación
     * @param {number} [params.year] - Año para filtrar (opcional)
     * @returns {Promise<Array>} Lista de snapshots
     */
    async getClosingHistory({ limit = 12, offset = 0, year } = {}) {
        try {
            const where = year ? { year } : {};

            const snapshots = await this.balanceSnapshotRepository.findMany({
                take: limit,
                skip: offset,
                where,
                orderBy: [
                    { year: 'desc' },
                    { month: 'desc' }
                ],
                include: {
                    generator: {
                        select: {
                            id: true,
                            email: true,
                            role: true
                        }
                    }
                }
            });

            const total = await this.balanceSnapshotRepository.count({ where });

            return {
                data: snapshots,
                pagination: {
                    total,
                    limit,
                    offset,
                    hasMore: (offset + limit) < total
                }
            };

        } catch (error) {
            console.error('[MonthlyClosing] Error al obtener historial:', error);
            throw error;
        }
    }

    /**
     * Obtener snapshot de un período específico
     * @param {number} month - Mes (1-12)
     * @param {number} year - Año (YYYY)
     * @returns {Promise<Object|null>} Snapshot o null si no existe
     */
    async getClosingByPeriod(month, year) {
        try {
            this._validatePeriod(month, year);

            const snapshot = await this.balanceSnapshotRepository.findUnique({
                where: {
                    month_year: {
                        month,
                        year
                    }
                },
                include: {
                    generator: {
                        select: {
                            id: true,
                            email: true,
                            role: true
                        }
                    }
                }
            });

            return snapshot;

        } catch (error) {
            console.error('[MonthlyClosing] Error al obtener snapshot:', error);
            throw error;
        }
    }

    /**
     * GET /api/admin/closing/stats - Estadísticas anuales agregadas
     */
    async getAnnualStats(year) {
        try {
            const currentYear = new Date().getFullYear();
            if (!year || year < 2020 || year > currentYear) {
                throw new Error(`Año inválido. Debe estar entre 2020 y ${currentYear}`);
            }

            const snapshots = await this.balanceSnapshotRepository.findMany({
                where: { year },
                orderBy: { month: 'asc' }
            });

            if (snapshots.length === 0) {
                return {
                    year,
                    annualGrossProfit: 0,
                    annualInvestorShare: 0,
                    annualAdminShare: 0,
                    totalPrincipalRecovered: 0,
                    monthlyBreakdown: []
                };
            }

            let annualGrossProfit = new Decimal(0);
            let annualInvestorShare = new Decimal(0);
            let annualAdminShare = new Decimal(0);
            let totalPrincipalRecovered = new Decimal(0);

            const monthlyBreakdown = snapshots.map(snap => {
                const grossProfit = new Decimal(snap.totalInterestCollected)
                    .add(new Decimal(snap.totalLateFeesCollected));

                annualGrossProfit = annualGrossProfit.add(grossProfit);
                annualInvestorShare = annualInvestorShare.add(new Decimal(snap.investorShare));
                annualAdminShare = annualAdminShare.add(new Decimal(snap.adminShare));
                totalPrincipalRecovered = totalPrincipalRecovered.add(new Decimal(snap.totalPrincipalRecovered));

                return {
                    month: snap.month,
                    monthName: this._getMonthName(snap.month),
                    grossProfit: grossProfit.toNumber(),
                    investorShare: parseFloat(snap.investorShare),
                    adminShare: parseFloat(snap.adminShare),
                    principalRecovered: parseFloat(snap.totalPrincipalRecovered)
                };
            });

            return {
                year,
                annualGrossProfit: annualGrossProfit.toNumber(),
                annualInvestorShare: annualInvestorShare.toNumber(),
                annualAdminShare: annualAdminShare.toNumber(),
                totalPrincipalRecovered: totalPrincipalRecovered.toNumber(),
                monthlyBreakdown
            };

        } catch (error) {
            console.error('[MonthlyClosing] Error en getAnnualStats:', error);
            throw error;
        }
    }

    /**
     * GET /api/admin/closing/compare - Comparar períodos mes a mes
     */
    async comparePeriods(fromMonth, toMonth, year) {
        try {
            if (fromMonth < 1 || fromMonth > 12 || toMonth < 1 || toMonth > 12) {
                throw new Error('Los meses deben estar entre 1 y 12');
            }

            if (fromMonth > toMonth) {
                throw new Error('El mes inicial no puede ser mayor al mes final');
            }

            const currentYear = new Date().getFullYear();
            if (!year || year < 2020 || year > currentYear) {
                throw new Error(`Año inválido. Debe estar entre 2020 y ${currentYear}`);
            }

            const snapshots = await this.balanceSnapshotRepository.findMany({
                where: {
                    year,
                    month: {
                        gte: fromMonth,
                        lte: toMonth
                    }
                },
                orderBy: { month: 'asc' }
            });

            const periods = snapshots.map((snap, index) => {
                const grossProfit = new Decimal(snap.totalInterestCollected)
                    .add(new Decimal(snap.totalLateFeesCollected));

                let growth = null;
                if (index > 0) {
                    const prevGrossProfit = new Decimal(snapshots[index - 1].totalInterestCollected)
                        .add(new Decimal(snapshots[index - 1].totalLateFeesCollected));

                    if (prevGrossProfit.gt(0)) {
                        const growthValue = grossProfit.sub(prevGrossProfit)
                            .div(prevGrossProfit)
                            .mul(100);
                        growth = (growthValue.gte(0) ? '+' : '') + growthValue.toFixed(2) + '%';
                    }
                }

                return {
                    month: snap.month,
                    monthName: this._getMonthName(snap.month),
                    grossProfit: grossProfit.toNumber(),
                    growth
                };
            });

            return { periods };

        } catch (error) {
            console.error('[MonthlyClosing] Error en comparePeriods:', error);
            throw error;
        }
    }

    /**
     * GET /api/admin/closing/current - Datos del mes actual
     */
    async getCurrentMonthData() {
        try {
            const now = new Date();
            const currentMonth = now.getMonth() + 1;
            const currentYear = now.getFullYear();

            let snapshot = await this.balanceSnapshotRepository.findUnique({
                where: {
                    month_year: {
                        month: currentMonth,
                        year: currentYear
                    }
                }
            });

            let isCurrentMonth = true;

            if (!snapshot) {
                snapshot = await this.balanceSnapshotRepository.findFirst({
                    orderBy: [
                        { year: 'desc' },
                        { month: 'desc' }
                    ]
                });
                isCurrentMonth = false;
            }

            if (!snapshot) {
                throw new Error('No existe ningún cierre mensual. Ejecuta POST /api/admin/monthly-closing primero');
            }

            const grossProfit = new Decimal(snapshot.totalInterestCollected)
                .add(new Decimal(snapshot.totalLateFeesCollected));

            const config = await this._getSystemConfig();
            const investorPct = new Decimal(config.investorSharePercentage).mul(100).toFixed(0);
            const adminPct = new Decimal(config.adminSharePercentage).mul(100).toFixed(0);

            return {
                month: snapshot.month,
                year: snapshot.year,
                monthName: this._getMonthName(snapshot.month),
                grossProfit: grossProfit.toNumber(),
                investorShare: parseFloat(snapshot.investorShare),
                adminShare: parseFloat(snapshot.adminShare),
                principalRecovered: parseFloat(snapshot.totalPrincipalRecovered),
                distributionRatio: `${investorPct}/${adminPct}`,
                isCurrentMonth
            };

        } catch (error) {
            console.error('[MonthlyClosing] Error en getCurrentMonthData:', error);
            throw error;
        }
    }

    /**
     * GET /api/admin/closing/trends - Tendencias de los últimos N meses
     */
    async getMonthlyTrends(months = 6) {
        try {
            if (months < 1 || months > 24) {
                throw new Error('El parámetro months debe estar entre 1 y 24');
            }

            const snapshots = await this.balanceSnapshotRepository.findMany({
                take: months,
                orderBy: [
                    { year: 'desc' },
                    { month: 'desc' }
                ]
            });

            if (snapshots.length === 0) {
                return {
                    trends: [],
                    averageGrowth: '0%',
                    bestMonth: null,
                    worstMonth: null
                };
            }

            const trends = snapshots.reverse().map(snap => {
                const grossProfit = new Decimal(snap.totalInterestCollected)
                    .add(new Decimal(snap.totalLateFeesCollected));

                return {
                    month: snap.month,
                    year: snap.year,
                    monthName: this._getMonthName(snap.month),
                    grossProfit: grossProfit.toNumber()
                };
            });

            let bestMonth = trends[0];
            let worstMonth = trends[0];
            let totalGrowth = new Decimal(0);
            let growthCount = 0;

            for (let i = 1; i < trends.length; i++) {
                if (trends[i].grossProfit > bestMonth.grossProfit) {
                    bestMonth = trends[i];
                }
                if (trends[i].grossProfit < worstMonth.grossProfit) {
                    worstMonth = trends[i];
                }

                const prev = new Decimal(trends[i - 1].grossProfit);
                const current = new Decimal(trends[i].grossProfit);

                if (prev.gt(0)) {
                    const growth = current.sub(prev).div(prev).mul(100);
                    totalGrowth = totalGrowth.add(growth);
                    growthCount++;
                }
            }

            const averageGrowth = growthCount > 0
                ? (totalGrowth.div(growthCount).gte(0) ? '+' : '') + totalGrowth.div(growthCount).toFixed(2) + '%'
                : '0%';

            return {
                trends,
                averageGrowth,
                bestMonth: {
                    month: bestMonth.month,
                    year: bestMonth.year,
                    monthName: bestMonth.monthName,
                    grossProfit: bestMonth.grossProfit
                },
                worstMonth: {
                    month: worstMonth.month,
                    year: worstMonth.year,
                    monthName: worstMonth.monthName,
                    grossProfit: worstMonth.grossProfit
                }
            };

        } catch (error) {
            console.error('[MonthlyClosing] Error en getMonthlyTrends:', error);
            throw error;
        }
    }

    // Métodos privados

    _validatePeriod(month, year) {
        if (!month || month < 1 || month > 12) {
            throw new Error('El mes debe estar entre 1 y 12');
        }

        const currentYear = new Date().getFullYear();
        if (!year || year < 2020 || year > currentYear + 1) {
            throw new Error(`El año debe estar entre 2020 y ${currentYear + 1}`);
        }

        const now = new Date();
        const requestedDate = new Date(year, month - 1, 1);

        if (requestedDate > now) {
            throw new Error('No se puede cerrar un período futuro');
        }
    }

    _getMonthRange(month, year) {
        const startDate = new Date(Date.UTC(year, month - 1, 1, 6, 0, 0));
        const endDate = new Date(Date.UTC(year, month, 0, 5, 59, 59, 999));
        return { startDate, endDate };
    }

    async _getSystemConfig() {
        const config = await this.configRepository.getCurrentConfig();

        if (!config) {
            throw new Error('No existe configuración del sistema. Crea una primero en /api/config');
        }

        let investorPct = new Decimal(config.investorSharePercentage);
        let adminPct = new Decimal(config.adminSharePercentage);

        // Normalizar: si vienen como 70/30, convertir a 0.70/0.30
        if (investorPct.gt(1)) {
            investorPct = investorPct.div(100);
        }
        if (adminPct.gt(1)) {
            adminPct = adminPct.div(100);
        }

        const total = investorPct.add(adminPct);

        if (!total.equals(new Decimal(1))) {
            throw new Error(`Los porcentajes de distribución no suman 100% (${investorPct.mul(100)}% + ${adminPct.mul(100)}% = ${total.mul(100)}%)`);
        }

        // Retornar config con valores normalizados
        return {
            ...config,
            investorSharePercentage: investorPct,
            adminSharePercentage: adminPct
        };
    }

    /**
     * CONTABILIDAD TRANSACCIONAL - Agregación basada en flujo de caja real
     * 
     * Consulta la tabla Payment (tabla de hechos) para obtener datos exactos del período.
     * Esto reemplaza la consulta anterior a PaymentSchedule que solo mostraba estado final.
     * 
     * @param {Date} startDate - Inicio del período
     * @param {Date} endDate - Fin del período
     * @returns {Promise<Object>} Datos financieros agregados del período
     */
    async _aggregatePayments(startDate, endDate) {
        // Nueva lógica: consultar tabla Payment directamente
        const result = await this.paymentRepository.aggregate({
            where: {
                paymentDate: {
                    gte: startDate,
                    lte: endDate
                },
                status: 'CONFIRMED'  // Solo pagos confirmados
            },
            _sum: {
                principalPaid: true,  // ← Nuevo campo
                interestPaid: true,   // ← Nuevo campo
                lateFeePaid: true     // ← Nuevo campo
            },
            _count: true
        });

        console.log('[MonthlyClosing] Agregación desde Payment:', {
            payments: result._count,
            principal: result._sum.principalPaid,
            interest: result._sum.interestPaid,
            lateFees: result._sum.lateFeePaid
        });

        return {
            totalPrincipalRecovered: new Decimal(result._sum.principalPaid || 0),
            totalInterestCollected: new Decimal(result._sum.interestPaid || 0),
            totalLateFeesCollected: new Decimal(result._sum.lateFeePaid || 0),
            paymentsCount: result._count
        };
    }

    _calculateDistribution(financialData, investorPercentage, adminPercentage) {
        const grossProfit = financialData.totalInterestCollected
            .add(financialData.totalLateFeesCollected);

        const investorShare = grossProfit.mul(investorPercentage);
        const adminShare = grossProfit.mul(adminPercentage);

        const total = investorShare.add(adminShare);
        const diff = grossProfit.sub(total).abs();

        if (diff.greaterThan(new Decimal(0.01))) {
            console.warn(`[MonthlyClosing] Diferencia en distribución: ${diff.toString()}`);
        }

        return { grossProfit, investorShare, adminShare };
    }

    async _calculateOutstandingPrincipal() {
        const result = await this.loanRepository.aggregate({
            where: {
                statusLoan: {
                    in: ['ACTIVE', 'PENDING']
                }
            },
            _sum: {
                remainingBalance: true
            }
        });

        return new Decimal(result._sum.remainingBalance || 0);
    }

    _getMonthName(monthNumber) {
        const months = [
            'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
            'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
        ];
        return months[monthNumber - 1] || 'Desconocido';
    }
}

module.exports = new MonthlyClosingService();
