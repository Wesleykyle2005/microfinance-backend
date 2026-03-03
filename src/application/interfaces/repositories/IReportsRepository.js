class IReportsRepository {
    async countLoans(args) { throw new Error('Not implemented'); }
    async aggregateLoans(args) { throw new Error('Not implemented'); }
    async groupByLoans(args) { throw new Error('Not implemented'); }
    async findManyLoans(args) { throw new Error('Not implemented'); }
    async findManyPayments(args) { throw new Error('Not implemented'); }
    async countPayments(args) { throw new Error('Not implemented'); }
    async findManyPaymentSchedules(args) { throw new Error('Not implemented'); }
    async countPaymentSchedules(args) { throw new Error('Not implemented'); }
    async aggregatePaymentSchedules(args) { throw new Error('Not implemented'); }
    async countClients(args) { throw new Error('Not implemented'); }
    async findUniqueClient(args) { throw new Error('Not implemented'); }
    async findUniquePayment(args) { throw new Error('Not implemented'); }
    async findUniqueBalanceSnapshot(args) { throw new Error('Not implemented'); }
}

module.exports = {
    IReportsRepository
};
