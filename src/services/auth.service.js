/**
 * Auth Service
 * Business logic layer for authentication
 */

const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const jwtConfig = require('../config/jwt.config');
const { repositoriesContainer } = require('../infrastructure/container/repositories.container');
const tokenRevocationService = require('./tokenRevocation.service');

const usersRepository = repositoriesContainer.userRepository;

const generateTokens = (user) => {
    const payload = {
        id: user.id,
        email: user.email,
        role: user.role
    };

    const accessToken = jwt.sign(
        payload,
        jwtConfig.JWT_SECRET,
        { expiresIn: jwtConfig.JWT_EXPIRES_IN }
    );

    const refreshToken = jwt.sign(
        payload,
        jwtConfig.JWT_REFRESH_SECRET,
        { expiresIn: jwtConfig.JWT_REFRESH_EXPIRES_IN }
    );

    return { accessToken, refreshToken };
};

const register = async ({ email, password, role = 'COBRADOR' }) => {
    // 1. Check if user already exists4545556
    const existingUser = await usersRepository.existsByEmail(email);
    if (existingUser) {
        throw new Error('El usuario con este email ya existe');
    }

    // 2. Validate role
    const validRoles = ['SUPER_ADMIN', 'ADMIN', 'COBRADOR'];
    if (!validRoles.includes(role)) {
        throw new Error('Rol inválido');
    }

    // 3. Hash password
    const salt = await bcrypt.genSalt(12);
    const passwordHash = await bcrypt.hash(password, salt);

    // 4. Create user
    const user = await usersRepository.create({
        email,
        passwordHash,
        role,
        isActive: true
    });

    // 5. Generate tokens
    const tokens = generateTokens(user);

    return {
        user,
        ...tokens
    };
};

/**
 * Login user with email and password
 * @param {Object} credentials - Login credentials
 * @param {string} credentials.email - User email
 * @param {string} credentials.password - User password
 * @returns {Promise<Object>} User data and tokens
 */
const login = async ({ email, password }) => {
    // 1. Find user by email (include password for verification)
    const user = await usersRepository.findByEmail(email, true);

    // 2. Validate user exists
    if (!user) {
        throw new Error('Credenciales inválidas');
    }

    // 3. Validate user is active
    if (!user.isActive) {
        throw new Error('Usuario inactivo. Contacte al administrador.');
    }

    // 4. Compare password
    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    if (!isPasswordValid) {
        throw new Error('Credenciales inválidas');
    }

    // 5. Update last login
    await usersRepository.updateLastLogin(user.id);

    // 6. Remove password hash from response
    const { passwordHash, ...userWithoutPassword } = user;

    // 7. Generate tokens
    const tokens = generateTokens(userWithoutPassword);

    return {
        user: userWithoutPassword,
        ...tokens
    };
};

/**
 * Refresh access token using refresh token
 * @param {string} refreshToken - Refresh token
 * @returns {Promise<Object>} New access token
 */
const refreshAccessToken = async (refreshToken) => {
    try {
        // 1. Verify refresh token
        const decoded = jwt.verify(refreshToken, jwtConfig.JWT_REFRESH_SECRET);

        // 2. Get user from database
        const user = await usersRepository.findById(decoded.id);

        // 3. Validate user exists and is active
        if (!user) {
            throw new Error('Usuario no encontrado');
        }

        if (!user.isActive) {
            throw new Error('Usuario inactivo');
        }

        // 4. Generate new access token
        const payload = {
            id: user.id,
            email: user.email,
            role: user.role
        };

        const newAccessToken = jwt.sign(
            payload,
            jwtConfig.JWT_SECRET,
            { expiresIn: jwtConfig.JWT_EXPIRES_IN }
        );

        return {
            accessToken: newAccessToken
        };
    } catch (error) {
        if (error.name === 'JsonWebTokenError') {
            throw new Error('Token inválido');
        }
        if (error.name === 'TokenExpiredError') {
            throw new Error('Refresh token expirado. Por favor inicie sesión nuevamente.');
        }
        throw error;
    }
};

/**
 * Validate and decode JWT token
 * @param {string} token - JWT token to validate
 * @returns {Promise<Object>} Decoded token payload
 */
