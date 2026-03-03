const express = require('express');
const router = express.Router();
const { protect, requireOperational } = require('../middlewares/auth.middleware');
const {
	getLoans,
	getLoanOptions,
	getLoan,
	getLoanSchedule,
	getLoanStats,
	getLoanSchedulesSummary,
	getPendingLoanStats,
	createLoan,
	approveLoan,
	rejectLoan,
	disburseLoan,
	rescheduleLoan
} = require('../presentation/http/controllers/loans.clean.controller');

router.use(protect, requireOperational);
router.post('/', createLoan);
router.get('/', getLoans);
router.get('/options', getLoanOptions);
router.get('/stats', getLoanStats);
router.get('/schedules/summary', getLoanSchedulesSummary);
router.get('/pending/stats', getPendingLoanStats);
router.get('/:id', getLoan);
router.get('/:id/schedule', getLoanSchedule);
router.patch('/:id/approve', approveLoan);
router.patch('/:id/reject', rejectLoan);
router.patch('/:id/disburse', disburseLoan);
router.patch('/:id/reschedule', rescheduleLoan);

module.exports = router;
