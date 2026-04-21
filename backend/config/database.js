/**
 * MongoDB connection configuration
 */

const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI, {
      // Mongoose 8+ handles these automatically
    });

    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);

    // Seed admin user on first run
    await seedAdmin();
  } catch (error) {
    console.error('❌ MongoDB connection error:', error.message);
    process.exit(1);
  }
};

/**
 * Seeds the initial admin user if none exists
 */
const seedAdmin = async () => {
  const User = require('../models/User');
  const bcrypt = require('bcryptjs');

  const adminExists = await User.findOne({ role: 'admin' });
  if (!adminExists) {
    const hashedPassword = await bcrypt.hash(
      process.env.ADMIN_PASSWORD || 'Admin@123456',
      12
    );
    await User.create({
      name: 'Super Admin',
      email: process.env.ADMIN_EMAIL || 'admin@Orderly.com',
      password: hashedPassword,
      role: 'admin',
    });
    console.log('✅ Admin user seeded:', process.env.ADMIN_EMAIL);
  }
};

module.exports = connectDB;
