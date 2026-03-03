class ValidateTokenDto {
    constructor({ token }) {
        this.token = token;
    }

    static fromRequest(body = {}) {
        return new ValidateTokenDto({
            token: body.token
        });
    }
}

module.exports = {
    ValidateTokenDto
};
