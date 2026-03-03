/**
 * Cron Service - Cierre Diario de Mora
 * Estrategia HÍBRIDA: Manual por defecto / Auto opcional
 */

const { repositoriesContainer } = require('../infrastructure/container/repositories.container');
const notificationService = require('./notification.service');
const { dailyClosingRepository } = repositoriesContainer;

class CronService {
    /**
     * Ejecutar Cierre Diario (Manual - invocado por Admin)
     * @param {string} userId - ID del admin que ejecuta
     * @returns {Promise<Object>} - Resultado con actionItems para frontend
     */
    async runDailyClosing(userId) {
        console.log(`[CronService] Iniciando cierre diario - Admin: ${userId}`);

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const existingLog = await dailyClosingRepository.findByExecutionDate(today);

        if (existingLog) {
            console.log('[CronService] Cierre ya ejecutado hoy');
            console.log(`  - Ejecutado a las: ${existingLog.executedAt.toLocaleTimeString()}`);
            console.log(`  - Por: ${existingLog.executedBy}`);
            console.log(`  - Cuotas procesadas: ${existingLog.processedCount}`);

            return {
                success: false,
                alreadyExecuted: true,
                message: 'El cierre diario ya fue ejecutado hoy',
                previousExecution: {
                    executedAt: existingLog.executedAt,
                    executedBy: existingLog.executedBy,
                    processedCount: existingLog.processedCount,
                    clientsAffected: existingLog.clientsAffected
                }
            };
        }
        try {
            // ========== PASO A: TRANSACCIÓN - IDENTIFICAR Y PROCESAR ==========
            const processingResult = await dailyClosingRepository.processDailyClosing({
                today,
                userId
            });

            console.log(`[CronService] Config: moraEnabled=${processingResult.config.moraEnabled}, notificationsEnabled=${processingResult.config.notificationsEnabled}`);
            console.log(`[CronService] Cuotas vencidas encontradas: ${processingResult.processed.length}`);

            // ========== PASO B: CEREBRO HÍBRIDO - NOTIFICACIONES ==========
            const actionItems = [];
            const notificationMode = processingResult.config.notificationMode;
            const notificationsEnabled = processingResult.config.notificationsEnabled;
            const moraEnabled = processingResult.config.moraEnabled;

            console.log(`[CronService] Notificaciones: ${notificationsEnabled ? 'ACTIVADAS' : 'DESACTIVADAS'}`);
            console.log(`[CronService] Modo: ${notificationMode}`);

            // Notificar solo si está activado (independiente de mora)
            if (notificationsEnabled && processingResult.processed.length > 0) {
                // Agrupar por cliente
                const clientMap = new Map();

                for (const item of processingResult.processed) {
                    const client = item.installment.loan.client;
                    const clientId = client.id;

                    if (!clientMap.has(clientId)) {
                        clientMap.set(clientId, {
                            client,
                            installments: [],
                            totalPenalty: 0
                        });
                    }

                    const clientData = clientMap.get(clientId);
                    clientData.installments.push(item);
                    clientData.totalPenalty += item.penalty;
                }

                // Procesar notificación para cada cliente
                for (const [clientId, data] of clientMap) {
                    const { client, installments, totalPenalty } = data;

                    // Generar mensaje (diferente según si hay mora o no)
                    const message = this._generateMessage(
                        client.fullName,
                        installments,
                        totalPenalty,
                        moraEnabled  // ← Contexto para el mensaje
                    );

                    // Generar link manual
                    const whatsappLink = notificationService.generateWhatsAppLink(
                        client.phoneNumber || '00000000',
                        message
                    );

                    let autoSent = false;

                    // Estrategia HÍBRIDA
                    if (notificationMode === 'AUTO' && client.phoneNumber) {
                        // Intentar envío automático
                        console.log(`[CronService] Intentando envío AUTO para ${client.fullName}...`);
                        autoSent = await notificationService.sendWhatsApp(
                            client.phoneNumber,
                            message,
                            {
                                source: 'daily-closing',
                                clientId,
                                clientName: client.fullName,
                                installmentsCount: installments.length,
                                totalPenalty: totalPenalty.toFixed(2),
                                moraEnabled,
                                notificationMode
                            }
                        );
                    }

                    // Si es MANUAL o falló AUTO → usar link manual
                    const actionRequired = !autoSent;

                    actionItems.push({
                        clientId: client.id,
                        clientName: client.fullName,
                        phone: client.phoneNumber || 'Sin teléfono',
                        installmentsCount: installments.length,
                        totalPenalty: totalPenalty.toFixed(2),
                        moraApplied: moraEnabled,
                        message,
                        whatsappLink,
                        autoSent,
                        actionRequired
                    });

                    if (autoSent) {
                        console.log(`[CronService] Enviado automáticamente a ${client.fullName}`);
                    } else {
                        console.log(`[CronService] Usar link manual para ${client.fullName}`);
                    }
                }
            } else if (!notificationsEnabled) {
                console.log('[CronService] Notificaciones desactivadas - no se enviarán alertas');
            }

            // ========== PASO C: REGISTRO Y RESPUESTA ==========
            // Calcular métricas
            const totalMoraApplied = processingResult.processed.reduce(
                (sum, item) => sum + item.penalty,
                0
            );

            const notificationsSent = actionItems.filter(item => item.autoSent).length;
            const notificationsFailed = actionItems.filter(item => !item.autoSent && item.actionRequired).length;

            // Crear log de ejecución
            await dailyClosingRepository.createExecutionLog({
                data: {
                    executedBy: userId,
                    executionDate: today,
                    processedCount: processingResult.processed.length,
                    clientsAffected: actionItems.length,
                    moraEnabled: processingResult.config.moraEnabled,
                    notificationsEnabled: notificationsEnabled,
                    notificationMode,
                    totalMoraApplied,
                    notificationsSent,
                    notificationsFailed,
                    success: true
                }
            });

            console.log('[CronService] Cierre completado');
            console.log(`  - Cuotas procesadas: ${processingResult.processed.length}`);
            console.log(`  - Clientes afectados: ${actionItems.length}`);
            console.log(`  - Mora total: C$${totalMoraApplied.toFixed(2)}`);
            console.log(`  - Notificaciones enviadas: ${notificationsSent}`);
            console.log(`  - Notificaciones fallback: ${notificationsFailed}`);

            return {
                success: true,
                processedCount: processingResult.processed.length,
                clientsAffected: actionItems.length,
                moraEnabled: processingResult.config.moraEnabled,
                notificationsEnabled,
                notificationMode,
                message: processingResult.message,
                actionItems,
                metrics: {
                    totalMoraApplied: totalMoraApplied.toFixed(2),
                    notificationsSent,
                    notificationsFailed
                },
                executedAt: new Date().toISOString()
            };

        } catch (error) {
            console.error('[CronService] Error en cierre diario:', error);

            // Registrar error en log
            try {
                await dailyClosingRepository.createExecutionLog({
                    data: {
                        executedBy: userId,
                        executionDate: today,
                        processedCount: 0,
                        clientsAffected: 0,
                        moraEnabled: false,
                        notificationsEnabled: false,
                        notificationMode: 'MANUAL',
                        totalMoraApplied: 0,
                        notificationsSent: 0,
                        notificationsFailed: 0,
                        success: false,
                        errorMessage: error.message
                    }
                });
            } catch (logError) {
                console.error('[CronService] Error al registrar log de error:', logError);
            }

            throw error;
        }
    }

