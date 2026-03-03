class MonthlyTrendsQueryDto {
    constructor({ months }) {
        this.months = months;
    }

    static fromRequest(query = {}) {
        const months = Number(query.months || 6);

        if (!Number.isInteger(months) || months < 1 || months > 36) {
            const error = new Error('El parámetro "months" debe ser un entero entre 1 y 36');
            error.statusCode = 400;
            throw error;
        }

        return new MonthlyTrendsQueryDto({
            months
        });
    }
}

module.exports = {
    MonthlyTrendsQueryDto
};
