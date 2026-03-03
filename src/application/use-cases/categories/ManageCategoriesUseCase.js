const searchFields = ['name', 'displayName', 'description'];
const filterableFields = ['approvalType', 'isActive', 'minScore', 'maxScore'];
const sortableFields = ['name', 'displayName', 'priorityOrder', 'createdAt', 'minScore'];

const normalizeFilterValue = (value) => {
    if (typeof value === 'string') {
        const lower = value.toLowerCase();
        if (lower === 'true') return true;
        if (lower === 'false') return false;
    }
    return value;
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

const buildWhere = (filters, search) => {
    const where = {};

    filterableFields.forEach((field) => {
        if (filters[field] !== undefined && filters[field] !== '') {
            where[field] = normalizeFilterValue(filters[field]);
        }
    });

    if (search) {
        where.OR = searchFields.map((field) => ({
            [field]: {
                contains: search,
                mode: 'insensitive'
            }
        }));
    }

    if (filters.from || filters.to) {
        where.createdAt = {};
        if (filters.from) {
            const fromDate = new Date(filters.from);
            if (!Number.isNaN(fromDate.getTime())) where.createdAt.gte = fromDate;
        }
        if (filters.to) {
            const toDate = new Date(filters.to);
            if (!Number.isNaN(toDate.getTime())) where.createdAt.lte = toDate;
        }
    }

    const includeInactive = normalizeFilterValue(filters.includeInactive);
    if (!includeInactive) {
        where.isActive = true;
    }

    return where;
};

const validateCreate = (data) => {
    if (!data.name || !data.displayName) {
        return 'Los campos "name" y "displayName" son requeridos';
    }
    if (data.minScore !== undefined && data.maxScore !== undefined && data.minScore > data.maxScore) {
        return 'El puntaje mínimo no puede ser mayor al puntaje máximo';
    }
    if (data.creditMultiplier && (data.creditMultiplier < 0 || data.creditMultiplier > 9.99)) {
        return 'El multiplicador de crédito debe estar entre 0 y 9.99';
    }
    return null;
};

const validateUpdate = (data, existing) => {
    if (data.minScore !== undefined || data.maxScore !== undefined) {
        const minScore = data.minScore ?? existing.minScore;
        const maxScore = data.maxScore ?? existing.maxScore;
        if (minScore > maxScore) {
            return 'El puntaje mínimo no puede ser mayor al puntaje máximo';
        }
    }
    if (data.creditMultiplier && (data.creditMultiplier < 0 || data.creditMultiplier > 9.99)) {
        return 'El multiplicador de crédito debe estar entre 0 y 9.99';
    }
    return null;
};

class ManageCategoriesUseCase {
    constructor(clientCategoryRepository) {
        this.clientCategoryRepository = clientCategoryRepository;
    }

    async getAll(query) {
        const {
            page = 1,
            pageSize = 20,
            search = '',
            sortBy = 'createdAt',
            sortOrder = 'desc',
            ...filters
        } = query;

        const pageNum = Math.max(1, parseInt(page, 10) || 1);
        const size = Math.min(100, Math.max(1, parseInt(pageSize, 10) || 20));
        const validSort = sortableFields.includes(sortBy) ? sortBy : 'createdAt';

        const where = buildWhere(filters, search);
        const orderBy = { [validSort]: sortOrder === 'asc' ? 'asc' : 'desc' };

        const [data, total] = await Promise.all([
            this.clientCategoryRepository.findMany({
                where,
                orderBy,
                skip: (pageNum - 1) * size,
                take: size
            }),
            this.clientCategoryRepository.count({ where })
        ]);

        return {
            data,
            meta: getPaginationMeta(total, pageNum, size)
        };
    }

    async getStats(query) {
        const {
            search = '',
            ...filters
        } = query;

        const where = buildWhere(filters, search);

        const [total, active, blocked, avgMultiplierAgg] = await Promise.all([
            this.clientCategoryRepository.count({ where }),
            this.clientCategoryRepository.count({
                where: {
                    ...where,
                    isActive: true
                }
            }),
            this.clientCategoryRepository.count({
                where: {
                    ...where,
                    approvalType: 'BLOCKED'
                }
            }),
            this.clientCategoryRepository.aggregate({
                where,
                _avg: {
                    creditMultiplier: true
                }
            })
        ]);

        return {
            total,
            active,
            blocked,
            avgMultiplier: Number(avgMultiplierAgg._avg.creditMultiplier || 0)
        };
    }

    async getOne(id) {
        const record = await this.clientCategoryRepository.findUnique({ where: { id } });

        if (!record || !record.isActive) {
            return null;
        }

        return record;
    }

    async create(payload) {
        const data = { ...payload };
        const validationError = validateCreate(data);

        if (validationError) {
            const error = new Error(validationError);
            error.statusCode = 400;
            throw error;
        }

        if (data.priorityOrder === undefined) {
            data.priorityOrder = 0;
        }

        return this.clientCategoryRepository.create({ data });
    }

    async update(id, payload) {
        const data = { ...payload };
        const existing = await this.clientCategoryRepository.findUnique({ where: { id } });

        if (!existing || !existing.isActive) {
            return null;
        }

        const validationError = validateUpdate(data, existing);
        if (validationError) {
            const error = new Error(validationError);
            error.statusCode = 400;
            throw error;
        }

        delete data.id;
        delete data.createdAt;

        return this.clientCategoryRepository.update({
            where: { id },
            data
        });
    }

    async remove(id) {
        const existing = await this.clientCategoryRepository.findUnique({ where: { id } });

        if (!existing || !existing.isActive) {
            return false;
        }

        await this.clientCategoryRepository.update({
            where: { id },
            data: { isActive: false }
        });

        return true;
    }
}

module.exports = {
    ManageCategoriesUseCase
};
