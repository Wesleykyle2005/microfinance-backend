class GetLoansUseCase {
    constructor(loanRepository) {
        this.loanRepository = loanRepository;
    }

    async execute(query = {}) {
        const {
            page = 1,
            limit = 10,
            status,
            search,
            dateRangeStart,
            dateRangeEnd,
            collectorId,
            clientId
        } = query;

        const where = {};

        if (status) {
            where.statusLoan = status;
        }

        if (collectorId) {
            where.collectorId = collectorId;
        }

        if (clientId) {
            where.clientId = clientId;
        }

        if (search && String(search).trim() !== '') {
            const value = String(search).trim();
            where.OR = [
                {
                    folio: {
                        contains: value,
                        mode: 'insensitive'
                    }
                },
                {
                    client: {
                        fullName: {
                            contains: value,
                            mode: 'insensitive'
                        }
                    }
                },
                {
                    client: {
                        identificationNumber: {
                            contains: value,
                            mode: 'insensitive'
                        }
                    }
                }
            ];
        }

        if (dateRangeStart || dateRangeEnd) {
            where.createdAt = {};

            if (dateRangeStart) {
                const startDate = new Date(dateRangeStart);
                startDate.setHours(0, 0, 0, 0);
                where.createdAt.gte = startDate;
            }

            if (dateRangeEnd) {
                const endDate = new Date(dateRangeEnd);
                endDate.setHours(23, 59, 59, 999);
                where.createdAt.lte = endDate;
            }
        }

        const pageNum = Math.max(1, parseInt(page, 10) || 1);
        const pageSize = Math.min(100, Math.max(1, parseInt(limit, 10) || 10));
        const skip = (pageNum - 1) * pageSize;

        const [loans, total] = await Promise.all([
            this.loanRepository.findMany({
                where,
                skip,
                take: pageSize,
                orderBy: { createdAt: 'desc' },
                include: {
                    client: {
                        select: {
                            id: true,
                            fullName: true,
                            identificationNumber: true,
                            phoneNumber: true,
                            category: {
                                select: {
                                    name: true,
                                    displayName: true,
                                    colorHex: true
                                }
                            }
                        }
                    },
                    collector: {
                        select: {
                            id: true,
                            email: true,
                            role: true
                        }
                    }
                }
            }),
            this.loanRepository.count({ where })
        ]);

        const lastPage = Math.ceil(total / pageSize);

        return {
            loans,
            meta: {
                total,
                page: pageNum,
                limit: pageSize,
                lastPage,
                hasNextPage: pageNum < lastPage,
                hasPrevPage: pageNum > 1,
                from: skip + 1,
                to: Math.min(skip + pageSize, total)
            }
        };
    }
}

module.exports = {
    GetLoansUseCase
};