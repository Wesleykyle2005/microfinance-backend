const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const { getRedisClient } = require('../config/redis');

const memoryBlacklist = new Map();

const hashToken = (token) => crypto.createHash('sha256').update(token).digest('hex');

const getTtlSeconds = (token) => {
    const decoded = jwt.decode(token);
    if (!decoded || !decoded.exp) return 60 * 60;

    const expiresAt = Number(decoded.exp);
    const now = Math.floor(Date.now() / 1000);
    return Math.max(1, expiresAt - now);
};

const cleanupMemoryBlacklist = () => {
    const now = Date.now();
    for (const [key, expiresAt] of memoryBlacklist.entries()) {
        if (expiresAt <= now) {
            memoryBlacklist.delete(key);
        }
    }
};

const revokeToken = async (token) => {
    if (!token) return;

    const tokenHash = hashToken(token);
    const ttlSeconds = getTtlSeconds(token);

    const redis = await getRedisClient();
    if (redis?.isOpen) {
        await redis.set(`revoked:${tokenHash}`, '1', {
            EX: ttlSeconds,
        });
        return;
    }

    memoryBlacklist.set(tokenHash, Date.now() + ttlSeconds * 1000);
};

const isTokenRevoked = async (token) => {
    if (!token) return true;

    const tokenHash = hashToken(token);

    const redis = await getRedisClient();
    if (redis?.isOpen) {
        const exists = await redis.get(`revoked:${tokenHash}`);
        return exists === '1';
    }

    cleanupMemoryBlacklist();
    const expiresAt = memoryBlacklist.get(tokenHash);
    if (!expiresAt) return false;

    return expiresAt > Date.now();
};

module.exports = {
    revokeToken,
    isTokenRevoked,
};
