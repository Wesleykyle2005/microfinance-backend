const cron = require('node-cron');
const ScoringService = require('../../services/scoring.service');

function initScoringScheduler() {
    cron.schedule('0 8 * * *', async () => {
        const startTime = new Date();
        console.log(`\n[ScoringScheduler] ========================================`);
        console.log(`[ScoringScheduler] Iniciando recálculo masivo de scoring...`);
        console.log(`[ScoringScheduler] Hora inicio: ${startTime.toLocaleString('es-NI', { timeZone: 'America/Managua' })}`);
        console.log(`[ScoringScheduler] ========================================\n`);

        try {
            const results = await ScoringService.recalculateAllActiveClients();

            const endTime = new Date();
            const duration = ((endTime - startTime) / 1000).toFixed(2);

            console.log(`\n[ScoringScheduler] ========================================`);
            console.log(`[ScoringScheduler] Recálculo completado`);
            console.log(`[ScoringScheduler] Total de clientes: ${results.total}`);
            console.log(`[ScoringScheduler] Procesados exitosamente: ${results.processed}`);
            console.log(`[ScoringScheduler] Cambios de categoría: ${results.categoryChanges}`);
            console.log(`[ScoringScheduler] Errores: ${results.errors}`);
            console.log(`[ScoringScheduler] Duración: ${duration}s`);

            if (results.errors > 0) {
                console.log(`\n[ScoringScheduler] Detalles de errores:`);
                results.errorDetails.forEach((err, index) => {
                    console.log(`  ${index + 1}. ${err.clientName} (${err.clientId}): ${err.error}`);
                });
            }

            console.log(`[ScoringScheduler] ========================================\n`);
        } catch (error) {
            console.error(`[ScoringScheduler] Error crítico en recálculo masivo:`, error);
        }
    }, {
        scheduled: true,
        timezone: 'America/Managua'
    });

    console.log('[ScoringScheduler] Scheduler iniciado - Se ejecutará diariamente a las 8:00 AM');
}

module.exports = { initScoringScheduler };
