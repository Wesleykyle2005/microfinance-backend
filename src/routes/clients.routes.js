const express = require('express');
const router = express.Router();
const { protect, requireOperational } = require('../middlewares/auth.middleware');
const {
	getClients,
	getClientOptions,
	getClientStats,
	createClient,
	getClient,
	updateClient,
	deleteClient,
	recalculateClientScoring,
	getClientScoringHistory
} = require('../presentation/http/controllers/clients.clean.controller');

router.use(protect, requireOperational);
router.get('/', getClients);
router.get('/options', getClientOptions);
router.get('/stats', getClientStats);
router.post('/', createClient);
router.get('/:id', getClient);
router.patch('/:id', updateClient);
router.delete('/:id', deleteClient);
router.post('/:id/scoring/recalculate', recalculateClientScoring);
router.get('/:id/scoring/history', getClientScoringHistory);

module.exports = router;
