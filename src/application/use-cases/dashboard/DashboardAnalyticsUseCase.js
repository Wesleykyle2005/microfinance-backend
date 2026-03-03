const Decimal = require('decimal.js');
const { toLocalISO, formatDate, getStartOfDay, getEndOfDay } = require('../../../utils/timezone.util');

const parseBoolean = (value, defaultValue = false) => {
    if (value === undefined || value === null || value === '') return defaultValue;
    if (typeof value === 'boolean') return value;
    return String(value).toLowerCase() === 'true';
};

const parseDateRange = (from, to) => {
    const range = {};

    if (from) {
        const fromDate = new Date(from);
        if (!Number.isNaN(fromDate.getTime())) {
            fromDate.setHours(0, 0, 0, 0);
            range.gte = fromDate;
        }
    }

    if (to) {
        const toDate = new Date(to);
        if (!Number.isNaN(toDate.getTime())) {
            toDate.setHours(23, 59, 59, 999);
            range.lte = toDate;
        }
    }

    return Object.keys(range).length > 0 ? range : null;
};

const parseStatuses = (value) => {
    if (!value) return [];
    return String(value)
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean);
};

const buildLoanWhereFromFilters = (filters) => {
    const where = {};

    if (filters.collectorId) {
        where.collectorId = filters.collectorId;
    }

    if (filters.categoryId) {
        where.client = {
            ...(where.client || {}),
            categoryId: filters.categoryId
        };
    }

    if (!filters.includeInactiveClients) {
        where.client = {
            ...(where.client || {}),
            isActive: true
        };
    }

    if (filters.loanStatuses.length > 0) {
        where.statusLoan = {
            in: filters.loanStatuses
        };
    }

    if (filters.loanCreatedAtRange) {
        where.createdAt = filters.loanCreatedAtRange;
    }

    return where;
};

const buildPaymentWhereFromFilters = (filters, loanWhere) => {
    const where = {
        status: {
            not: 'FAILED'
        }
    };

    if (Object.keys(loanWhere).length > 0) {
        where.loan = loanWhere;
    }

    if (filters.paymentDateRange) {
        where.paymentDate = filters.paymentDateRange;
    }

    return where;
};

const parseOverviewFilters = (query = {}) => {
    const {
        from,
        to,
        collectorId,
        categoryId,
        loanStatus,
        includeInactiveClients
    } = query;

    return {
        from: from || null,
        to: to || null,
        collectorId: collectorId || null,
        categoryId: categoryId || null,
        includeInactiveClients: parseBoolean(includeInactiveClients, false),
        loanStatuses: parseStatuses(loanStatus),
        loanCreatedAtRange: parseDateRange(from, to),
        paymentDateRange: parseDateRange(from, to)
    };
};

class DashboardAnalyticsUseCase {
    constructor(loanRepository, paymentRepository, clientRepository, clientCategoryRepository) {
        this.loanRepository = loanRepository;
        this.paymentRepository = paymentRepository;
        this.clientRepository = clientRepository;
        this.clientCategoryRepository = clientCategoryRepository;
    }

