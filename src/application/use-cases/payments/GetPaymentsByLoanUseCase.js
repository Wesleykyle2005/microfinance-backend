class GetPaymentsByLoanUseCase {
    constructor(paymentRepository) {
        this.paymentRepository = paymentRepository;
    }

    async execute(loanId, query = {}) {
        const { page = 1, limit = 20, status, search, paymentMethod, notConfirmed } = query;

        const pageNum = Math.max(1, parseInt(page, 10) || 1);
        const pageSize = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
        const skip = (pageNum - 1) * pageSize;

        const where = {
            loanId,
            ...(status ? { status } : {})
        };

        if (!status && String(notConfirmed) === 'true') {
            where.status = {
                not: 'CONFIRMED'
            };
        }

        if (paymentMethod) {
            where.paymentMethod = paymentMethod;
        }

        if (search && String(search).trim() !== '') {
            where.OR = [
                {
                    receiptFolio: {
                        contains: String(search).trim(),
                        mode: 'insensitive'
                    }
                },
                {
                    notes: {
                        contains: String(search).trim(),
                        mode: 'insensitive'
                    }
                }
            ];
        }

        const [payments, total, totalsAgg] = await Promise.all([
            this.paymentRepository.findMany({
                where,
                orderBy: { paymentDate: 'desc' },
                skip,
                take: pageSize,
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
                    notes: true,
                    createdAt: true,
                    creator: {
                        select: {
                            id: true,
                            email: true
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
    GetPaymentsByLoanUseCase
};