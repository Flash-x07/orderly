/**
 * config/plans.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Single source of truth for all subscription plan definitions.
 *
 * ✅ Add a new plan here → it is automatically available everywhere.
 * ✅ Change a table limit here → enforced across the whole backend instantly.
 * ✅ No plan logic lives in controllers or routes.
 * ─────────────────────────────────────────────────────────────────────────────
 */

// ─── Plan Definitions ──────────────────────────────────────────────────────────

const PLANS = {
  free: {
    id: 'free',
    displayName: 'Free',
    tableLimit: 3,           // null = unlimited; enforced by checkTableLimit
    features: {
      orderManagement:       true,
      qrCodeGeneration:      true,   // Free can generate QR codes — capped at 3 tables
      realTimeNotifications: false,
      removeBranding:        false,
      analytics:             false,
      customBranding:        false,
      multiRestaurant:       false,
      prioritySupport:       false,
    },
    upgradeTo: 'pro',        // suggested next tier — used in error responses
  },

  // Trial = pro-level access for a limited time (activated via promo code)
  trial: {
    id: 'trial',
    displayName: 'Trial',
    tableLimit: 20,          // same cap as Pro
    features: {
      orderManagement:      true,
      qrCodeGeneration:     true,
      realTimeNotifications: true,
      removeBranding:       true,
      analytics:            false,
      customBranding:       false,
      multiRestaurant:      false,
      prioritySupport:      false,
    },
    upgradeTo: 'pro',
  },

  pro: {
    id: 'pro',
    displayName: 'Pro',
    tableLimit: 20,
    features: {
      orderManagement:      true,
      qrCodeGeneration:     true,
      realTimeNotifications: true,
      removeBranding:       true,
      analytics:            false,
      customBranding:       false,
      multiRestaurant:      false,
      prioritySupport:      false,
    },
    upgradeTo: 'premium',
  },

  premium: {
    id: 'premium',
    displayName: 'Premium',
    tableLimit: null,        // unlimited
    features: {
      orderManagement:      true,
      qrCodeGeneration:     true,
      realTimeNotifications: true,
      removeBranding:       true,
      analytics:            true,
      customBranding:       true,
      multiRestaurant:      true,
      prioritySupport:      true,
    },
    upgradeTo: null,         // already top tier
  },
};

// ─── Plan Hierarchy ────────────────────────────────────────────────────────────
// Used to compare / validate upgrades without hard-coding numbers elsewhere.

const PLAN_HIERARCHY = {
  none:    0,
  free:    1,
  trial:   2,   // trial maps to pro-level access (adjust if needed)
  pro:     3,
  premium: 4,
};

// ─── Valid paid plans that users can request ───────────────────────────────────

const UPGRADEABLE_PLANS = ['pro', 'premium'];

// ─── Billing cycle durations ───────────────────────────────────────────────────

const BILLING_CYCLE_DAYS = {
  weekly:  7,
  monthly: 30,
};

// ─── Helper: get plan config safely ───────────────────────────────────────────
// Returns the Free plan config when the plan is unknown/expired/none.

const getPlanConfig = (planId) => {
  return PLANS[planId] ?? PLANS.free;
};

// ─── Helper: is planB a higher tier than planA? ────────────────────────────────

const isUpgrade = (currentPlan, targetPlan) => {
  return (PLAN_HIERARCHY[targetPlan] ?? 0) > (PLAN_HIERARCHY[currentPlan] ?? 0);
};

module.exports = {
  PLANS,
  PLAN_HIERARCHY,
  UPGRADEABLE_PLANS,
  BILLING_CYCLE_DAYS,
  getPlanConfig,
  isUpgrade,
};