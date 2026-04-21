const jwt  = require('jsonwebtoken');
const User = require('../models/User');

/**
 * protect
 * ─────────────────────────────────────────────────────────────────────────────
 * Verifies the JWT and attaches req.user.
 *
 * Intentionally does NOT require restaurant to be non-null — an owner whose
 * restaurant was deleted must still be able to authenticate so they can
 * create a new one.
 * ─────────────────────────────────────────────────────────────────────────────
 */
const protect = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Not authenticated. Please log in.' });
    }

    const token = authHeader.split(' ')[1];
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (err) {
      if (err.name === 'TokenExpiredError') {
        return res.status(401).json({ error: 'Session expired. Please log in again.' });
      }
      return res.status(401).json({ error: 'Invalid token. Please log in.' });
    }

    // Populate restaurant — this may resolve to null if the restaurant was
    // deleted. That is valid — we do NOT reject null-restaurant users here.
    // We select _id explicitly so ownership comparisons always work.
    const user = await User.findById(decoded.id)
      .populate('restaurant', '_id name slug theme currency logo')
      .select('-password');

    if (!user) return res.status(401).json({ error: 'User no longer exists.' });
    if (!user.isActive) return res.status(401).json({ error: 'Your account has been deactivated.' });

    req.user = user;
    next();
  } catch (err) {
    res.status(500).json({ error: 'Authentication error.' });
  }
};

/**
 * requireRestaurant
 * ─────────────────────────────────────────────────────────────────────────────
 * Use this INSTEAD of assuming restaurant is always present on routes that
 * genuinely need it (orders, menu, tables, etc.).
 *
 * Returns a structured 403 that the frontend can detect and redirect to the
 * "create restaurant" flow.
 * ─────────────────────────────────────────────────────────────────────────────
 */
const requireRestaurant = (req, res, next) => {
  const restaurantId = req.user?.restaurant?._id ?? req.user?.restaurant;
  if (!restaurantId) {
    return res.status(403).json({
      error: 'No restaurant linked to this account.',
      code: 'NO_RESTAURANT',
    });
  }
  next();
};

const restrictTo = (...roles) => (req, res, next) => {
  if (!req.user || !roles.includes(req.user.role)) {
    return res.status(403).json({ error: 'You do not have permission to perform this action.' });
  }
  next();
};

module.exports = { protect, requireRestaurant, restrictTo };
