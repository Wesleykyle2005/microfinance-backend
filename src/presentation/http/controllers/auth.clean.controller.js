const asyncHandler = require('express-async-handler');
const { useCasesContainer } = require('../../../infrastructure/container/useCases.container');
const { RegisterDto } = require('../../../application/dtos/auth/RegisterDto');
const { LoginDto } = require('../../../application/dtos/auth/LoginDto');
const { RefreshTokenDto } = require('../../../application/dtos/auth/RefreshTokenDto');
const { ValidateTokenDto } = require('../../../application/dtos/auth/ValidateTokenDto');
const { ChangePasswordDto } = require('../../../application/dtos/auth/ChangePasswordDto');
const { RegisterAdminDto } = require('../../../application/dtos/auth/RegisterAdminDto');

const { authUseCase } = useCasesContainer.auth;

const register = asyncHandler(async (req, res) => {
    const dto = RegisterDto.fromRequest(req.body);
    const { email, password, role } = dto;

    if (!email || !password) {
        res.status(400);
        throw new Error('Email y contraseña son requeridos');
    }

    const data = await authUseCase.register({ email, password, role });

    res.status(201).json({
        status: 'success',
        message: 'Usuario registrado exitosamente',
        data: {
            user: data.user,
            accessToken: data.accessToken,
            refreshToken: data.refreshToken
        }
    });
});

const login = asyncHandler(async (req, res) => {
    const dto = LoginDto.fromRequest(req.body);
    const { email, password } = dto;

    if (!email || !password) {
        res.status(400);
        throw new Error('Email y contraseña son requeridos');
    }

    const data = await authUseCase.login({ email, password });

    res.status(200).json({
        status: 'success',
        message: 'Login exitoso',
        data: {
            user: data.user,
            accessToken: data.accessToken,
            refreshToken: data.refreshToken
        }
    });
});

const refreshToken = asyncHandler(async (req, res) => {
    const dto = RefreshTokenDto.fromRequest(req.body);
    const { refreshToken } = dto;

    if (!refreshToken) {
        res.status(400);
        throw new Error('Refresh token es requerido');
    }

    const data = await authUseCase.refreshAccessToken(refreshToken);

    res.status(200).json({
        status: 'success',
        message: 'Token renovado exitosamente',
        data: {
            accessToken: data.accessToken
        }
    });
});

const validateToken = asyncHandler(async (req, res) => {
    const dto = ValidateTokenDto.fromRequest(req.body);
    const { token } = dto;

    if (!token) {
        res.status(400);
        throw new Error('Token es requerido');
    }

    const data = await authUseCase.validateToken(token);

    res.status(200).json({
        status: 'success',
        message: 'Token válido',
        data
    });
});

const changePassword = asyncHandler(async (req, res) => {
    const dto = ChangePasswordDto.fromRequest(req.body, req.user?.id);
    const { oldPassword, newPassword, userId } = dto;

    if (!oldPassword || !newPassword) {
        res.status(400);
        throw new Error('Contraseña actual y nueva son requeridas');
    }

    if (!userId) {
        res.status(401);
        throw new Error('Usuario no autenticado');
    }

    const data = await authUseCase.changePassword({
        userId,
        oldPassword,
        newPassword
    });

    res.status(200).json({
        status: 'success',
        message: data.message,
        data
    });
});

const getMe = asyncHandler(async (req, res) => {
    const userId = req.user?.id;

    if (!userId) {
        res.status(401);
        throw new Error('Usuario no autenticado');
    }

    const user = await authUseCase.getUserById(userId);

    res.status(200).json({
        status: 'success',
        data: { user }
    });
});

const logout = asyncHandler(async (req, res) => {
    const userId = req.user?.id;
    const bearerToken = req.authToken;

    if (!userId) {
        res.status(401);
        throw new Error('Usuario no autenticado');
    }

    const data = await authUseCase.logout(userId, bearerToken);

    res.status(200).json({
        status: 'success',
        message: data.message,
        data
    });
});

const registerInitialAdmin = asyncHandler(async (req, res) => {
    const dto = RegisterAdminDto.fromRequest(req.body);
    const { email, password, fullName } = dto;

    if (!email || !password) {
        res.status(400);
        throw new Error('Email y contraseña son requeridos');
    }

    if (process.env.ENABLE_BOOTSTRAP_ADMIN !== 'true') {
        res.status(403);
        throw new Error('Bootstrap de administrador deshabilitado');
    }

    const expectedSecret = process.env.BOOTSTRAP_ADMIN_SECRET;
    if (!expectedSecret) {
        res.status(500);
        throw new Error('Configuración de bootstrap incompleta');
    }

    const providedSecret = String(req.get('x-bootstrap-secret') || '');
    if (!providedSecret || providedSecret !== expectedSecret) {
        res.status(403);
        throw new Error('Secreto de bootstrap inválido');
    }

    let data;
    try {
        data = await authUseCase.registerAdmin({ email, password, fullName });
    } catch (error) {
        const message = error?.message || 'No se pudo crear el administrador inicial';

        if (message.includes('Ya existe un SUPER_ADMIN')) {
            res.status(403);
            throw new Error(message);
        }

        if (message.includes('ya existe')) {
            res.status(409);
            throw new Error(message);
        }

        throw error;
    }

    res.status(201).json({
        status: 'success',
        message: 'Administrador creado exitosamente',
        data: { user: data }
    });
});

module.exports = {
    register,
    login,
    refreshToken,
    validateToken,
    changePassword,
    getMe,
    logout,
    registerInitialAdmin
};