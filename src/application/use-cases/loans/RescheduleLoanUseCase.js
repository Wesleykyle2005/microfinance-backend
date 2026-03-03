class RescheduleLoanUseCase {
    constructor(loanRepository, paymentScheduleRepository, amortizationService) {
        this.loanRepository = loanRepository;
        this.paymentScheduleRepository = paymentScheduleRepository;
        this.amortizationService = amortizationService;
    }

    async execute({ loanId, newStartDate, reason, userId, ipAddress, userAgent }) {
        if (!newStartDate || !reason) {
            throw new Error('RESCHEDULE_REQUIRED_FIELDS');
        }

        const parsedStartDate = new Date(newStartDate);
        if (Number.isNaN(parsedStartDate.getTime())) {
            throw new Error('RESCHEDULE_INVALID_DATE');
        }

        const loan = await this.loanRepository.findUnique({
            where: { id: loanId },
            include: {
                client: {
                    select: { fullName: true }
                }
            }
        });

        if (!loan) {
            throw new Error('LOAN_NOT_FOUND');
        }

        if (loan.statusLoan !== 'ACTIVE') {
            throw new Error(`LOAN_STATUS_INVALID:${loan.statusLoan}`);
        }

        const pendingInstallments = await this.paymentScheduleRepository.findMany({
            where: {
                loanId,
                status: { not: 'PAID' }
            },
            orderBy: { paymentNumber: 'asc' }
        });

        if (pendingInstallments.length === 0) {
            throw new Error('RESCHEDULE_NO_PENDING_INSTALLMENTS');
        }

        const updatedInstallments = pendingInstallments.map((installment, index) => {
            const newDueDate = this.amortizationService.calculateDueDate(
                parsedStartDate,
                index,
                loan.frequency
            );

            const newStatus = installment.status === 'OVERDUE' ? 'PENDING' : installment.status;

            return {
                id: installment.id,
                paymentNumber: installment.paymentNumber,
                oldDueDate: installment.dueDate,
                newDueDate,
                oldStatus: installment.status,
                newStatus
            };
        });

        const newMaturityDate = updatedInstallments[updatedInstallments.length - 1].newDueDate;

        const result = await this.loanRepository.rescheduleLoan({
            loanId,
            maturityDate: newMaturityDate,
            installments: updatedInstallments,
            auditLogData: {
                userId,
                action: 'RESCHEDULE_LOAN',
                entityType: 'Loan',
                entityId: loanId,
                changes: {
                    reason,
                    newStartDate: parsedStartDate,
                    newMaturityDate,
                    installmentsRescheduled: updatedInstallments.length,
                    overdueReverted: updatedInstallments.filter((i) => i.oldStatus === 'OVERDUE').length,
                    details: updatedInstallments.map((i) => ({
                        paymentNumber: i.paymentNumber,
                        oldDueDate: i.oldDueDate,
                        newDueDate: i.newDueDate,
                        statusChange: i.oldStatus !== i.newStatus ? `${i.oldStatus} → ${i.newStatus}` : null
                    }))
                },
                ipAddress,
                userAgent
            }
        });

        return {
            loan,
            reason,
            parsedStartDate,
            newMaturityDate,
            installments: result
        };
    }
}

module.exports = {
    RescheduleLoanUseCase
};