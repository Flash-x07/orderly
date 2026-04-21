/**
 * Restaurant Controller
 * Restaurant profile and settings management
 *
 * Added: createRestaurant — lets an owner who has no restaurant (e.g. after
 *        admin deletion) create a new one without going through registration.
 */

const Restaurant = require('../models/Restaurant');
const User       = require('../models/User');

// ─── Helpers ───────────────────────────────────────────────────────────────────

const notFound = (res) =>
  res.status(404).json({ success: false, code: 'RESTAURANT_NOT_FOUND' });

// ─── Controllers ──────────────────────────────────────────────────────────────

/**
 * POST /api/restaurants
 * Create a new restaurant for the authenticated owner.
 * Only allowed when the user has no restaurant linked yet.
 */
const createRestaurant = async (req, res) => {
  try {
    const userId = req.user._id;

    // Prevent creating a second restaurant (unless admin)
    if (req.user.role !== 'admin') {
      const existingId = req.user.restaurant?._id ?? req.user.restaurant;
      if (existingId) {
        // Verify the referenced restaurant actually exists
        const exists = await Restaurant.findById(existingId);
        if (exists) {
          return res.status(409).json({
            success: false,
            error: 'You already have a restaurant. Update it in Settings.',
            code: 'RESTAURANT_ALREADY_EXISTS',
          });
        }
        // The reference is stale (document deleted) — allow recreation
      }
    }

    const { name, currency } = req.body;
    if (!name || !String(name).trim()) {
      return res.status(400).json({ success: false, error: 'Restaurant name is required.' });
    }

    const restaurant = await Restaurant.create({
      name: String(name).trim(),
      owner: userId,
      currency: currency || 'USD',
    });

    // Link the new restaurant to the user
    await User.findByIdAndUpdate(userId, { restaurant: restaurant._id });

    res.status(201).json({ success: true, message: 'Restaurant created.', restaurant });
  } catch (error) {
    console.error('createRestaurant error:', error);
    res.status(500).json({ success: false, error: 'Failed to create restaurant.' });
  }
};

/**
 * GET /api/restaurants/:id
 * Get restaurant details.
 * Public fields only — never expose owner PII or subscription state.
 */
const getRestaurant = async (req, res) => {
  try {
    const restaurant = await Restaurant.findById(req.params.id)
      .select('-__v');
    if (!restaurant) return notFound(res);
    // Strip owner ObjectId from public response
    const { owner: _owner, ...safe } = restaurant.toObject();
    res.json({ success: true, restaurant: safe });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to fetch restaurant.' });
  }
};

/**
 * PUT /api/restaurants/:id
 * Update restaurant profile (general fields)
 */
const updateRestaurant = async (req, res) => {
  try {
    const { id } = req.params;

    if (req.user.role !== 'admin') {
      if (!req.user.restaurant) return notFound(res);
      const ownedId = req.user.restaurant?._id?.toString() ?? req.user.restaurant?.toString();
      if (ownedId !== id) {
        return res.status(403).json({ success: false, error: 'Access denied.' });
      }
    }

    const allowedFields = [
      'name', 'description', 'logo', 'coverImage', 'cuisine',
      'address', 'phone', 'currency', 'theme', 'settings',
    ];

    const updates = {};
    allowedFields.forEach((field) => {
      if (req.body[field] !== undefined) updates[field] = req.body[field];
    });

    const restaurant = await Restaurant.findByIdAndUpdate(
      id,
      { $set: updates },
      { new: true, runValidators: true },
    );

    if (!restaurant) return notFound(res);

    res.json({ success: true, message: 'Restaurant updated.', restaurant });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to update restaurant.' });
  }
};

/**
 * PUT /api/restaurants/:id/logo
 * Update only the restaurant logo.
 */
const updateLogo = async (req, res) => {
  try {
    const { id } = req.params;
    const { logo } = req.body;

    if (req.user.role !== 'admin') {
      if (!req.user.restaurant) return notFound(res);
      const ownedId = req.user.restaurant?._id?.toString() ?? req.user.restaurant?.toString();
      if (ownedId !== id) {
        return res.status(403).json({ success: false, error: 'Access denied.' });
      }
    }

    if (logo === undefined) {
      return res.status(400).json({ success: false, error: 'logo field is required.' });
    }

    if (logo !== '' && !logo.startsWith('data:image/') && !logo.startsWith('http')) {
      return res.status(400).json({ success: false, error: 'Invalid logo format.' });
    }

    const restaurant = await Restaurant.findByIdAndUpdate(
      id,
      { logo },
      { new: true },
    );

    if (!restaurant) return notFound(res);

    res.json({ success: true, message: 'Logo updated.', logo: restaurant.logo });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to update logo.' });
  }
};

module.exports = { createRestaurant, getRestaurant, updateRestaurant, updateLogo };
