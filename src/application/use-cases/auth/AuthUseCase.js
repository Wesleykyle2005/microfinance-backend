class AuthUseCase {
    constructor(authService, tokenRevocationService) {
        this.authService = authService;
        this.tokenRevocationService = tokenRevocationService;
    }

    async register(dto) {
        return this.authService.register(dto);
    }

    async login(dto) {
        return this.authService.login(dto);
    }

    async refreshAccessToken(refreshToken) {
        return this.authService.refreshAccessToken(refreshToken);
    }

    async validateToken(token) {
        return this.authService.validateToken(token);
    }

    async changePassword(dto) {
        return this.authService.changePassword(dto);
    }

    async getUserById(userId) {
        return this.authService.getUserById(userId);
    }

    async logout(userId, bearerToken) {
        const data = await this.authService.logout(userId);

        if (bearerToken) {
            await this.tokenRevocationService.revokeToken(bearerToken);
        }

        return data;
    }

    async registerAdmin(dto) {
        return this.authService.registerAdmin(dto);
    }
}

module.exports = {
    AuthUseCase
};
