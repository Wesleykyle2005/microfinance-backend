class GetLoanByIdUseCase {
    constructor(loanRepository) {
        this.loanRepository = loanRepository;
    }

    async execute(loanId) {
        return this.loanRepository.findUnique({
            where: { id: loanId },
            include: {
                client: {
                    include: {
                        category: true
                    }
                },
                collector: true,
                paymentSchedules: {
                    orderBy: { paymentNumber: 'asc' }
                },
                payments: {
                    orderBy: { createdAt: 'desc' }
                }
            }
        });
    }
}

module.exports = {
    GetLoanByIdUseCase
};