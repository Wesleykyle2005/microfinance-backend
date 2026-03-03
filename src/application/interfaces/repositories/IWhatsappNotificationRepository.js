class IWhatsappNotificationRepository {
    async create(data) { throw new Error('Not implemented'); }
    async updateStatus(id, data) { throw new Error('Not implemented'); }
    async listPending(limit) { throw new Error('Not implemented'); }
}

module.exports = {
    IWhatsappNotificationRepository
};
