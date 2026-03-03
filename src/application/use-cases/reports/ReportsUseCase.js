class ReportsUseCase {
    constructor(reportsService) {
        this.reportsService = reportsService;
    }

    async getCarteraData(filters) {
        return this.reportsService.getCarteraData(filters);
    }

    async generateCarteraExcel(carteraData, metadata) {
        return this.reportsService.generateCarteraExcel(carteraData, metadata);
    }

    async getCarteraOverview(filters) {
        return this.reportsService.getCarteraOverview(filters);
    }

    async getCarteraLoansLight(filters) {
        return this.reportsService.getCarteraLoansLight(filters);
    }

    async getCarteraInstallmentsByLoan(loanId, options) {
        return this.reportsService.getCarteraInstallmentsByLoan(loanId, options);
    }

    async getCarteraPaymentsByLoan(loanId, options) {
        return this.reportsService.getCarteraPaymentsByLoan(loanId, options);
    }

    async getMoraData() {
        return this.reportsService.getMoraData();
    }

    async generateMoraExcel(moraData) {
        return this.reportsService.generateMoraExcel(moraData);
    }

    async getMoraOverview() {
        return this.reportsService.getMoraOverview();
    }

    async getMoraLoansLight(options) {
        return this.reportsService.getMoraLoansLight(options);
    }

    async getBalanceData(month, year) {
        return this.reportsService.getBalanceData(month, year);
    }

    async generateBalanceExcel(balanceData, month, year) {
        return this.reportsService.generateBalanceExcel(balanceData, month, year);
    }

    async generateBalancePdf(balanceData, month, year) {
        return this.reportsService.generateBalancePdf(balanceData, month, year);
    }

    async getClienteEstadoCuentaData(clientId) {
        return this.reportsService.getClienteEstadoCuentaData(clientId);
    }

    async generateClienteEstadoCuentaPdf(payload) {
        return this.reportsService.generateClienteEstadoCuentaPdf(payload);
    }

    async getReciboPagoData(paymentId) {
        return this.reportsService.getReciboPagoData(paymentId);
    }

    async generateReciboPagoPdf(payment) {
        return this.reportsService.generateReciboPagoPdf(payment);
    }
}

module.exports = {
    ReportsUseCase
};
