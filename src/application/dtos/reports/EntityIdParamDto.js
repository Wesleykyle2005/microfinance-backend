class EntityIdParamDto {
    constructor({ id, paymentId }) {
        this.id = id;
        this.paymentId = paymentId;
    }

    static fromRequest(params = {}) {
        return new EntityIdParamDto({
            id: params.id,
            paymentId: params.paymentId
        });
    }
}

module.exports = {
    EntityIdParamDto
};
