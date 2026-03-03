const { IClientRepository } = require('../../../application/interfaces/repositories/IClientRepository');
const { getPrismaClient } = require('../../database/prismaClient');

class PrismaClientRepository extends IClientRepository {
    constructor() {
        super();
        this.prisma = getPrismaClient();
    }

    async findById(id) {
        return this.prisma.clientProfile.findUnique({
            where: { id },
            include: {
                category: true
            }
        });
    }

    async findUnique(params = {}) {
        return this.prisma.clientProfile.findUnique(params);
    }

    async findMany(params = {}) {
        return this.prisma.clientProfile.findMany(params);
    }

    async count(params = {}) {
        return this.prisma.clientProfile.count(params);
    }

    async create(dataOrParams) {
        if (dataOrParams && typeof dataOrParams === 'object' && 'data' in dataOrParams) {
            return this.prisma.clientProfile.create(dataOrParams);
        }

        return this.prisma.clientProfile.create({ data: dataOrParams });
    }

    async update(idOrParams, data) {
        if (idOrParams && typeof idOrParams === 'object' && 'where' in idOrParams) {
            return this.prisma.clientProfile.update(idOrParams);
        }

        return this.prisma.clientProfile.update({
            where: { id: idOrParams },
            data
        });
    }

    async list(filters = {}) {
        return this.prisma.clientProfile.findMany({
            where: filters,
            orderBy: {
                createdAt: 'desc'
            }
        });
    }

    async findCategoryUnique(params = {}) {
        return this.prisma.clientCategory.findUnique(params);
    }

    async findCategoryFirst(params = {}) {
        return this.prisma.clientCategory.findFirst(params);
    }

    async createCategoryTransition(data) {
        return this.prisma.clientCategoryTransition.create({ data });
    }

    async findScoringHistory(params = {}) {
        return this.prisma.scoringHistory.findMany(params);
    }

    async countScoringHistory(params = {}) {
        return this.prisma.scoringHistory.count(params);
    }
}

module.exports = {
    PrismaClientRepository
};
