class ComparePeriodsQueryDto {
    constructor({ fromMonth, toMonth, year }) {
        this.fromMonth = fromMonth;
        this.toMonth = toMonth;
        this.year = year;
    }

    static fromRequest(query = {}) {
        if (query.from === undefined || query.to === undefined) {
            const error = new Error('Los parámetros "from" y "to" son requeridos');
            error.statusCode = 400;
            throw error;
        }

        const fromMonth = Number(query.from);
        const toMonth = Number(query.to);
        const year = Number(query.year || new Date().getFullYear());

        if (!Number.isInteger(fromMonth) || fromMonth < 1 || fromMonth > 12) {
            const error = new Error('El parámetro "from" debe estar entre 1 y 12');
            error.statusCode = 400;
            throw error;
        }

        if (!Number.isInteger(toMonth) || toMonth < 1 || toMonth > 12) {
            const error = new Error('El parámetro "to" debe estar entre 1 y 12');
            error.statusCode = 400;
            throw error;
        }

        if (!Number.isInteger(year) || year < 2020 || year > new Date().getFullYear()) {
            const error = new Error(`Año inválido. Debe estar entre 2020 y ${new Date().getFullYear()}`);
            error.statusCode = 400;
            throw error;
        }

        return new ComparePeriodsQueryDto({
            fromMonth,
            toMonth,
            year
        });
    }
}

module.exports = {
    ComparePeriodsQueryDto
};
