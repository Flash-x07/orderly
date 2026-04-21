/**
 * Subscription Middleware
 * ─────────────────────────────────────────────────────────────────
 * 1. checkSubscriptionExpiry  — auto-expires subscriptions past their date
 * 2. requireActiveSubscription — blocks access if subscription is not active
 * ─────────────────────────────────────────────────────────────────
 */

const User = require('../models/User');

/**
 * Run on every authenticated request.
 * If the user's subscriptionExpiresAt has passed, flip their status to "expired"
 * and plan to "none" so they are blocked from premium features.
 */
const checkSubscriptionExpiry = async (req, res, next) => {
  try {
    // Only applies to authenticated users
    if (!req.user) return next();

    const user = req.user;

    // Already expired or cancelled — nothing to flip
    if (user.subscriptionStatus !== 'active') return next();

    // No expiry set → treat as permanently active (admin-assigned, etc.)
    if (!user.subscriptionExpiresAt) return next();

    const now = new Date();
    if (new Date(user.subscriptionExpiresAt) < now) {
      // Persist the change — use 'free' consistently (not 'none')
      await User.findByIdAndUpdate(user._id, {
        subscriptionStatus: 'expired',
        subscriptionPlan:   'free',
        plan:               'free',
      });

      // Mutate the in-request object too so downstream middleware sees it
      req.user.subscriptionStatus = 'expired';
      req.user.subscriptionPlan   = 'free';
      req.user.plan               = 'free';
    }

    next();
  } catch (err) {
    next(err);
  }
};

/**
 * Gate any route behind an active subscription.
 * Must come AFTER protect() and checkSubscriptionExpiry().
 */
const requireActiveSubscription = (req, res, next) => {
  // Admins bypass subscription checks
  if (req.user?.role === 'admin') return next();

  if (req.user?.subscriptionStatus !== 'active') {
    return res.status(403).json({
      error: 'subscription_required',
      message:
        req.user?.subscriptionStatus === 'expired'
          ? 'Your subscription has expired. Please upgrade to continue.'
          : 'An active subscription is required to access this feature.',
      subscriptionStatus: req.user?.subscriptionStatus || 'expired',
      subscriptionPlan:   req.user?.subscriptionPlan   || 'none',
    });
  }

  next();
};

module.exports = { checkSubscriptionExpiry, requireActiveSubscription };
