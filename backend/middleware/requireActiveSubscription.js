/**
 * middleware/requireFeature.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Factory function — returns an Express middleware that blocks access if the
 * current plan does not include a specific feature.
 *
 * Must be placed AFTER protect() and loadSubscription() in the chain.
 *
 * Usage:
 *   const requireFeature = require('../middleware/requireFeature');
 *
 *   router.get('/analytics',    protect, loadSubscription, requireFeature('analytics'),    getAnalytics);
 *   router.put('/branding',     protect, loadSubscription, requireFeature('customBranding'), updateBranding);
 *   router.get('/restaurants',  protect, loadSubscription, requireFeature('multiRestaurant'), listRestaurants);
 *
 * Feature names must match the keys inside PLANS[planId].features in config/plans.js.
 * ─────────────────────────────────────────────────────────────────────────────
 */

const { PLANS } = require('../config/plans');

/**
 * Returns a middleware that checks whether req.planConfig.features[featureName]
 * is true.  If not, responds with a structured 403.
 *
 * @param {string} featureName - A key from PLANS[*].features
 * @returns {Function} Express middleware
 */
const requireFeature = (featureName) => (req, res, next) => {
  // Admins always bypass — loadSubscription already assigned them premium
  if (req.user?.role === 'admin') return next();

  const planConfig = req.planConfig;

  if (!planConfig) {
    return res.status(500).json({
      success: false,
      code:    'MIDDLEWARE_MISCONFIGURED',
      message: 'loadSubscription must run before requireFeature.',
    });
  }

  if (planConfig.features[featureName] === true) {
    return next();
  }

  // Find the lowest plan that unlocks this feature to give a useful upgrade hint
  const upgradeTo = _findLowestPlanWithFeature(featureName);

  return res.status(403).json({
    success:     false,
    code:        'FEATURE_LOCKED',
    message:     `"${_featureLabel(featureName)}" is not available on the ${planConfig.displayName} plan.`,
    feature:     featureName,
    currentPlan: req.effectivePlan,
    upgradeTo:   upgradeTo ?? planConfig.upgradeTo,
  });
};

// ─── Internal helpers ──────────────────────────────────────────────────────────

/** Returns the lowest plan (by hierarchy) that has the feature enabled. */
const _findLowestPlanWithFeature = (featureName) => {
  const tierOrder = ['free', 'pro', 'premium'];
  return tierOrder.find((planId) => PLANS[planId]?.features[featureName] === true) ?? null;
};

/** Converts a camelCase feature key into a readable label. */
const _featureLabel = (featureName) =>
  featureName
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, (c) => c.toUpperCase())
    .trim();

module.exports = requireFeature;