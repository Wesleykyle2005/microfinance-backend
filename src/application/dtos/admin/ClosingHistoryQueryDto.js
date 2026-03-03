class ClosingHistoryQueryDto {
    constructor({ limit, offset, year }) {
        this.limit = limit;
        this.offset = offset;
        this.year = year;
    }

    static fromRequest(query = {}) {
        return new ClosingHistoryQueryDto({
            limit: Number(query.limit || 12),
            offset: Number(query.offset || 0),
            year: query.year ? Number(query.year) : undefined
        });
    }
}

module.exports = {
    ClosingHistoryQueryDto
};
