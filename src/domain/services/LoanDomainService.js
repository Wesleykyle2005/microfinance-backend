class LoanDomainService {
    static isClientEligible(client) {
        return Boolean(client && client.isActive && !client.isCreditBlocked);
    }
}

module.exports = {
    LoanDomainService
};
