const { ISystemConfigRepository } = require('../../../application/interfaces/repositories/ISystemConfigRepository');
const { getPrismaClient } = require('../../database/prismaClient');

class PrismaSystemConfigRepository extends ISystemConfigRepository {
    constructor() {
        super();
        this.prisma = getPrismaClient();
    }

    async getCurrentConfig() {
        return this.prisma.systemConfig.findFirst();
    }

    async count() {
        return this.prisma.systemConfig.count();
    }

    async findMany(params = {}) {
        return this.prisma.systemConfig.findMany(params);
    }

    async findUnique(params = {}) {
        return this.prisma.systemConfig.findUnique(params);
    }

    async create(params = {}) {
        return this.prisma.systemConfig.create(params);
    }

    async createHistoryMany(data = []) {
        if (!Array.isArray(data) || data.length === 0) return { count: 0 };
        return this.prisma.configurationHistory.createMany({ data });
    }

    async update(id, data, include) {
        return this.prisma.systemConfig.update({
            where: { id },
            data,
            ...(include ? { include } : {})
        });
    }
}

module.exports = {
    PrismaSystemConfigRepository
};
