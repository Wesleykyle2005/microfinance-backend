// src/services/scoring.service.js
const { repositoriesContainer } = require('../infrastructure/container/repositories.container');
const { differenceInDays } = require('date-fns');
const { scoringRepository } = repositoriesContainer;

class ScoringService {
    /**
     * Calcula el score de un cliente (0-100) basado en historial de pagos,
     * montos y puntualidad. Actualiza categoría automáticamente.
     * RISK es solo alerta, NO bloquea crédito automáticamente.
     */
    static async calculateClientScore(clientId) {
        // 1. Validar cliente
        const client = await scoringRepository.findClientById(clientId);

        if (!client) {
            throw new Error('Cliente no encontrado');
        }

        if (!client.isActive) {
            throw new Error('Cliente inactivo');
        }

        const currentScore = client.scoringPoints || 0;
        const currentCategoryId = client.categoryId;

        // 2. Calcular 3 componentes
        const [paymentHistoryScore, amountHistoryScore, punctualityScore] = await Promise.all([
            this._calculatePaymentHistoryScore(clientId),
            this._calculateAmountHistoryScore(clientId),
            this._calculatePunctualityScore(clientId)
        ]);

        // 3. Fórmula ponderada
        const newScore = Math.round(
            (paymentHistoryScore * 0.5) +
            (amountHistoryScore * 0.3) +
            (punctualityScore * 0.2)
        );

        // 4. Determinar nueva categoría
        const newCategory = await this._findCategoryForScore(newScore);

        if (!newCategory) {
            throw new Error(`No se encontró categoría para score ${newScore}`);
        }

        // 5. Actualizar en transacción
        const result = await scoringRepository.updateClientScoreAndCreateHistory({
            clientId,
            newScore,
            newCategoryId: newCategory.id,
            pointsChange: newScore - currentScore
        });

        // 6. Obtener categoría anterior para comparación
        let previousCategory = null;
        if (currentCategoryId) {
            previousCategory = await scoringRepository.findCategoryById(currentCategoryId);
        }

        return {
            success: true,
            clientId,
            clientName: client.fullName,
            previousScore: currentScore,
            newScore,
            scoreChange: newScore - currentScore,
            breakdown: {
                paymentHistory: paymentHistoryScore,
                amountHistory: amountHistoryScore,
                punctuality: punctualityScore
            },
            previousCategory: previousCategory ? {
                id: currentCategoryId,
                name: previousCategory.name,
                displayName: previousCategory.displayName
            } : null,
            newCategory: {
                id: newCategory.id,
                name: newCategory.name,
                displayName: newCategory.displayName
            },
            categoryChanged: currentCategoryId !== newCategory.id,
            isRiskCategory: newCategory.name === 'RISK',
            warning: newCategory.name === 'RISK' ? 'Cliente en categoría de RIESGO - Requiere revisión admin' : null
        };
    }

    /**
     * A. Historial de Pagos (0-100)
     * % de cuotas pagadas sobre vencidas hasta hoy
     */
    static async _calculatePaymentHistoryScore(clientId) {
        const now = new Date();

        const baseWhere = {
            loan: { clientId },
            dueDate: { lte: now }
        };

        const [totalSchedules, paidSchedules] = await Promise.all([
            scoringRepository.countPaymentSchedules({
                where: baseWhere
            }),
            scoringRepository.countPaymentSchedules({
                where: {
                    ...baseWhere,
                    status: 'PAID'
                }
            })
        ]);

        // Caso borde: cliente nuevo sin préstamos
        if (totalSchedules === 0) {
            return 50; // Score neutro
        }

        return Math.round((paidSchedules / totalSchedules) * 100);
    }

    /**
     * B. Historial de Montos (0-100)
     * Ratio de dinero pagado vs prestado
     */
    static async _calculateAmountHistoryScore(clientId) {
        const [totalLentResult, totalPaidResult] = await Promise.all([
            scoringRepository.aggregateLoans({
                where: {
                    clientId,
                    statusLoan: { not: 'PENDING' }
                },
                _sum: { principalAmount: true }
            }),
            scoringRepository.aggregatePaymentSchedules({
                where: { loan: { clientId } },
                _sum: { paidAmount: true }
            })
        ]);

        const totalLent = totalLentResult._sum.principalAmount
            ? parseFloat(totalLentResult._sum.principalAmount.toString())
            : 0;

        // Caso borde: sin préstamos
        if (totalLent === 0) {
            return 50; // Score neutro
        }

        const totalPaid = totalPaidResult._sum.paidAmount
            ? parseFloat(totalPaidResult._sum.paidAmount.toString())
            : 0;

        // Ratio de pago
        const ratio = totalPaid / totalLent;

        // Si ha pagado todo o más (ratio >= 1) → 100 puntos
        if (ratio >= 1) return 100;

        return Math.round(ratio * 100);
    }

    /**
     * C. Puntualidad (0-100)
     * Basado en días de retraso promedio
     */
    static async _calculatePunctualityScore(clientId) {
        // Obtener cuotas pagadas con fecha
        const paidSchedules = await scoringRepository.findPaidSchedulesWithDates(clientId);

        // Caso borde: sin pagos
        if (paidSchedules.length === 0) {
            return 50; // Score neutro
        }

        // Calcular días de retraso promedio
        const totalDelayDays = paidSchedules.reduce((sum, schedule) => {
            const delayDays = differenceInDays(schedule.paidDate, schedule.dueDate);
            return sum + delayDays;
        }, 0);

        const avgDelayDays = totalDelayDays / paidSchedules.length;

        // Fórmula: 100 - (promedio * 5)
        // Pago anticipado (negativo) → topeado a 100
        // Retrasos grandes → puede llegar a 0
        const score = 100 - (avgDelayDays * 5);

        return Math.max(0, Math.min(100, Math.round(score)));
    }

    /**
     * Busca la categoría correspondiente al score
     */
    static async _findCategoryForScore(score) {
        const categories = await scoringRepository.findActiveCategories();

        return categories.find(cat =>
            score >= cat.minScore && score <= cat.maxScore
        );
    }

    /**
     * Recalcula scoring de todos los clientes activos
     * Usado por el scheduler diario
     */
    static async recalculateAllActiveClients() {
        const clients = await scoringRepository.findActiveClients();

        const results = {
            total: clients.length,
            processed: 0,
            categoryChanges: 0,
            errors: 0,
            errorDetails: []
        };

        for (const client of clients) {
            try {
                const result = await this.calculateClientScore(client.id);
                results.processed++;

                if (result.categoryChanged) {
                    results.categoryChanges++;
                }
            } catch (error) {
                results.errors++;
                results.errorDetails.push({
                    clientId: client.id,
                    clientName: client.fullName,
                    error: error.message
                });
                console.error(`[ScoringService] Error procesando ${client.fullName}:`, error.message);
            }
        }

        return results;
    }
}

module.exports = ScoringService;