    async getOverview(query = {}) {
        const filters = parseOverviewFilters(query);
        const loanWhere = buildLoanWhereFromFilters(filters);
        const paymentWhere = buildPaymentWhereFromFilters(filters, loanWhere);
        const activeLoanWhere = {
            ...loanWhere,
            statusLoan: 'ACTIVE'
        };

        const [
            totalDisbursed,
            totalRecovered,
            activeLoansCount,
            capitalCirculating,
            loansWithOverdueCount,
            completedLoansCount,
            totalMoraAccrued,
            activeClients,
            portfolioDistribution,
            categories,
            pendingRequests
        ] = await Promise.all([
            this.loanRepository.aggregate({
                where: {
                    ...loanWhere,
                    statusLoan: {
                        in: ['ACTIVE', 'PAID_OFF', 'DEFAULTED']
                    }
                },
                _sum: {
                    principalAmount: true
                }
            }),
            this.paymentRepository.aggregate({
                where: paymentWhere,
                _sum: {
                    principalPaid: true,
                    interestPaid: true,
                    lateFeePaid: true
                }
            }),
            this.loanRepository.count({
                where: activeLoanWhere
            }),
            this.loanRepository.aggregate({
                where: activeLoanWhere,
                _sum: {
                    remainingBalance: true
                }
            }),
            this.loanRepository.count({
                where: {
                    ...activeLoanWhere,
                    paymentSchedules: {
                        some: {
                            status: 'OVERDUE'
                        }
                    }
                }
            }),
            this.loanRepository.count({
                where: {
                    ...loanWhere,
                    statusLoan: 'PAID_OFF'
                }
            }),
            this.loanRepository.aggregate({
                where: activeLoanWhere,
                _sum: {
                    lateFeesAccrued: true
                }
            }),
            this.clientRepository.count({
                where: {
                    ...(filters.categoryId ? { categoryId: filters.categoryId } : {}),
                    ...(filters.includeInactiveClients ? {} : { isActive: true })
                }
            }),
            this.loanRepository.groupBy({
                by: ['statusLoan'],
                where: loanWhere,
                _count: {
                    id: true
                },
                _sum: {
                    principalAmount: true,
                    remainingBalance: true
                }
            }),
            this.clientCategoryRepository.findMany({
                where: {
                    ...(filters.categoryId ? { id: filters.categoryId } : {}),
                    ...(filters.includeInactiveClients ? {} : { isActive: true })
                },
                include: {
                    clientProfiles: {
                        where: {
                            ...(filters.includeInactiveClients ? {} : { isActive: true })
                        },
                        select: {
                            id: true
                        }
                    }
                },
                orderBy: {
                    priorityOrder: 'asc'
                }
            }),
            this.loanRepository.findMany({
                where: {
                    ...loanWhere,
                    statusLoan: 'PENDING'
                },
                select: {
                    id: true,
                    folio: true,
                    createdAt: true,
                    principalAmount: true,
                    currency: true,
                    frequency: true,
                    termDays: true,
                    client: {
                        select: {
                            id: true,
                            fullName: true,
                            identificationNumber: true,
                            phoneNumber: true,
                            category: {
                                select: {
                                    displayName: true,
                                    name: true
                                }
                            }
                        }
                    }
                },
                orderBy: {
                    createdAt: 'desc'
                },
                take: 20
            })
        ]);

        const netProfit = new Decimal(totalRecovered._sum.interestPaid || 0)
            .plus(new Decimal(totalRecovered._sum.lateFeePaid || 0));

        const totalCapitalInvested = new Decimal(totalDisbursed._sum.principalAmount || 0);
        const totalCapitalRecovered = new Decimal(totalRecovered._sum.principalPaid || 0);

        const capitalRecoveryRate = totalCapitalInvested.gt(0)
            ? totalCapitalRecovered.div(totalCapitalInvested).mul(100).toNumber()
            : 0;

        const surplusRevenue = new Decimal(totalRecovered._sum.interestPaid || 0)
            .plus(new Decimal(totalRecovered._sum.lateFeePaid || 0));

        const returnOnInvestment = totalCapitalInvested.gt(0)
            ? surplusRevenue.div(totalCapitalInvested).mul(100).toNumber()
            : 0;

        const pendingDistributionMap = pendingRequests.reduce((acc, item) => {
            const key = item.client?.category?.displayName || item.client?.category?.name || 'SIN_CATEGORIA';
            if (!acc[key]) {
                acc[key] = {
                    category: key,
                    count: 0,
                    totalAmount: 0
                };
            }
            acc[key].count += 1;
            acc[key].totalAmount += Number(item.principalAmount || 0);
            return acc;
        }, {});

        return {
            data: {
                summary: {
                    totalDisbursed: parseFloat(totalDisbursed._sum.principalAmount || 0),
                    totalRecovered: {
                        principal: parseFloat(totalRecovered._sum.principalPaid || 0),
                        interest: parseFloat(totalRecovered._sum.interestPaid || 0),
                        lateFees: parseFloat(totalRecovered._sum.lateFeePaid || 0),
                        total: parseFloat(totalCapitalRecovered) + parseFloat(totalRecovered._sum.interestPaid || 0) + parseFloat(totalRecovered._sum.lateFeePaid || 0)
                    },
                    capitalCirculating: parseFloat(capitalCirculating._sum.remainingBalance || 0),
                    activeLoans: activeLoansCount,
                    completedLoans: completedLoansCount,
                    loansInMora: loansWithOverdueCount,
                    totalMoraAccrued: parseFloat(totalMoraAccrued._sum.lateFeesAccrued || 0),
                    netProfit: netProfit.toNumber(),
                    activeClients,
                    capitalRecoveryRate: parseFloat(capitalRecoveryRate.toFixed(2)),
                    surplusRevenue: surplusRevenue.toNumber(),
                    returnOnInvestment: parseFloat(returnOnInvestment.toFixed(2))
                },
                portfolioDistribution: portfolioDistribution.map((item) => ({
                    status: item.statusLoan,
                    count: item._count.id,
                    totalPrincipal: parseFloat(item._sum.principalAmount || 0),
                    totalRemaining: parseFloat(item._sum.remainingBalance || 0)
                })),
                clientsByCategory: categories.map((cat) => ({
                    categoryId: cat.id,
                    categoryName: cat.name,
                    displayName: cat.displayName,
                    colorHex: cat.colorHex,
                    clientCount: cat.clientProfiles.length,
                    scoreRange: {
                        min: cat.minScore,
                        max: cat.maxScore
                    }
                })),
                pendingStats: {
                    count: pendingRequests.length,
                    totalCapitalNeeded: parseFloat(
                        pendingRequests.reduce((sum, item) => sum + Number(item.principalAmount || 0), 0).toFixed(2)
                    ),
                    distributionByCategory: Object.values(pendingDistributionMap).map((item) => ({
                        ...item,
                        totalAmount: parseFloat(item.totalAmount.toFixed(2))
                    })),
                    requests: pendingRequests.map((item) => ({
                        id: item.id,
                        folio: item.folio,
                        createdAt: item.createdAt,
                        amount: Number(item.principalAmount || 0),
                        currency: item.currency,
                        frequency: item.frequency,
                        termDays: item.termDays,
                        client: {
                            id: item.client?.id,
                            name: item.client?.fullName,
                            identificationNumber: item.client?.identificationNumber,
                            phoneNumber: item.client?.phoneNumber,
                            category: item.client?.category?.displayName || item.client?.category?.name || 'SIN_CATEGORIA'
                        }
                    }))
                }
            },
            filters: {
                from: filters.from,
                to: filters.to,
                collectorId: filters.collectorId,
                categoryId: filters.categoryId,
                loanStatus: filters.loanStatuses,
                includeInactiveClients: filters.includeInactiveClients
            },
            generatedAt: toLocalISO()
        };
    }