    /**
     * Generar mensaje de WhatsApp (contextual según mora)
     * @private
     */
    _generateMessage(clientName, installments, totalPenalty, moraEnabled) {
        const installmentsText = installments.map(item => {
            const inst = item.installment;
            const dueDate = inst.dueDate.toLocaleDateString('es-NI');

            if (moraEnabled && item.penalty > 0) {
                // CON MORA: Mostrar penalización
                return `Cuota #${inst.paymentNumber} (Vencida: ${dueDate}) - Mora: C$${item.penalty.toFixed(2)}`;
            } else {
                // SIN MORA: Solo recordatorio
                return `Cuota #${inst.paymentNumber} (Vencida: ${dueDate})`;
            }
        }).join('\n');

        if (moraEnabled && totalPenalty > 0) {
            // Mensaje CON MORA
            return `Hola ${clientName},

Le informamos que las siguientes cuotas han vencido y se ha aplicado mora:

${installmentsText}

Total mora aplicada: C$${totalPenalty.toFixed(2)}

Por favor, realice su pago lo antes posible para evitar cargos adicionales.

Gracias.`;
        } else {
            // Mensaje SIN MORA (solo recordatorio)
            return `Hola ${clientName},

Le recordamos que las siguientes cuotas se encuentran vencidas:

${installmentsText}

Por favor, realice su pago lo antes posible.

Gracias por su atención.`;
        }
    }
}

module.exports = new CronService();
