const express = require('express');
const {
  getPublicMenu, getAllMenuItems, createMenuItem,
  updateMenuItem, deleteMenuItem, toggleAvailability,
} = require('../controllers/menuController');
const { protect } = require('../middleware/auth');

const router = express.Router();

// Public - customers
router.get('/:restaurantId', getPublicMenu);

// Protected - restaurant owners
router.get('/:restaurantId/all', protect, getAllMenuItems);
router.post('/:restaurantId', protect, createMenuItem);
router.put('/:restaurantId/:itemId', protect, updateMenuItem);
router.delete('/:restaurantId/:itemId', protect, deleteMenuItem);
router.patch('/:restaurantId/:itemId/toggle', protect, toggleAvailability);

module.exports = router;
