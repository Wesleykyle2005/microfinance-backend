const { useCasesContainer } = require('../../../infrastructure/container/useCases.container');
const { toLocalISO } = require('../../../utils/timezone.util');
const { manageClientsUseCase } = useCasesContainer.clients;

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

async function getClients(req, res) {
    try {
        const result = await manageClientsUseCase.getClients(req.query);

        return success(res, result);
    } catch (error) {
        return fail(res, 'Error al obtener registros', 500, error.message);
    }
}

async function getClientOptions(req, res) {
    try {
        const data = await manageClientsUseCase.getClientOptions(req.query);

        return success(res, { data });
    } catch (error) {
        return fail(res, 'Error al obtener opciones de clientes', 500, error.message);
    }
}

async function getClientStats(req, res) {
    try {
        const data = await manageClientsUseCase.getClientStats(req.query);

        return success(res, { data });
    } catch (error) {
        return fail(res, 'Error al obtener estadísticas de clientes', 500, error.message);
    }
}

async function createClient(req, res) {
    try {
        const record = await manageClientsUseCase.createClient(req.body, req.user?.id);

        return success(res, {
            message: 'Registro creado exitosamente',
            data: record
        }, 201);
    } catch (error) {
        if (error.statusCode === 400) {
            return fail(res, error.message, 400, error.details || null);
        }
        if (error.code === 'P2002') {
            return fail(res, `Ya existe un registro con esos valores únicos: ${error.meta?.target?.join(', ')}`, 409, error.meta);
        }
        if (error.code === 'P2003') {
            return fail(res, 'Referencia inválida a registro relacionado', 400);
        }
        return fail(res, 'Error al crear registro', 500, error.message);
    }
}

async function getClient(req, res) {
    try {
        const record = await manageClientsUseCase.getClient(req.params.id);

        if (!record) {
            return fail(res, 'Registro no encontrado', 404);
        }

        return success(res, { data: record });
    } catch (error) {
        return fail(res, 'Error al obtener registro', 500, error.message);
    }
}

async function updateClient(req, res) {
    try {
        const record = await manageClientsUseCase.updateClient(req.params.id, req.body, req.user?.id);

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

async function deleteClient(req, res) {
    try {
        const deleted = await manageClientsUseCase.deleteClient(req.params.id);

        if (!deleted) return fail(res, 'Registro no encontrado', 404);

        return success(res, { message: 'Registro desactivado exitosamente' });
    } catch (error) {
        if (error.code === 'P2003') return fail(res, 'No se puede eliminar: existen registros relacionados', 409);
        if (error.code === 'P2025') return fail(res, 'Registro no encontrado', 404);
        return fail(res, 'Error al eliminar registro', 500, error.message);
    }
}

async function recalculateClientScoring(req, res) {
    try {
        const result = await manageClientsUseCase.recalculateClientScoring(req.params.id);

        if (!result) {
            return res.status(404).json({
                success: false,
                error: 'Cliente no encontrado',
                timestamp: toLocalISO()
            });
        }

        return res.status(200).json({
            success: true,
            message: 'Scoring recalculado exitosamente',
            data: {
                clientId: result.clientId,
                clientName: result.clientName,
                previousScore: result.previousScore,
                newScore: result.newScore,
                scoreChange: result.scoreChange,
                breakdown: result.breakdown,
                previousCategory: result.previousCategory,
                newCategory: result.newCategory,
                categoryChanged: result.categoryChanged,
                isRiskCategory: result.isRiskCategory,
                warning: result.warning
            },
            timestamp: toLocalISO()
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            error: error.message,
            timestamp: toLocalISO()
        });
    }
}

async function getClientScoringHistory(req, res) {
    try {
        const result = await manageClientsUseCase.getClientScoringHistory(req.params.id, req.query);

        if (!result) {
            return res.status(404).json({
                success: false,
                error: 'Cliente no encontrado',
                timestamp: toLocalISO()
            });
        }

        return res.status(200).json({
            success: true,
            data: {
                clientId: result.clientId,
                clientName: result.clientName,
                history: result.history
            },
            meta: result.meta,
            timestamp: toLocalISO()
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            error: error.message,
            timestamp: toLocalISO()
        });
    }
}

module.exports = {
    getClients,
    getClientOptions,
    getClientStats,
    createClient,
    getClient,
    updateClient,
    deleteClient,
    recalculateClientScoring,
    getClientScoringHistory
};