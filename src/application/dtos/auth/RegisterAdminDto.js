class RegisterAdminDto {
    constructor({ email, password, fullName }) {
        this.email = email;
        this.password = password;
        this.fullName = fullName;
    }

    static fromRequest(body = {}) {
        return new RegisterAdminDto({
            email: body.email,
            password: body.password,
            fullName: body.fullName
        });
    }
}

module.exports = {
    RegisterAdminDto
};
