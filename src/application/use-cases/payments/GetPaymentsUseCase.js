class GetPaymentsUseCase {
    constructor(paymentRepository) {
        this.paymentRepository = paymentRepository;
    }

    async execute(query = {}) {
        const {
            status,
            loanId,
            search,
            paymentMethod,
            notConfirmed,
            page = 1,
            limit = 50
        } = query;

        const where = {};

        if (loanId) {
            where.loanId = loanId;
        }

        if (status) {
            where.status = status;
        }

        if (!status && String(notConfirmed) === 'true') {
            where.status = {
                not: 'CONFIRMED'
            };
        }

        if (paymentMethod) {
            where.paymentMethod = paymentMethod;
        }

        if (search && String(search).trim() !== '') {
            const value = String(search).trim();
            where.OR = [
                {
                    receiptFolio: {
                        contains: value,
                        mode: 'insensitive'
                    }
                },
                {
                    loan: {
                        folio: {
                            contains: value,
                            mode: 'insensitive'
                        }
                    }
                },
                {
                    loan: {
                        client: {
                            fullName: {
                                contains: value,
                                mode: 'insensitive'
                            }
                        }
                    }
                }
            ];
        }

        const pageNum = Math.max(1, parseInt(page, 10) || 1);
        const pageSize = Math.min(100, Math.max(1, parseInt(limit, 10) || 50));
        const skip = (pageNum - 1) * pageSize;

        const [payments, total, totalsAgg] = await Promise.all([
            this.paymentRepository.findMany({
                where,
                orderBy: { paymentDate: 'desc' },
                skip,
                take: pageSize,
                select: {
                    id: true,
                    loanId: true,
                    amount: true,
                    principalPaid: true,
                    interestPaid: true,
                    lateFeePaid: true,
                    paymentDate: true,
                    paymentMethod: true,
                    receiptFolio: true,
                    status: true,
                    notes: true,
                    createdAt: true,
                    loan: {
                        select: {
                            id: true,
                            folio: true,
                            client: {
                                select: {
                                    id: true,
                                    fullName: true
                                }
                            }
                        }
                    }
                }
            }),
            this.paymentRepository.count({ where }),
            this.paymentRepository.aggregate({
                where,
                _sum: {
                    amount: true
                }
            })
        ]);

        const totals = {
            totalPaid: Number(totalsAgg._sum.amount || 0),
            count: total
        };

        return {
            payments,
            totals,
            meta: {
                total,
                page: pageNum,
                limit: pageSize,
                lastPage: Math.max(1, Math.ceil(total / pageSize)),
                hasNextPage: pageNum < Math.max(1, Math.ceil(total / pageSize)),
                hasPrevPage: pageNum > 1,
                from: total === 0 ? 0 : skip + 1,
                to: Math.min(skip + pageSize, total)
            }
        };
    }
}

module.exports = {
    GetPaymentsUseCase
};