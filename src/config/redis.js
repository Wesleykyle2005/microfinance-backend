/**
 * Redis Configuration
 * Client for session management and caching
 */

const { createClient } = require('redis');

let client = null;
let connectingPromise = null;
let lastConnectionFailedAt = 0;
let lastRedisLogAt = 0;
const RETRY_COOLDOWN_MS = 60000;
const LOG_COOLDOWN_MS = 30000;

const logRedis = (prefix, error) => {
	const now = Date.now();
	if (now - lastRedisLogAt < LOG_COOLDOWN_MS) return;
	lastRedisLogAt = now;
	console.error(prefix, formatRedisError(error));
};

const formatRedisError = (error) => {
	if (!error) return 'Unknown Redis error';
	if (typeof error === 'string') return error;

	const parts = [
		error.message,
		error.code,
		error.name,
	].filter(Boolean);

	return parts.length > 0 ? parts.join(' | ') : JSON.stringify(error);
};

const getRedisUrl = () => {
	if (process.env.REDIS_URL) return process.env.REDIS_URL;

	const host = process.env.REDIS_HOST;
	const port = process.env.REDIS_PORT;

	if (host && port) {
		return `redis://${host}:${port}`;
	}

	return null;
};

const connectRedis = async () => {
	if (client?.isOpen) return client;
	if (connectingPromise) return connectingPromise;

	const now = Date.now();
	if (lastConnectionFailedAt && now - lastConnectionFailedAt < RETRY_COOLDOWN_MS) {
		return null;
	}

	const redisUrl = getRedisUrl();
	if (!redisUrl) {
		return null;
	}

	client = createClient({
		url: redisUrl,
		password: process.env.REDIS_PASSWORD || undefined,
		socket: {
			reconnectStrategy: () => false,
			connectTimeout: 1500,
		},
	});

	client.on('error', (error) => {
		logRedis('[Redis] Error:', error);
	});

	connectingPromise = client.connect()
		.then(() => {
			console.log('[Redis] Connected');
			connectingPromise = null;
			lastConnectionFailedAt = 0;
			return client;
		})
		.catch((error) => {
			logRedis('[Redis] Connection failed:', error);
			connectingPromise = null;
			lastConnectionFailedAt = Date.now();
			client = null;
			return null;
		});

	return connectingPromise;
};

const getRedisClient = async () => {
	if (client?.isOpen) return client;
	return connectRedis();
};

const disconnectRedis = async () => {
	if (!client?.isOpen) return;
	await client.quit();
	client = null;
};

module.exports = {
	getRedisClient,
	disconnectRedis,
};
