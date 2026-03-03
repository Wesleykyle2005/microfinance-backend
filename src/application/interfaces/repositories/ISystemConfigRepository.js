class ISystemConfigRepository {
    async getCurrentConfig() { throw new Error('Not implemented'); }
    async count() { throw new Error('Not implemented'); }
    async findMany(params) { throw new Error('Not implemented'); }
    async findUnique(params) { throw new Error('Not implemented'); }
    async create(params) { throw new Error('Not implemented'); }
    async createHistoryMany(data) { throw new Error('Not implemented'); }
    async update(id, data, include) { throw new Error('Not implemented'); }
}

module.exports = {
    ISystemConfigRepository
};
