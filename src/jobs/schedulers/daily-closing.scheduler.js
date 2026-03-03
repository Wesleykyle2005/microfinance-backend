const cron = require('node-cron');
const cronService = require('../../services/cron.service');
const notificationService = require('../../services/notification.service');

class DailyClosingScheduler {
    constructor() {
        this.isRunning = false;
        this.task = null;
    }

    start() {
        console.log('[DailyClosingScheduler] Programando cierre diario...');

        this.task = cron.schedule('0 8 * * *', async () => {
            await this._executeClosing();
        }, {
            scheduled: true,
            timezone: 'America/Managua'
        });

        console.log('[DailyClosingScheduler] Scheduler activo - Ejecutará 8:00 AM');
        console.log('[DailyClosingScheduler] Timezone: America/Managua (UTC-6)');
    }

    async _executeClosing() {
        if (this.isRunning) {
            console.log('[DailyClosingScheduler] Ya hay un cierre en ejecución - omitiendo');
            return;
        }

        this.isRunning = true;
        const startTime = Date.now();

        try {
            console.log('[DailyClosingScheduler] Ejecutando cierre diario automático...');

            const result = await cronService.runDailyClosing('SYSTEM_AUTO');

            const executionTime = ((Date.now() - startTime) / 1000).toFixed(2);

            if (result.alreadyExecuted) {
                console.log(`[DailyClosingScheduler] ${result.message}`);
                return;
            }

            console.log(`[DailyClosingScheduler] Cierre completado en ${executionTime}s`);
            console.log(`  - Cuotas procesadas: ${result.processedCount}`);
            console.log(`  - Clientes afectados: ${result.clientsAffected}`);
            console.log(`  - Mora aplicada: ${result.moraEnabled ? 'Sí' : 'No'}`);
            console.log(`  - Mora total: C$${result.metrics.totalMoraApplied}`);
            console.log(`  - Notificaciones enviadas: ${result.metrics.notificationsSent}`);
            console.log(`  - Notificaciones fallback: ${result.metrics.notificationsFailed}`);

            await this._notifyAdmin(result);

        } catch (error) {
            const executionTime = ((Date.now() - startTime) / 1000).toFixed(2);

            console.error(`[DailyClosingScheduler] Error en cierre automático (${executionTime}s):`, error);

            await this._notifyAdminError(error);

        } finally {
            this.isRunning = false;
        }
    }


    async _notifyAdmin(result) {
        const adminPhone = process.env.ADMIN_NOTIFICATION_PHONE || process.env.SUPER_ADMIN_PHONE;

        if (!adminPhone) {
            console.log('[DailyClosingScheduler] ADMIN_NOTIFICATION_PHONE no configurado - omitiendo notificación admin');
            return result;
        }

        const message = [
            '✅ Cierre diario ejecutado',
            `Fecha: ${new Date().toLocaleString('es-NI')}`,
            `Cuotas procesadas: ${result.processedCount || 0}`,
            `Clientes afectados: ${result.clientsAffected || 0}`,
            `Mora aplicada: ${result.moraEnabled ? 'Sí' : 'No'}`,
            `Mora total: C$${result?.metrics?.totalMoraApplied || 0}`,
            `Notificaciones enviadas: ${result?.metrics?.notificationsSent || 0}`,
            `Fallback manual: ${result?.metrics?.notificationsFailed || 0}`
        ].join('\n');

        const sent = await notificationService.sendWhatsApp(adminPhone, message, {
            source: 'daily-closing-admin',
            type: 'success'
        });

        if (!sent) {
            const manualLink = notificationService.generateWhatsAppLink(adminPhone, message);
            console.log('[DailyClosingScheduler] Notificación admin no enviada automáticamente. Link manual:', manualLink);
        }

        return result;
    }

    async _notifyAdminError(error) {
        const adminPhone = process.env.ADMIN_NOTIFICATION_PHONE || process.env.SUPER_ADMIN_PHONE;

        if (!adminPhone) {
            console.log('[DailyClosingScheduler] ADMIN_NOTIFICATION_PHONE no configurado - omitiendo notificación de error admin');
            return error;
        }

        const message = [
            '🚨 Error en cierre diario automático',
            `Fecha: ${new Date().toLocaleString('es-NI')}`,
            `Error: ${error.message || 'Error no especificado'}`
        ].join('\n');

        const sent = await notificationService.sendWhatsApp(adminPhone, message, {
            source: 'daily-closing-admin',
            type: 'error'
        });

        if (!sent) {
            const manualLink = notificationService.generateWhatsAppLink(adminPhone, message);
            console.log('[DailyClosingScheduler] Notificación de error admin no enviada automáticamente. Link manual:', manualLink);
        }

        return error;
    }

    async runNow() {
        console.log('[DailyClosingScheduler] Ejecutando cierre inmediato (manual)...');

        if (this.isRunning) {
            throw new Error('Ya hay un cierre en ejecución. Espere a que termine.');
        }

        try {
            this.isRunning = true;
            const result = await cronService.runDailyClosing('SYSTEM_MANUAL');
            console.log('[DailyClosingScheduler] Ejecución manual completada:', result);
            return result;
        } catch (error) {
            console.error('[DailyClosingScheduler] Error en ejecución manual:', error);
            throw error;
        } finally {
            this.isRunning = false;
        }
    }

    stop() {
        if (this.task) {
            this.task.stop();
            console.log('[DailyClosingScheduler] Scheduler detenido');
        }
    }

    getStatus() {
        return {
            isRunning: this.isRunning,
            isScheduled: Boolean(this.task),
            nextRun: this.task ? 'Diario a las 8:00 AM' : 'No programado'
        };
    }
}

module.exports = new DailyClosingScheduler();
