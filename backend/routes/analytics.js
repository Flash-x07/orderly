/**
 * routes/analytics.js  (EXAMPLE)
 * ─────────────────────────────────────────────────────────────────────────────
 * Demonstrates how to protect Premium-only routes using the middleware chain.
 *
 * Analytics    → requireFeature('analytics')       → Premium only
 * Custom theme → requireFeature('customBranding')   → Premium only
 * Multi-resto  → requireFeature('multiRestaurant')  → Premium only
 *
 * If a Pro user hits GET /api/analytics/:restaurantId they receive:
 * {
 *   "success": false,
 *   "code": "FEATURE_LOCKED",
 *   "message": "\"Analytics\" is not available on the Pro plan.",
 *   "feature": "analytics",
 *   "currentPlan": "pro",
 *   "upgradeTo": "premium"
 * }
 * ─────────────────────────────────────────────────────────────────────────────
 */

const express          = require('express');
const { protect }      = require('../middleware/auth');
const loadSubscription = require('../middleware/loadSubscription');
const requireFeature   = require('../middleware/requireFeature');

const router = express.Router();

// ── Analytics (Premium only) ───────────────────────────────────────────────────

router.get(
  '/:restaurantId',
  protect,
  loadSubscription,
  requireFeature('analytics'),
  async (req, res) => {
    // At this point the user definitely has the analytics feature.
    // Your real analytics controller logic goes here.
    res.json({ success: true, message: 'Analytics data here.', plan: req.effectivePlan });
  }
);

// ── Custom branding (Premium only) ────────────────────────────────────────────

router.put(
  '/:restaurantId/branding',
  protect,
  loadSubscription,
  requireFeature('customBranding'),
  async (req, res) => {
    // Update logo, theme colors, etc.
    res.json({ success: true, message: 'Branding updated.' });
  }
);

// ── Multi-restaurant (Premium only) ───────────────────────────────────────────

router.get(
  '/multi',
  protect,
  loadSubscription,
  requireFeature('multiRestaurant'),
  async (req, res) => {
    res.json({ success: true, message: 'Multi-restaurant data here.' });
  }
);

module.exports = router;
