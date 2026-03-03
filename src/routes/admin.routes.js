const express = require('express');
const router = express.Router();
const { protect, requireAdmin } = require('../middlewares/auth.middleware');
const adminController = require('../presentation/http/controllers/admin.clean.controller');

router.use(protect, requireAdmin);
router.post('/run-closing', adminController.runClosing.bind(adminController));
router.post('/test-closing', adminController.testClosing.bind(adminController));
router.post('/monthly-closing', adminController.runMonthlyClosing.bind(adminController));
router.get('/closing-history', adminController.getClosingHistory.bind(adminController));
router.get('/closing/stats', adminController.getMonthlyStats.bind(adminController));
router.get('/closing/compare', adminController.compareMonthlyPeriods.bind(adminController));
router.get('/closing/current', adminController.getCurrentMonthData.bind(adminController));
router.get('/closing/trends', adminController.getMonthlyTrends.bind(adminController));
router.get('/closing/:month/:year', adminController.getClosingByPeriod.bind(adminController));

module.exports = router;
