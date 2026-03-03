const express = require('express');
const router = express.Router();
const { protect, requireAdmin, requireOperational } = require('../middlewares/auth.middleware');
const configController = require('../presentation/http/controllers/config.clean.controller');

router.use(protect, requireOperational);
router.get('/', configController.getAll);
router.get('/:id', configController.getOne);
router.post('/', requireAdmin, configController.create);
router.patch('/:id', requireAdmin, configController.update);

module.exports = router;
