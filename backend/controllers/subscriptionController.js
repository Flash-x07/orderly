/**
 * controllers/subscriptionController.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Handles all subscription CRUD: user requests, admin approval/rejection,
 * instant upgrade, status query, and cancellation.
 *
 * No plan limits or feature flags live here — those are in config/plans.js
 * and enforced by middleware. This controller only deals with state changes.
 * ─────────────────────────────────────────────────────────────────────────────
 */

const { validationResult } = require('express-validator');
const User                 = require('../models/User');
const SubscriptionRequest  = require('../models/SubscriptionRequest');
const { getIO }            = require('../socket/socketManager');
const {
  sendSubscriptionRequestEmail,
  sendSubscriptionApprovedEmail,
  sendSubscriptionRejectedEmail,
} = require('../config/emailService');
const {
  buildActivateUpdate,
  buildCancelUpdate,
  buildExpireUpdate,
  formatSubscriptionStatus,
} = require('../utils/subscriptionHelpers');
const { UPGRADEABLE_PLANS, isUpgrade } = require('../config/plans');

// ─── User: Request a plan upgrade ─────────────────────────────────────────────

const requestSubscription = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { plan, billingCycle } = req.body;

    // Block if already on an active paid subscription
    if (
      req.user.subscriptionStatus === 'active' &&
      UPGRADEABLE_PLANS.includes(req.user.subscriptionPlan)
    ) {
      return res.status(400).json({
        success: false,
        code:    'ALREADY_SUBSCRIBED',
        message: 'You already have an active subscription.',
      });
    }

    // Block duplicate pending requests
    const existing = await SubscriptionRequest.findOne({
      user:   req.user._id,
      status: 'pending',
    });
    if (existing) {
      return res.status(400).json({
        success:   false,
        code:      'REQUEST_ALREADY_PENDING',
        message:   'You already have a pending subscription request. Please wait for admin review.',
        requestId: existing._id,
      });
    }

    const request = await SubscriptionRequest.create({
      user:         req.user._id,
      plan,
      billingCycle,
      status:       'pending',
    });

    await User.findByIdAndUpdate(req.user._id, {
      subscriptionStatus: 'pending',
      subscriptionPlan:   plan,
      plan,
    });

    // Real-time: notify admin room
    _emitSafe(() =>
      getIO().to('admin_room').emit('subscription_request', {
        requestId:   request._id,
        userId:      req.user._id,
        userName:    req.user.name,
        userEmail:   req.user.email,
        plan,
        billingCycle,
        createdAt:   request.createdAt,
        message:     `${req.user.name} requested ${plan} (${billingCycle})`,
      })
    );

    // Email: notify admin
    _emailSafe(async () => {
      const adminEmail = process.env.ADMIN_EMAIL;
      if (adminEmail) {
        await sendSubscriptionRequestEmail(adminEmail, {
          userName:    req.user.name,
          userEmail:   req.user.email,
          plan,
          billingCycle,
        });
      }
    });

    return res.status(201).json({
      success:            true,
      message:            'Subscription request submitted. You will be notified once the admin reviews it.',
      requestId:          request._id,
      subscriptionStatus: 'pending',
      subscriptionPlan:   plan,
    });
  } catch (err) {
    console.error('[Subscription] requestSubscription error:', err);
    return res.status(500).json({ success: false, message: 'Failed to submit subscription request.' });
  }
};

// ─── User: Instant upgrade (self-serve) ───────────────────────────────────────
// POST /api/subscription/upgrade
// Immediately activates the plan — no admin approval required.
// (Keep requestSubscription for approval-flow. Use this for payment-verified flow.)

const upgradeSubscription = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { plan, billingCycle } = req.body;

    // Prevent downgrade via this endpoint — but trial users CAN upgrade to pro/premium
    const isTrial = req.user.subscriptionPlan === 'trial';
    if (
      !isTrial &&
      !isUpgrade(req.user.subscriptionPlan, plan) &&
      req.user.subscriptionStatus === 'active'
    ) {
      return res.status(400).json({
        success: false,
        code:    'INVALID_UPGRADE',
        message: `Cannot downgrade from ${req.user.subscriptionPlan} to ${plan} via this endpoint.`,
      });
    }

    const update = buildActivateUpdate(plan, billingCycle);
    const updated = await User.findByIdAndUpdate(req.user._id, update, { new: true }).select(
      'subscriptionPlan subscriptionStatus subscriptionExpiresAt billingCycle'
    );

    // Cancel any pending requests — they are no longer needed
    await SubscriptionRequest.updateMany(
      { user: req.user._id, status: 'pending' },
      { status: 'approved', reviewedAt: new Date(), reviewedBy: req.user._id }
    );

    return res.json({
      success:  true,
      message:  `Successfully upgraded to ${plan}.`,
      subscription: {
        plan:      updated.subscriptionPlan,
        status:    updated.subscriptionStatus,
        expiresAt: updated.subscriptionExpiresAt,
        billing:   updated.billingCycle,
      },
    });
  } catch (err) {
    console.error('[Subscription] upgradeSubscription error:', err);
    return res.status(500).json({ success: false, message: 'Failed to upgrade subscription.' });
  }
};

// ─── User: Status ──────────────────────────────────────────────────────────────

