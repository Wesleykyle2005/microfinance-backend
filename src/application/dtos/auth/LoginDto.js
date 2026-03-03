class LoginDto {
    constructor({ email, password }) {
        this.email = email;
        this.password = password;
    }

    static fromRequest(body = {}) {
        return new LoginDto({
            email: body.email,
            password: body.password
        });
    }
}

module.exports = {
    LoginDto
};
