/**
 * Socket.io Manager — Production Ready
 *
 * ADDED:
 * - join_admin_room  → admins join 'admin_room' to receive subscription_request events
 * - join_user_room   → users join 'user:<userId>' to receive approval/rejection events
 */

const { Server } = require('socket.io');
let io;

const initSocket = (server) => {
  const rawOrigins     = process.env.FRONTEND_URL || 'http://localhost:5173';
  const allowedOrigins = rawOrigins.split(',').map((o) => o.trim());

  io = new Server(server, {
    cors: {
      origin: allowedOrigins,
      methods: ['GET', 'POST'],
      credentials: true,
    },
  });

  io.on('connection', (socket) => {
    console.log(`🔌 Socket connected: ${socket.id}`);

    // Restaurant dashboard — order events
    socket.on('join_restaurant', (restaurantId) => {
      if (!restaurantId) return;
      socket.join(`restaurant:${restaurantId}`);
    });

    // Order tracking
    socket.on('join_order_tracking', ({ orderId }) => {
      if (!orderId) return;
      socket.join(`order:${orderId}`);
    });

    // Admin panel — receives subscription_request notifications
    socket.on('join_admin_room', () => {
      socket.join('admin_room');
    });

    // Per-user room — receives subscription_approved / subscription_rejected
    socket.on('join_user_room', (userId) => {
      if (!userId) return;
      socket.join(`user:${userId}`);
    });

    socket.on('disconnect', () => {
      console.log(`🔌 Socket disconnected: ${socket.id}`);
    });
  });

  console.log('✅ Socket.io initialized');
  return io;
};

const getIO = () => {
  if (!io) throw new Error('Socket.io not initialized. Call initSocket first.');
  return io;
};

module.exports = { initSocket, getIO };
