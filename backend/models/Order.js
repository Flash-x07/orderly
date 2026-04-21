/**
 * Order Model
 * Tracks customer orders with full lifecycle management
 */

const mongoose = require('mongoose');

const orderItemSchema = new mongoose.Schema({
  menuItem: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'MenuItem',
    required: true,
  },
  name: { type: String, required: true }, // Snapshot name at time of order
  price: { type: Number, required: true }, // Snapshot price at time of order
  quantity: {
    type: Number,
    required: true,
    min: [1, 'Quantity must be at least 1'],
    max: [20, 'Quantity cannot exceed 20'],
  },
  notes: { type: String, maxlength: 200 }, // Special requests per item
});

const orderSchema = new mongoose.Schema(
  {
    restaurant: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Restaurant',
      required: true,
      index: true,
    },
    orderNumber: {
      type: String,
      unique: true,
    },
    tableNumber: {
      type: String,
      required: [true, 'Table number is required'],
    },
    items: {
      type: [orderItemSchema],
      validate: {
        validator: (v) => v.length > 0,
        message: 'Order must have at least one item',
      },
    },
    // Order totals
    subtotal: { type: Number, required: true },
    tax: { type: Number, default: 0 },
    total: { type: Number, required: true },

    // Customer info (optional)
    customerName: { type: String, maxlength: 100 },
    customerNote: { type: String, maxlength: 500 },

    // Order lifecycle
    status: {
      type: String,
      enum: ['pending', 'accepted', 'preparing', 'ready', 'completed', 'rejected'],
      default: 'pending',
      index: true,
    },

    // Timestamps for each status change
    statusHistory: [
      {
        status: String,
        changedAt: { type: Date, default: Date.now },
        note: String,
      },
    ],

    estimatedReadyAt: Date,
    completedAt: Date,
  },
  { timestamps: true }
);

// Auto-generate human-readable order number
orderSchema.pre('save', async function (next) {
  if (!this.orderNumber) {
    const count = await mongoose.model('Order').countDocuments({
      restaurant: this.restaurant,
    });
    const pad = String(count + 1).padStart(4, '0');
    const prefix = new Date().toISOString().slice(2, 10).replace(/-/g, '');
    this.orderNumber = `TF-${prefix}-${pad}`;
  }
  next();
});

// Index for dashboard queries
orderSchema.index({ restaurant: 1, status: 1, createdAt: -1 });

module.exports = mongoose.model('Order', orderSchema);
