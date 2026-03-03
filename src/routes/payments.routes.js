const express = require('express');
const router = express.Router();
const { protect, requireOperational } = require('../middlewares/auth.middleware');
const {
	getPayments,
	createPayment,
	confirmPayment,
	getPaymentsByLoan,
	getPaymentsStats,
	getPendingByClient,
	getPayment
} = require('../presentation/http/controllers/payments.clean.controller');

router.use(protect, requireOperational);
router.get('/', getPayments);
router.get('/stats', getPaymentsStats);
router.get('/pending-by-client', getPendingByClient);
router.post('/', createPayment);
router.patch('/:id/confirm', confirmPayment);
router.get('/loan/:loanId', getPaymentsByLoan);
router.get('/:id', getPayment);

module.exports = router;