    async getSummary() {
        const [
            totalDisbursed,
            totalRecovered,
            activeLoansCount,
            capitalCirculating,
            loansWithOverdueCount,
            completedLoansCount,
            totalMoraAccrued,
            activeClients
        ] = await Promise.all([
            this.loanRepository.aggregate({
                where: {
                    statusLoan: {
                        in: ['ACTIVE', 'PAID_OFF', 'DEFAULTED']
                    }
                },
                _sum: {
                    principalAmount: true
                }
            }),
            this.loanRepository.aggregate({
                _sum: {
                    principalPaid: true,
                    interestPaid: true,
                    lateFeesPaid: true
                }
            }),
            this.loanRepository.count({
                where: {
                    statusLoan: 'ACTIVE'
                }
            }),
            this.loanRepository.aggregate({
                where: {
                    statusLoan: 'ACTIVE'
                },
                _sum: {
                    remainingBalance: true
                }
            }),
            this.loanRepository.count({
                where: {
                    statusLoan: 'ACTIVE',
                    paymentSchedules: {
                        some: {
                            status: 'OVERDUE'
                        }
                    }
                }
            }),
            this.loanRepository.count({
                where: {
                    statusLoan: 'PAID_OFF'
                }
            }),
            this.loanRepository.aggregate({
                where: {
                    statusLoan: 'ACTIVE'
                },
                _sum: {
                    lateFeesAccrued: true
                }
            }),
            this.clientRepository.count({
                where: {
                    isActive: true
                }
            })
        ]);

        const netProfit = new Decimal(totalRecovered._sum.interestPaid || 0)
            .plus(new Decimal(totalRecovered._sum.lateFeesPaid || 0));

        const totalCapitalInvested = new Decimal(totalDisbursed._sum.principalAmount || 0);
        const totalCapitalRecovered = new Decimal(totalRecovered._sum.principalPaid || 0);

        const capitalRecoveryRate = totalCapitalInvested.gt(0)
            ? totalCapitalRecovered.div(totalCapitalInvested).mul(100).toNumber()
            : 0;

        const surplusRevenue = new Decimal(totalRecovered._sum.interestPaid || 0)
            .plus(new Decimal(totalRecovered._sum.lateFeesPaid || 0));

        const returnOnInvestment = totalCapitalInvested.gt(0)
            ? surplusRevenue.div(totalCapitalInvested).mul(100).toNumber()
            : 0;

        return {
            data: {
                totalDisbursed: parseFloat(totalDisbursed._sum.principalAmount || 0),
                totalRecovered: {
                    principal: parseFloat(totalRecovered._sum.principalPaid || 0),
                    interest: parseFloat(totalRecovered._sum.interestPaid || 0),
                    lateFees: parseFloat(totalRecovered._sum.lateFeesPaid || 0),
                    total: parseFloat(totalCapitalRecovered) + parseFloat(totalRecovered._sum.interestPaid || 0) + parseFloat(totalRecovered._sum.lateFeesPaid || 0)
                },
                capitalCirculating: parseFloat(capitalCirculating._sum.remainingBalance || 0),
                activeLoans: activeLoansCount,
                completedLoans: completedLoansCount,
                loansInMora: loansWithOverdueCount,
                totalMoraAccrued: parseFloat(totalMoraAccrued._sum.lateFeesAccrued || 0),
                netProfit: netProfit.toNumber(),
                activeClients,
                capitalRecoveryRate: parseFloat(capitalRecoveryRate.toFixed(2)),
                surplusRevenue: surplusRevenue.toNumber(),
                returnOnInvestment: parseFloat(returnOnInvestment.toFixed(2))
            },
            generatedAt: toLocalISO()
        };
    }

