/**
 * PromoCode Model
 * Manages trial activation codes for the subscription system.
 *
 * CHANGES:
 * - code        → auto-generated (nanoid-style, 10 uppercase chars). No longer user-supplied.
 * - expiresAt   → removed as an input field. Computed as startsAt + durationDays.
 * - startsAt    → new field. Code is not redeemable before this date.
 * - isValid     → virtual now checks all three conditions: active window, maxUses, isActive flag.
 * - status      → computed virtual: 'scheduled' | 'active' | 'expired' | 'exhausted' | 'disabled'
 */

const mongoose = require('mongoose');
const crypto   = require('crypto');

/** Generate a unique, human-friendly 10-char uppercase code (no ambiguous chars). */
const generateCode = () => {
  const CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no 0/O/I/1
  let code = '';
  const bytes = crypto.randomBytes(10);
  for (const byte of bytes) {
    code += CHARS[byte % CHARS.length];
  }
  return code;
};

const promoCodeSchema = new mongoose.Schema(
  {
    code: {
      type:      String,
      unique:    true,
      uppercase: true,
      trim:      true,
      // Generated automatically in pre-validate hook — never supplied by client.
    },

    plan: {
      type:     String,
      enum:     ['pro', 'premium'],
      required: [true, 'Plan is required'],
    },

    durationDays: {
      type:     Number,
      required: [true, 'Duration in days is required'],
      min:      [1,   'Duration must be at least 1 day'],
      max:      [365, 'Duration cannot exceed 365 days'],
    },

    /** Code becomes redeemable from this date onward. */
    startsAt: {
      type:     Date,
      required: [true, 'Start date is required'],
    },

    /**
     * Computed and stored on create/update.
     * expiresAt = startsAt + durationDays
     * Never accepted from the client directly.
     */
    expiresAt: {
      type: Date,
    },

    maxUses: {
      type:     Number,
      required: true,
      min:      [1, 'maxUses must be at least 1'],
      default:  100,
    },

    usedCount: {
      type:    Number,
      default: 0,
      min:     0,
    },

    /** Manual kill-switch. Overrides everything when false. */
    isActive: {
      type:    Boolean,
      default: true,
    },

    description: {
      type:     String,
      trim:     true,
      maxlength: 200,
    },
  },
  { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } }
);

// ── Hooks ──────────────────────────────────────────────────────────────────────

/** Auto-generate code if not already set (new documents only). */
promoCodeSchema.pre('validate', function (next) {
  if (!this.code) {
    this.code = generateCode();
  }
  next();
});

/** Recompute expiresAt whenever startsAt or durationDays changes. */
promoCodeSchema.pre('save', function (next) {
  if (this.isModified('startsAt') || this.isModified('durationDays')) {
    const start = new Date(this.startsAt);
    start.setDate(start.getDate() + this.durationDays);
    this.expiresAt = start;
  }
  next();
});

// ── Virtuals ───────────────────────────────────────────────────────────────────

/**
 * Computed status string — use this in the UI instead of combining booleans.
 *   'scheduled'  → startsAt is in the future
 *   'active'     → within window, uses remaining, isActive = true
 *   'expired'    → past expiresAt
 *   'exhausted'  → maxUses reached
 *   'disabled'   → manually toggled off
 */
promoCodeSchema.virtual('status').get(function () {
  const now = new Date();
  if (!this.isActive)                       return 'disabled';
  if (now < new Date(this.startsAt))        return 'scheduled';
  if (now > new Date(this.expiresAt))       return 'expired';
  if (this.usedCount >= this.maxUses)       return 'exhausted';
  return 'active';
});

/** True only when the code can actually be redeemed right now. */
promoCodeSchema.virtual('isValid').get(function () {
  return this.status === 'active';
});

// ── Indexes ────────────────────────────────────────────────────────────────────

promoCodeSchema.index({ code: 1 });
promoCodeSchema.index({ startsAt: 1, expiresAt: 1 });

module.exports = mongoose.model('PromoCode', promoCodeSchema);