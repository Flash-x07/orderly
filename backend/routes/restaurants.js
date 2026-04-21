const express = require('express');
const { createRestaurant, getRestaurant, updateRestaurant, updateLogo } = require('../controllers/restaurantController');
const { protect } = require('../middleware/auth');

const router = express.Router();

// Create a new restaurant (for owners who have none)
router.post('/', protect, createRestaurant);

router.get('/:id', getRestaurant);
router.put('/:id', protect, updateRestaurant);

// Dedicated logo endpoint — updates only logo, fast and simple
router.put('/:id/logo', protect, updateLogo);

module.exports = router;
