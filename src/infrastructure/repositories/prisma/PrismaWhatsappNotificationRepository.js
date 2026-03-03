const { IWhatsappNotificationRepository } = require('../../../application/interfaces/repositories/IWhatsappNotificationRepository');
const { getPrismaClient } = require('../../database/prismaClient');

class PrismaWhatsappNotificationRepository extends IWhatsappNotificationRepository {
    constructor(prismaClient = null) {
        super();
        this.prisma = prismaClient || getPrismaClient();
    }

    async create(data) {
        return this.prisma.whatsappNotification.create({ data });
    }

    async updateStatus(id, data) {
        return this.prisma.whatsappNotification.update({
            where: { id },
            data
        });
    }

    async listPending(limit = 100) {
        const size = Math.min(500, Math.max(1, Number(limit) || 100));
        return this.prisma.whatsappNotification.findMany({
            where: { status: 'PENDING' },
            orderBy: { createdAt: 'asc' },
            take: size
        });
    }
}

module.exports = {
    PrismaWhatsappNotificationRepository
};
