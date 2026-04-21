/**
 * MenuItem Model
 * Individual items on a restaurant's menu
 */

const mongoose = require('mongoose');

const menuItemSchema = new mongoose.Schema(
  {
    restaurant: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Restaurant',
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: [true, 'Item name is required'],
      trim: true,
      maxlength: [120, 'Name cannot exceed 120 characters'],
    },
    description: {
      type: String,
      maxlength: [400, 'Description cannot exceed 400 characters'],
    },
    price: {
      type: Number,
      required: [true, 'Price is required'],
      min: [0, 'Price cannot be negative'],
    },
    category: {
      type: String,
      required: [true, 'Category is required'],
      trim: true,
    },
    image: String, // URL
    isAvailable: {
      type: Boolean,
      default: true,
    },
    isFeatured: {
      type: Boolean,
      default: false,
    },
    // Dietary info
    tags: [String], // e.g. ['vegan', 'gluten-free', 'spicy', 'popular']
    preparationTime: {
      type: Number,
      default: 15, // minutes
    },
    sortOrder: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);

// Index for fast menu queries by restaurant + category
menuItemSchema.index({ restaurant: 1, category: 1, isAvailable: 1 });

module.exports = mongoose.model('MenuItem', menuItemSchema);
