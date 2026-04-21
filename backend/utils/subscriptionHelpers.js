/**
 * utils/subscriptionHelpers.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Pure helper functions for subscription logic.
 * No Express req/res here — only reusable, testable utilities.
 *
 * Controllers and middleware import from here to stay thin.
 * ─────────────────────────────────────────────────────────────────────────────
 */

const { BILLING_CYCLE_DAYS, PLAN_HIERARCHY } = require('../config/plans');

// ─── Date Helpers ──────────────────────────────────────────────────────────────

/**
 * Returns a new Date `days` days from now.
 * @param {number} days
 * @returns {Date}
 */
const addDays = (days) => {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d;
};

/**
 * Returns the number of whole days remaining until `expiresAt`.
 * Returns 0 if already expired or no date is provided.
 * @param {Date|string|null} expiresAt
 * @returns {number}
 */
const getDaysRemaining = (expiresAt) => {
  if (!expiresAt) return 0;
  const ms = new Date(expiresAt) - Date.now();
  return ms > 0 ? Math.ceil(ms / (1000 * 60 * 60 * 24)) : 0;
};

/**
 * Returns true if the given expiry date is in the past.
 * @param {Date|string|null} expiresAt
 * @returns {boolean}
 */
const isExpired = (expiresAt) => {
  if (!expiresAt) return false;
  return new Date(expiresAt) < new Date();
};

// ─── Plan Validators ───────────────────────────────────────────────────────────

/**
 * Returns the duration in days for a billing cycle string.
 * @param {'weekly'|'monthly'} cycle
 * @returns {number}
 */
const getDurationDays = (cycle) => BILLING_CYCLE_DAYS[cycle] ?? 0;

/**
 * Returns true if targetPlan is strictly higher than currentPlan.
 * @param {string} currentPlan
 * @param {string} targetPlan
 * @returns {boolean}
 */
const isUpgrade = (currentPlan, targetPlan) =>
  (PLAN_HIERARCHY[targetPlan] ?? 0) > (PLAN_HIERARCHY[currentPlan] ?? 0);

// ─── Mongoose Update Payload Builders ─────────────────────────────────────────
// Use these in controllers to keep DB update logic in one place.

/**
 * Builds the update payload to activate a paid subscription.
 * @param {'pro'|'premium'} plan
 * @param {'weekly'|'monthly'} billingCycle
 * @returns {object}
 */
const buildActivateUpdate = (plan, billingCycle) => {
  const days      = getDurationDays(billingCycle);
  const expiresAt = addDays(days);

  return {
    subscriptionPlan:      plan,
    subscriptionStatus:    'active',
    subscriptionExpiresAt: expiresAt,
    billingCycle,
    // Legacy fields kept in sync
    plan,
    planExpiresAt: expiresAt,
  };
};

/**
 * Builds the update payload to cancel a subscription (sets to free).
 * @returns {object}
 */
const buildCancelUpdate = () => ({
  subscriptionStatus:    'cancelled',
  subscriptionPlan:      'free',
  billingCycle:          null,
  subscriptionExpiresAt: null,
  plan:                  'free',
  planExpiresAt:         null,
});

/**
 * Builds the update payload to expire a subscription (status = expired, plan = free).
 * @returns {object}
 */
const buildExpireUpdate = () => ({
  subscriptionStatus: 'expired',
  subscriptionPlan:   'free',
  plan:               'free',
});

/**
 * Builds the update payload to downgrade to free plan explicitly.
 * @returns {object}
 */
const buildDowngradeToFreeUpdate = () => ({
  subscriptionStatus:    'active',
  subscriptionPlan:      'free',
  subscriptionExpiresAt: null,
  billingCycle:          null,
  plan:                  'free',
  planExpiresAt:         null,
});

// ─── Response Formatters ───────────────────────────────────────────────────────

/**
 * Serialises a user document into a clean subscription status response body.
 * @param {object} user - Mongoose user document
 * @param {object|null} pendingRequest - Pending SubscriptionRequest doc or null
 * @returns {object}
 */
const formatSubscriptionStatus = (user, pendingRequest = null) => ({
  subscriptionPlan:      user.subscriptionPlan,
  subscriptionStatus:    user.subscriptionStatus,
  subscriptionExpiresAt: user.subscriptionExpiresAt,
  billingCycle:          user.billingCycle,
  trialUsed:             user.trialUsed,
  daysRemaining:         getDaysRemaining(user.subscriptionExpiresAt),
  isActive:              user.subscriptionStatus === 'active',
  pendingRequest:        pendingRequest || null,
});

module.exports = {
  // Date helpers
  addDays,
  getDaysRemaining,
  isExpired,

  // Plan validators
  getDurationDays,
  isUpgrade,

  // Update builders
  buildActivateUpdate,
  buildCancelUpdate,
  buildExpireUpdate,
  buildDowngradeToFreeUpdate,

  // Response formatters
  formatSubscriptionStatus,
};