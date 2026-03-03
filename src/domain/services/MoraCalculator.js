class MoraCalculator {
    static calculate({ principalDue, lateFeeRate, daysOverdue, type = 'DAILY' }) {
        const principal = Number(principalDue || 0);
        const rate = Number(lateFeeRate || 0);

        if (type === 'MONTHLY') {
            return principal * rate;
        }

        const dailyRate = rate / 30;
        return principal * dailyRate * Math.max(0, Number(daysOverdue || 0));
    }
}

module.exports = {
    MoraCalculator
};
