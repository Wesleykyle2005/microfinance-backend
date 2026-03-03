const { IPaymentRepository } = require('../../../application/interfaces/repositories/IPaymentRepository');
const { getPrismaClient } = require('../../database/prismaClient');

class PrismaPaymentRepository extends IPaymentRepository {
    constructor(prismaClient = null) {
        super();
        this.prisma = prismaClient || getPrismaClient();
    }

    async create(data) {
        return this.prisma.payment.create({ data });
    }

    async listByLoan(loanId) {
        return this.prisma.payment.findMany({
            where: { loanId },
            orderBy: { paymentDate: 'desc' }
        });
    }

    async findById(id) {
        return this.prisma.payment.findUnique({
            where: { id }
        });
    }

    async findUnique(args) {
        return this.prisma.payment.findUnique(args);
    }

    async findMany(args) {
        return this.prisma.payment.findMany(args);
    }

    async count(args = {}) {
        return this.prisma.payment.count(args);
    }

    async aggregate(args = {}) {
        return this.prisma.payment.aggregate(args);
    }

    async updateById(id, data, options = {}) {
        return this.prisma.payment.update({
            where: { id },
            data,
            ...options
        });
    }

    async confirmPaymentWithAudit({ paymentId, auditLogData }) {
        return this.prisma.$transaction(async (tx) => {
            const confirmedPayment = await tx.payment.update({
                where: { id: paymentId },
                data: {
                    status: 'CONFIRMED'
                }
            });

            await tx.auditLog.create({
                data: auditLogData
            });

            return confirmedPayment;
        });
    }
}

module.exports = {
    PrismaPaymentRepository
};
