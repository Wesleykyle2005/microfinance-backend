const { LoanDomainService } = require('../../../domain/services/LoanDomainService');
const { Percentage } = require('../../../domain/value-objects/Percentage');

class CreateLoanUseCase {
    constructor(loanRepository, clientRepository, configRepository, amortizationService) {
        this.loanRepository = loanRepository;
        this.clientRepository = clientRepository;
        this.configRepository = configRepository;
        this.amortizationService = amortizationService;
    }

    async execute(dto) {
        const client = await this.clientRepository.findById(dto.clientId);

        if (!client || !client.isActive) {
            throw new Error('CLIENT_NOT_FOUND_OR_INACTIVE');
        }

        if (!LoanDomainService.isClientEligible(client)) {
            throw new Error('CLIENT_CREDIT_BLOCKED');
        }

        const config = await this.configRepository.getCurrentConfig();

        if (!config) {
            throw new Error('SYSTEM_CONFIG_NOT_FOUND');
        }

        const months = Number(dto.months) || Math.ceil((Number(dto.termDays) || 30) / 30);
        const amount = Number(dto.principalAmount || dto.approvedAmount);

        const interestRate = new Percentage(
            dto.interestRate !== undefined
                ? Number(dto.interestRate)
                : Number(config.defaultInterestRate)
        ).toRate();

        const lateFeeRate = new Percentage(
            dto.lateFeeRate !== undefined
                ? Number(dto.lateFeeRate)
                : Number(config.defaultLateFeeRate)
        ).toRate();

        const scheduleCalculation = this.amortizationService.calculateSchedule({
            amount,
            months,
            frequency: dto.frequency || 'MONTHLY',
            interestRate,
            startDate: new Date()
        });

        const loanData = {
            clientId: dto.clientId,
            principalAmount: amount,
            approvedAmount: Number(dto.approvedAmount || amount),
            interestRate,
            lateFeeRate,
            interestTotal: scheduleCalculation.totals.totalInterest,
            totalAmount: scheduleCalculation.totals.totalAmount,
            remainingBalance: scheduleCalculation.totals.totalAmount,
            termDays: Number(dto.termDays || months * 30),
            frequency: dto.frequency || 'MONTHLY',
            currency: dto.currency || 'NIO',
            statusLoan: 'PENDING',
            createdBy: dto.createdBy,
            collectorId: dto.createdBy
        };

        return this.loanRepository.create(loanData);
    }
}

module.exports = {
    CreateLoanUseCase
};
