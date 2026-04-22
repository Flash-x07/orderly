/**
 * Auth Controller
 * - Login does NOT require email verification
 * - hashCode() normalizes input (trim + toLowerCase) to fix code comparison bugs
 * - email always normalized with toLowerCase().trim() before DB queries
 * - restaurant field is always safe to be null (owner without restaurant)
 */

const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const { validationResult } = require('express-validator');
const User = require('../models/User');
const Restaurant = require('../models/Restaurant');
const { sendVerificationEmail, sendPasswordResetEmail } = require('../config/emailService');

// ─── Helpers ───────────────────────────────────────────────────────────────────

const generateToken = (id, rememberMe = false) =>
  jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: rememberMe ? '30d' : (process.env.JWT_EXPIRES_IN || '7d'),
  });

const generate6DigitCode = () =>
  Math.floor(100000 + Math.random() * 900000).toString();

const hashCode = (raw) =>
  crypto.createHash('sha256').update(String(raw).trim().toLowerCase()).digest('hex');

/**
 * buildUserPayload
 * ─────────────────────────────────────────────────────────────────────────────
 * Returns a safe, serialisable user object for API responses.
 * restaurant is always included as-is (may be null if deleted/unset).
 * ─────────────────────────────────────────────────────────────────────────────
 */
const buildUserPayload = (user) => ({
  id: user._id,
  name: user.name,
  email: user.email,
  role: user.role,
  plan: user.plan,
  subscriptionPlan: user.subscriptionPlan,
  subscriptionStatus: user.subscriptionStatus,
  avatar: user.avatar,
  isVerified: user.isVerified,
  trialUsed: user.trialUsed,
  // restaurant is the populated object or null — never crash on missing
  restaurant: user.restaurant ?? null,
});

// ─── Register ──────────────────────────────────────────────────────────────────
const register = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { name, restaurantName, currency } = req.body;
    const email    = String(req.body.email    || '').toLowerCase().trim();
    const password = req.body.password;

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ error: 'Email already registered.' });
    }

    const code    = generate6DigitCode();
    const expires = new Date(Date.now() + 10 * 60 * 1000);

    const user = await User.create({
      name,
      email,
      password,
      role: 'owner',
      isVerified: false,
      emailVerificationCodeHash: hashCode(code),
      emailVerificationExpires: expires,
    });

    const restaurant = await Restaurant.create({
      name: restaurantName || `${name}'s Restaurant`,
      owner: user._id,
      currency: currency || 'USD',
    });

    user.restaurant = restaurant._id;
    await user.save({ validateBeforeSave: false });

    // Send verification email (non-blocking — don't fail registration if mail fails)
    try { await sendVerificationEmail(email, code, name); } catch (_) {}

    res.status(201).json({
      message: 'Registration successful! Please verify your email.',
      needsVerification: true,
      email,
      user: {
        ...buildUserPayload(user),
        restaurant: restaurant._id,
      },
    });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ error: 'Registration failed.' });
  }
};

// ─── Verify Email ──────────────────────────────────────────────────────────────
const verifyEmail = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const email = String(req.body.email || '').toLowerCase().trim();
    const code  = String(req.body.code  || '').trim();

    const user = await User.findOne({ email }).select('+emailVerificationCodeHash +emailVerificationExpires');
    if (!user) return res.status(400).json({ error: 'Invalid or expired code.' });
    if (user.isVerified) return res.json({ message: 'Email already verified.' });

    if (!user.emailVerificationCodeHash || !user.emailVerificationExpires) {
      return res.status(400).json({ error: 'No verification code found. Request a new one.' });
    }
    if (user.emailVerificationExpires < new Date()) {
      return res.status(400).json({ error: 'Code expired. Request a new one.' });
    }
    if (user.emailVerificationCodeHash !== hashCode(code)) {
      return res.status(400).json({ error: 'Invalid code.' });
    }

    user.isVerified = true;
    user.emailVerificationCodeHash = undefined;
    user.emailVerificationExpires  = undefined;
    await user.save({ validateBeforeSave: false });

    const token = generateToken(user._id);
    const populated = await User.findById(user._id).populate('restaurant', 'name slug theme currency logo');
    res.json({ message: 'Email verified successfully!', token, user: buildUserPayload(populated) });
  } catch (error) {
    res.status(500).json({ error: 'Verification failed.' });
  }
};

// ─── Resend Verification Code ──────────────────────────────────────────────────
const resendVerificationCode = async (req, res) => {
  try {
    const email = String(req.body.email || '').toLowerCase().trim();
    const user  = await User.findOne({ email });

    const SAFE = { message: 'If this email exists and is unverified, a new code has been sent.' };
    if (!user || user.isVerified) return res.json(SAFE);

    const code    = generate6DigitCode();
    const expires = new Date(Date.now() + 10 * 60 * 1000);
    user.emailVerificationCodeHash = hashCode(code);
    user.emailVerificationExpires  = expires;
    await user.save({ validateBeforeSave: false });

    try { await sendVerificationEmail(email, code, user.name); } catch (_) {}
    res.json(SAFE);
  } catch (error) {
    res.status(500).json({ error: 'Failed to resend code.' });
  }
};

