class GetPaymentsStatsUseCase {
    constructor(paymentRepository) {
        this.paymentRepository = paymentRepository;
    }

    buildWhere(query = {}) {
        const {
            loanId,
            search,
            paymentMethod,
            notConfirmed
        } = query;

        const where = {};

        if (loanId) {
            where.loanId = loanId;
        }

        if (String(notConfirmed) === 'true') {
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

        return where;
    }

    async execute(query = {}) {
        const where = this.buildWhere(query);

        const [total, pending, confirmed, failed, totalsAgg] = await Promise.all([
            this.paymentRepository.count({ where }),
            this.paymentRepository.count({
                where: {
                    ...where,
                    status: 'PENDING'
                }
            }),
            this.paymentRepository.count({
                where: {
                    ...where,
                    status: 'CONFIRMED'
                }
            }),
            this.paymentRepository.count({
                where: {
                    ...where,
                    status: 'FAILED'
                }
            }),
            this.paymentRepository.aggregate({
                where,
                _sum: {
                    amount: true
                }
            })
        ]);

        return {
            total,
            pending,
            confirmed,
            failed,
            totalAmount: Number(totalsAgg._sum.amount || 0)
        };
    }
}

module.exports = {
    GetPaymentsStatsUseCase
};
