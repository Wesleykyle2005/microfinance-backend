class RegisterPaymentDto {
    constructor({
        loanId,
        amount,
        principalPaid,
        interestPaid,
        lateFeePaid,
        paymentDate,
        paymentMethod,
        voucherPhotoUrl,
        notes,
        createdBy
    }) {
        this.loanId = loanId;
        this.amount = amount;
        this.principalPaid = principalPaid;
        this.interestPaid = interestPaid;
        this.lateFeePaid = lateFeePaid;
        this.paymentDate = paymentDate;
        this.paymentMethod = paymentMethod;
        this.voucherPhotoUrl = voucherPhotoUrl;
        this.notes = notes;
        this.createdBy = createdBy;
    }

    static fromRequest(body, userId) {
        return new RegisterPaymentDto({
            loanId: body.loanId,
            amount: body.amount,
            principalPaid: body.principalPaid,
            interestPaid: body.interestPaid,
            lateFeePaid: body.lateFeePaid,
            paymentDate: body.paymentDate || new Date().toISOString(),
            paymentMethod: body.paymentMethod || 'CASH',
            voucherPhotoUrl: body.voucherPhotoUrl || null,
            notes: body.notes || null,
            createdBy: userId
        });
    }
}

module.exports = {
    RegisterPaymentDto
};
