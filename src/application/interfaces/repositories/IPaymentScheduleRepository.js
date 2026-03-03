class IPaymentScheduleRepository {
    async listPendingByLoan(loanId) { throw new Error('Not implemented'); }
    async update(id, data) { throw new Error('Not implemented'); }
    async createMany(data) { throw new Error('Not implemented'); }
    async countUnpaidByLoan(loanId) { throw new Error('Not implemented'); }
}

module.exports = {
    IPaymentScheduleRepository
};
