/**
 * Admin Controller
 * Platform-level admin operations (stats, restaurant management, plan management)
 */

const User       = require('../models/User');
const Restaurant = require('../models/Restaurant');
const Order      = require('../models/Order');
const MenuItem   = require('../models/MenuItem');
const Table      = require('../models/Table');

const getPlatformStats = async (req, res) => {
  try {
    const [totalUsers, totalRestaurants, totalOrders, totalMenuItems] = await Promise.all([
      User.countDocuments({ role: 'owner' }),
      Restaurant.countDocuments(),
      Order.countDocuments(),
      MenuItem.countDocuments(),
    ]);

    // Use 'total' — that is the field name in the Order schema
    const revenueAgg = await Order.aggregate([
      { $match: { status: { $in: ['completed', 'delivered'] } } },
      { $group: { _id: null, total: { $sum: '$total' } } },
    ]);
    const totalRevenue = revenueAgg[0]?.total || 0;

    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const recentSignups = await User.countDocuments({
      role: 'owner',
      createdAt: { $gte: thirtyDaysAgo },
    });

    const planDistribution = await User.aggregate([
      { $match: { role: 'owner' } },
      { $group: { _id: '$subscriptionPlan', count: { $sum: 1 } } },
    ]);

    res.json({ totalUsers, totalRestaurants, totalOrders, totalMenuItems, totalRevenue, recentSignups, planDistribution });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch platform stats.' });
  }
};

const getAllRestaurants = async (req, res) => {
  try {
    const { search = '', limit = 50, page = 1 } = req.query;
    const limitNum = Math.min(Number(limit) || 50, 200);
    const pageNum  = Math.max(Number(page)  || 1,  1);
    const skip     = (pageNum - 1) * limitNum;

    // Build match — search across restaurant name or owner name/email
    const matchQuery = search
      ? {
          $or: [
            { name:        { $regex: search, $options: 'i' } },
          ],
        }
      : {};

    const [restaurants, total] = await Promise.all([
      Restaurant.find(matchQuery)
        .populate('owner', 'name email subscriptionPlan subscriptionStatus createdAt isActive')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum),
      Restaurant.countDocuments(matchQuery),
    ]);

    res.json({ restaurants, total, page: pageNum, pages: Math.ceil(total / limitNum) });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch restaurants.' });
  }
};

/**
 * Toggle restaurant visibility (isActive on the Restaurant document).
 * Does NOT touch the owner user account at all.
 */
const toggleRestaurant = async (req, res) => {
  try {
    const restaurant = await Restaurant.findById(req.params.id);
    if (!restaurant) return res.status(404).json({ error: 'Restaurant not found.' });

    restaurant.isActive = !restaurant.isActive;
    await restaurant.save();

    const updated = await Restaurant.findById(restaurant._id)
      .populate('owner', 'name email subscriptionPlan subscriptionStatus createdAt isActive');

    res.json({
      message: `Restaurant ${restaurant.isActive ? 'activated' : 'deactivated'}.`,
      isActive: restaurant.isActive,
      restaurant: updated,
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to toggle restaurant.' });
  }
};

/**
 * deleteRestaurant
 * ─────────────────────────────────────────────────────────────────────────────
 * Permanently removes a restaurant and all its associated data.
 *
 * CRITICAL: The owner User account is preserved. We only clear the
 * `restaurant` field so the account stays valid. The owner can log in
 * normally and create a new restaurant or join another.
 * ─────────────────────────────────────────────────────────────────────────────
 */
const deleteRestaurant = async (req, res) => {
  try {
    const restaurant = await Restaurant.findById(req.params.id);
    if (!restaurant) return res.status(404).json({ error: 'Restaurant not found.' });

    const ownerId = restaurant.owner;

    // Delete all associated data
    await Promise.all([
      MenuItem.deleteMany({ restaurant: restaurant._id }),
      Order.deleteMany({ restaurant: restaurant._id }),
      Table.deleteMany({ restaurant: restaurant._id }),
    ]);

    // Delete the restaurant document
    await restaurant.deleteOne();

    // Clear the restaurant reference on the owner — account stays alive
    if (ownerId) {
      await User.findByIdAndUpdate(
        ownerId,
        { $unset: { restaurant: '' } },
      );
    }

    res.json({
      message: 'Restaurant deleted. The owner account remains active.',
      ownerId: ownerId?.toString() ?? null,
    });
  } catch (error) {
    console.error('deleteRestaurant error:', error);
    res.status(500).json({ error: 'Failed to delete restaurant.' });
  }
};

const updateUserPlan = async (req, res) => {
  try {
    const { plan, status, expiresAt } = req.body;
    const validPlans    = ['none', 'free', 'trial', 'pro', 'premium'];
    const validStatuses = ['active', 'expired', 'cancelled', 'pending'];

    if (plan   && !validPlans.includes(plan))    return res.status(400).json({ error: 'Invalid plan.' });
    if (status && !validStatuses.includes(status)) return res.status(400).json({ error: 'Invalid status.' });

    const updates = {};

    if (plan) {
      updates.subscriptionPlan = plan;
      updates.plan             = plan;

      // When admin sets a paid/trial plan, default status to active unless overridden
      if (['pro', 'premium', 'trial'].includes(plan)) {
        updates.subscriptionStatus = status || 'active';
      } else if (plan === 'free') {
        // Downgrade to free: cancel subscription cleanly
        updates.subscriptionStatus    = 'active'; // free is always "active"
        updates.subscriptionExpiresAt = null;
        updates.billingCycle          = null;
        updates.planExpiresAt         = null;
      }
    }

    // Explicit status override takes priority
    if (status) updates.subscriptionStatus = status;

    if (expiresAt) {
      updates.subscriptionExpiresAt = new Date(expiresAt);
      updates.planExpiresAt         = new Date(expiresAt);
    }

    const user = await User.findByIdAndUpdate(req.params.id, updates, { new: true })
      .select('-password');
    if (!user) return res.status(404).json({ error: 'User not found.' });

    res.json({ message: 'User plan updated successfully.', user });
  } catch (error) {
    console.error('updateUserPlan error:', error);
    res.status(500).json({ error: 'Failed to update user plan.' });
  }
};

module.exports = { getPlatformStats, getAllRestaurants, toggleRestaurant, deleteRestaurant, updateUserPlan };
