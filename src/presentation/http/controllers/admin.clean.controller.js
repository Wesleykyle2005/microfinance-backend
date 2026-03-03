/**
 * Admin Controller
 * Operaciones administrativas (cierre diario, cierre mensual, reportes, etc.)
 */

const { useCasesContainer } = require('../../../infrastructure/container/useCases.container');
const { RunMonthlyClosingDto } = require('../../../application/dtos/admin/RunMonthlyClosingDto');
const { ClosingHistoryQueryDto } = require('../../../application/dtos/admin/ClosingHistoryQueryDto');
const { ClosingPeriodParamsDto } = require('../../../application/dtos/admin/ClosingPeriodParamsDto');
const { ComparePeriodsQueryDto } = require('../../../application/dtos/admin/ComparePeriodsQueryDto');
const { MonthlyTrendsQueryDto } = require('../../../application/dtos/admin/MonthlyTrendsQueryDto');

const { adminClosingUseCase } = useCasesContainer.admin;

class AdminController {
    async runClosing(req, res) {
        try {
            const result = await adminClosingUseCase.runDailyClosing(req.user.id);

            return res.json({
                success: true,
                data: result
            });

        } catch (error) {
            console.error('[AdminController] Error en cierre diario:', error);
            return res.status(500).json({
                success: false,
                error: 'Error al ejecutar cierre diario',
                details: error.message
            });
        }
    }

    async testClosing(req, res) {
        try {
            const result = await adminClosingUseCase.runDailyClosingTest();

            return res.json({
                success: true,
                message: 'Test de cierre ejecutado correctamente',
                data: result
            });

        } catch (error) {
            console.error('[AdminController] Error en test de cierre:', error);
            return res.status(500).json({
                success: false,
                error: 'Error al ejecutar test de cierre',
                details: error.message
            });
        }
    }

    async runMonthlyClosing(req, res) {
        try {
            const dto = RunMonthlyClosingDto.fromRequest(req.body, req.user.id);
            const { month, year, userId } = dto;

            const result = await adminClosingUseCase.runMonthlyClosing({
                month,
                year,
                userId
            });

            return res.json({
                success: true,
                message: `Cierre mensual de ${month}/${year} ejecutado correctamente`,
                data: result
            });

        } catch (error) {
            console.error('[AdminController] Error en cierre mensual:', error);

            if (error.statusCode) {
                return res.status(error.statusCode).json({
                    success: false,
                    error: error.message
                });
            }

            return res.status(500).json({
                success: false,
                error: 'Error al ejecutar cierre mensual',
                details: error.message
            });
        }
    }

    async getClosingHistory(req, res) {
        try {
            const dto = ClosingHistoryQueryDto.fromRequest(req.query);
            const { limit, offset, year } = dto;

            const result = await adminClosingUseCase.getClosingHistory({
                limit,
                offset,
                year
            });

            return res.json({
                success: true,
                ...result
            });

        } catch (error) {
            console.error('[AdminController] Error al obtener historial:', error);
            return res.status(500).json({
                success: false,
                error: 'Error al obtener historial de cierres',
                details: error.message
            });
        }
    }

    async getClosingByPeriod(req, res) {
        try {
            const dto = ClosingPeriodParamsDto.fromRequest(req.params);
            const { month, year } = dto;

            const snapshot = await adminClosingUseCase.getClosingByPeriod(month, year);

            if (!snapshot) {
                return res.status(404).json({
                    success: false,
                    error: `No existe cierre para el período ${month}/${year}`,
                    message: 'Ejecuta POST /api/admin/monthly-closing para crear uno'
                });
            }

            return res.json({
                success: true,
                data: snapshot
            });

        } catch (error) {
            console.error('[AdminController] Error al obtener cierre:', error);

            if (error.statusCode) {
                return res.status(error.statusCode).json({
                    success: false,
                    error: error.message
                });
            }

            return res.status(500).json({
                success: false,
                error: 'Error al obtener cierre del período',
                details: error.message
            });
        }
    }

    async getMonthlyStats(req, res) {
        try {
            const year = parseInt(req.query.year) || new Date().getFullYear();

            const data = await adminClosingUseCase.getAnnualStats(year);

            return res.json({
                success: true,
                data
            });

        } catch (error) {
            console.error('[AdminController] Error en getMonthlyStats:', error);
            return res.status(500).json({
                success: false,
                error: 'Error al obtener estadísticas anuales',
                details: error.message
            });
        }
    }

    async compareMonthlyPeriods(req, res) {
        try {
            const dto = ComparePeriodsQueryDto.fromRequest(req.query);
            const { fromMonth, toMonth, year } = dto;

            const data = await adminClosingUseCase.comparePeriods(fromMonth, toMonth, year);

            return res.json({
                success: true,
                data
            });

        } catch (error) {
            console.error('[AdminController] Error en compareMonthlyPeriods:', error);
            return res.status(400).json({
                success: false,
                error: error.message
            });
        }
    }

    async getCurrentMonthData(req, res) {
        try {
            const data = await adminClosingUseCase.getCurrentMonthData();

            return res.json({
                success: true,
                data
            });

        } catch (error) {
            console.error('[AdminController] Error en getCurrentMonthData:', error);

            if (error.message.includes('No existe ningún cierre')) {
                return res.status(404).json({
                    success: false,
                    error: error.message
                });
            }

            return res.status(500).json({
                success: false,
                error: 'Error al obtener datos del mes actual',
                details: error.message
            });
        }
    }

    async getMonthlyTrends(req, res) {
        try {
            const dto = MonthlyTrendsQueryDto.fromRequest(req.query);
            const { months } = dto;

            const data = await adminClosingUseCase.getMonthlyTrends(months);

            return res.json({
                success: true,
                data
            });

        } catch (error) {
            console.error('[AdminController] Error en getMonthlyTrends:', error);
            return res.status(400).json({
                success: false,
                error: error.message
            });
        }
    }
}

module.exports = new AdminController();
