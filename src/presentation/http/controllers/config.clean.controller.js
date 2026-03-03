const { useCasesContainer } = require('../../../infrastructure/container/useCases.container');
const { toLocalISO } = require('../../../utils/timezone.util');
const { UpdateSystemConfigDto } = require('../../../application/dtos/config/UpdateSystemConfigDto');
const { manageConfigUseCase } = useCasesContainer.config;

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
        const result = await manageConfigUseCase.getAll(req.query);
        return success(res, result);
    } catch (error) {
        return fail(res, 'Error al obtener registros', 500, error.message);
    }
}

async function getOne(req, res) {
    try {
        const record = await manageConfigUseCase.getOne(req.params.id);

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
        const dto = UpdateSystemConfigDto.fromRequest(req.body, req.user?.id);
        const record = await manageConfigUseCase.create(dto, req.user?.id);

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
        const dto = UpdateSystemConfigDto.fromRequest(req.body, req.user?.id);
        const record = await manageConfigUseCase.update(req.params.id, dto, req.user?.id);

        if (!record) return fail(res, 'Registro no encontrado', 404);

        return success(res, {
            message: 'Registro actualizado exitosamente',
            data: record
        });
    } catch (error) {
        if (error.statusCode === 400) {
            return fail(res, error.message, 400, error.details || null);
        }
        if (error.code === 'P2002') return fail(res, 'Ya existe un registro con esos valores únicos', 409);
        if (error.code === 'P2025') return fail(res, 'Registro no encontrado', 404);
        return fail(res, 'Error al actualizar registro', 500, error.message);
    }
}

module.exports = {
    getAll,
    getOne,
    create,
    update
};
