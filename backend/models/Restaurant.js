/**
 * Restaurant Model
 * Core entity for the SaaS platform
 */

const mongoose = require('mongoose');

const restaurantSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Restaurant name is required'],
      trim: true,
      maxlength: [150, 'Name cannot exceed 150 characters'],
    },
    slug: {
      type: String,
      unique: true,
      lowercase: true,
      trim: true,
    },
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    description: {
      type: String,
      maxlength: [500, 'Description cannot exceed 500 characters'],
    },
    logo: String, // URL or base64
    coverImage: String,
    cuisine: {
      type: String,
      default: 'International',
    },
    address: {
      street: String,
      city: String,
      country: String,
    },
    phone: String,
    currency: {
      type: String,
      default: 'USD',
    },
    // Theme customization
    theme: {
      primaryColor: { type: String, default: '#FF6B35' },
      accentColor: { type: String, default: '#2D3250' },
    },
    tableCount: {
      type: Number,
      default: 10,
      min: 1,
      max: 200,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    // Settings
    settings: {
      allowScheduledOrders: { type: Boolean, default: false },
      requireTableNumber: { type: Boolean, default: true },
      orderConfirmationMessage: {
        type: String,
        default: 'Your order has been received! We will prepare it shortly.',
      },
      estimatedPrepTime: { type: Number, default: 20 }, // minutes
    },
  },
  { timestamps: true }
);

// Auto-generate slug from name
restaurantSchema.pre('save', function (next) {
  if (this.isModified('name') && !this.slug) {
    this.slug = this.name
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
  }
  next();
});

module.exports = mongoose.model('Restaurant', restaurantSchema);
