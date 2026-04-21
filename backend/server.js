/**
 * Orderly - SaaS Restaurant Ordering Platform
 * Main Server Entry Point — Production Ready
 */

require('dotenv').config();
const express       = require('express');
const http          = require('http');
const cors          = require('cors');
const morgan        = require('morgan');
const helmet        = require('helmet');
const mongoSanitize = require('express-mongo-sanitize');
const rateLimit     = require('express-rate-limit');

const connectDB      = require('./config/database');
const { initSocket } = require('./socket/socketManager');
const { verifyEmailTransporter } = require('./config/emailService');

const authRoutes         = require('./routes/auth');
const restaurantRoutes   = require('./routes/restaurants');
const menuRoutes         = require('./routes/menu');
const orderRoutes        = require('./routes/orders');
const tableRoutes        = require('./routes/tables');
const adminRoutes        = require('./routes/admin');
const promoRoutes        = require('./routes/promo');
// FIX: was requiring './routes/subscription' which didn't exist — file is now created
const subscriptionRoutes = require('./routes/subscription');
const { checkSubscriptionExpiry } = require('./middleware/subscription');

const app    = express();
const server = http.createServer(app);

connectDB();
initSocket(server);
verifyEmailTransporter();

// Security headers
app.use(helmet());

// CORS — supports comma-separated origins in FRONTEND_URL
const rawOrigins     = process.env.FRONTEND_URL || 'http://localhost:5173';
const allowedOrigins = rawOrigins.split(',').map((o) => o.trim());

app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) return callback(null, true);
    callback(new Error(`CORS: origin ${origin} not allowed`));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
}));

app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ extended: true, limit: '5mb' }));
app.use(mongoSanitize());
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));

// Rate limiting
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, max: 200,
  standardHeaders: true, legacyHeaders: false,
  message: { error: 'Too many requests, please try again later.' },
});
app.use('/api/', apiLimiter);

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, max: 20,
  standardHeaders: true, legacyHeaders: false,
  message: { error: 'Too many auth attempts, please try again later.' },
});
app.use('/api/auth/', authLimiter);

// FIX: Apply checkSubscriptionExpiry globally on all authenticated routes.
// This replaces the duplicate expiry block that was living inside protect()
// in middleware/auth.js. Now there is exactly one place that writes the
// 'expired' status to the DB, and it runs after protect() has attached req.user.
app.use(checkSubscriptionExpiry);

// Routes
app.use('/api/auth',         authRoutes);
app.use('/api/restaurants',  restaurantRoutes);
app.use('/api/menu',         menuRoutes);
app.use('/api/orders',       orderRoutes);
app.use('/api/tables',       tableRoutes);
app.use('/api/admin',        adminRoutes);
app.use('/api/promo',        promoRoutes);
app.use('/api/subscription', subscriptionRoutes);

app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error('Global Error:', err.stack);
  if (err.message?.startsWith('CORS:')) {
    return res.status(403).json({ error: err.message });
  }
  res.status(err.status || 500).json({
    error: process.env.NODE_ENV === 'production' ? 'Something went wrong' : err.message,
  });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`\n  ✅  Orderly running on port ${PORT}  [${process.env.NODE_ENV || 'development'}]\n`);
});

module.exports = { app, server };