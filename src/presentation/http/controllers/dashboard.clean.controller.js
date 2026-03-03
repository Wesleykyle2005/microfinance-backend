/**
 * Dashboard Controller
 * Métricas y KPIs del sistema para el Super Admin
 */

const { useCasesContainer } = require('../../../infrastructure/container/useCases.container');

const { dashboardAnalyticsUseCase } = useCasesContainer.dashboard;

class DashboardController {
    async getOverview(req, res) {
        try {
            const response = await dashboardAnalyticsUseCase.getOverview(req.query);
            return res.json({ success: true, ...response });
        } catch (error) {
            console.error('[Dashboard] Error al obtener overview:', error);
            return res.status(500).json({
                success: false,
                error: 'Error al obtener overview del dashboard',
                details: error.message
            });
        }
    }

    async getSummary(req, res) {
        try {
            const response = await dashboardAnalyticsUseCase.getSummary();
            return res.json({ success: true, ...response });

        } catch (error) {
            console.error('[Dashboard] Error al obtener resumen:', error);
            return res.status(500).json({
                success: false,
                error: 'Error al obtener métricas del dashboard',
                details: error.message
            });
        }
    }

    async getCashFlow(req, res) {
        try {
            const response = await dashboardAnalyticsUseCase.getCashFlow(req.query);
            return res.json({ success: true, ...response });

        } catch (error) {
            console.error('[Dashboard] Error al obtener cashflow:', error);
            return res.status(500).json({
                success: false,
                error: 'Error al obtener flujo de caja',
                details: error.message
            });
        }
    }

    async getPortfolioDistribution(req, res) {
        try {
            const response = await dashboardAnalyticsUseCase.getPortfolioDistribution();
            return res.json({ success: true, ...response });

        } catch (error) {
            console.error('[Dashboard] Error al obtener distribución:', error);
            return res.status(500).json({
                success: false,
                error: 'Error al obtener distribución de cartera',
                details: error.message
            });
        }
    }

    async getClientsByCategory(req, res) {
        try {
            const response = await dashboardAnalyticsUseCase.getClientsByCategory();
            return res.json({ success: true, ...response });

        } catch (error) {
            console.error('[Dashboard] Error al obtener clientes por categoría:', error);
            return res.status(500).json({
                success: false,
                error: 'Error al obtener clientes por categoría',
                details: error.message
            });
        }
    }
}

module.exports = new DashboardController();
