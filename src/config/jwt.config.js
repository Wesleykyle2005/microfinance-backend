// src/config/jwt.config.js
const crypto = require('crypto');

function generateSystemSecretKey() {
    const systemContext = {
        projectName: 'microfinance-backend',
        version: '1.0.0',
        environment: process.env.NODE_ENV || 'development',
        // Usa una porción de la DB URL (sin credenciales completas por seguridad)
        dbIdentifier: process.env.DATABASE_URL
            ? crypto.createHash('sha256').update(process.env.DATABASE_URL).digest('hex').substring(0, 16)
            : 'default-db-identifier',
        // Timestamp de generación - puedes cambiarlo manualmente para regenerar
        // Formato: YYYY-MM-DD (actualiza esta fecha cuando quieras rotar la clave manualmente)
        keyGenerationDate: '2026-01-17',
        // Salt único del proyecto
        projectSalt: 'microfinanciera-inmuebles-georgi-dikov-secure-salt'
    };

    // Combina todos los datos del contexto
    const contextString = JSON.stringify(systemContext);

    // Genera un hash SHA-256 del contexto
    const hash = crypto.createHash('sha256').update(contextString).digest('hex');

    // Crea una clave más robusta combinando múltiples hashes
    const secondaryHash = crypto.createHash('sha512')
        .update(hash + systemContext.projectSalt)
        .digest('base64');

    return secondaryHash;
}

function getJwtSecret(envVarName) {
    const value = process.env[envVarName];

    if (value) {
        return value;
    }

    if (process.env.NODE_ENV === 'production') {
        throw new Error(`[SECURITY] ${envVarName} is required in production`);
    }

    return generateSystemSecretKey();
}

module.exports = {
    JWT_SECRET: getJwtSecret('JWT_SECRET'),
    JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '1d',
    JWT_REFRESH_SECRET: getJwtSecret('JWT_REFRESH_SECRET'),
    JWT_REFRESH_EXPIRES_IN: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
    regenerateSecretKey: generateSystemSecretKey
};
