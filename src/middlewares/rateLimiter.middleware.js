const rateLimit = require('express-rate-limit');

const buildLimiter = ({ windowMs, max, message }) => rateLimit({
	windowMs,
	max,
	message,
	standardHeaders: true,
	legacyHeaders: false,
});

const authLoginLimiter = buildLimiter({
	windowMs: 15 * 60 * 1000,
	max: process.env.NODE_ENV === 'development' ? 100 : 10,
	message: 'Demasiados intentos de inicio de sesión. Intenta nuevamente en unos minutos.',
});

const authRefreshLimiter = buildLimiter({
	windowMs: 10 * 60 * 1000,
	max: process.env.NODE_ENV === 'development' ? 200 : 30,
	message: 'Demasiadas solicitudes de renovación de token. Espera unos minutos.',
});

const authValidateLimiter = buildLimiter({
	windowMs: 10 * 60 * 1000,
	max: process.env.NODE_ENV === 'development' ? 200 : 40,
	message: 'Demasiadas validaciones de token. Espera unos minutos.',
});

const authBootstrapLimiter = buildLimiter({
	windowMs: 60 * 60 * 1000,
	max: process.env.NODE_ENV === 'development' ? 10 : 3,
	message: 'Demasiados intentos de bootstrap de administrador. Espera antes de reintentar.',
});

module.exports = {
	authLoginLimiter,
	authRefreshLimiter,
	authValidateLimiter,
	authBootstrapLimiter,
};
