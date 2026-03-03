const { useCasesContainer } = require('../../../infrastructure/container/useCases.container');
const { toLocalISO } = require('../../../utils/timezone.util');
const { manageCategoriesUseCase } = useCasesContainer.categories;

const success = (res, data, statusCode = 200) => {
    return res.status(statusCode).json({
        success: true,
        ...data,
        timestamp: toLocalISO()
    });
};

const fail = (res, message, statusCode = 500, details = null) => {
    return res.status(statusCode).json({
        success: false,
        error: message,
        ...(details && { details }),
        timestamp: toLocalISO()
    });
};

async function getAll(req, res) {
    try {
        const result = await manageCategoriesUseCase.getAll(req.query);

        return success(res, result);
    } catch (error) {
        return fail(res, 'Error al obtener registros', 500, error.message);
    }
}

async function getStats(req, res) {
    try {
        const data = await manageCategoriesUseCase.getStats(req.query);

        return success(res, { data });
    } catch (error) {
        return fail(res, 'Error al obtener estadísticas de categorías', 500, error.message);
    }
}

async function getOne(req, res) {
    try {
        const record = await manageCategoriesUseCase.getOne(req.params.id);

        if (!record) {
            return fail(res, 'Registro no encontrado', 404);
        }

        return success(res, { data: record });
    } catch (error) {
        return fail(res, 'Error al obtener registro', 500, error.message);
    }
}

async function create(req, res) {
    try {
        const record = await manageCategoriesUseCase.create(req.body);

        return success(res, {
            message: 'Registro creado exitosamente',
            data: record
        }, 201);
    } catch (error) {
        if (error.statusCode === 400) {
            return fail(res, error.message, 400, error.details || null);
        }
        if (error.code === 'P2002') {
            return fail(res, 'Ya existe un registro con esos valores únicos', 409, error.meta);
        }
        if (error.code === 'P2003') {
            return fail(res, 'Referencia inválida a registro relacionado', 400);
        }
        return fail(res, 'Error al crear registro', 500, error.message);
    }
}

async function update(req, res) {
    try {
        const record = await manageCategoriesUseCase.update(req.params.id, req.body);

        if (!record) {
            return fail(res, 'Registro no encontrado', 404);
        }

        return success(res, {
            message: 'Registro actualizado exitosamente',
            data: record
        });
    } catch (error) {
        if (error.statusCode === 400) {
            return fail(res, error.message, 400, error.details || null);
        }
        if (error.code === 'P2002') {
            return fail(res, 'Ya existe un registro con esos valores únicos', 409);
        }
        if (error.code === 'P2025') {
            return fail(res, 'Registro no encontrado', 404);
        }
        return fail(res, 'Error al actualizar registro', 500, error.message);
    }
}

async function remove(req, res) {
    try {
        const deleted = await manageCategoriesUseCase.remove(req.params.id);

        if (!deleted) {
            return fail(res, 'Registro no encontrado', 404);
        }

        return success(res, { message: 'Registro desactivado exitosamente' });
    } catch (error) {
        if (error.code === 'P2003') {
            return fail(res, 'No se puede eliminar: existen registros relacionados', 409);
        }
        if (error.code === 'P2025') {
            return fail(res, 'Registro no encontrado', 404);
        }
        return fail(res, 'Error al eliminar registro', 500, error.message);
    }
}

module.exports = {
    getAll,
    getStats,
    getOne,
    create,
    update,
    delete: remove
};
