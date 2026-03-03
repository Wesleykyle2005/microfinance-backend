class ILoanRepository {
    async findById(id) { throw new Error('Not implemented'); }
    async create(data) { throw new Error('Not implemented'); }
    async update(id, data) { throw new Error('Not implemented'); }
    async findActiveByClient(clientId) { throw new Error('Not implemented'); }
    async listByStatusAndDateRange(status, from, to) { throw new Error('Not implemented'); }
}

module.exports = {
    ILoanRepository
};
