/**
 * routes/subscription.js
 * ─────────────────────────────────────────────────────────────────────────────
 * User:
 *   POST  /api/subscription/request   — submit an approval-flow plan request
 *   POST  /api/subscription/upgrade   — instant self-serve plan upgrade
 *   GET   /api/subscription/status    — current subscription info
 *   POST  /api/subscription/cancel    — cancel active subscription
 *
 * Admin:
 *   GET   /api/subscription/admin/requests
 *   PATCH /api/subscription/admin/requests/:id/approve
 *   PATCH /api/subscription/admin/requests/:id/reject
 * ─────────────────────────────────────────────────────────────────────────────
 */

const express                 = require('express');
const { body }                = require('express-validator');
const { protect, restrictTo } = require('../middleware/auth');
const loadSubscription        = require('../middleware/loadSubscription');
const {
  requestSubscription,
  upgradeSubscription,
  getSubscriptionStatus,
  cancelSubscription,
  listSubscriptionRequests,
  approveSubscription,
  rejectSubscription,
} = require('../controllers/subscriptionController');

const router = express.Router();

// ── Shared validators ──────────────────────────────────────────────────────────

const planValidation = [
  body('plan')
    .isIn(['pro', 'premium'])
    .withMessage('Plan must be "pro" or "premium".'),
  body('billingCycle')
    .isIn(['weekly', 'monthly'])
    .withMessage('billingCycle must be "weekly" or "monthly".'),
];

// ── User routes ────────────────────────────────────────────────────────────────

// Approval-flow request (admin must approve before subscription is activated)
router.post('/request',  protect, loadSubscription, planValidation, requestSubscription);

// Instant upgrade (use after payment is verified externally)
router.post('/upgrade',  protect, loadSubscription, planValidation, upgradeSubscription);

router.get ('/status',   protect, loadSubscription, getSubscriptionStatus);
router.post('/cancel',   protect, cancelSubscription);

// ── Admin routes ───────────────────────────────────────────────────────────────

router.get(
  '/admin/requests',
  protect, restrictTo('admin'),
  listSubscriptionRequests
);

router.patch(
  '/admin/requests/:id/approve',
  protect, restrictTo('admin'),
  approveSubscription
);

router.patch(
  '/admin/requests/:id/reject',
  protect, restrictTo('admin'),
  [body('reason').optional().isString().isLength({ max: 300 })],
  rejectSubscription
);

module.exports = router;