const { getRedisClient } = require('../config/redis');

const stableSerialize = (value) => {
	if (!value || typeof value !== 'object') return '';

	const entries = Object.entries(value)
		.filter(([, entryValue]) => entryValue !== undefined && entryValue !== null && entryValue !== '')
		.sort(([a], [b]) => a.localeCompare(b));

	return entries
		.map(([key, entryValue]) => `${encodeURIComponent(key)}=${encodeURIComponent(String(entryValue))}`)
		.join('&');
};

const getCacheKey = (namespace, req) => {
	const query = stableSerialize(req.query);
	const userPart = `user:${req.user?.id || 'anon'}:role:${req.user?.role || 'na'}`;
	const queryPart = query ? `?${query}` : '';

	return `cache:${namespace}:${req.path}${queryPart}:${userPart}`;
};

const deleteKeysByPattern = async (redis, pattern) => {
	let cursor = '0';
	do {
		const result = await redis.scan(cursor, {
			MATCH: pattern,
			COUNT: 100,
		});

		cursor = result.cursor;
		if (result.keys.length > 0) {
			await redis.del(result.keys);
		}
	} while (cursor !== '0');
};

const cacheResponse = ({ namespace, ttlSeconds = 60 }) => async (req, res, next) => {
	const redis = await getRedisClient();
	if (!redis?.isOpen) return next();

	const cacheKey = getCacheKey(namespace, req);

	try {
		const cached = await redis.get(cacheKey);
		if (cached) {
			res.set('X-Cache', 'HIT');
			return res.status(200).json(JSON.parse(cached));
		}
	} catch (error) {
		console.error('[Cache] Read error:', error.message);
	}

	const originalJson = res.json.bind(res);
	res.json = (body) => {
		if (res.statusCode < 400 && body?.success === true) {
			redis.set(cacheKey, JSON.stringify(body), { EX: ttlSeconds })
				.catch((error) => console.error('[Cache] Write error:', error.message));
		}

		res.set('X-Cache', 'MISS');
		return originalJson(body);
	};

	return next();
};

const invalidateByNamespace = ({ namespace }) => async (req, res, next) => {
	const redis = await getRedisClient();
	if (!redis?.isOpen) return next();

	const originalJson = res.json.bind(res);
	res.json = (body) => {
		if (res.statusCode < 400 && body?.success === true) {
			deleteKeysByPattern(redis, `cache:${namespace}:*`)
				.catch((error) => console.error('[Cache] Invalidate error:', error.message));
		}

		return originalJson(body);
	};

	return next();
};

module.exports = {
	cacheResponse,
	invalidateByNamespace,
};
