/**
 * N8N Integration Configuration
 * Webhook URLs and authentication
 */

const parseTimeout = (value, fallback) => {
	const timeout = Number.parseInt(value, 10);
	if (Number.isNaN(timeout) || timeout <= 0) {
		return fallback;
	}
	return timeout;
};

const N8N_WEBHOOK_URL = process.env.N8N_WEBHOOK_URL || '';
const N8N_WEBHOOK_TOKEN = process.env.N8N_WEBHOOK_TOKEN || '';
const N8N_TIMEOUT_MS = parseTimeout(process.env.N8N_TIMEOUT_MS, 10000);

module.exports = {
	enabled: Boolean(N8N_WEBHOOK_URL),
	webhookUrl: N8N_WEBHOOK_URL,
	webhookToken: N8N_WEBHOOK_TOKEN,
	timeoutMs: N8N_TIMEOUT_MS
};
