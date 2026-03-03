const axios = require('axios');
const n8nConfig = require('../config/n8n.config');
const { repositoriesContainer } = require('../infrastructure/container/repositories.container');

const whatsappNotificationRepository = repositoriesContainer.whatsappNotificationRepository;

class NotificationService {
    async sendWhatsApp(phone, message, metadata = {}) {
        const normalizedPhone = this._normalizePhone(phone);
        const persistedNotification = await this._createNotificationRecord(
            normalizedPhone,
            message,
            metadata
        );

        console.log('[NotificationService] Intento de envío WhatsApp:');
        console.log(`  Teléfono: ${normalizedPhone}`);
        console.log(`  Mensaje: ${message}`);
        console.log(`  n8n habilitado: ${n8nConfig.enabled ? 'Sí' : 'No'}`);

        if (!n8nConfig.enabled) {
            console.log('[NotificationService] N8N_WEBHOOK_URL no configurado - usar método manual');
            await this._updateNotificationRecord(persistedNotification?.id, {
                status: 'FAILED',
                errorMessage: 'N8N_WEBHOOK_URL no configurado'
            });
            return false;
        }

        try {
            const headers = {
                'Content-Type': 'application/json',
                Accept: 'application/json'
            };

            if (n8nConfig.webhookToken) {
                headers['x-webhook-token'] = n8nConfig.webhookToken;
            }

            const payload = {
                channel: 'whatsapp',
                phone: normalizedPhone,
                message,
                sentAt: new Date().toISOString(),
                source: metadata.source || 'daily-closing',
                metadata
            };

            const response = await axios.post(
                n8nConfig.webhookUrl,
                payload,
                {
                    headers,
                    timeout: n8nConfig.timeoutMs,
                    validateStatus: () => true
                }
            );

            const webhookAccepted = response.status >= 200
                && response.status < 300
                && (response.data?.success === undefined || response.data.success === true);

            if (!webhookAccepted) {
                console.log(`[NotificationService] n8n rechazó envío (${response.status})`);
                await this._updateNotificationRecord(persistedNotification?.id, {
                    status: 'FAILED',
                    externalMessageId: response.data?.messageId || null,
                    errorMessage: `n8n status ${response.status}`
                });
                return false;
            }

            console.log('[NotificationService] Mensaje aceptado por n8n');
            await this._updateNotificationRecord(persistedNotification?.id, {
                status: 'SENT',
                externalMessageId: response.data?.messageId || null,
                sentAt: new Date()
            });
            return true;
        } catch (error) {
            console.error('[NotificationService] Error enviando a n8n:', error.message);
            await this._updateNotificationRecord(persistedNotification?.id, {
                status: 'FAILED',
                errorMessage: error.message
            });
            return false;
        }
    }

    async _createNotificationRecord(normalizedPhone, message, metadata = {}) {
        try {
            if (!metadata.clientId) {
                return null;
            }

            const dueAmount = metadata.totalPenalty !== undefined
                ? Number(metadata.totalPenalty)
                : null;

            return await whatsappNotificationRepository.create({
                clientId: metadata.clientId,
                phoneNumber: normalizedPhone,
                messageType: metadata.messageType || 'CUSTOM',
                loanId: metadata.loanId || null,
                loanFolio: metadata.loanFolio || 'MULTI',
                dueAmount: Number.isFinite(dueAmount) ? dueAmount : null,
                messageBody: message,
                status: 'PENDING'
            });
        } catch (error) {
            console.error('[NotificationService] No se pudo persistir whatsappNotification:', error.message);
            return null;
        }
    }

    async _updateNotificationRecord(notificationId, data) {
        try {
            if (!notificationId) {
                return;
            }

            await whatsappNotificationRepository.updateStatus(notificationId, data);
        } catch (error) {
            console.error('[NotificationService] No se pudo actualizar whatsappNotification:', error.message);
        }
    }

    _normalizePhone(phone) {
        const digitsOnly = String(phone || '').replace(/\D/g, '');

        if (!digitsOnly) {
            return '';
        }

        if (digitsOnly.startsWith('505')) {
            return digitsOnly;
        }

        return `505${digitsOnly}`;
    }

    generateWhatsAppLink(phone, message) {
        const encodedMessage = encodeURIComponent(message);
        const normalizedPhone = this._normalizePhone(phone);
        return `https://wa.me/${normalizedPhone}?text=${encodedMessage}`;
    }
}

module.exports = new NotificationService();
