/**
 * Table Controller
 * Manages tables and generates QR codes for each table
 */

const QRCode     = require('qrcode');
const Table      = require('../models/Table');
const Restaurant = require('../models/Restaurant');

// ─── Ownership helper ──────────────────────────────────────────────────────────
const _ownsRestaurant = (user, restaurantId) => {
  if (user.role === 'admin') return true;
  const ownedId = user.restaurant?._id?.toString() ?? user.restaurant?.toString();
  return ownedId === restaurantId;
};

/**
 * Generate QR code image for a table
 */
const generateQRCode = async (restaurantId, qrToken, frontendUrl) => {
  const menuUrl = `${frontendUrl}/menu/${restaurantId}?table=${qrToken}`;

  const qrImage = await QRCode.toDataURL(menuUrl, {
    errorCorrectionLevel: 'H',
    type:   'image/png',
    width:  400,
    margin: 2,
    color: {
      dark:  '#1a1a2e',
      light: '#ffffff',
    },
  });

  return { qrImage, menuUrl };
};

/**
 * GET /api/tables/:restaurantId
 * Get all tables for a restaurant
 */
const getRestaurantTables = async (req, res) => {
  try {
    const { restaurantId } = req.params;

    // Ownership check
    if (!_ownsRestaurant(req.user, restaurantId)) {
      return res.status(403).json({ error: 'Access denied.' });
    }

    const tables = await Table.find({ restaurant: restaurantId, isActive: true })
      .sort({ number: 1 })
      .lean();
    res.json({ tables });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch tables.' });
  }
};

/**
 * POST /api/tables/:restaurantId/generate
 * Bulk generate tables with QR codes
 */
const generateTables = async (req, res) => {
  try {
    const { restaurantId } = req.params;
    const { count = 10 }   = req.body;
    const frontendUrl      = (process.env.FRONTEND_URL || 'http://localhost:5173').split(',')[0].trim();

    // ── Ownership check ──────────────────────────────────────────────────────
    if (!_ownsRestaurant(req.user, restaurantId)) {
      return res.status(403).json({ error: 'Access denied.' });
    }

    // ── Verify the restaurant actually exists in the DB ──────────────────────
    const restaurant = await Restaurant.findById(restaurantId);
    if (!restaurant) {
      return res.status(404).json({ error: 'Restaurant not found.' });
    }

    const requestedCount = Number(count);
    if (!Number.isInteger(requestedCount) || requestedCount < 1) {
      return res.status(400).json({ success: false, code: 'INVALID_COUNT', message: 'count must be a positive integer.' });
    }

    // ── Plan limit — safety net (checkTableLimit middleware catches this first) ─
    const planConfig = req.planConfig;
    const tableLimit = planConfig?.tableLimit ?? 3; // defensive fallback to Free limit

    if (tableLimit !== null && requestedCount > tableLimit) {
      return res.status(403).json({
        success:     false,
        code:        'TABLE_LIMIT_REACHED',
        message:     `Your ${planConfig.displayName} plan allows a maximum of ${tableLimit} table${tableLimit === 1 ? '' : 's'}. You requested ${requestedCount}.`,
        currentPlan: req.effectivePlan,
        tableLimit,
        upgradeTo:   planConfig.upgradeTo,
      });
    }

    // Hard cap at 200 regardless of plan (Premium safety ceiling)
    if (requestedCount > 200) {
      return res.status(400).json({
        success: false,
        code:    'INVALID_COUNT',
        message: 'Maximum 200 tables allowed per restaurant.',
      });
    }

    // ── Generate ─────────────────────────────────────────────────────────────
    // Delete existing tables and regenerate fresh
    await Table.deleteMany({ restaurant: restaurantId });

    const tables = [];
    for (let i = 1; i <= requestedCount; i++) {
      const table = new Table({
        restaurant: restaurantId,
        number:     String(i),
        label:      `Table ${i}`,
      });

      const { qrImage } = await generateQRCode(restaurantId, table.qrToken, frontendUrl);
      table.qrCodeImage = qrImage;
      tables.push(table);
    }

    await Table.insertMany(tables);
    await Restaurant.findByIdAndUpdate(restaurantId, { tableCount: requestedCount });

    // Re-fetch so caller gets the full table list (with _id, qrToken, etc.)
    const created = await Table.find({ restaurant: restaurantId, isActive: true })
      .sort({ number: 1 })
      .lean();

    res.json({
      message: `${requestedCount} tables generated successfully.`,
      count:   requestedCount,
      tables:  created,
    });
  } catch (error) {
    console.error('Generate tables error:', error);
    res.status(500).json({ error: 'Failed to generate tables.' });
  }
};

/**
 * GET /api/tables/verify/:qrToken
 * Verify QR code token — called when customer scans a QR code
 */
const verifyQRToken = async (req, res) => {
  try {
    const { qrToken } = req.params;

    const table = await Table.findOne({ qrToken, isActive: true }).populate(
      'restaurant',
      'name description logo theme currency settings isActive'
    );

    if (!table || !table.restaurant.isActive) {
      return res.status(404).json({ error: 'Invalid or expired QR code.' });
    }

    res.json({
      tableNumber: table.number,
      tableLabel:  table.label,
      restaurant:  table.restaurant,
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to verify QR code.' });
  }
};

/**
 * GET /api/tables/:restaurantId/:tableId/qr
 * Get QR code image for a specific table
 */
const getTableQR = async (req, res) => {
  try {
    const { restaurantId, tableId } = req.params;

    if (!_ownsRestaurant(req.user, restaurantId)) {
      return res.status(403).json({ error: 'Access denied.' });
    }

    const table = await Table.findOne({ _id: tableId, restaurant: restaurantId });
    if (!table) return res.status(404).json({ error: 'Table not found.' });

    res.json({ qrCode: table.qrCodeImage, number: table.number, label: table.label });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch QR code.' });
  }
};

module.exports = { getRestaurantTables, generateTables, verifyQRToken, getTableQR };