    async getCashFlow(query = {}) {
        const rawDays = parseInt(query.days, 10);
        const days = Number.isFinite(rawDays) && rawDays > 0 ? rawDays : 30;
        const includeAll = String(query.includeAll || 'false').toLowerCase() === 'true';

        const endDate = getEndOfDay().toDate();
        const startDate = getStartOfDay().subtract(days, 'day').toDate();

        const statusFilter = {
            not: 'FAILED'
        };

        const dateFilter = includeAll
            ? {}
            : {
                paymentDate: {
                    gte: startDate,
                    lte: endDate
                }
            };

        let payments = await this.paymentRepository.findMany({
            where: {
                ...dateFilter,
                status: statusFilter
            },
            select: {
                paymentDate: true,
                createdAt: true,
                amount: true
            },
            orderBy: {
                paymentDate: 'asc'
            }
        });

        if (!includeAll && payments.length === 0) {
            payments = await this.paymentRepository.findMany({
                where: {
                    createdAt: {
                        gte: startDate,
                        lte: endDate
                    },
                    status: statusFilter
                },
                select: {
                    paymentDate: true,
                    createdAt: true,
                    amount: true
                },
                orderBy: {
                    createdAt: 'asc'
                }
            });
        }

        const cashFlowMap = new Map();

        payments.forEach((payment) => {
            const paymentReferenceDate = payment.paymentDate || payment.createdAt;
            const dateKey = formatDate(paymentReferenceDate);
            const currentAmount = cashFlowMap.get(dateKey) || 0;
            cashFlowMap.set(dateKey, currentAmount + parseFloat(payment.amount));
        });

        const cashFlow = Array.from(cashFlowMap.entries())
            .map(([date, amount]) => ({
                date,
                amount: parseFloat(amount.toFixed(2))
            }))
            .sort((a, b) => new Date(a.date) - new Date(b.date));

        const totalIncome = cashFlow.reduce((sum, item) => sum + item.amount, 0);
        const avgDailyIncome = cashFlow.length > 0 ? totalIncome / cashFlow.length : 0;

        return {
            data: cashFlow,
            meta: {
                totalIncome: parseFloat(totalIncome.toFixed(2)),
                avgDailyIncome: parseFloat(avgDailyIncome.toFixed(2)),
                daysWithIncome: cashFlow.length,
                periodDays: days,
                startDate: formatDate(startDate),
                endDate: formatDate(endDate),
                includeAll,
                totalPayments: payments.length
            }
        };
    }

    async getPortfolioDistribution() {
        const distribution = await this.loanRepository.groupBy({
            by: ['statusLoan'],
            _count: {
                id: true
            },
            _sum: {
                principalAmount: true,
                remainingBalance: true
            }
        });

        return {
            data: distribution.map((item) => ({
                status: item.statusLoan,
                count: item._count.id,
                totalPrincipal: parseFloat(item._sum.principalAmount || 0),
                totalRemaining: parseFloat(item._sum.remainingBalance || 0)
            }))
        };
    }

    async getClientsByCategory() {
        const categories = await this.clientCategoryRepository.findMany({
            where: {
                isActive: true
            },
            include: {
                clientProfiles: {
                    where: {
                        isActive: true
                    },
                    select: {
                        id: true
                    }
                }
            },
            orderBy: {
                priorityOrder: 'asc'
            }
        });

        return {
            data: categories.map((cat) => ({
                categoryId: cat.id,
                categoryName: cat.name,
                displayName: cat.displayName,
                colorHex: cat.colorHex,
                clientCount: cat.clientProfiles.length,
                scoreRange: {
                    min: cat.minScore,
                    max: cat.maxScore
                }
            }))
        };
    }
}

module.exports = {
    DashboardAnalyticsUseCase
};