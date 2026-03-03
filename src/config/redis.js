/**
 * Redis Configuration
 * Client for session management and caching
 */

const { createClient } = require('redis');

let client = null;
let connectingPromise = null;

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

	const redisUrl = getRedisUrl();
	if (!redisUrl) {
		return null;
	}

	client = createClient({
		url: redisUrl,
		password: process.env.REDIS_PASSWORD || undefined,
	});

	client.on('error', (error) => {
		console.error('[Redis] Error:', error.message);
	});

	connectingPromise = client.connect()
		.then(() => {
			console.log('[Redis] Connected');
			connectingPromise = null;
			return client;
		})
		.catch((error) => {
			console.error('[Redis] Connection failed:', error.message);
			connectingPromise = null;
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
