class GetLoanStatsUseCase {
    constructor(loanRepository) {
        this.loanRepository = loanRepository;
    }

    buildBaseWhere(query = {}) {
        const {
            search,
            dateRangeStart,
            dateRangeEnd,
            collectorId,
            clientId
        } = query;

        const where = {};

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
                if (!Number.isNaN(startDate.getTime())) {
                    startDate.setHours(0, 0, 0, 0);
                    where.createdAt.gte = startDate;
                }
            }

            if (dateRangeEnd) {
                const endDate = new Date(dateRangeEnd);
                if (!Number.isNaN(endDate.getTime())) {
                    endDate.setHours(23, 59, 59, 999);
                    where.createdAt.lte = endDate;
                }
            }

            if (Object.keys(where.createdAt).length === 0) {
                delete where.createdAt;
            }
        }

        return where;
    }

    async execute(query = {}) {
        const baseWhere = this.buildBaseWhere(query);

        const [total, active, pending, defaulted, cancelled, paidOff] = await Promise.all([
            this.loanRepository.count({ where: baseWhere }),
            this.loanRepository.count({ where: { ...baseWhere, statusLoan: 'ACTIVE' } }),
            this.loanRepository.count({ where: { ...baseWhere, statusLoan: 'PENDING' } }),
            this.loanRepository.count({ where: { ...baseWhere, statusLoan: 'DEFAULTED' } }),
            this.loanRepository.count({ where: { ...baseWhere, statusLoan: 'CANCELLED' } }),
            this.loanRepository.count({ where: { ...baseWhere, statusLoan: 'PAID_OFF' } })
        ]);

        return {
            total,
            active,
            pending,
            defaulted,
            cancelled,
            paidOff
        };
    }
}

module.exports = {
    GetLoanStatsUseCase
};
