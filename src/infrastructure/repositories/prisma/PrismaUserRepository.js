const { IUserRepository } = require('../../../application/interfaces/repositories/IUserRepository');
const { getPrismaClient } = require('../../database/prismaClient');

class PrismaUserRepository extends IUserRepository {
    constructor(prismaClient = null) {
        super();
        this.prisma = prismaClient || getPrismaClient();
    }

    async create(data) {
        return this.prisma.user.create({
            data,
            select: {
                id: true,
                email: true,
                role: true,
                isActive: true,
                createdAt: true,
                updatedAt: true,
                lastLogin: true
            }
        });
    }

    async findByEmail(email, includePassword = false) {
        const select = {
            id: true,
            email: true,
            role: true,
            isActive: true,
            createdAt: true,
            updatedAt: true,
            lastLogin: true
        };

        if (includePassword) {
            select.passwordHash = true;
        }

        return this.prisma.user.findUnique({
            where: { email },
            select
        });
    }

    async findById(id) {
        return this.prisma.user.findUnique({
            where: { id },
            select: {
                id: true,
                email: true,
                role: true,
                isActive: true,
                createdAt: true,
                updatedAt: true,
                lastLogin: true
            }
        });
    }

    async update(id, data) {
        return this.prisma.user.update({
            where: { id },
            data,
            select: {
                id: true,
                email: true,
                role: true,
                isActive: true,
                createdAt: true,
                updatedAt: true,
                lastLogin: true
            }
        });
    }

    async updateLastLogin(id) {
        return this.prisma.user.update({
            where: { id },
            data: { lastLogin: new Date() },
            select: {
                id: true,
                lastLogin: true
            }
        });
    }

    async existsByEmail(email) {
        const count = await this.prisma.user.count({
            where: { email }
        });
        return count > 0;
    }

    async countByRole(role) {
        return this.prisma.user.count({
            where: { role }
        });
    }
}

module.exports = {
    PrismaUserRepository
};