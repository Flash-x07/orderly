const express           = require('express');
const { protect }       = require('../middleware/auth');
const loadSubscription  = require('../middleware/loadSubscription');
const checkTableLimit   = require('../middleware/checkTableLimit');
const {
  getRestaurantTables,
  generateTables,
  verifyQRToken,
  getTableQR,
} = require('../controllers/tableController');

const router = express.Router();

// ── Public ─────────────────────────────────────────────────────────────────────

// Customers scan a QR code — no auth needed
router.get('/verify/:qrToken', verifyQRToken);

// ── Protected ──────────────────────────────────────────────────────────────────

// List tables — available to any authenticated owner
router.get('/:restaurantId', protect, loadSubscription, getRestaurantTables);

// Generate tables:
//   1. protect          — must be logged in
//   2. loadSubscription — resolve plan config, auto-expire if needed
//   3. checkTableLimit  — enforce per-plan table cap (Free: 3, Pro: 20, Premium: unlimited)
//                         (no requireFeature gate — Free plan can use QR codes, just capped)
router.post(
  '/:restaurantId/generate',
  protect,
  loadSubscription,
  checkTableLimit,
  generateTables
);

// Get single table QR image — any authenticated owner
router.get('/:restaurantId/:tableId/qr', protect, loadSubscription, getTableQR);

module.exports = router;
