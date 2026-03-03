const searchFields = [
    'fullName',
    'identificationNumber',
    'email',
    'phoneNumber',
    'businessName',
    'city'
];

const filterableFields = [
    'categoryId',
    'city',
    'isCreditBlocked',
    'isActive',
    'businessType'
];

const sortableFields = [
    'fullName',
    'scoringPoints',
    'createdAt',
    'lastCategoryChange',
    'monthlyIncome'
];

const includeRelations = {
    category: true,
    creator: {
        select: {
            id: true,
            email: true,
            role: true
        }
    }
};

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

class ManageClientsUseCase {
    constructor(clientRepository, scoringService) {
        this.clientRepository = clientRepository;
        this.scoringService = scoringService;
    }

    async getClients(query) {
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
            this.clientRepository.findMany({
                where,
                orderBy,
                skip: (pageNum - 1) * size,
                take: size,
                include: includeRelations
            }),
            this.clientRepository.count({ where })
        ]);

        return {
            data,
            meta: getPaginationMeta(total, pageNum, size)
        };
    }

    async getClientOptions(query) {
        const {
            search = '',
            limit = 100,
            includeInactive,
            categoryId
        } = query;

        const size = Math.min(300, Math.max(1, parseInt(limit, 10) || 100));
        const shouldIncludeInactive = normalizeFilterValue(includeInactive) === true;

        const where = {
            ...(shouldIncludeInactive ? {} : { isActive: true }),
            ...(categoryId ? { categoryId: String(categoryId) } : {}),
            ...(search && String(search).trim() !== ''
                ? {
                    OR: [
                        {
                            fullName: {
                                contains: String(search).trim(),
                                mode: 'insensitive'
                            }
                        },
                        {
                            identificationNumber: {
                                contains: String(search).trim(),
                                mode: 'insensitive'
                            }
                        }
                    ]
                }
                : {})
        };

        return this.clientRepository.findMany({
            where,
            select: {
                id: true,
                fullName: true,
                identificationNumber: true,
                categoryId: true,
                isActive: true
            },
            orderBy: {
                fullName: 'asc'
            },
            take: size
        });
    }

    async getClientStats(query) {
        const {
            search = '',
            ...filters
        } = query;

        const where = buildWhere(filters, search);

        const [total, active, blocked, risk] = await Promise.all([
            this.clientRepository.count({ where }),
            this.clientRepository.count({
                where: {
                    ...where,
                    isActive: true
                }
            }),
            this.clientRepository.count({
                where: {
                    ...where,
                    isCreditBlocked: true
                }
            }),
            this.clientRepository.count({
                where: {
                    ...where,
                    category: {
                        name: 'RISK'
                    }
                }
            })
        ]);

        return {
            total,
            active,
            blocked,
            risk
        };
    }

    async createClient(payload, userId) {
        const data = { ...payload };

        if (data.fullName) {
            data.fullName = data.fullName.toUpperCase().trim();
        }

        if (data.businessName) {
            data.businessName = data.businessName.toUpperCase().trim();
        }

        if (!data.fullName || data.fullName.trim() === '') {
            const error = new Error('El nombre completo es requerido');
            error.statusCode = 400;
            throw error;
        }

        if (!data.identificationNumber || data.identificationNumber.trim() === '') {
            const error = new Error('El número de identificación es requerido');
            error.statusCode = 400;
            throw error;
        }

        const existing = await this.clientRepository.findUnique({
            where: { identificationNumber: data.identificationNumber }
        });

        if (existing) {
            const error = new Error(`Ya existe un cliente con la identificación ${data.identificationNumber}`);
            error.statusCode = 400;
            throw error;
        }

        if (data.categoryId) {
            const category = await this.clientRepository.findCategoryUnique({
                where: { id: data.categoryId }
            });

            if (!category) {
                const error = new Error('La categoría especificada no existe');
                error.statusCode = 400;
                throw error;
            }

            if (!category.isActive) {
                const error = new Error('La categoría especificada está inactiva');
                error.statusCode = 400;
                throw error;
            }
        }

        if (!data.categoryId) {
            const defaultCategory = await this.clientRepository.findCategoryFirst({
                where: { isActive: true, name: 'STANDARD' }
            }) || await this.clientRepository.findCategoryFirst({
                where: { isActive: true },
                orderBy: { priorityOrder: 'asc' }
            });

            if (defaultCategory) {
                data.categoryId = defaultCategory.id;
            } else {
                throw new Error('No hay categorías activas disponibles. Debe crear al menos una categoría antes de agregar clientes.');
            }
        }

        if (data.monthlyIncome !== undefined && data.monthlyIncome !== null) {
            const income = parseFloat(data.monthlyIncome);
            if (Number.isNaN(income) || income < 0) {
                const error = new Error('El ingreso mensual debe ser un número positivo');
                error.statusCode = 400;
                throw error;
            }
        }

        if (data.scoringPoints === undefined) {
            data.scoringPoints = 0;
        }

        if (data.isCreditBlocked === undefined) {
            data.isCreditBlocked = false;
        }

        if (userId && !data.createdBy) {
            data.createdBy = userId;
        }

        return this.clientRepository.create({
            data,
            include: includeRelations
        });
    }

    async getClient(id) {
        const record = await this.clientRepository.findUnique({
            where: { id },
            include: includeRelations
        });

        if (!record || !record.isActive) {
            return null;
        }

        return record;
    }

    async updateClient(id, payload, userId) {
        const data = { ...payload };

        const existing = await this.clientRepository.findUnique({ where: { id } });
        if (!existing || !existing.isActive) return null;

        if (data.fullName) {
            data.fullName = data.fullName.toUpperCase().trim();
        }

        if (data.businessName) {
            data.businessName = data.businessName.toUpperCase().trim();
        }

        if (data.identificationNumber && data.identificationNumber !== existing.identificationNumber) {
            const duplicate = await this.clientRepository.findUnique({
                where: { identificationNumber: data.identificationNumber }
            });

            if (duplicate) {
                const error = new Error(`Ya existe otro cliente con la identificación ${data.identificationNumber}`);
                error.statusCode = 400;
                throw error;
            }
        }

        if (data.categoryId && data.categoryId !== existing.categoryId) {
            const category = await this.clientRepository.findCategoryUnique({
                where: { id: data.categoryId }
            });

            if (!category) {
                const error = new Error('La categoría especificada no existe');
                error.statusCode = 400;
                throw error;
            }

            if (!category.isActive) {
                const error = new Error('La categoría especificada está inactiva');
                error.statusCode = 400;
                throw error;
            }
        }

        if (data.monthlyIncome !== undefined && data.monthlyIncome !== null) {
            const income = parseFloat(data.monthlyIncome);
            if (Number.isNaN(income) || income < 0) {
                const error = new Error('El ingreso mensual debe ser un número positivo');
                error.statusCode = 400;
                throw error;
            }
        }

        delete data.id;
        delete data.createdAt;

        const record = await this.clientRepository.update({
            where: { id },
            data,
            include: includeRelations
        });

        if (record.categoryId !== existing.categoryId) {
            await this.clientRepository.createCategoryTransition({
                data: {
                    clientId: record.id,
                    oldCategoryId: existing.categoryId,
                    newCategoryId: record.categoryId,
                    reason: 'Cambio manual por usuario',
                    triggeredBy: 'MANUAL',
                    triggeredByUserId: userId || null
                }
            });
        }

        return record;
    }

    async deleteClient(id) {
        const existing = await this.clientRepository.findUnique({ where: { id } });
        if (!existing || !existing.isActive) return false;

        await this.clientRepository.update({
            where: { id },
            data: { isActive: false }
        });

        return true;
    }

    async recalculateClientScoring(id) {
        const client = await this.clientRepository.findUnique({
            where: { id },
            select: { id: true, fullName: true, isActive: true }
        });

        if (!client) {
            return null;
        }

        return this.scoringService.calculateClientScore(id);
    }

    async getClientScoringHistory(id, query) {
        const { page = 1, pageSize = 20 } = query;

        const client = await this.clientRepository.findUnique({
            where: { id },
            select: { id: true, fullName: true }
        });

        if (!client) {
            return null;
        }

        const pageNum = Math.max(1, parseInt(page, 10) || 1);
        const size = Math.min(100, Math.max(1, parseInt(pageSize, 10) || 20));
        const skip = (pageNum - 1) * size;

        const [history, total] = await Promise.all([
            this.clientRepository.findScoringHistory({
                where: { clientId: id },
                orderBy: { triggeredAt: 'desc' },
                skip,
                take: size,
                include: {
                    triggerLoan: {
                        select: {
                            id: true,
                            folio: true
                        }
                    }
                }
            }),
            this.clientRepository.countScoringHistory({ where: { clientId: id } })
        ]);

        return {
            clientId: id,
            clientName: client.fullName,
            history,
            meta: {
                total,
                page: pageNum,
                pageSize: size,
                totalPages: Math.ceil(total / size)
            }
        };
    }
}

module.exports = {
    ManageClientsUseCase
};
