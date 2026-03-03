class LoanReportQueryDto {
    constructor({ loanId, page, limit, onlyOpen, includePending }) {
        this.loanId = loanId;
        this.page = page;
        this.limit = limit;
        this.onlyOpen = onlyOpen;
        this.includePending = includePending;
    }

    static fromRequest(params = {}, query = {}) {
        return new LoanReportQueryDto({
            loanId: params.loanId,
            page: query.page,
            limit: query.limit,
            onlyOpen: String(query.onlyOpen || 'false') === 'true',
            includePending: String(query.includePending || 'false') === 'true'
        });
    }
}

module.exports = {
    LoanReportQueryDto
};
