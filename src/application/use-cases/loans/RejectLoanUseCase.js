class RejectLoanUseCase {
    constructor(loanRepository) {
        this.loanRepository = loanRepository;
    }

    async execute({ loanId, reason, userId, ipAddress, userAgent }) {
        const loan = await this.loanRepository.findUnique({ where: { id: loanId } });

        if (!loan) {
            throw new Error('LOAN_NOT_FOUND');
        }

        if (loan.statusLoan !== 'PENDING') {
            throw new Error(`LOAN_STATUS_INVALID:${loan.statusLoan}`);
        }

        return this.loanRepository.rejectLoan({
            loanId,
            auditLogData: {
                userId,
                action: 'REJECT_LOAN',
                entityType: 'Loan',
                entityId: loanId,
                changes: {
                    status: 'PENDING → CANCELLED',
                    reason
                },
                ipAddress,
                userAgent
            }
        });
    }
}

module.exports = {
    RejectLoanUseCase
};