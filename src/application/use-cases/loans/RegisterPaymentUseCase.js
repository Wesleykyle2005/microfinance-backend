const { PaymentDomainService } = require('../../../domain/services/PaymentDomainService');

class RegisterPaymentUseCase {
    constructor(loanRepository, paymentRepository, scheduleRepository, notificationService) {
        this.loanRepository = loanRepository;
        this.paymentRepository = paymentRepository;
        this.scheduleRepository = scheduleRepository;
        this.notificationService = notificationService;
    }

    async execute(dto) {
        const loan = await this.loanRepository.findById(dto.loanId);

        if (!loan) {
            throw new Error('LOAN_NOT_FOUND');
        }

        const breakdown = PaymentDomainService.buildBreakdown({
            principalPaid: dto.principalPaid,
            interestPaid: dto.interestPaid,
            lateFeePaid: dto.lateFeePaid
        });

        const payment = await this.paymentRepository.create({
            loanId: dto.loanId,
            amount: dto.amount,
            principalPaid: breakdown.principalPaid,
            interestPaid: breakdown.interestPaid,
            lateFeePaid: breakdown.lateFeePaid,
            paymentDate: dto.paymentDate,
            paymentMethod: dto.paymentMethod,
            notes: dto.notes,
            voucherPhotoUrl: dto.voucherPhotoUrl,
            status: 'CONFIRMED',
            createdBy: dto.createdBy
        });

        if (this.notificationService && typeof this.notificationService.sendPaymentConfirmed === 'function') {
            await this.notificationService.sendPaymentConfirmed(loan, payment);
        }

        return payment;
    }
}

module.exports = {
    RegisterPaymentUseCase
};
