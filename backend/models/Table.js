/**
 * Table Model
 * Each table has a unique QR code linking customers to the menu
 */

const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

const tableSchema = new mongoose.Schema(
  {
    restaurant: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Restaurant',
      required: true,
      index: true,
    },
    number: {
      type: String,
      required: true,
    },
    label: {
      type: String, // e.g. "Window Table", "Patio 3"
    },
    // Unique token embedded in QR code URL
    qrToken: {
      type: String,
      unique: true,
      default: () => uuidv4(),
    },
    qrCodeImage: String, // base64 PNG of QR code
    isActive: {
      type: Boolean,
      default: true,
    },
    capacity: {
      type: Number,
      default: 4,
    },
  },
  { timestamps: true }
);

tableSchema.index({ restaurant: 1, number: 1 }, { unique: true });

module.exports = mongoose.model('Table', tableSchema);
