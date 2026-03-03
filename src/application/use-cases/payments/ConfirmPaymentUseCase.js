class ConfirmPaymentUseCase {
    constructor(paymentRepository) {
        this.paymentRepository = paymentRepository;
    }

    async execute({ paymentId, userId, ipAddress, userAgent }) {
        const payment = await this.paymentRepository.findUnique({
            where: { id: paymentId },
            select: {
                id: true,
                status: true,
                receiptFolio: true,
                loanId: true
            }
        });

        if (!payment) {
            throw new Error('PAYMENT_NOT_FOUND');
        }

        if (payment.status !== 'PENDING') {
            throw new Error(`PAYMENT_STATUS_INVALID:${payment.status}`);
        }

        return this.paymentRepository.confirmPaymentWithAudit({
            paymentId,
            auditLogData: {
                userId,
                action: 'CONFIRM_PAYMENT',
                entityType: 'Payment',
                entityId: paymentId,
                changes: {
                    fromStatus: payment.status,
                    toStatus: 'CONFIRMED',
                    receiptFolio: payment.receiptFolio || null,
                    loanId: payment.loanId
                },
                ipAddress,
                userAgent
            }
        });
    }
}

module.exports = {
    ConfirmPaymentUseCase
};