class AdminClosingUseCase {
    constructor({ cronService, monthlyClosingService, dailyClosingScheduler }) {
        this.cronService = cronService;
        this.monthlyClosingService = monthlyClosingService;
        this.dailyClosingScheduler = dailyClosingScheduler;
    }

    async runDailyClosing(userId) {
        return this.cronService.runDailyClosing(userId);
    }

    async runDailyClosingTest() {
        return this.dailyClosingScheduler.runNow();
    }

    async runMonthlyClosing(dto) {
        return this.monthlyClosingService.executeClosing(dto);
    }

    async getClosingHistory(dto) {
        return this.monthlyClosingService.getClosingHistory(dto);
    }

    async getClosingByPeriod(month, year) {
        return this.monthlyClosingService.getClosingByPeriod(month, year);
    }

    async getAnnualStats(year) {
        return this.monthlyClosingService.getAnnualStats(year);
    }

    async comparePeriods(fromMonth, toMonth, year) {
        return this.monthlyClosingService.comparePeriods(fromMonth, toMonth, year);
    }

    async getCurrentMonthData() {
        return this.monthlyClosingService.getCurrentMonthData();
    }

    async getMonthlyTrends(months) {
        return this.monthlyClosingService.getMonthlyTrends(months);
    }
}

module.exports = {
    AdminClosingUseCase
};
