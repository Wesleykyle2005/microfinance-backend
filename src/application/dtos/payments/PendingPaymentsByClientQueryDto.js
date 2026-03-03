class PendingPaymentsByClientQueryDto {
    constructor({ clientId }) {
        this.clientId = clientId;
    }

    static fromRequest(query = {}) {
        const clientId = String(query.clientId || '').trim();

        if (!clientId) {
            const error = new Error('El parámetro clientId es requerido');
            error.statusCode = 400;
            throw error;
        }

        return new PendingPaymentsByClientQueryDto({ clientId });
    }
}

module.exports = {
    PendingPaymentsByClientQueryDto
};
