/**
 * Categories Routes
 * API endpoints for Client Categories CRUD
 */

const express = require('express');
const router = express.Router();
const categoriesController = require('../presentation/http/controllers/categories.clean.controller');
const { protect, requireOperational } = require('../middlewares/auth.middleware');

// ============================================
// PROTECT ALL ROUTES (require authentication)
// ============================================
router.use(protect, requireOperational);

// ============================================
// CRUD ROUTES
// ============================================

/**
 * @route   GET /api/categories
 * @desc    Get all categories (with pagination, search, filters)
 * @access  Private
 */
router.get('/', categoriesController.getAll);
router.get('/stats', categoriesController.getStats);

/**
 * @route   POST /api/categories
 * @desc    Create new category
 * @access  Private (Admin only - add role middleware if needed)
 */
router.post('/', categoriesController.create);

/**
 * @route   GET /api/categories/:id
 * @desc    Get single category by ID
 * @access  Private
 */
router.get('/:id', categoriesController.getOne);

/**
 * @route   PATCH /api/categories/:id
 * @desc    Update category
 * @access  Private (Admin only - add role middleware if needed)
 */
router.patch('/:id', categoriesController.update);

/**
 * @route   DELETE /api/categories/:id
 * @desc    Delete category (soft delete)
 * @access  Private (Admin only - add role middleware if needed)
 */
router.delete('/:id', categoriesController.delete);

module.exports = router;
