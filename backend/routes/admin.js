const express = require('express');
const {
  getPlatformStats,
  getAllRestaurants,
  toggleRestaurant,
  deleteRestaurant,
  updateUserPlan,
} = require('../controllers/adminController');
const { protect, restrictTo } = require('../middleware/auth');

const router = express.Router();

router.use(protect, restrictTo('admin'));

router.get   ('/stats',                        getPlatformStats);
router.get   ('/restaurants',                  getAllRestaurants);
router.patch ('/restaurants/:id/toggle',       toggleRestaurant);
router.delete('/restaurants/:id',              deleteRestaurant);   // ✅ جديد
router.patch ('/users/:id/plan',               updateUserPlan);

module.exports = router;