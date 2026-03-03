class PaymentDomainService {
    static buildBreakdown({ principalPaid = 0, interestPaid = 0, lateFeePaid = 0 }) {
        const principal = Number(principalPaid || 0);
        const interest = Number(interestPaid || 0);
        const lateFee = Number(lateFeePaid || 0);

        return {
            principalPaid: principal,
            interestPaid: interest,
            lateFeePaid: lateFee,
            totalApplied: principal + interest + lateFee
        };
    }
}

module.exports = {
    PaymentDomainService
};
