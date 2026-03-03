const asyncHandler = require('express-async-handler');
const authService = require('../services/auth.service');

const requireRoles = (allowedRoles) => asyncHandler(async (req, res, next) => {
    if (!req.user) {
        res.status(401);
        throw new Error('No autorizado');
    }

    if (!allowedRoles.includes(req.user.role)) {
        res.status(403);
        throw new Error('Acceso denegado: permisos insuficientes');
    }

    next();
});

exports.protect = asyncHandler(async (req, res, next) => {
    const authHeader = req.headers.authorization;
    let token;

    if (authHeader && authHeader.startsWith('Bearer ')) {
        token = authHeader.split(' ')[1];
    }

    if (!token) {
        res.status(401);
        throw new Error('No autorizado, token no proporcionado');
    }

    try {
        const validation = await authService.validateToken(token);

        if (!validation?.valid || !validation?.user?.id) {
            res.status(401);
            throw new Error('No autorizado, token inválido o expirado');
        }

        req.user = validation.user;
        req.authToken = token;

        next();
    } catch (error) {
        res.status(401);
        throw new Error('No autorizado, token inválido o expirado');
    }
});

exports.requireSuperAdmin = asyncHandler(async (req, res, next) => {
    if (!req.user) {
        res.status(401);
        throw new Error('No autorizado');
    }

    if (req.user.role !== 'SUPER_ADMIN') {
        res.status(403);
        throw new Error('Acceso denegado: se requiere rol SUPER_ADMIN');
    }

    next();
});

exports.requireAdmin = requireRoles(['SUPER_ADMIN', 'ADMIN']);
exports.requireOperational = requireRoles(['SUPER_ADMIN', 'ADMIN', 'COBRADOR']);