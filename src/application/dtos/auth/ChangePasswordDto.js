class ChangePasswordDto {
    constructor({ userId, oldPassword, newPassword }) {
        this.userId = userId;
        this.oldPassword = oldPassword;
        this.newPassword = newPassword;
    }

    static fromRequest(body = {}, userId) {
        return new ChangePasswordDto({
            userId,
            oldPassword: body.oldPassword,
            newPassword: body.newPassword
        });
    }
}

module.exports = {
    ChangePasswordDto
};
