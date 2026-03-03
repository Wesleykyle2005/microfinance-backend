const { IScoringRepository } = require('../../../application/interfaces/repositories/IScoringRepository');
const { getPrismaClient } = require('../../database/prismaClient');

class PrismaScoringRepository extends IScoringRepository {
    constructor(prismaClient = null) {
        super();
        this.prisma = prismaClient || getPrismaClient();
    }

    async findClientById(clientId) {
        return this.prisma.clientProfile.findUnique({
            where: { id: clientId },
            select: {
                id: true,
                fullName: true,
                scoringPoints: true,
                categoryId: true,
                isActive: true
            }
        });
    }

    async findCategoryById(categoryId) {
        return this.prisma.clientCategory.findUnique({
            where: { id: categoryId },
            select: { name: true, displayName: true }
        });
    }

    async countPaymentSchedules(where) {
        return this.prisma.paymentSchedule.count({ where });
    }

    async aggregateLoans(args) {
        return this.prisma.loan.aggregate(args);
    }

    async aggregatePaymentSchedules(args) {
        return this.prisma.paymentSchedule.aggregate(args);
    }

    async findPaidSchedulesWithDates(clientId) {
        return this.prisma.paymentSchedule.findMany({
            where: {
                loan: { clientId },
                status: 'PAID',
                paidDate: { not: null }
            },
            select: {
                dueDate: true,
                paidDate: true
            }
        });
    }

    async findActiveCategories() {
        return this.prisma.clientCategory.findMany({
            where: { isActive: true },
            orderBy: { minScore: 'asc' }
        });
    }

    async updateClientScoreAndCreateHistory({ clientId, newScore, newCategoryId, pointsChange }) {
        return this.prisma.$transaction(async (tx) => {
            const updatedClient = await tx.clientProfile.update({
                where: { id: clientId },
                data: {
                    scoringPoints: newScore,
                    categoryId: newCategoryId
                },
                include: {
                    category: true
                }
            });

            await tx.scoringHistory.create({
                data: {
                    clientId,
                    pointsChange,
                    newTotalPoints: newScore,
                    reason: 'RECALCULATION',
                    triggeredAt: new Date()
                }
            });

            return updatedClient;
        });
    }

    async findActiveClients() {
        return this.prisma.clientProfile.findMany({
            where: { isActive: true },
            select: { id: true, fullName: true }
        });
    }
}

module.exports = {
    PrismaScoringRepository
};
