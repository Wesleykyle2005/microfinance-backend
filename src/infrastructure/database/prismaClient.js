const { PrismaClient } = require('@prisma/client');

let prisma;

function getPrismaClient() {
    if (!prisma) {
        prisma = new PrismaClient({
            log: process.env.NODE_ENV === 'development'
                ? ['query', 'info', 'warn', 'error']
                : ['error']
        });
    }

    return prisma;
}

module.exports = {
    getPrismaClient
};
