/**
 * middleware/checkTableLimit.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Enforces per-plan table limits on the generate endpoint.
 *
 * Must be placed AFTER protect() and loadSubscription() in the chain.
 *
 * Plan limits (defined in config/plans.js):
 *   Free    → 3  tables  (tableLimit: 3)
 *   Trial   → 20 tables  (tableLimit: 20)
 *   Pro     → 20 tables  (tableLimit: 20)
 *   Premium → unlimited  (tableLimit: null)
 *
 * Checks the *requested* count (req.body.count) against the plan cap so we
 * can reject "I want 10 tables but you're on Free (max 3)" in one clear error
 * before any DB writes happen.
 *
 * Usage in routes:
 *   router.post(
 *     '/:restaurantId/generate',
 *     protect,
 *     loadSubscription,
 *     checkTableLimit,
 *     generateTables
 *   );
 * ─────────────────────────────────────────────────────────────────────────────
 */

const checkTableLimit = (req, res, next) => {
  // Admins are never limited (loadSubscription gives them premium config)
  if (req.user?.role === 'admin') return next();

  const planConfig = req.planConfig;

  if (!planConfig) {
    return res.status(500).json({
      success: false,
      code:    'MIDDLEWARE_MISCONFIGURED',
      message: 'loadSubscription must run before checkTableLimit.',
    });
  }

  // null = unlimited — let the request through
  if (planConfig.tableLimit === null) return next();

  // Parse the requested count from the body (default 1 so a missing body
  // still gets validated; the controller applies its own default of 10)
  const requested = Number(req.body?.count ?? 1);

  if (requested > planConfig.tableLimit) {
    return res.status(403).json({
      success:     false,
      code:        'TABLE_LIMIT_REACHED',
      message:     `Your ${planConfig.displayName} plan allows a maximum of ${planConfig.tableLimit} table${planConfig.tableLimit === 1 ? '' : 's'}. You requested ${requested}.`,
      currentPlan: req.effectivePlan,
      tableLimit:  planConfig.tableLimit,
      upgradeTo:   planConfig.upgradeTo,
    });
  }

  next();
};

module.exports = checkTableLimit;
