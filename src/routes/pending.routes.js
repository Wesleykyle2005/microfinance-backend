const express = require('express');
const router = express.Router();
const { protect, requireOperational } = require('../middlewares/auth.middleware');
const { getPendingLoanStats } = require('../presentation/http/controllers/loans.clean.controller');

router.use(protect, requireOperational);

router.get('/stats', getPendingLoanStats);

module.exports = router;
