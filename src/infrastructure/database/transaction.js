const { getPrismaClient } = require('./prismaClient');

async function runInTransaction(callback) {
    const prisma = getPrismaClient();
    return prisma.$transaction(async (tx) => callback(tx));
}

module.exports = {
    runInTransaction
};
