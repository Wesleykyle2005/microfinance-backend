const Decimal = require('decimal.js');
const { IDailyClosingRepository } = require('../../../application/interfaces/repositories/IDailyClosingRepository');
const { getPrismaClient } = require('../../database/prismaClient');
const { MoraCalculator } = require('../../../domain/services/MoraCalculator');

class PrismaDailyClosingRepository extends IDailyClosingRepository {
    constructor(prismaClient = null) {
        super();
        this.prisma = prismaClient || getPrismaClient();
    }

    async findByExecutionDate(executionDate) {
        return this.prisma.dailyClosingLog.findUnique({
            where: { executionDate }
        });
    }

    async createExecutionLog(args) {
        return this.prisma.dailyClosingLog.create(args);
    }

    async processDailyClosing({ today, userId }) {
        return this.prisma.$transaction(async (tx) => {
            const config = await tx.systemConfig.findFirst();

            if (!config) {
                throw new Error('SystemConfig no encontrado. Configure el sistema primero.');
            }

            const lateFeeRate = new Decimal(config.defaultLateFeeRate);

            const overdueInstallments = await tx.paymentSchedule.findMany({
                where: {
                    dueDate: {
                        lt: today
                    },
                    status: {
                        notIn: ['PAID', 'OVERDUE', 'RESCHEDULED']
                    }
                },
                include: {
                    loan: {
                        include: {
                            client: {
                                select: {
                                    id: true,
                                    fullName: true,
                                    phoneNumber: true
                                }
                            }
                        }
                    }
                },
                orderBy: {
                    dueDate: 'asc'
                }
            });

            if (overdueInstallments.length === 0) {
                return {
                    config,
                    processed: [],
                    message: 'No hay cuotas vencidas para procesar'
                };
            }

            const processedInstallments = [];

            for (const installment of overdueInstallments) {
                const principalDue = new Decimal(installment.principalDueAmount);
                const currentLateFee = new Decimal(installment.lateFeeAmount || 0);
                const daysOverdue = Math.floor((today - installment.dueDate) / (1000 * 60 * 60 * 24));

                let penalty = new Decimal(0);
                let newLateFee = currentLateFee;
                let newTotalDue = new Decimal(installment.totalDue);

                if (config.moraEnabled) {
                    const calculatedPenalty = MoraCalculator.calculate({
                        principalDue: principalDue.toNumber(),
                        lateFeeRate: lateFeeRate.toNumber(),
                        daysOverdue,
                        type: config.moraCalculationType
                    });

                    penalty = new Decimal(calculatedPenalty);

                    newLateFee = currentLateFee.plus(penalty);
                    newTotalDue = new Decimal(installment.totalDue).plus(penalty);
                }

                await tx.paymentSchedule.update({
                    where: { id: installment.id },
                    data: {
                        lateFeeAmount: newLateFee.toNumber(),
                        totalDue: newTotalDue.toNumber(),
                        remainingAmount: config.moraEnabled
                            ? { increment: penalty.toNumber() }
                            : undefined,
                        status: 'OVERDUE'
                    }
                });

                if (config.moraEnabled && penalty.gt(0)) {
                    await tx.loan.update({
                        where: { id: installment.loanId },
                        data: {
                            lateFeesAccrued: {
                                increment: penalty.toNumber()
                            },
                            totalAmount: {
                                increment: penalty.toNumber()
                            },
                            remainingBalance: {
                                increment: penalty.toNumber()
                            }
                        }
                    });

                    await tx.moraApplicationLog.create({
                        data: {
                            installmentId: installment.id,
                            loanId: installment.loanId,
                            moraAmountApplied: penalty.toNumber(),
                            dailyRate: lateFeeRate.div(30).toNumber(),
                            daysOverdue,
                            applicationType: 'DAILY',
                            appliedAt: new Date(),
                            appliedByUserId: userId,
                            notes: `Cierre diario - ${daysOverdue} días de atraso - Mora cobrada`
                        }
                    });
                }

                processedInstallments.push({
                    installment,
                    penalty: penalty.toNumber(),
                    daysOverdue,
                    moraApplied: config.moraEnabled
                });
            }

            return {
                config,
                processed: processedInstallments,
                message: config.moraEnabled
                    ? 'Mora aplicada y cuotas marcadas como vencidas'
                    : 'Cuotas marcadas como vencidas sin cobrar mora'
            };
        });
    }
}

module.exports = {
    PrismaDailyClosingRepository
};
