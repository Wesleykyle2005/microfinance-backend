class GetLoanScheduleUseCase {
    constructor(paymentScheduleRepository) {
        this.paymentScheduleRepository = paymentScheduleRepository;
    }

    async execute(loanId, query = {}) {
        const { page = 1, limit = 100, status, onlyOpen } = query;

        const pageNum = Math.max(1, parseInt(page, 10) || 1);
        const pageSize = Math.min(200, Math.max(1, parseInt(limit, 10) || 100));
        const skip = (pageNum - 1) * pageSize;

        const where = {
            loanId,
            ...(status ? { status } : {}),
            ...(String(onlyOpen) === 'true'
                ? {
                    status: {
                        in: ['PENDING', 'PARTIAL', 'OVERDUE']
                    }
                }
                : {})
        };

        const [items, total] = await Promise.all([
            this.paymentScheduleRepository.findMany({
                where,
                orderBy: { paymentNumber: 'asc' },
                skip,
                take: pageSize
            }),
            this.paymentScheduleRepository.count({ where })
        ]);

        return {
            items,
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
    GetLoanScheduleUseCase
};