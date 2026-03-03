class IUserRepository {
    async findById(id) { throw new Error('Not implemented'); }
    async findByEmail(email, includePassword) { throw new Error('Not implemented'); }
    async create(data) { throw new Error('Not implemented'); }
    async update(id, data) { throw new Error('Not implemented'); }
    async updateLastLogin(id) { throw new Error('Not implemented'); }
    async existsByEmail(email) { throw new Error('Not implemented'); }
    async countByRole(role) { throw new Error('Not implemented'); }
}

module.exports = {
    IUserRepository
};
