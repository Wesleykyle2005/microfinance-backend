const { IPaymentScheduleRepository } = require('../../../application/interfaces/repositories/IPaymentScheduleRepository');
const { getPrismaClient } = require('../../database/prismaClient');

class PrismaPaymentScheduleRepository extends IPaymentScheduleRepository {
    constructor(prismaClient = null) {
        super();
        this.prisma = prismaClient || getPrismaClient();
    }

    async listPendingByLoan(loanId) {
        return this.prisma.paymentSchedule.findMany({
            where: {
                loanId,
                status: {
                    in: ['PENDING', 'PARTIAL', 'OVERDUE']
                }
            },
            orderBy: {
                dueDate: 'asc'
            }
        });
    }

    async update(id, data) {
        return this.prisma.paymentSchedule.update({
            where: { id },
            data
        });
    }

    async createMany(data) {
        return this.prisma.paymentSchedule.createMany({ data });
    }

    async countUnpaidByLoan(loanId) {
        return this.prisma.paymentSchedule.count({
            where: {
                loanId,
                status: {
                    not: 'PAID'
                }
            }
        });
    }

    async findMany(args) {
        return this.prisma.paymentSchedule.findMany(args);
    }

    async count(args = {}) {
        return this.prisma.paymentSchedule.count(args);
    }
}

module.exports = {
    PrismaPaymentScheduleRepository
};
