/**
 * middleware/loadSubscription.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Runs after protect().
 *
 * Responsibilities:
 *   1. Auto-expire subscriptions whose subscriptionExpiresAt has passed.
 *   2. Resolve the effective plan for users whose status is 'none'/'expired'
 *      → they fall back to the Free plan.
 *   3. Attach `req.planConfig` (the full plan definition from config/plans.js)
 *      so every downstream middleware / controller can read limits / features
 *      without re-querying anything.
 *
 * Result after this middleware:
 *   req.user           — the Mongoose user (already attached by protect())
 *   req.planConfig     — the resolved plan config object from PLANS
 *   req.effectivePlan  — the string id of the resolved plan ('free'/'pro'/'premium')
 * ─────────────────────────────────────────────────────────────────────────────
 */

const User                    = require('../models/User');
const { getPlanConfig, PLANS } = require('../config/plans');

const loadSubscription = async (req, res, next) => {
  try {
    if (!req.user) return next();

    const user = req.user;

    // ── 1. Auto-expire if subscriptionExpiresAt has passed ──────────────────
    if (
      user.subscriptionStatus === 'active' &&
      user.subscriptionExpiresAt &&
      new Date(user.subscriptionExpiresAt) < new Date()
    ) {
      await User.findByIdAndUpdate(user._id, {
        subscriptionStatus: 'expired',
        subscriptionPlan:   'free',
        plan:               'free',
        subscriptionExpiresAt: user.subscriptionExpiresAt, // keep for audit
      });

      // Mutate the in-request object so the rest of this request sees it too
      user.subscriptionStatus = 'expired';
      user.subscriptionPlan   = 'free';
      user.plan               = 'free';
    }

    // ── 2. Resolve effective plan ────────────────────────────────────────────
    // Admins bypass plan restrictions entirely; give them a synthetic config.
    if (user.role === 'admin') {
      req.effectivePlan = 'premium';
      req.planConfig    = PLANS.premium;
      return next();
    }

    // Active subscription → use their actual plan (including 'trial')
    // Any other status (expired, pending, cancelled, none) → Free
    const isActive    = user.subscriptionStatus === 'active';
    const rawPlan     = user.subscriptionPlan || 'free';
    // Only trust the plan when the subscription is active; otherwise fall back
    const resolvedPlan = isActive ? rawPlan : 'free';

    req.effectivePlan = resolvedPlan;
    req.planConfig    = getPlanConfig(resolvedPlan);

    next();
  } catch (err) {
    next(err);
  }
};

module.exports = loadSubscription;