// ─── Login ─────────────────────────────────────────────────────────────────────
const login = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const email      = String(req.body.email || '').toLowerCase().trim();
    const { password, rememberMe } = req.body;

    // Populate restaurant so the client gets the full object (or null if deleted)
    const user = await User.findOne({ email })
      .select('+password')
      .populate('restaurant', 'name slug theme currency logo');

    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    if (!user.isActive) {
      return res.status(401).json({ error: 'Your account has been deactivated. Contact support.' });
    }

    user.lastLogin = new Date();
    await user.save({ validateBeforeSave: false });

    const token = generateToken(user._id, rememberMe);
    const userData = buildUserPayload(user);

    // Login succeeds regardless of email verification status.
    // Verification is only required for register flow and forgot-password reset.
    res.json({ token, user: userData });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed.' });
  }
};

// ─── Get Me ────────────────────────────────────────────────────────────────────
const getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user._id)
      .populate('restaurant', 'name slug theme currency logo');
    if (!user) return res.status(404).json({ error: 'User not found.' });
    res.json({ user: buildUserPayload(user) });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch profile.' });
  }
};

// ─── Update Profile ────────────────────────────────────────────────────────────
const updateProfile = async (req, res) => {
  try {
    const { name, currentPassword, newPassword, avatar } = req.body;

    const user = await User.findById(req.user._id).select('+password');

    if (name) user.name = name;

    if (avatar !== undefined) {
      if (avatar === '' || avatar.startsWith('data:image/') || avatar.startsWith('http')) {
        user.avatar = avatar;
      } else {
        return res.status(400).json({ error: 'Invalid avatar format.' });
      }
    }

    if (newPassword) {
      if (!currentPassword) {
        return res.status(400).json({ error: 'Current password is required.' });
      }
      const isMatch = await user.comparePassword(currentPassword);
      if (!isMatch) {
        return res.status(400).json({ error: 'Current password is incorrect.' });
      }
      user.password = newPassword;
    }

    await user.save();
    res.json({ message: 'Profile updated successfully.', avatar: user.avatar });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update profile.' });
  }
};

// ─── Update Avatar ─────────────────────────────────────────────────────────────
const updateAvatar = async (req, res) => {
  try {
    const { avatar } = req.body;

    if (avatar === undefined) {
      return res.status(400).json({ error: 'avatar field is required.' });
    }

    if (avatar !== '' && !avatar.startsWith('data:image/') && !avatar.startsWith('http')) {
      return res.status(400).json({ error: 'Invalid avatar format.' });
    }

    const user = await User.findByIdAndUpdate(
      req.user._id,
      { avatar },
      { new: true }
    );

    if (!user) return res.status(404).json({ error: 'User not found.' });

    res.json({ message: 'Avatar updated.', avatar: user.avatar });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update avatar.' });
  }
};

// ─── Forgot Password ───────────────────────────────────────────────────────────
const forgotPassword = async (req, res) => {
  try {
    const email = String(req.body.email || '').toLowerCase().trim();
    if (!email) {
      return res.status(400).json({ error: 'Email is required.' });
    }

    const SAFE_RESPONSE = { message: 'If this email exists, a reset code has been sent.' };

    const user = await User.findOne({ email });
    if (!user) {
      return res.json(SAFE_RESPONSE);
    }

    const code = generate6DigitCode();
    user.passwordResetCodeHash = hashCode(code);
    user.passwordResetExpires = new Date(Date.now() + 10 * 60 * 1000);
    await user.save({ validateBeforeSave: false });

    try {
      await sendPasswordResetEmail(email, code, user.name);
    } catch (mailErr) {
      console.error('Reset email failed:', mailErr.message);
    }

    res.json(SAFE_RESPONSE);
  } catch (error) {
    res.status(500).json({ error: 'Failed to process request.' });
  }
};

// ─── Reset Password ────────────────────────────────────────────────────────────
const resetPassword = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const email    = String(req.body.email || '').toLowerCase().trim();
    const code     = String(req.body.code  || '').trim();
    const password = req.body.password;

    const user = await User.findOne({ email }).select('+passwordResetCodeHash +passwordResetExpires');
    if (!user || !user.passwordResetCodeHash || !user.passwordResetExpires) {
      return res.status(400).json({ error: 'Invalid or expired reset code.' });
    }

    if (user.passwordResetExpires < new Date()) {
      return res.status(400).json({ error: 'Reset code has expired.' });
    }

    if (user.passwordResetCodeHash !== hashCode(code)) {
      return res.status(400).json({ error: 'Invalid reset code.' });
    }

    user.password = password;
    user.passwordResetCodeHash = undefined;
    user.passwordResetExpires  = undefined;
    await user.save();

    res.json({ message: 'Password reset successfully. You can now log in.' });
  } catch (error) {
    res.status(500).json({ error: 'Password reset failed.' });
  }
};

module.exports = {
  register,
  verifyEmail,
  resendVerificationCode,
  login,
  getMe,
  updateProfile,
  updateAvatar,
  forgotPassword,
  resetPassword,
};
