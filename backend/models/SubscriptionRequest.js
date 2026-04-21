/**
 * SubscriptionRequest Model
 * Created when a user clicks "Get Pro" or "Get Premium".
 * Admin approves or rejects — only then does the user get access.
 */

const mongoose = require('mongoose');

const subscriptionRequestSchema = new mongoose.Schema(
  {
    user: {
      type:     mongoose.Schema.Types.ObjectId,
      ref:      'User',
      required: true,
    },

    plan: {
      type:     String,
      enum:     ['pro', 'premium'],
      required: true,
    },

    billingCycle: {
      type: String,
      enum: ['weekly', 'monthly'],
      required: true,
    },

    status: {
      type:    String,
      enum:    ['pending', 'approved', 'rejected'],
      default: 'pending',
    },

    /** Set by admin when acting on the request */
    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref:  'User',
    },
    reviewedAt: Date,
    rejectionReason: {
      type:     String,
      maxlength: 300,
    },
  },
  { timestamps: true }
);

// One active pending request per user at a time
subscriptionRequestSchema.index({ user: 1, status: 1 });

module.exports = mongoose.model('SubscriptionRequest', subscriptionRequestSchema);
