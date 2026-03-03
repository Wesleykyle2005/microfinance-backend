const { IBalanceSnapshotRepository } = require('../../../application/interfaces/repositories/IBalanceSnapshotRepository');
const { getPrismaClient } = require('../../database/prismaClient');

class PrismaBalanceSnapshotRepository extends IBalanceSnapshotRepository {
    constructor(prismaClient = null) {
        super();
        this.prisma = prismaClient || getPrismaClient();
    }

    async upsert(args) {
        return this.prisma.balanceSnapshot.upsert(args);
    }

    async findMany(args = {}) {
        return this.prisma.balanceSnapshot.findMany(args);
    }

    async count(args = {}) {
        return this.prisma.balanceSnapshot.count(args);
    }

    async findUnique(args) {
        return this.prisma.balanceSnapshot.findUnique(args);
    }

    async findFirst(args = {}) {
        return this.prisma.balanceSnapshot.findFirst(args);
    }
}

module.exports = {
    PrismaBalanceSnapshotRepository
};