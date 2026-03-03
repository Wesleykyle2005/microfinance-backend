const { IReportsRepository } = require('../../../application/interfaces/repositories/IReportsRepository');
const { getPrismaClient } = require('../../database/prismaClient');

class PrismaReportsRepository extends IReportsRepository {
    constructor(prismaClient = null) {
        super();
        this.prisma = prismaClient || getPrismaClient();
    }

    async countLoans(args = {}) {
        return this.prisma.loan.count(args);
    }

    async aggregateLoans(args = {}) {
        return this.prisma.loan.aggregate(args);
    }

    async groupByLoans(args = {}) {
        return this.prisma.loan.groupBy(args);
    }

    async findManyLoans(args = {}) {
        return this.prisma.loan.findMany(args);
    }

    async findManyPayments(args = {}) {
        return this.prisma.payment.findMany(args);
    }

    async countPayments(args = {}) {
        return this.prisma.payment.count(args);
    }

    async findManyPaymentSchedules(args = {}) {
        return this.prisma.paymentSchedule.findMany(args);
    }

    async countPaymentSchedules(args = {}) {
        return this.prisma.paymentSchedule.count(args);
    }

    async aggregatePaymentSchedules(args = {}) {
        return this.prisma.paymentSchedule.aggregate(args);
    }

    async countClients(args = {}) {
        return this.prisma.clientProfile.count(args);
    }

    async findUniqueClient(args = {}) {
        return this.prisma.clientProfile.findUnique(args);
    }

    async findUniquePayment(args = {}) {
        return this.prisma.payment.findUnique(args);
    }

    async findUniqueBalanceSnapshot(args) {
        return this.prisma.balanceSnapshot.findUnique(args);
    }
}

module.exports = {
    PrismaReportsRepository
};