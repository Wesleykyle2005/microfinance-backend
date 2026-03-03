class GetLoanOptionsUseCase {
    constructor(loanRepository) {
        this.loanRepository = loanRepository;
    }

    async execute(query = {}) {
        const {
            status = 'ACTIVE',
            clientId,
            search,
            limit = 150
        } = query;

        const size = Math.min(400, Math.max(1, parseInt(limit, 10) || 150));
        const where = {
            ...(status && String(status).toUpperCase() !== 'ALL'
                ? { statusLoan: String(status).toUpperCase() }
                : {}),
            ...(clientId ? { clientId: String(clientId) } : {}),
            ...(search && String(search).trim() !== ''
                ? {
                    OR: [
                        {
                            folio: {
                                contains: String(search).trim(),
                                mode: 'insensitive'
                            }
                        },
                        {
                            client: {
                                fullName: {
                                    contains: String(search).trim(),
                                    mode: 'insensitive'
                                }
                            }
                        }
                    ]
                }
                : {})
        };

        return this.loanRepository.findMany({
            where,
            select: {
                id: true,
                folio: true,
                statusLoan: true,
                client: {
                    select: {
                        id: true,
                        fullName: true
                    }
                }
            },
            orderBy: {
                createdAt: 'desc'
            },
            take: size
        });
    }
}

module.exports = {
    GetLoanOptionsUseCase
};