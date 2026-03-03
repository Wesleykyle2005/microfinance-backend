class RegisterDto {
    constructor({ email, password, role }) {
        this.email = email;
        this.password = password;
        this.role = role;
    }

    static fromRequest(body = {}) {
        return new RegisterDto({
            email: body.email,
            password: body.password,
            role: body.role
        });
    }
}

module.exports = {
    RegisterDto
};
