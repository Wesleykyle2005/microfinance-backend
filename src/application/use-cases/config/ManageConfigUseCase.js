const includeRelations = {
    updater: {
        select: {
            id: true,
            email: true,
            role: true
        }
    }
};

const getPaginationMeta = (total, page, pageSize) => {
    const totalPages = Math.ceil(total / pageSize);
    return {
        total,
        page,
        pageSize,
        totalPages,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1
    };
};

const validateAndNormalizeUpdate = (data, existing) => {
    if (data.defaultInterestRate !== undefined) {
        let rate = parseFloat(data.defaultInterestRate);
        if (isNaN(rate)) {
            return 'La tasa de interés debe ser un número válido';
        }

        if (rate > 1) {
            rate = rate / 100;
            data.defaultInterestRate = rate;
        }

        if (rate < 0 || rate > 1) {
            return 'La tasa de interés debe estar entre 0 y 100%';
        }
    }

    if (data.defaultLateFeeRate !== undefined) {
        let fee = parseFloat(data.defaultLateFeeRate);
        if (isNaN(fee)) {
            return 'La tasa de mora debe ser un número válido';
        }

        if (fee > 1) {
            fee = fee / 100;
            data.defaultLateFeeRate = fee;
        }

        if (fee < 0 || fee > 1) {
            return 'La tasa de mora debe estar entre 0 y 100%';
        }
    }

    if (data.investorSharePercentage !== undefined || data.adminSharePercentage !== undefined) {
        let investor = data.investorSharePercentage !== undefined
            ? parseFloat(data.investorSharePercentage)
            : parseFloat(existing.investorSharePercentage);

        let admin = data.adminSharePercentage !== undefined
            ? parseFloat(data.adminSharePercentage)
            : parseFloat(existing.adminSharePercentage);

        if (isNaN(investor) || isNaN(admin)) {
            return 'Los porcentajes deben ser números válidos';
        }

        if (investor > 1) {
            investor = investor / 100;
            if (data.investorSharePercentage !== undefined) {
                data.investorSharePercentage = investor;
            }
        }
        if (admin > 1) {
            admin = admin / 100;
            if (data.adminSharePercentage !== undefined) {
                data.adminSharePercentage = admin;
            }
        }

        const total = investor + admin;
        if (Math.abs(total - 1.0) > 0.01) {
            return `Los porcentajes de inversor (${(investor * 100).toFixed(0)}%) y admin (${(admin * 100).toFixed(0)}%) deben sumar 100%`;
        }
    }

    if (data.exchangeRateNioUsd !== undefined) {
        const rate = parseFloat(data.exchangeRateNioUsd);
        if (isNaN(rate) || rate <= 0) {
            return 'El tipo de cambio debe ser un número positivo';
        }
    }

    return null;
};

class ManageConfigUseCase {
    constructor(systemConfigRepository) {
        this.systemConfigRepository = systemConfigRepository;
    }

    async getAll(query) {
        const {
            page = 1,
            pageSize = 20,
            sortOrder = 'desc'
        } = query;

        const pageNum = Math.max(1, parseInt(page, 10) || 1);
        const size = Math.min(100, Math.max(1, parseInt(pageSize, 10) || 20));
        const orderBy = { updatedAt: sortOrder === 'asc' ? 'asc' : 'desc' };

        const [data, total] = await Promise.all([
            this.systemConfigRepository.findMany({
                orderBy,
                skip: (pageNum - 1) * size,
                take: size,
                include: includeRelations
            }),
            this.systemConfigRepository.count()
        ]);

        return {
            data,
            meta: getPaginationMeta(total, pageNum, size)
        };
    }

    async getOne(id) {
        return this.systemConfigRepository.findUnique({
            where: { id },
            include: includeRelations
        });
    }

    async create(payload, userId) {
        const data = { ...payload };

        const count = await this.systemConfigRepository.count();
        if (count > 0) {
            const error = new Error('⛔ Error: Ya existe una configuración del sistema. No puedes crear otra, solo editar la existente (PATCH).');
            error.statusCode = 400;
            throw error;
        }

        if (data.defaultInterestRate !== undefined) {
            const rate = parseFloat(data.defaultInterestRate);
            if (rate > 1) data.defaultInterestRate = rate / 100;
        }

        if (data.defaultLateFeeRate !== undefined) {
            const fee = parseFloat(data.defaultLateFeeRate);
            if (fee > 1) data.defaultLateFeeRate = fee / 100;
        }

        let investor = parseFloat(data.investorSharePercentage || 0);
        let admin = parseFloat(data.adminSharePercentage || 0);

        if (investor > 1) {
            investor = investor / 100;
            data.investorSharePercentage = investor;
        }
        if (admin > 1) {
            admin = admin / 100;
            data.adminSharePercentage = admin;
        }

        if (Math.abs((investor + admin) - 1.0) > 0.01) {
            const error = new Error(`Los porcentajes de inversor (${(investor * 100).toFixed(0)}%) y admin (${(admin * 100).toFixed(0)}%) deben sumar 100%`);
            error.statusCode = 400;
            throw error;
        }

        if (!userId) {
            const error = new Error('Usuario no autenticado. Debes estar logueado para crear configuración.');
            error.statusCode = 400;
            throw error;
        }

        data.updatedBy = userId;

        return this.systemConfigRepository.create({
            data,
            include: includeRelations
        });
    }

    async update(id, payload, userId) {
        const data = { ...payload };
        const existing = await this.systemConfigRepository.findUnique({ where: { id } });

        if (!existing) {
            return null;
        }

        const validationError = validateAndNormalizeUpdate(data, existing);
        if (validationError) {
            const error = new Error(validationError);
            error.statusCode = 400;
            throw error;
        }

        if (userId) {
            data.updatedBy = userId;
        }

        delete data.id;
        delete data.createdAt;

        const record = await this.systemConfigRepository.update(id, data, includeRelations);

        const changes = [];
        const fieldsToTrack = [
            'defaultInterestRate',
            'defaultLateFeeRate',
            'moraEnabled',
            'moraCalculationType',
            'investorSharePercentage',
            'adminSharePercentage',
            'exchangeRateNioUsd'
        ];

        for (const field of fieldsToTrack) {
            if (
                record[field] !== undefined &&
                existing[field] !== undefined &&
                record[field].toString() !== existing[field].toString()
            ) {
                changes.push({
                    parameterName: field,
                    oldValue: existing[field].toString(),
                    newValue: record[field].toString(),
                    changedBy: record.updatedBy,
                    systemConfigId: record.id
                });
            }
        }

        if (changes.length > 0) {
            await this.systemConfigRepository.createHistoryMany(changes);
        }

        return record;
    }
}

module.exports = {
    ManageConfigUseCase
};