const validateToken = async (token) => {
    try {
        const revoked = await tokenRevocationService.isTokenRevoked(token);
        if (revoked) {
            throw new Error('Token revocado');
        }

        const decoded = jwt.verify(token, jwtConfig.JWT_SECRET);

        // Verify user still exists and is active
        const user = await usersRepository.findById(decoded.id);

        if (!user) {
            throw new Error('Usuario no encontrado');
        }

        if (!user.isActive) {
            throw new Error('Usuario inactivo');
        }

        return {
            valid: true,
            user: {
                id: decoded.id,
                email: decoded.email,
                role: decoded.role
            }
        };
    } catch (error) {
        if (error.name === 'JsonWebTokenError') {
            throw new Error('Token inválido');
        }
        if (error.name === 'TokenExpiredError') {
            throw new Error('Token expirado');
        }
        throw error;
    }
};

/**
 * Change user password
 * @param {Object} data - Password change data
 * @param {string} data.userId - User ID
 * @param {string} data.oldPassword - Current password
 * @param {string} data.newPassword - New password
 * @returns {Promise<Object>} Success message
 */
const changePassword = async ({ userId, oldPassword, newPassword }) => {
    // 1. Get user with password
    const user = await usersRepository.findByEmail(
        (await usersRepository.findById(userId)).email,
        true
    );

    if (!user) {
        throw new Error('Usuario no encontrado');
    }

    // 2. Verify old password
    const isPasswordValid = await bcrypt.compare(oldPassword, user.passwordHash);
    if (!isPasswordValid) {
        throw new Error('Contraseña actual incorrecta');
    }

    // 3. Validate new password is different
    if (oldPassword === newPassword) {
        throw new Error('La nueva contraseña debe ser diferente a la actual');
    }

    // 4. Hash new password
    const salt = await bcrypt.genSalt(12);
    const newPasswordHash = await bcrypt.hash(newPassword, salt);

    // 5. Update password
    await usersRepository.update(userId, {
        passwordHash: newPasswordHash
    });

    return {
        success: true,
        message: 'Contraseña actualizada correctamente'
    };
};

/**
 * Get user by ID
 * @param {string} userId - User ID
 * @returns {Promise<Object>} User data
 */
const getUserById = async (userId) => {
    const user = await usersRepository.findById(userId);

    if (!user) {
        throw new Error('Usuario no encontrado');
    }

    return user;
};

/**
 * Logout user (placeholder for future token blacklisting)
 * @param {string} userId - User ID
 * @returns {Promise<Object>} Success message
 */
const logout = async (userId) => {
    // For now, just validate user exists
    const user = await usersRepository.findById(userId);

    if (!user) {
        throw new Error('Usuario no encontrado');
    }

    // La revocación del token se maneja en controller para tener acceso al bearer

    return {
        success: true,
        message: 'Sesión cerrada correctamente'
    };
};

/**
 * Quick admin registration (for initial setup or seed)
 * @param {Object} data - Admin data
 * @param {string} data.email - Admin email
 * @param {string} data.password - Admin password
 * @param {string} data.fullName - Admin full name (optional, for future use)
 * @returns {Promise<Object>} Created admin user
 */
const registerAdmin = async ({ email, password, fullName }) => {
    const superAdminCount = await usersRepository.countByRole('SUPER_ADMIN');
    if (superAdminCount > 0) {
        throw new Error('Ya existe un SUPER_ADMIN registrado. Esta ruta solo es válida para configuración inicial.');
    }

    const existingUser = await usersRepository.existsByEmail(email);
    if (existingUser) {
        throw new Error('El usuario con este email ya existe');
    }

    // Hash password
    const salt = await bcrypt.genSalt(12);
    const passwordHash = await bcrypt.hash(password, salt);

    // Create admin user
    const admin = await usersRepository.create({
        email,
        passwordHash,
        role: 'SUPER_ADMIN',
        isActive: true
    });

    return admin;
};

module.exports = {
    register,
    login,
    generateTokens,
    refreshAccessToken,
    validateToken,
    changePassword,
    getUserById,
    logout,
    registerAdmin
};
