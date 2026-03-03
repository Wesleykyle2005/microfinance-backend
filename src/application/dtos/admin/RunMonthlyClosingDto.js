class RunMonthlyClosingDto {
    constructor({ month, year, userId }) {
        this.month = month;
        this.year = year;
        this.userId = userId;
    }

    static fromRequest(body = {}, userId) {
        const now = new Date();
        const month = Number(body.month || now.getMonth() + 1);
        const year = Number(body.year || now.getFullYear());

        if (!Number.isInteger(month) || month < 1 || month > 12) {
            const error = new Error('El mes debe estar entre 1 y 12');
            error.statusCode = 400;
            throw error;
        }

        if (!Number.isInteger(year) || year < 2020 || year > now.getFullYear() + 1) {
            const error = new Error(`El año debe estar entre 2020 y ${now.getFullYear() + 1}`);
            error.statusCode = 400;
            throw error;
        }

        return new RunMonthlyClosingDto({
            month,
            year,
            userId
        });
    }
}

module.exports = {
    RunMonthlyClosingDto
};
