const { ILoanRepository } = require('../../../application/interfaces/repositories/ILoanRepository');
const { getPrismaClient } = require('../../database/prismaClient');

class PrismaLoanRepository extends ILoanRepository {
    constructor(prismaClient = null) {
        super();
        this.prisma = prismaClient || getPrismaClient();
    }

    async findById(id) {
        return this.prisma.loan.findUnique({
            where: { id },
            include: {
                client: true,
                payments: true,
                paymentSchedules: true
            }
        });
    }

    async create(data) {
        return this.prisma.loan.create({ data });
    }

    async findUnique(args) {
        return this.prisma.loan.findUnique(args);
    }

    async findMany(args) {
        return this.prisma.loan.findMany(args);
    }

    async count(args = {}) {
        return this.prisma.loan.count(args);
    }

    async aggregate(args = {}) {
        return this.prisma.loan.aggregate(args);
    }

    async groupBy(args = {}) {
        return this.prisma.loan.groupBy(args);
    }

    async update(id, data) {
        return this.prisma.loan.update({
            where: { id },
            data
        });
    }

    async updateById(id, data, options = {}) {
        return this.prisma.loan.update({
            where: { id },
            data,
            ...options
        });
    }

    async findActiveByClient(clientId) {
        return this.prisma.loan.findMany({
            where: {
                clientId,
                statusLoan: {
                    in: ['PENDING', 'ACTIVE']
                }
            },
            orderBy: {
                createdAt: 'desc'
            }
        });
    }

    async listByStatusAndDateRange(statusLoan, from, to) {
        return this.prisma.loan.findMany({
            where: {
                statusLoan,
                disbursementDate: {
                    gte: from,
                    lte: to
                }
            },
            orderBy: {
                disbursementDate: 'asc'
            }
        });
    }

    async approveLoanWithSchedule({ loanId, loanData, schedule, auditLogData }) {
        return this.prisma.$transaction(async (tx) => {
            const updatedLoan = await tx.loan.update({
                where: { id: loanId },
                data: loanData,
                include: {
                    client: true,
                    collector: true
                }
            });

            await tx.paymentSchedule.deleteMany({
                where: { loanId }
            });

            await tx.paymentSchedule.createMany({
                data: schedule
            });

            await tx.auditLog.create({
                data: auditLogData
            });

            return updatedLoan;
        });
    }

    async rejectLoan({ loanId, auditLogData }) {
        return this.prisma.$transaction(async (tx) => {
            const updatedLoan = await tx.loan.update({
                where: { id: loanId },
                data: {
                    statusLoan: 'CANCELLED'
                },
                include: {
                    client: true
                }
            });

            await tx.auditLog.create({
                data: auditLogData
            });

            return updatedLoan;
        });
    }

    async disburseLoan({ loanId, disbursedAt, auditLogData }) {
        return this.prisma.$transaction(async (tx) => {
            const updatedLoan = await tx.loan.update({
                where: { id: loanId },
                data: {
                    disbursementDate: disbursedAt
                },
                include: {
                    client: true
                }
            });

            await tx.auditLog.create({
                data: auditLogData
            });

            return updatedLoan;
        });
    }

    async rescheduleLoan({ loanId, maturityDate, installments, auditLogData }) {
        return this.prisma.$transaction(async (tx) => {
            for (const item of installments) {
                await tx.paymentSchedule.update({
                    where: { id: item.id },
                    data: {
                        dueDate: item.newDueDate,
                        status: item.newStatus
                    }
                });
            }

            await tx.loan.update({
                where: { id: loanId },
                data: {
                    maturityDate
                }
            });

            await tx.auditLog.create({
                data: auditLogData
            });

            return installments;
        });
    }
}

module.exports = {
    PrismaLoanRepository
};
