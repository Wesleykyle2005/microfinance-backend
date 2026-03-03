class GenerateReportDto {
    constructor({
        type,
        format,
        month,
        year,
        status,
        from,
        to
    }) {
        this.type = type;
        this.format = format;
        this.month = month;
        this.year = year;
        this.status = status;
        this.from = from;
        this.to = to;
    }

    static fromRequest(type, query = {}) {
        return new GenerateReportDto({
            type,
            format: query.format || 'excel',
            month: query.month ? Number(query.month) : null,
            year: query.year ? Number(query.year) : null,
            status: query.status || null,
            from: query.from || null,
            to: query.to || null
        });
    }

    static fromBalanceRequest(params = {}, query = {}) {
        return new GenerateReportDto({
            type: 'balance',
            format: query.format || 'excel',
            month: params.month ? Number(params.month) : null,
            year: params.year ? Number(params.year) : null,
            status: null,
            from: null,
            to: null
        });
    }
}

module.exports = {
    GenerateReportDto
};
