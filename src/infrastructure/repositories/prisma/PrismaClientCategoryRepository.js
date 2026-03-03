const { IClientCategoryRepository } = require('../../../application/interfaces/repositories/IClientCategoryRepository');
const { getPrismaClient } = require('../../database/prismaClient');

class PrismaClientCategoryRepository extends IClientCategoryRepository {
    constructor() {
        super();
        this.prisma = getPrismaClient();
    }

    findMany(params = {}) {
        return this.prisma.clientCategory.findMany(params);
    }

    count(params = {}) {
        return this.prisma.clientCategory.count(params);
    }

    aggregate(params = {}) {
        return this.prisma.clientCategory.aggregate(params);
    }

    findUnique(params = {}) {
        return this.prisma.clientCategory.findUnique(params);
    }

    create(params = {}) {
        return this.prisma.clientCategory.create(params);
    }

    update(params = {}) {
        return this.prisma.clientCategory.update(params);
    }
}

module.exports = {
    PrismaClientCategoryRepository
};