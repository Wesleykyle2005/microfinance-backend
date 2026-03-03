class GetPendingLoanStatsUseCase {
    constructor(loanRepository) {
        this.loanRepository = loanRepository;
    }

    async execute(query = {}) {
        const { limit = 50 } = query;
        const detailsLimit = Math.min(200, Math.max(1, parseInt(limit, 10) || 50));

        const pendingWhere = {
            statusLoan: 'PENDING'
        };

        const [pendingLoansCount, pendingLoansSum, pendingLoans, recentPendingLoans] = await Promise.all([
            this.loanRepository.count({
                where: pendingWhere
            }),
            this.loanRepository.aggregate({
                where: pendingWhere,
                _sum: {
                    principalAmount: true
                }
            }),
            this.loanRepository.findMany({
                where: pendingWhere,
                select: {
                    principalAmount: true,
                    client: {
                        select: {
                            category: {
                                select: {
                                    name: true,
                                    displayName: true
                                }
                            }
                        }
                    }
                }
            }),
            this.loanRepository.findMany({
                where: pendingWhere,
                orderBy: {
                    createdAt: 'desc'
                },
                take: detailsLimit,
                select: {
                    id: true,
                    folio: true,
                    createdAt: true,
                    principalAmount: true,
                    frequency: true,
                    currency: true,
                    termDays: true,
                    client: {
                        select: {
                            id: true,
                            fullName: true,
                            identificationNumber: true,
                            phoneNumber: true,
                            category: {
                                select: {
                                    name: true,
                                    displayName: true
                                }
                            }
                        }
                    }
                }
            })
        ]);

        const totalCapitalNeeded = Number(pendingLoansSum._sum.principalAmount || 0);

        const distributionMap = pendingLoans.reduce((acc, loan) => {
            const categoryName =
                loan.client?.category?.displayName ||
                loan.client?.category?.name ||
                'Sin categoría';

            if (!acc[categoryName]) {
                acc[categoryName] = {
                    category: categoryName,
                    count: 0,
                    totalAmount: 0
                };
            }

            acc[categoryName].count += 1;
            acc[categoryName].totalAmount += Number(loan.principalAmount);

            return acc;
        }, {});

        const distributionByCategory = Object.values(distributionMap).sort(
            (a, b) => b.count - a.count
        );

        const requests = recentPendingLoans.map((loan) => ({
            id: loan.id,
            folio: loan.folio,
            createdAt: loan.createdAt,
            amount: Number(loan.principalAmount),
            currency: loan.currency,
            frequency: loan.frequency,
            termDays: loan.termDays,
            client: {
                id: loan.client?.id,
                name: loan.client?.fullName,
                identificationNumber: loan.client?.identificationNumber,
                phoneNumber: loan.client?.phoneNumber,
                category:
                    loan.client?.category?.displayName ||
                    loan.client?.category?.name ||
                    'Sin categoría'
            }
        }));

        return {
            count: pendingLoansCount,
            totalCapitalNeeded,
            distributionByCategory,
            requests,
            loans: requests.map((request) => ({
                id: request.id,
                folio: request.folio,
                amount: request.amount,
                clientName: request.client?.name,
                category: request.client?.category
            })),
            meta: {
                detailsLimit,
                requestsReturned: requests.length
            }
        };
    }
}

module.exports = {
    GetPendingLoanStatsUseCase
};