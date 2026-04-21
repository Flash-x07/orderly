/**
 * Order Controller
 * Handles order creation, real-time updates, and lifecycle management
 */

const Order = require('../models/Order');
const MenuItem = require('../models/MenuItem');
const Restaurant = require('../models/Restaurant');
const { getIO } = require('../socket/socketManager');

/**
 * POST /api/orders
 * Customer places a new order (public route)
 */
const createOrder = async (req, res) => {
  try {
    const { restaurantId, tableNumber, items, customerName, customerNote } = req.body;

    if (!items || items.length === 0) {
      return res.status(400).json({ error: 'Order must contain at least one item.' });
    }

    // Verify restaurant exists
    const restaurant = await Restaurant.findById(restaurantId);
    if (!restaurant || !restaurant.isActive) {
      return res.status(404).json({ error: 'Restaurant not found.' });
    }

    // Fetch and validate each menu item
    const orderItems = [];
    let subtotal = 0;

    for (const item of items) {
      const menuItem = await MenuItem.findOne({
        _id: item.menuItemId,
        restaurant: restaurantId,
        isAvailable: true,
      });

      if (!menuItem) {
        return res.status(400).json({
          error: `Item "${item.name || item.menuItemId}" is not available.`,
        });
      }

      const quantity = Math.min(Math.max(1, item.quantity), 20);
      const lineTotal = menuItem.price * quantity;
      subtotal += lineTotal;

      orderItems.push({
        menuItem: menuItem._id,
        name: menuItem.name,      // Snapshot name
        price: menuItem.price,    // Snapshot price
        quantity,
        notes: item.notes || '',
      });
    }

    // Calculate totals (no tax for now, easily extendable)
    const tax = 0;
    const total = subtotal + tax;

    // Create the order
    const order = await Order.create({
      restaurant: restaurantId,
      tableNumber,
      items: orderItems,
      subtotal,
      tax,
      total,
      customerName: customerName || 'Guest',
      customerNote: customerNote || '',
      statusHistory: [{ status: 'pending' }],
    });

    // Populate for response
    await order.populate('items.menuItem', 'name price image');

    // 🔔 Emit real-time event to restaurant dashboard
    const io = getIO();
    io.to(`restaurant:${restaurantId}`).emit('new_order', {
      order,
      message: `New order from Table ${tableNumber}!`,
    });

    res.status(201).json({
      message: restaurant.settings.orderConfirmationMessage,
      order: {
        id: order._id,
        orderNumber: order.orderNumber,
        status: order.status,
        total: order.total,
        estimatedPrepTime: restaurant.settings.estimatedPrepTime,
      },
    });
  } catch (error) {
    console.error('Create order error:', error);
    res.status(500).json({ error: 'Failed to place order. Please try again.' });
  }
};

/**
 * GET /api/orders/restaurant/:restaurantId
 * Get all orders for a restaurant (dashboard)
 */
const getRestaurantOrders = async (req, res) => {
  try {
    const { restaurantId } = req.params;
    const { status, date, limit = 50, page = 1 } = req.query;

    // Ownership check
    const userRestaurantId = req.user.restaurant?._id?.toString() ?? req.user.restaurant?.toString();
    if (req.user.role !== 'admin' && userRestaurantId !== restaurantId) {
      return res.status(403).json({ error: 'Access denied.' });
    }

    // Build query
    const query = { restaurant: restaurantId };
    if (status && status !== 'all') query.status = status;
    if (date) {
      const startOfDay = new Date(date);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(date);
      endOfDay.setHours(23, 59, 59, 999);
      query.createdAt = { $gte: startOfDay, $lte: endOfDay };
    }

    const skip = (Number(page) - 1) * Number(limit);

    const [orders, total] = await Promise.all([
      Order.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit))
        .lean(),
      Order.countDocuments(query),
    ]);

    res.json({
      orders,
      pagination: { total, page: Number(page), pages: Math.ceil(total / Number(limit)) },
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch orders.' });
  }
};

/**
 * PATCH /api/orders/:orderId/status
 * Update order status (restaurant owner only)
 */
const updateOrderStatus = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { status, note } = req.body;

    const validTransitions = {
      pending: ['accepted', 'rejected'],
      accepted: ['preparing', 'rejected'],
      preparing: ['ready'],
      ready: ['completed'],
    };

    const order = await Order.findById(orderId);
    if (!order) return res.status(404).json({ error: 'Order not found.' });

    // Verify ownership — normalise both sides to strings
    const orderRestaurantId = order.restaurant?.toString();
    const userRestaurantId  = req.user.restaurant?._id?.toString() ?? req.user.restaurant?.toString();
    if (
      req.user.role !== 'admin' &&
      orderRestaurantId !== userRestaurantId
    ) {
      return res.status(403).json({ error: 'Access denied.' });
    }

    // Validate status transition
    const allowed = validTransitions[order.status] || [];
    if (!allowed.includes(status)) {
      return res.status(400).json({
        error: `Cannot transition from "${order.status}" to "${status}".`,
      });
    }

    // Update order
    order.status = status;
    order.statusHistory.push({ status, note: note || '' });
    if (status === 'completed') order.completedAt = new Date();
    if (status === 'accepted') {
      const restaurant = await Restaurant.findById(order.restaurant);
      order.estimatedReadyAt = new Date(
        Date.now() + (restaurant?.settings.estimatedPrepTime || 20) * 60000
      );
    }

    await order.save();

    // 🔔 Emit real-time status update
    const io = getIO();
    io.to(`restaurant:${order.restaurant}`).emit('order_updated', { order });

    res.json({ message: `Order ${status} successfully.`, order });
  } catch (error) {
    console.error('Update order status error:', error);
    res.status(500).json({ error: 'Failed to update order status.' });
  }
};

/**
 * GET /api/orders/restaurant/:restaurantId/stats
 * Get dashboard statistics
 */
const getOrderStats = async (req, res) => {
  try {
    const { restaurantId } = req.params;

    // Ownership check
    const userRestaurantId = req.user.restaurant?._id?.toString() ?? req.user.restaurant?.toString();
    if (req.user.role !== 'admin' && userRestaurantId !== restaurantId) {
      return res.status(403).json({ error: 'Access denied.' });
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [todayOrders, pendingCount, totalRevenue, weeklyRevenue] = await Promise.all([
      // Today's orders
      Order.countDocuments({
        restaurant: restaurantId,
        createdAt: { $gte: today },
      }),
      // Pending orders
      Order.countDocuments({
        restaurant: restaurantId,
        status: { $in: ['pending', 'accepted', 'preparing'] },
      }),
      // All-time revenue
      Order.aggregate([
        { $match: { restaurant: require('mongoose').Types.ObjectId.createFromHexString(restaurantId), status: 'completed' } },
        { $group: { _id: null, total: { $sum: '$total' } } },
      ]),
      // This week's revenue
      Order.aggregate([
        {
          $match: {
            restaurant: require('mongoose').Types.ObjectId.createFromHexString(restaurantId),
            status: 'completed',
            createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
          },
        },
        { $group: { _id: null, total: { $sum: '$total' } } },
      ]),
    ]);

    res.json({
      todayOrders,
      pendingOrders: pendingCount,
      totalRevenue: totalRevenue[0]?.total || 0,
      weeklyRevenue: weeklyRevenue[0]?.total || 0,
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch stats.' });
  }
};

module.exports = { createOrder, getRestaurantOrders, updateOrderStatus, getOrderStats };
