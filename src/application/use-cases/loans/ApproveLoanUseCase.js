class ApproveLoanUseCase {
    constructor(loanRepository, amortizationService) {
        this.loanRepository = loanRepository;
        this.amortizationService = amortizationService;
    }

    async execute({ loanId, userId, ipAddress, userAgent }) {
        const loan = await this.loanRepository.findUnique({
            where: { id: loanId },
            include: {
                client: {
                    include: {
                        category: true
                    }
                }
            }
        });

        if (!loan) {
            throw new Error('LOAN_NOT_FOUND');
        }

        if (loan.statusLoan !== 'PENDING') {
            throw new Error(`LOAN_STATUS_INVALID:${loan.statusLoan}`);
        }

        const approvalTimestamp = new Date();

        const { schedule, totals } = this.amortizationService.calculateSchedule({
            amount: Number(loan.principalAmount),
            months: Math.ceil(Number(loan.termDays) / 30),
            frequency: loan.frequency,
            interestRate: Number(loan.interestRate),
            startDate: approvalTimestamp
        });

        const updatedLoan = await this.loanRepository.approveLoanWithSchedule({
            loanId,
            loanData: {
                statusLoan: 'ACTIVE',
                approvalDate: approvalTimestamp,
                disbursementDate: approvalTimestamp,
                interestTotal: totals.totalInterest,
                totalAmount: totals.totalAmount,
                remainingBalance: totals.totalAmount,
                maturityDate: schedule[schedule.length - 1].dueDate
            },
            schedule: schedule.map((item) => ({
                loanId,
                paymentNumber: item.paymentNumber,
                dueDate: item.dueDate,
                principalDueAmount: item.principalDueAmount,
                interestAmount: item.interestAmount,
                lateFeeAmount: 0,
                totalDue: item.totalDue,
                paidAmount: 0,
                remainingAmount: item.remainingAmount,
                status: 'PENDING'
            })),
            auditLogData: {
                userId,
                action: 'APPROVE_LOAN',
                entityType: 'Loan',
                entityId: loanId,
                changes: {
                    status: 'PENDING → ACTIVE',
                    newStartDate: approvalTimestamp,
                    scheduleRegenerated: true,
                    newMaturityDate: schedule[schedule.length - 1].dueDate
                },
                ipAddress,
                userAgent
            }
        });

        const result = {
            loan: updatedLoan,
            schedule,
            approvalTimestamp
        };

        return result;
    }
}

module.exports = {
    ApproveLoanUseCase
};