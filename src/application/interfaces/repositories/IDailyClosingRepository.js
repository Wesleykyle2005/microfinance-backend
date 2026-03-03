class IDailyClosingRepository {
    async findByExecutionDate(executionDate) { throw new Error('Not implemented'); }
    async createExecutionLog(args) { throw new Error('Not implemented'); }
    async processDailyClosing(args) { throw new Error('Not implemented'); }
}

module.exports = {
    IDailyClosingRepository
};
