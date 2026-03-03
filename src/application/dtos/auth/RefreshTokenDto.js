class RefreshTokenDto {
    constructor({ refreshToken }) {
        this.refreshToken = refreshToken;
    }

    static fromRequest(body = {}) {
        return new RefreshTokenDto({
            refreshToken: body.refreshToken
        });
    }
}

module.exports = {
    RefreshTokenDto
};
