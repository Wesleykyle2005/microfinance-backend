class IPaymentRepository {
    async create(data) { throw new Error('Not implemented'); }
    async listByLoan(loanId) { throw new Error('Not implemented'); }
    async findById(id) { throw new Error('Not implemented'); }
}

module.exports = {
    IPaymentRepository
};
