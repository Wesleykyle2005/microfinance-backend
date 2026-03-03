/**
 * Reports Routes
 * API endpoints para reportes
 */

const express = require('express');
const router = express.Router();
const { protect, requireOperational } = require('../middlewares/auth.middleware');
const reportsController = require('../presentation/http/controllers/reports.clean.controller');

// Todas las rutas requieren autenticación
router.use(protect, requireOperational);

/**
 * @route   GET /api/reports
 * @desc    Obtener listado de reportes disponibles
 * @access  Private
 */
router.get('/', reportsController.getAvailableReports);

/**
 * @route   GET /api/reports/cartera/overview
 * @desc    Resumen ligero de cartera (JSON)
 * @access  Private
 */
router.get('/cartera/overview', reportsController.getCarteraOverview);

/**
 * @route   GET /api/reports/cartera/loans
 * @desc    Lista paginada y ligera de cartera (JSON)
 * @access  Private
 */
router.get('/cartera/loans', reportsController.getCarteraLoansLight);

/**
 * @route   GET /api/reports/cartera/loan/:loanId/installments
 * @desc    Cuotas por préstamo (JSON)
 * @access  Private
 */
router.get('/cartera/loan/:loanId/installments', reportsController.getCarteraInstallmentsByLoan);

/**
 * @route   GET /api/reports/cartera/loan/:loanId/payments
 * @desc    Pagos por préstamo (JSON)
 * @access  Private
 */
router.get('/cartera/loan/:loanId/payments', reportsController.getCarteraPaymentsByLoan);

/**
 * @route   GET /api/reports/cartera
 * @desc    Reporte de cartera completa (Excel)
 * @access  Private
 * @query   format=excel, month (opcional), year (opcional), status (opcional)
 */
router.get('/cartera', reportsController.getCartera);

/**
 * @route   GET /api/reports/mora
 * @desc    Reporte de clientes en mora (Excel)
 * @access  Private
 * @query   format=excel
 */
router.get('/mora', reportsController.getMora);

/**
 * @route   GET /api/reports/mora/overview
 * @desc    Resumen ligero de mora (JSON)
 * @access  Private
 */
router.get('/mora/overview', reportsController.getMoraOverview);

/**
 * @route   GET /api/reports/mora/loans
 * @desc    Lista paginada de préstamos en mora (JSON)
 * @access  Private
 */
router.get('/mora/loans', reportsController.getMoraLoansLight);

/**
 * @route   GET /api/reports/mora/loan/:loanId/installments
 * @desc    Cuotas vencidas por préstamo (JSON)
 * @access  Private
 */
router.get('/mora/loan/:loanId/installments', reportsController.getMoraInstallmentsByLoan);

/**
 * @route   GET /api/reports/balance/:month/:year
 * @desc    Balance mensual (Excel o PDF)
 * @access  Private (Super Admin)
 * @params  month, year
 * @query   format=excel o format=pdf
 */
router.get('/balance/:month/:year', reportsController.getBalance);

/**
 * @route   GET /api/reports/cliente/:id
 * @desc    Estado de cuenta individual (PDF)
 * @access  Private
 * @params  id (clientId)
 */
router.get('/cliente/:id', reportsController.getClienteEstadoCuenta);

/**
 * @route   GET /api/reports/recibo/:paymentId
 * @desc    Recibo de pago (PDF)
 * @access  Private
 * @params  paymentId
 */
router.get('/recibo/:paymentId', reportsController.getReciboPago);

module.exports = router;
