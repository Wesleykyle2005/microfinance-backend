class IClientRepository {
    async findById(id) { throw new Error('Not implemented'); }
    async create(data) { throw new Error('Not implemented'); }
    async update(id, data) { throw new Error('Not implemented'); }
    async list(filters) { throw new Error('Not implemented'); }
}

module.exports = {
    IClientRepository
};
