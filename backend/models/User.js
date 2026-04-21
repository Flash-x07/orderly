/**
 * User Model
 * Handles restaurant owners and admin accounts
 * Includes full subscription / trial management fields
 */

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
      maxlength: [100, 'Name cannot exceed 100 characters'],
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Invalid email format'],
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: [8, 'Password must be at least 8 characters'],
      select: false,
    },
    role: {
      type: String,
      enum: ['owner', 'admin'],
      default: 'owner',
    },
    restaurant: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Restaurant',
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    lastLogin: Date,
    avatar: {
      type: String,
      default: '',
    },

    // ── Email Verification ──────────────────────────────────────
    isVerified: {
      type: Boolean,
      default: false,
    },
    emailVerificationCodeHash: {
      type: String,
      select: false,
    },
    emailVerificationExpires: {
      type: Date,
      select: false,
    },

    // ── Password Reset (OTP) ────────────────────────────────────
    passwordResetCodeHash: {
      type: String,
      select: false,
    },
    passwordResetExpires: {
      type: Date,
      select: false,
    },

    // ── Subscription System ─────────────────────────────────────
    subscriptionPlan: {
      type: String,
      // ✅ 'free' added — new users start on free plan
      enum: ['none', 'free', 'trial', 'pro', 'premium'],
      default: 'free',
    },
    subscriptionStatus: {
      type: String,
      // ✅ new users start as 'active' on free plan (no expiry needed)
      enum: ['active', 'expired', 'cancelled', 'pending'],
      default: 'active',
    },
    subscriptionExpiresAt: {
      type: Date,
      default: null,  // null = no expiry (free plan never expires)
    },
    billingCycle: {
      type: String,
      enum: ['weekly', 'monthly', null],
      default: null,
    },
    trialUsed: {
      type: Boolean,
      default: false,
    },
    trialCodeUsed: {
      type: String,
      default: null,
    },

    // Legacy fields kept for backwards-compat
    plan: {
      type: String,
      default: 'free',
    },
    planExpiresAt: Date,
  },
  { timestamps: true }
);

// ── Virtuals ────────────────────────────────────────────────────────────────────

userSchema.virtual('subscriptionDaysRemaining').get(function () {
  if (!this.subscriptionExpiresAt) return null;
  const ms = new Date(this.subscriptionExpiresAt) - Date.now();
  return ms > 0 ? Math.ceil(ms / (1000 * 60 * 60 * 24)) : 0;
});

userSchema.virtual('hasActiveSubscription').get(function () {
  return this.subscriptionStatus === 'active';
});

// ── Hooks ───────────────────────────────────────────────────────────────────────

userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

// Keep legacy plan field in sync
userSchema.pre('save', function (next) {
  if (this.isModified('subscriptionPlan')) {
    this.plan = this.subscriptionPlan;
    this.planExpiresAt = this.subscriptionExpiresAt;
  }
  next();
});

// ── Methods ─────────────────────────────────────────────────────────────────────

userSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model('User', userSchema);