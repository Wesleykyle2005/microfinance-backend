class UpdateSystemConfigDto {
    constructor({
        defaultInterestRate,
        defaultLateFeeRate,
        exchangeRateNioUsd,
        moraCalculationType,
        moraEnabled,
        investorSharePercentage,
        adminSharePercentage,
        notificationMode,
        notificationsEnabled,
        updatedBy
    }) {
        this.defaultInterestRate = defaultInterestRate;
        this.defaultLateFeeRate = defaultLateFeeRate;
        this.exchangeRateNioUsd = exchangeRateNioUsd;
        this.moraCalculationType = moraCalculationType;
        this.moraEnabled = moraEnabled;
        this.investorSharePercentage = investorSharePercentage;
        this.adminSharePercentage = adminSharePercentage;
        this.notificationMode = notificationMode;
        this.notificationsEnabled = notificationsEnabled;
        this.updatedBy = updatedBy;
    }

    static fromRequest(body, userId) {
        const payload = body || {};

        const toOptionalNumber = (value, fieldName) => {
            if (value === undefined || value === null || value === '') {
                return undefined;
            }

            const parsed = Number(value);
            if (!Number.isFinite(parsed)) {
                const error = new Error(`El campo ${fieldName} debe ser numérico`);
                error.statusCode = 400;
                throw error;
            }

            return parsed;
        };

        const toOptionalBoolean = (value, fieldName) => {
            if (value === undefined || value === null || value === '') {
                return undefined;
            }

            if (typeof value === 'boolean') {
                return value;
            }

            if (value === 'true' || value === '1' || value === 1) {
                return true;
            }

            if (value === 'false' || value === '0' || value === 0) {
                return false;
            }

            const error = new Error(`El campo ${fieldName} debe ser booleano`);
            error.statusCode = 400;
            throw error;
        };

        const normalizeEnum = (value, allowedValues, fieldName) => {
            if (value === undefined || value === null || value === '') {
                return undefined;
            }

            const normalized = String(value).trim().toUpperCase();
            if (!allowedValues.includes(normalized)) {
                const error = new Error(
                    `El campo ${fieldName} debe ser uno de: ${allowedValues.join(', ')}`
                );
                error.statusCode = 400;
                throw error;
            }

            return normalized;
        };

        return new UpdateSystemConfigDto({
            defaultInterestRate: toOptionalNumber(payload.defaultInterestRate, 'defaultInterestRate'),
            defaultLateFeeRate: toOptionalNumber(payload.defaultLateFeeRate, 'defaultLateFeeRate'),
            exchangeRateNioUsd: toOptionalNumber(payload.exchangeRateNioUsd, 'exchangeRateNioUsd'),
            moraCalculationType: normalizeEnum(
                payload.moraCalculationType,
                ['DAILY', 'MONTHLY'],
                'moraCalculationType'
            ),
            moraEnabled: toOptionalBoolean(payload.moraEnabled, 'moraEnabled'),
            investorSharePercentage: toOptionalNumber(
                payload.investorSharePercentage,
                'investorSharePercentage'
            ),
            adminSharePercentage: toOptionalNumber(
                payload.adminSharePercentage,
                'adminSharePercentage'
            ),
            notificationMode: normalizeEnum(
                payload.notificationMode,
                ['AUTO', 'MANUAL'],
                'notificationMode'
            ),
            notificationsEnabled: toOptionalBoolean(
                payload.notificationsEnabled,
                'notificationsEnabled'
            ),
            updatedBy: userId
        });
    }
}

module.exports = {
    UpdateSystemConfigDto
};
