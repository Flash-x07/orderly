/**
 * Subscription Utilities
 * ─────────────────────────────────────────────────────────────────
 * Pure helper functions shared across subscription routes,
 * controllers, and middleware.  No Express req/res here — only
 * reusable logic so controllers stay thin.
 * ─────────────────────────────────────────────────────────────────
 */

// ─── Constants ──────────────────────────────────────────────────────────────────

const VALID_PLANS   = ['pro', 'premium'];
const VALID_CYCLES  = ['weekly', 'monthly'];

const PLAN_HIERARCHY = {
  none:    0,
  trial:   1,
  pro:     2,
  premium: 3,
};

const CYCLE_DURATION_DAYS = {
  weekly:  7,
  monthly: 30,
};

// ─── Date Helpers ────────────────────────────────────────────────────────────────

/**
 * Returns a new Date that is `days` days from now.
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
 * Returns 0 if already expired or no date provided.
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

// ─── Plan / Cycle Validators ─────────────────────────────────────────────────────

/**
 * Returns true if `plan` is a valid paid plan (pro or premium).
 * @param {string} plan
 * @returns {boolean}
 */
const isValidPlan = (plan) => VALID_PLANS.includes(plan);

/**
 * Returns true if `cycle` is a valid billing cycle.
 * @param {string} cycle
 * @returns {boolean}
 */
const isValidBillingCycle = (cycle) => VALID_CYCLES.includes(cycle);

/**
 * Returns the duration in days for a given billing cycle.
 * @param {'weekly'|'monthly'} cycle
 * @returns {number}
 */
const getDurationDays = (cycle) => CYCLE_DURATION_DAYS[cycle] ?? 0;

/**
 * Returns true if `targetPlan` is a higher-tier plan than `currentPlan`.
 * Useful for preventing accidental downgrades.
 * @param {string} currentPlan
 * @param {string} targetPlan
 * @returns {boolean}
 */
const isUpgrade = (currentPlan, targetPlan) => {
  return (PLAN_HIERARCHY[targetPlan] ?? 0) > (PLAN_HIERARCHY[currentPlan] ?? 0);
};

// ─── Subscription Object Builder ──────────────────────────────────────────────────

/**
 * Builds the Mongoose update payload for activating a subscription.
 * @param {'pro'|'premium'} plan
 * @param {'weekly'|'monthly'} billingCycle
 * @returns {{ subscriptionPlan, subscriptionStatus, subscriptionExpiresAt, billingCycle, plan, planExpiresAt }}
 */
const buildSubscriptionUpdate = (plan, billingCycle) => {
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
 * Builds the Mongoose update payload for cancelling a subscription.
 * @returns {object}
 */
const buildCancelUpdate = () => ({
  subscriptionStatus:    'cancelled',
  subscriptionPlan:      'none',
  billingCycle:          null,
  plan:                  'none',
});

/**
 * Builds the Mongoose update payload for expiring a subscription.
 * @returns {object}
 */
const buildExpireUpdate = () => ({
  subscriptionStatus: 'expired',
  subscriptionPlan:   'none',
  plan:               'none',
});

// ─── Response Formatters ─────────────────────────────────────────────────────────

/**
 * Formats a user document into a clean subscription status response body.
 * @param {import('../models/User').UserDocument} user
 * @returns {object}
 */
const formatSubscriptionStatus = (user) => ({
  subscriptionPlan:      user.subscriptionPlan,
  subscriptionStatus:    user.subscriptionStatus,
  subscriptionExpiresAt: user.subscriptionExpiresAt,
  billingCycle:          user.billingCycle,
  trialUsed:             user.trialUsed,
  daysRemaining:         getDaysRemaining(user.subscriptionExpiresAt),
  isActive:              user.subscriptionStatus === 'active',
});

// ─── Subscription Guard Helpers ───────────────────────────────────────────────────

/**
 * Returns true if the user currently has an active subscription.
 * Admins are always considered active.
 * @param {{ role: string, subscriptionStatus: string }} user
 * @returns {boolean}
 */
const hasActiveSubscription = (user) => {
  if (user?.role === 'admin') return true;
  return user?.subscriptionStatus === 'active';
};

/**
 * Returns a standardised 403 error body for subscription-gated routes.
 * @param {{ subscriptionStatus: string, subscriptionPlan: string }} user
 * @returns {{ error: string, message: string, subscriptionStatus: string, subscriptionPlan: string }}
 */
const buildSubscriptionRequiredError = (user) => ({
  error:              'subscription_required',
  message:
    user?.subscriptionStatus === 'expired'
      ? 'Your subscription has expired. Please upgrade to continue.'
      : 'An active subscription is required to access this feature.',
  subscriptionStatus: user?.subscriptionStatus || 'expired',
  subscriptionPlan:   user?.subscriptionPlan   || 'none',
});

// ─── Exports ─────────────────────────────────────────────────────────────────────

module.exports = {
  // Constants
  VALID_PLANS,
  VALID_CYCLES,
  PLAN_HIERARCHY,
  CYCLE_DURATION_DAYS,

  // Date helpers
  addDays,
  getDaysRemaining,
  isExpired,

  // Validators
  isValidPlan,
  isValidBillingCycle,
  getDurationDays,
  isUpgrade,

  // Update payload builders
  buildSubscriptionUpdate,
  buildCancelUpdate,
  buildExpireUpdate,

  // Response helpers
  formatSubscriptionStatus,
  hasActiveSubscription,
  buildSubscriptionRequiredError,
};