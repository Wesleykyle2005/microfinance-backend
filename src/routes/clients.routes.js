const express = require('express');
const router = express.Router();
const { protect, requireOperational } = require('../middlewares/auth.middleware');
const { cacheResponse, invalidateByNamespace } = require('../middlewares/cache.middleware');
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

const clientsCache = cacheResponse({ namespace: 'clients', ttlSeconds: 120 });
const invalidateClientsCache = invalidateByNamespace({ namespace: 'clients' });

router.use(protect, requireOperational);
router.get('/', clientsCache, getClients);
router.get('/options', clientsCache, getClientOptions);
router.get('/stats', clientsCache, getClientStats);
router.post('/', invalidateClientsCache, createClient);
router.get('/:id', clientsCache, getClient);
router.patch('/:id', invalidateClientsCache, updateClient);
router.delete('/:id', invalidateClientsCache, deleteClient);
router.post('/:id/scoring/recalculate', invalidateClientsCache, recalculateClientScoring);
router.get('/:id/scoring/history', clientsCache, getClientScoringHistory);

module.exports = router;
