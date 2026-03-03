class GetPaymentByIdUseCase {
    constructor(paymentRepository) {
        this.paymentRepository = paymentRepository;
    }

    async execute(paymentId) {
        return this.paymentRepository.findUnique({
            where: { id: paymentId },
            include: {
                loan: {
                    include: {
                        client: {
                            select: {
                                fullName: true,
                                identificationNumber: true
                            }
                        }
                    }
                },
                creator: {
                    select: {
                        email: true
                    }
                }
            }
        });
    }
}

module.exports = {
    GetPaymentByIdUseCase
};