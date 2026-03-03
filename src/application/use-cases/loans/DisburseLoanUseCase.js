class DisburseLoanUseCase {
    constructor(loanRepository) {
        this.loanRepository = loanRepository;
    }

    async execute({ loanId, userId, ipAddress, userAgent }) {
        const loan = await this.loanRepository.findUnique({ where: { id: loanId } });

        if (!loan) {
            throw new Error('LOAN_NOT_FOUND');
        }

        if (loan.statusLoan !== 'ACTIVE') {
            throw new Error(`LOAN_STATUS_INVALID:${loan.statusLoan}`);
        }

        if (loan.disbursementDate) {
            throw new Error('LOAN_ALREADY_DISBURSED');
        }

        const disbursedAt = new Date();

        return this.loanRepository.disburseLoan({
            loanId,
            disbursedAt,
            auditLogData: {
                userId,
                action: 'DISBURSE_LOAN',
                entityType: 'Loan',
                entityId: loanId,
                changes: {
                    disbursedAt
                },
                ipAddress,
                userAgent
            }
        });
    }
}

module.exports = {
    DisburseLoanUseCase
};