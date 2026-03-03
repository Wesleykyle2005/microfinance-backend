// src/routes/auth.routes.js
const express = require('express');
const router = express.Router();
const authController = require('../presentation/http/controllers/auth.clean.controller');
const authMiddleware = require('../middlewares/auth.middleware');
const {
	authLoginLimiter,
	authRefreshLimiter,
	authValidateLimiter,
	authBootstrapLimiter,
} = require('../middlewares/rateLimiter.middleware');

// Rutas públicas
router.post('/login', authLoginLimiter, authController.login);
router.post('/refresh-token', authRefreshLimiter, authController.refreshToken);
router.post('/validate-token', authValidateLimiter, authController.validateToken);
router.post('/register-admin', authBootstrapLimiter, authController.registerInitialAdmin);

// Rutas privadas (requieren autenticación)
router.post(
	'/register',
	authMiddleware.protect,
	authMiddleware.requireSuperAdmin,
	authController.register
);
router.put('/change-password', authMiddleware.protect, authController.changePassword);
router.get('/me', authMiddleware.protect, authController.getMe);
router.post('/logout', authMiddleware.protect, authController.logout);

module.exports = router;