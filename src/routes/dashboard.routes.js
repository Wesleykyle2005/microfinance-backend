/**
 * Dashboard Routes
 * API endpoints for dashboard metrics
 */

const express = require('express');
const router = express.Router();
const dashboardController = require('../presentation/http/controllers/dashboard.clean.controller');
const { protect, requireAdmin } = require('../middlewares/auth.middleware');

// Aplicar autenticación a todas las rutas
router.use(protect, requireAdmin);

/**
 * @route   GET /api/dashboard/overview
 * @desc    Resumen integral del dashboard con filtros compartidos
 * @query   from, to, collectorId, categoryId, loanStatus, includeInactiveClients
 * @access  Private (SUPER_ADMIN)
 */
router.get('/overview', dashboardController.getOverview);

/**
 * @route   GET /api/dashboard/summary
 * @desc    Obtener resumen ejecutivo con KPIs principales
 * @access  Private (SUPER_ADMIN)
 */
router.get('/summary', dashboardController.getSummary);

/**
 * @route   GET /api/dashboard/cashflow
 * @desc    Flujo de caja agrupado por día
 * @query   days - Número de días a consultar (default: 30)
 * @access  Private (SUPER_ADMIN)
 */
router.get('/cashflow', dashboardController.getCashFlow);

/**
 * @route   GET /api/dashboard/portfolio-distribution
 * @desc    Distribución de cartera por estado
 * @access  Private (SUPER_ADMIN)
 */
router.get('/portfolio-distribution', dashboardController.getPortfolioDistribution);

/**
 * @route   GET /api/dashboard/clients-by-category
 * @desc    Clientes agrupados por categoría
 * @access  Private (SUPER_ADMIN)
 */
router.get('/clients-by-category', dashboardController.getClientsByCategory);

module.exports = router;