const getSubscriptionStatus = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select(
      'subscriptionPlan subscriptionStatus subscriptionExpiresAt billingCycle trialUsed trialCodeUsed'
    );
    if (!user) return res.status(404).json({ success: false, message: 'User not found.' });

    const pendingRequest = await SubscriptionRequest.findOne({
      user:   req.user._id,
      status: 'pending',
    }).select('plan billingCycle createdAt');

    // Spread directly — frontend reads data.subscriptionPlan, data.subscriptionStatus, etc.
    return res.json({
      success: true,
      ...formatSubscriptionStatus(user, pendingRequest),
    });
  } catch (err) {
    console.error('[Subscription] getSubscriptionStatus error:', err);
    return res.status(500).json({ success: false, message: 'Failed to fetch subscription status.' });
  }
};

// ─── User: Cancel ──────────────────────────────────────────────────────────────

const cancelSubscription = async (req, res) => {
  try {
    const targetId = req.user.role === 'admin' && req.body.userId
      ? req.body.userId
      : req.user._id;

    await User.findByIdAndUpdate(targetId, buildCancelUpdate());

    await SubscriptionRequest.updateMany(
      { user: targetId, status: 'pending' },
      { status: 'rejected', rejectionReason: 'Cancelled by user' }
    );

    return res.json({ success: true, message: 'Subscription cancelled. You are now on the Free plan.' });
  } catch (err) {
    console.error('[Subscription] cancelSubscription error:', err);
    return res.status(500).json({ success: false, message: 'Failed to cancel subscription.' });
  }
};

// ─── Admin: List requests ──────────────────────────────────────────────────────

const listSubscriptionRequests = async (req, res) => {
  try {
    const { status = 'pending', page = 1, limit = 20 } = req.query;
    const query = status === 'all' ? {} : { status };

    const [requests, total] = await Promise.all([
      SubscriptionRequest.find(query)
        .populate('user',       'name email subscriptionPlan subscriptionStatus')
        .populate('reviewedBy', 'name')
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(Number(limit)),
      SubscriptionRequest.countDocuments(query),
    ]);

    return res.json({ success: true, requests, total });
  } catch (err) {
    console.error('[Subscription] listSubscriptionRequests error:', err);
    return res.status(500).json({ success: false, message: 'Failed to fetch subscription requests.' });
  }
};

// ─── Admin: Approve ────────────────────────────────────────────────────────────

const approveSubscription = async (req, res) => {
  try {
    const request = await SubscriptionRequest.findById(req.params.id).populate('user');
    if (!request) return res.status(404).json({ success: false, message: 'Request not found.' });
    if (request.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: `Request is already ${request.status}.`,
      });
    }

    const update = buildActivateUpdate(request.plan, request.billingCycle);
    await User.findByIdAndUpdate(request.user._id, update);

    request.status     = 'approved';
    request.reviewedBy = req.user._id;
    request.reviewedAt = new Date();
    await request.save();

    const { subscriptionExpiresAt } = update;

    _emitSafe(() =>
      getIO().to(`user:${request.user._id}`).emit('subscription_approved', {
        plan:                  request.plan,
        billingCycle:          request.billingCycle,
        subscriptionExpiresAt,
        message:               `Your ${request.plan} subscription has been approved!`,
      })
    );

    _emailSafe(() =>
      sendSubscriptionApprovedEmail(request.user.email, {
        userName:     request.user.name,
        plan:         request.plan,
        billingCycle: request.billingCycle,
        expiresAt:    subscriptionExpiresAt,
      })
    );

    return res.json({
      success: true,
      message: `Subscription approved for ${request.user.name}.`,
      request,
    });
  } catch (err) {
    console.error('[Subscription] approveSubscription error:', err);
    return res.status(500).json({ success: false, message: 'Failed to approve subscription.' });
  }
};

// ─── Admin: Reject ─────────────────────────────────────────────────────────────

const rejectSubscription = async (req, res) => {
  try {
    const { reason } = req.body;

    const request = await SubscriptionRequest.findById(req.params.id).populate('user');
    if (!request) return res.status(404).json({ success: false, message: 'Request not found.' });
    if (request.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: `Request is already ${request.status}.`,
      });
    }

    await User.findByIdAndUpdate(request.user._id, buildExpireUpdate());

    request.status          = 'rejected';
    request.reviewedBy      = req.user._id;
    request.reviewedAt      = new Date();
    request.rejectionReason = reason || '';
    await request.save();

    _emitSafe(() =>
      getIO().to(`user:${request.user._id}`).emit('subscription_rejected', {
        plan:    request.plan,
        reason:  reason || '',
        message: `Your ${request.plan} subscription request was not approved.`,
      })
    );

    _emailSafe(() =>
      sendSubscriptionRejectedEmail(request.user.email, {
        userName: request.user.name,
        plan:     request.plan,
        reason:   reason || '',
      })
    );

    return res.json({
      success: true,
      message: `Subscription request rejected for ${request.user.name}.`,
      request,
    });
  } catch (err) {
    console.error('[Subscription] rejectSubscription error:', err);
    return res.status(500).json({ success: false, message: 'Failed to reject subscription.' });
  }
};

// ─── Internal helpers ──────────────────────────────────────────────────────────

/** Fire-and-forget socket emit — never lets a socket error bubble up. */
const _emitSafe = (fn) => { try { fn(); } catch (_) {} };

/** Fire-and-forget async email — never lets an email error bubble up. */
const _emailSafe = (fn) => { fn().catch(() => {}); };

// ─── Exports ───────────────────────────────────────────────────────────────────

module.exports = {
  requestSubscription,
  upgradeSubscription,
  getSubscriptionStatus,
  cancelSubscription,
  listSubscriptionRequests,
  approveSubscription,
  rejectSubscription,
};