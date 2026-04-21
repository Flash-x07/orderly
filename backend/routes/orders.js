const express = require('express');
const {
  createOrder, getRestaurantOrders,
  updateOrderStatus, getOrderStats,
} = require('../controllers/orderController');
const { protect } = require('../middleware/auth');

const router = express.Router();

// Public - customers place orders
router.post('/', createOrder);

// Protected - dashboard
router.get('/restaurant/:restaurantId', protect, getRestaurantOrders);
router.get('/restaurant/:restaurantId/stats', protect, getOrderStats);
router.patch('/:orderId/status', protect, updateOrderStatus);

module.exports = router;
