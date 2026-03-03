const { IMoraApplicationLogRepository } = require('../../../application/interfaces/repositories/IMoraApplicationLogRepository');
const { getPrismaClient } = require('../../database/prismaClient');

class PrismaMoraApplicationLogRepository extends IMoraApplicationLogRepository {
    constructor(prismaClient = null) {
        super();
        this.prisma = prismaClient || getPrismaClient();
    }

    async create(data) {
        return this.prisma.moraApplicationLog.create({ data });
    }

    async listByLoan(loanId) {
        return this.prisma.moraApplicationLog.findMany({
            where: { loanId },
            orderBy: { appliedAt: 'desc' }
        });
    }
}

module.exports = {
    PrismaMoraApplicationLogRepository
};
