/**
 * Promo Code Routes
 * POST   /api/promo/redeem            — redeem a trial code (auth required)
 * POST   /api/promo/admin/create      — create a code (admin only)
 * GET    /api/promo/admin/list        — list all codes (admin only)
 * PATCH  /api/promo/admin/:id/toggle  — toggle active flag (admin only)
 *
 * CHANGES:
 * - Removed `code` and `expiresAt` from create validation (auto-handled by model).
 * - Added `startsAt` validation (ISO8601 date, defaults to now if omitted).
 */

const express                  = require('express');
const { body }                 = require('express-validator');
const { protect, restrictTo }  = require('../middleware/auth');
const {
  redeemPromoCode,
  createPromoCode,
  listPromoCodes,
  togglePromoCode,
} = require('../controllers/promoController');

const router = express.Router();

// ─── User: redeem ───────────────────────────────────────────────────────────────
router.post(
  '/redeem',
  protect,
  [
    body('code')
      .trim()
      .notEmpty().withMessage('Promo code is required.')
      .isLength({ min: 4, max: 32 }).withMessage('Invalid code length.'),
  ],
  redeemPromoCode
);

// ─── Admin: create ──────────────────────────────────────────────────────────────
router.post(
  '/admin/create',
  protect,
  restrictTo('admin'),
  [
    body('plan')
      .isIn(['pro', 'premium']).withMessage('Plan must be "pro" or "premium".'),

    body('durationDays')
      .isInt({ min: 1, max: 365 }).withMessage('durationDays must be between 1 and 365.'),

    body('maxUses')
      .optional()
      .isInt({ min: 1 }).withMessage('maxUses must be at least 1.'),

    body('startsAt')
      .optional()
      .isISO8601().withMessage('startsAt must be a valid date (ISO 8601).'),
  ],
  createPromoCode
);

// ─── Admin: list / toggle ───────────────────────────────────────────────────────
router.get  ('/admin/list',          protect, restrictTo('admin'), listPromoCodes);
router.patch('/admin/:id/toggle',    protect, restrictTo('admin'), togglePromoCode);

module.exports = router;