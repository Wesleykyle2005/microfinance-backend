const { PrismaLoanRepository } = require('../repositories/prisma/PrismaLoanRepository');
const { PrismaClientRepository } = require('../repositories/prisma/PrismaClientRepository');
const { PrismaSystemConfigRepository } = require('../repositories/prisma/PrismaSystemConfigRepository');
const { PrismaPaymentRepository } = require('../repositories/prisma/PrismaPaymentRepository');
const { PrismaPaymentScheduleRepository } = require('../repositories/prisma/PrismaPaymentScheduleRepository');
const { PrismaClientCategoryRepository } = require('../repositories/prisma/PrismaClientCategoryRepository');
const { PrismaScoringRepository } = require('../repositories/prisma/PrismaScoringRepository');
const { PrismaDailyClosingRepository } = require('../repositories/prisma/PrismaDailyClosingRepository');
const { PrismaBalanceSnapshotRepository } = require('../repositories/prisma/PrismaBalanceSnapshotRepository');
const { PrismaReportsRepository } = require('../repositories/prisma/PrismaReportsRepository');
const { PrismaUserRepository } = require('../repositories/prisma/PrismaUserRepository');
const { PrismaMoraApplicationLogRepository } = require('../repositories/prisma/PrismaMoraApplicationLogRepository');
const { PrismaWhatsappNotificationRepository } = require('../repositories/prisma/PrismaWhatsappNotificationRepository');
const { ILoanRepository } = require('../../application/interfaces/repositories/ILoanRepository');
const { IClientRepository } = require('../../application/interfaces/repositories/IClientRepository');
const { ISystemConfigRepository } = require('../../application/interfaces/repositories/ISystemConfigRepository');
const { IPaymentRepository } = require('../../application/interfaces/repositories/IPaymentRepository');
const { IPaymentScheduleRepository } = require('../../application/interfaces/repositories/IPaymentScheduleRepository');
const { IClientCategoryRepository } = require('../../application/interfaces/repositories/IClientCategoryRepository');
const { IScoringRepository } = require('../../application/interfaces/repositories/IScoringRepository');
const { IDailyClosingRepository } = require('../../application/interfaces/repositories/IDailyClosingRepository');
const { IBalanceSnapshotRepository } = require('../../application/interfaces/repositories/IBalanceSnapshotRepository');
const { IReportsRepository } = require('../../application/interfaces/repositories/IReportsRepository');
const { IUserRepository } = require('../../application/interfaces/repositories/IUserRepository');
const { IMoraApplicationLogRepository } = require('../../application/interfaces/repositories/IMoraApplicationLogRepository');
const { IWhatsappNotificationRepository } = require('../../application/interfaces/repositories/IWhatsappNotificationRepository');
const { validateInterfaceImplementation } = require('./validateInterfaceImplementation');

const repositoriesContainer = {
    loanRepository: new PrismaLoanRepository(),
    clientRepository: new PrismaClientRepository(),
    configRepository: new PrismaSystemConfigRepository(),
    paymentRepository: new PrismaPaymentRepository(),
    paymentScheduleRepository: new PrismaPaymentScheduleRepository(),
    clientCategoryRepository: new PrismaClientCategoryRepository(),
    scoringRepository: new PrismaScoringRepository(),
    dailyClosingRepository: new PrismaDailyClosingRepository(),
    balanceSnapshotRepository: new PrismaBalanceSnapshotRepository(),
    reportsRepository: new PrismaReportsRepository(),
    userRepository: new PrismaUserRepository(),
    moraApplicationLogRepository: new PrismaMoraApplicationLogRepository(),
    whatsappNotificationRepository: new PrismaWhatsappNotificationRepository()
};

const repositoryContracts = [
    ['loanRepository', ILoanRepository],
    ['clientRepository', IClientRepository],
    ['configRepository', ISystemConfigRepository],
    ['paymentRepository', IPaymentRepository],
    ['paymentScheduleRepository', IPaymentScheduleRepository],
    ['clientCategoryRepository', IClientCategoryRepository],
    ['scoringRepository', IScoringRepository],
    ['dailyClosingRepository', IDailyClosingRepository],
    ['balanceSnapshotRepository', IBalanceSnapshotRepository],
    ['reportsRepository', IReportsRepository],
    ['userRepository', IUserRepository],
    ['moraApplicationLogRepository', IMoraApplicationLogRepository],
    ['whatsappNotificationRepository', IWhatsappNotificationRepository]
];

for (const [repositoryKey, InterfaceClass] of repositoryContracts) {
    validateInterfaceImplementation(repositoriesContainer[repositoryKey], InterfaceClass, repositoryKey);
}

module.exports = {
    repositoriesContainer
};
