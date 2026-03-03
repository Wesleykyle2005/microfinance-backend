class CreateLoanDto {
    constructor({
        clientId,
        principalAmount,
        approvedAmount,
        interestRate,
        lateFeeRate,
        termDays,
        frequency,
        currency,
        months,
        createdBy
    }) {
        this.clientId = clientId;
        this.principalAmount = principalAmount;
        this.approvedAmount = approvedAmount;
        this.interestRate = interestRate;
        this.lateFeeRate = lateFeeRate;
        this.termDays = termDays;
        this.frequency = frequency;
        this.currency = currency;
        this.months = months;
        this.createdBy = createdBy;
    }

    static fromRequest(body, userId) {
        return new CreateLoanDto({
            clientId: body.clientId,
            principalAmount: body.principalAmount,
            approvedAmount: body.approvedAmount,
            interestRate: body.interestRate,
            lateFeeRate: body.lateFeeRate,
            termDays: body.termDays,
            months: body.months,
            frequency: body.frequency,
            currency: body.currency,
            createdBy: userId
        });
    }
}

module.exports = {
    CreateLoanDto
};
