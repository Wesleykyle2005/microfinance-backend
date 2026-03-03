class ClosingPeriodParamsDto {
    constructor({ month, year }) {
        this.month = month;
        this.year = year;
    }

    static fromRequest(params = {}) {
        const month = Number(params.month);
        const year = Number(params.year);
        const maxYear = new Date().getFullYear() + 1;

        if (!Number.isInteger(month) || month < 1 || month > 12) {
            const error = new Error('Mes inválido. Debe estar entre 1 y 12');
            error.statusCode = 400;
            throw error;
        }

        if (!Number.isInteger(year) || year < 2020 || year > maxYear) {
            const error = new Error('Año inválido');
            error.statusCode = 400;
            throw error;
        }

        return new ClosingPeriodParamsDto({
            month,
            year
        });
    }
}

module.exports = {
    ClosingPeriodParamsDto
};
