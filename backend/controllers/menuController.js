/**
 * Menu Controller
 * CRUD operations for menu items and categories
 */

const MenuItem = require('../models/MenuItem');
const Restaurant = require('../models/Restaurant');

/**
 * GET /api/menu/:restaurantId
 * Public route - get full menu grouped by category
 * Only returns data for active restaurants.
 */
const getPublicMenu = async (req, res) => {
  try {
    const { restaurantId } = req.params;

    const [restaurant, items] = await Promise.all([
      Restaurant.findById(restaurantId).select('name description logo theme currency settings isActive'),
      MenuItem.find({ restaurant: restaurantId, isAvailable: true })
        .sort({ sortOrder: 1, createdAt: 1 })
        .lean(),
    ]);

    if (!restaurant) {
      return res.status(404).json({ error: 'Restaurant not found.' });
    }

    // Do not expose menu for inactive/disabled restaurants
    if (!restaurant.isActive) {
      return res.status(403).json({ error: 'This restaurant is currently unavailable.' });
    }

    // Group items by category
    const menu = items.reduce((acc, item) => {
      const cat = item.category;
      if (!acc[cat]) acc[cat] = [];
      acc[cat].push(item);
      return acc;
    }, {});

    res.json({ restaurant, menu, categories: Object.keys(menu) });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch menu.' });
  }
};

/**
 * GET /api/menu/:restaurantId/all
 * Get all items (including unavailable) for dashboard
 * Ownership check: only the restaurant's own owner (or admin) may see this.
 */
const getAllMenuItems = async (req, res) => {
  try {
    const { restaurantId } = req.params;

    if (!_ownsRestaurant(req.user, restaurantId)) {
      return res.status(403).json({ error: 'Access denied.' });
    }

    const items = await MenuItem.find({ restaurant: restaurantId })
      .sort({ category: 1, sortOrder: 1 })
      .lean();
    res.json({ items });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch menu items.' });
  }
};

// ─── Ownership helper ──────────────────────────────────────────────────────────
// Normalises the comparison so it works whether req.user.restaurant is a
// populated object ({ _id: ObjectId }) or a raw ObjectId / string.
const _ownsRestaurant = (user, restaurantId) => {
  if (user.role === 'admin') return true;
  // restaurant may be populated object or bare ObjectId
  const ownedId = user.restaurant?._id?.toString() ?? user.restaurant?.toString();
  return ownedId === restaurantId;
};

/**
 * POST /api/menu/:restaurantId
 * Add a new menu item
 */
const createMenuItem = async (req, res) => {
  try {
    const { restaurantId } = req.params;
    const { name, description, price, category, image, tags, preparationTime, isFeatured } = req.body;

    // Ownership check — normalised to handle populated object vs raw ObjectId
    if (!_ownsRestaurant(req.user, restaurantId)) {
      return res.status(403).json({ error: 'Access denied.' });
    }

    // Validate required fields
    if (!name || !category || price === undefined || price === null || price === '') {
      return res.status(400).json({ error: 'name, category, and price are required.' });
    }

    const item = await MenuItem.create({
      restaurant: restaurantId,
      name,
      description,
      price: Number(price),
      category,
      image,
      tags: tags || [],
      preparationTime: preparationTime || 15,
      isFeatured: isFeatured || false,
    });

    res.status(201).json({ message: 'Menu item created.', item });
  } catch (error) {
    console.error('Create menu item error:', error);
    res.status(500).json({ error: 'Failed to create menu item.' });
  }
};

/**
 * PUT /api/menu/:restaurantId/:itemId
 * Update a menu item
 */
const updateMenuItem = async (req, res) => {
  try {
    const { restaurantId, itemId } = req.params;

    if (!_ownsRestaurant(req.user, restaurantId)) {
      return res.status(403).json({ error: 'Access denied.' });
    }

    // Whitelist updatable fields to prevent mass-assignment
    const allowed = ['name', 'description', 'price', 'category', 'image',
                     'tags', 'preparationTime', 'isFeatured', 'isAvailable', 'sortOrder'];
    const updates = {};
    allowed.forEach((f) => { if (req.body[f] !== undefined) updates[f] = req.body[f]; });
    if (updates.price !== undefined) updates.price = Number(updates.price);

    const item = await MenuItem.findOneAndUpdate(
      { _id: itemId, restaurant: restaurantId },
      { $set: updates },
      { new: true, runValidators: true }
    );

    if (!item) return res.status(404).json({ error: 'Menu item not found.' });

    res.json({ message: 'Menu item updated.', item });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update menu item.' });
  }
};

/**
 * DELETE /api/menu/:restaurantId/:itemId
 * Delete a menu item
 */
const deleteMenuItem = async (req, res) => {
  try {
    const { restaurantId, itemId } = req.params;

    if (!_ownsRestaurant(req.user, restaurantId)) {
      return res.status(403).json({ error: 'Access denied.' });
    }

    const item = await MenuItem.findOneAndDelete({ _id: itemId, restaurant: restaurantId });
    if (!item) return res.status(404).json({ error: 'Menu item not found.' });

    res.json({ message: 'Menu item deleted.' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete menu item.' });
  }
};

/**
 * PATCH /api/menu/:restaurantId/:itemId/toggle
 * Toggle item availability
 */
const toggleAvailability = async (req, res) => {
  try {
    const { restaurantId, itemId } = req.params;

    // Ownership check — same pattern as other mutations
    if (!_ownsRestaurant(req.user, restaurantId)) {
      return res.status(403).json({ error: 'Access denied.' });
    }

    const item = await MenuItem.findOne({ _id: itemId, restaurant: restaurantId });
    if (!item) return res.status(404).json({ error: 'Item not found.' });

    item.isAvailable = !item.isAvailable;
    await item.save();

    res.json({ message: `Item is now ${item.isAvailable ? 'available' : 'unavailable'}.`, item });
  } catch (error) {
    res.status(500).json({ error: 'Failed to toggle availability.' });
  }
};

module.exports = { getPublicMenu, getAllMenuItems, createMenuItem, updateMenuItem, deleteMenuItem, toggleAvailability };
