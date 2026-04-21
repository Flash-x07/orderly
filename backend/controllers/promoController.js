/**
 * Promo Code Controller
 *
 * CHANGES:
 * - createPromoCode  → no longer accepts `code` or `expiresAt` from the client.
 *   Accepts `startsAt` instead. Code is auto-generated; expiresAt is computed.
 * - redeemPromoCode  → validation now checks startsAt ('scheduled') in addition
 *   to expiry and usage, and uses the model's `status` virtual for clear errors.
 */

const { validationResult } = require('express-validator');
const PromoCode = require('../models/PromoCode');
const User      = require('../models/User');

// ─── Redeem ────────────────────────────────────────────────────────────────────

const redeemPromoCode = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const code = String(req.body.code || '').trim().toUpperCase();
    if (!code) {
      return res.status(400).json({ error: 'Promo code is required.' });
    }

    // ── 1. Find ─────────────────────────────────────────────────────────────
    const promo = await PromoCode.findOne({ code });
    if (!promo) {
      return res.status(404).json({ error: 'Invalid promo code.' });
    }

    // ── 2. Validate via status virtual ──────────────────────────────────────
    const STATUS_ERRORS = {
      disabled:   'This promo code has been deactivated.',
      scheduled:  `This promo code is not active yet. It starts on ${new Date(promo.startsAt).toLocaleDateString()}.`,
      expired:    'This promo code has expired.',
      exhausted:  'This promo code has reached its usage limit.',
    };

    if (promo.status !== 'active') {
      return res.status(400).json({ error: STATUS_ERRORS[promo.status] });
    }

    // ── 3. Check trial abuse ─────────────────────────────────────────────────
    if (req.user.trialUsed) {
      return res.status(400).json({
        error: 'You have already used a trial. Each account is limited to one trial.',
      });
    }

    // ── 4. Apply trial to user ───────────────────────────────────────────────
    const trialExpiresAt = new Date();
    trialExpiresAt.setDate(trialExpiresAt.getDate() + promo.durationDays);

    await User.findByIdAndUpdate(req.user._id, {
      subscriptionPlan:      'trial',
      subscriptionStatus:    'active',
      subscriptionExpiresAt: trialExpiresAt,
      billingCycle:          null,
      trialUsed:             true,
      trialCodeUsed:         promo.code,
      plan:                  'trial',
      planExpiresAt:         trialExpiresAt,
    });

    // ── 5. Increment usage ───────────────────────────────────────────────────
    await PromoCode.findByIdAndUpdate(promo._id, { $inc: { usedCount: 1 } });

    return res.status(200).json({
      message:               `Trial activated! You have ${promo.durationDays} days of ${promo.plan} access.`,
      subscriptionPlan:      'trial',
      subscriptionStatus:    'active',
      subscriptionExpiresAt: trialExpiresAt,
      durationDays:          promo.durationDays,
      plan:                  promo.plan,
    });
  } catch (err) {
    console.error('[PromoCode] redeemPromoCode error:', err);
    return res.status(500).json({ error: 'Something went wrong. Please try again.' });
  }
};

// ─── Admin: Create ─────────────────────────────────────────────────────────────

const createPromoCode = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    // `code` and `expiresAt` are NOT accepted — generated/computed by the model.
    const { plan, durationDays, maxUses, startsAt, description } = req.body;

    const promo = await PromoCode.create({
      plan,
      durationDays,
      maxUses:     maxUses || 100,
      startsAt:    startsAt ? new Date(startsAt) : new Date(),
      description: description || '',
    });

    return res.status(201).json({
      message: 'Promo code created.',
      promo,
    });
  } catch (err) {
    console.error('[PromoCode] createPromoCode error:', err);
    return res.status(500).json({ error: 'Failed to create promo code.' });
  }
};

// ─── Admin: List ───────────────────────────────────────────────────────────────

const listPromoCodes = async (req, res) => {
  try {
    const promos = await PromoCode.find().sort({ createdAt: -1 });
    return res.json({ promos });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to fetch promo codes.' });
  }
};

// ─── Admin: Toggle ─────────────────────────────────────────────────────────────

const togglePromoCode = async (req, res) => {
  try {
    const promo = await PromoCode.findById(req.params.id);
    if (!promo) return res.status(404).json({ error: 'Promo code not found.' });

    promo.isActive = !promo.isActive;
    await promo.save();

    return res.json({
      message: `Promo code ${promo.isActive ? 'activated' : 'deactivated'}.`,
      promo,
    });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to update promo code.' });
  }
};

module.exports = { redeemPromoCode, createPromoCode, listPromoCodes, togglePromoCode };