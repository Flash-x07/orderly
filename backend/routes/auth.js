/**
 * Auth Routes
 */

const express = require('express');
const { body } = require('express-validator');
const rateLimit = require('express-rate-limit');
const {
  register,
  verifyEmail,
  resendVerificationCode,
  login,
  getMe,
  updateProfile,
  updateAvatar,
  forgotPassword,
  resetPassword,
} = require('../controllers/authController');
const { protect } = require('../middleware/auth');

const router = express.Router();

const otpLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many attempts. Please try again in 10 minutes.' },
});

router.post('/register', [
  body('name').trim().notEmpty().withMessage('Name is required'),
  body('email').isEmail().withMessage('Valid email is required'),
  body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
  body('restaurantName').trim().notEmpty().withMessage('Restaurant name is required'),
], register);

router.post('/verify-email', otpLimiter, [
  body('email').isEmail().withMessage('Valid email is required'),
  body('code').isLength({ min: 6, max: 6 }).isNumeric().withMessage('Code must be a 6-digit number'),
], verifyEmail);

router.post('/resend-verification-code', otpLimiter, [
  body('email').isEmail().withMessage('Valid email is required'),
], resendVerificationCode);

router.post('/login', [
  body('email').isEmail().withMessage('Valid email is required'),
  body('password').notEmpty().withMessage('Password is required'),
], login);

router.get('/me', protect, getMe);
router.put('/profile', protect, updateProfile);
router.put('/avatar', protect, [
  body('avatar').exists().withMessage('avatar field is required'),
], updateAvatar);

router.post('/forgot-password', otpLimiter, [
  body('email').isEmail().withMessage('Valid email is required'),
], forgotPassword);

router.post('/reset-password', otpLimiter, [
  body('email').isEmail().withMessage('Valid email is required'),
  body('code').isLength({ min: 6, max: 6 }).isNumeric().withMessage('Code must be a 6-digit number'),
  body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
], resetPassword);

module.exports = router;