class IScoringRepository {
    async findClientById(clientId) { throw new Error('Not implemented'); }
    async findCategoryById(categoryId) { throw new Error('Not implemented'); }
    async countPaymentSchedules(where) { throw new Error('Not implemented'); }
    async aggregateLoans(args) { throw new Error('Not implemented'); }
    async aggregatePaymentSchedules(args) { throw new Error('Not implemented'); }
    async findPaidSchedulesWithDates(clientId) { throw new Error('Not implemented'); }
    async findActiveCategories() { throw new Error('Not implemented'); }
    async updateClientScoreAndCreateHistory(args) { throw new Error('Not implemented'); }
    async findActiveClients() { throw new Error('Not implemented'); }
}

module.exports = {
    IScoringRepository
};
