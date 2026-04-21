import { useState, useRef, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import api from '../../services/api.js';
import toast from 'react-hot-toast';
import { CheckCircle, RotateCcw } from 'lucide-react';
import styles from './Auth.module.css';

function OrderlyIcon({ size = 36 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg" style={{ flexShrink: 0, borderRadius: size * 0.18 }}>
      <rect width="512" height="512" rx="100" fill="#FF6B35"/>
      <rect x="80" y="80" width="110" height="110" rx="8" fill="white"/>
      <rect x="95" y="95" width="80" height="80" rx="4" fill="#FF6B35"/>
      <rect x="112" y="112" width="46" height="46" rx="2" fill="white"/>
      <rect x="210" y="80" width="50" height="50" rx="6" fill="white"/>
      <rect x="222" y="92" width="26" height="26" rx="2" fill="#FF6B35"/>
      <rect x="229" y="99" width="12" height="12" rx="1" fill="white"/>
      <rect x="80" y="210" width="50" height="50" rx="6" fill="white"/>
      <rect x="92" y="222" width="26" height="26" rx="2" fill="#FF6B35"/>
      <rect x="99" y="229" width="12" height="12" rx="1" fill="white"/>
      <rect x="210" y="148" width="22" height="22" rx="3" fill="white"/>
      <rect x="240" y="148" width="22" height="22" rx="3" fill="white"/>
      <rect x="148" y="210" width="22" height="22" rx="3" fill="white"/>
      <rect x="148" y="240" width="22" height="22" rx="3" fill="white"/>
      <rect x="210" y="210" width="22" height="22" rx="3" fill="white"/>
      <rect x="240" y="240" width="22" height="22" rx="3" fill="white"/>
      <rect x="210" y="240" width="22" height="22" rx="3" fill="white"/>
      <rect x="340" y="80" width="22" height="140" rx="11" fill="white"/>
      <rect x="326" y="80" width="10" height="60" rx="5" fill="white"/>
      <rect x="356" y="80" width="10" height="60" rx="5" fill="white"/>
      <rect x="326" y="132" width="40" height="14" rx="4" fill="white"/>
      <rect x="395" y="80" width="22" height="160" rx="11" fill="white"/>
      <path d="M395 80 Q417 80 417 130 L395 130 Z" fill="white"/>
      <rect x="80" y="340" width="160" height="28" rx="14" fill="white"/>
      <rect x="80" y="390" width="130" height="28" rx="14" fill="white"/>
      <path d="M290 370 L340 430 L440 300" stroke="white" strokeWidth="42" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
    </svg>
  );
}

const RESEND_COOLDOWN = 60; // seconds

export default function VerifyEmailPage() {
  const navigate      = useNavigate();
  const location      = useLocation();
  const { login: authLogin } = useAuth();

  // Email can come from registration redirect state or query param
  const emailFromState = location.state?.email || new URLSearchParams(location.search).get('email') || '';
  const [email, setEmail]     = useState(emailFromState);
  const [digits, setDigits]   = useState(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [verified, setVerified] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const inputRefs = useRef([]);

  // Auto-start cooldown timer if we just arrived from registration
  useEffect(() => {
    if (location.state?.email) {
      setCooldown(RESEND_COOLDOWN);
    }
  }, []);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setInterval(() => setCooldown((c) => c - 1), 1000);
    return () => clearInterval(t);
  }, [cooldown]);

  // ── OTP input logic ──────────────────────────────────────────────────────────
  const handleDigitChange = (i, val) => {
    // Allow paste of full code
    if (val.length > 1) {
      const clean = val.replace(/\D/g, '').slice(0, 6);
      const next = [...digits];
      clean.split('').forEach((ch, idx) => { if (idx < 6) next[idx] = ch; });
      setDigits(next);
      const focusIdx = Math.min(clean.length, 5);
      inputRefs.current[focusIdx]?.focus();
      return;
    }
    if (!/^\d?$/.test(val)) return;
    const next = [...digits];
    next[i] = val;
    setDigits(next);
    if (val && i < 5) inputRefs.current[i + 1]?.focus();
  };

  const handleKeyDown = (i, e) => {
    if (e.key === 'Backspace' && !digits[i] && i > 0) {
      inputRefs.current[i - 1]?.focus();
    }
  };

  const code = digits.join('');

  // ── Submit ───────────────────────────────────────────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (code.length !== 6) {
      toast.error('Please enter all 6 digits.');
      return;
    }
    if (!email) {
      toast.error('Email address is required.');
      return;
    }
    setLoading(true);
    try {
      const { data } = await api.post('/auth/verify-email', { email, code });
      // Store token and update auth context
      localStorage.setItem('tf_token', data.token);
      api.defaults.headers.common['Authorization'] = `Bearer ${data.token}`;
      setVerified(true);
      toast.success('Email verified! Welcome to Orderly 🎉');
      setTimeout(() => navigate('/dashboard', { replace: true }), 1500);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Verification failed.');
      // Clear inputs on error
      setDigits(['', '', '', '', '', '']);
      inputRefs.current[0]?.focus();
    } finally {
      setLoading(false);
    }
  };

  // ── Resend ───────────────────────────────────────────────────────────────────
  const handleResend = async () => {
    if (cooldown > 0 || !email) return;
    try {
      await api.post('/auth/resend-verification-code', { email });
      toast.success('A new code has been sent!');
      setCooldown(RESEND_COOLDOWN);
      setDigits(['', '', '', '', '', '']);
      inputRefs.current[0]?.focus();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to resend. Try again.');
    }
  };

  // ── Verified success state ───────────────────────────────────────────────────
  if (verified) {
    return (
      <div className={styles.page}>
        <div className={styles.formSide} style={{ flex: 1 }}>
          <div className={styles.formCard}>
            <div className={styles.sentState}>
              <div className={styles.sentIcon} style={{ color: 'var(--accent)' }}>
                <CheckCircle size={56} strokeWidth={1.5} />
              </div>
              <h2>Email verified!</h2>
              <p>Your account is now active. Redirecting you to the dashboard…</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      {/* Left decorative panel */}
      <div className={styles.art}>
        <div className={styles.artInner}>
          <div className={styles.brandMark}>
            <OrderlyIcon size={56} />
          </div>
          <h1>Check your inbox</h1>
          <p>We sent a 6-digit code to your email. Enter it to activate your account.</p>
          <div className={styles.features}>
            {[
              'Code expires in 10 minutes',
              'Check your spam folder too',
              'You can request a new code anytime',
            ].map((f) => (
              <div key={f} className={styles.featureItem}>
                <span className={styles.check}>✓</span> {f}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right form panel */}
      <div className={styles.formSide}>
        <div className={styles.formCard}>
          {/* Mobile logo */}
          <div className={styles.mobileLogoWrap}>
            <OrderlyIcon size={44} />
            <span className={styles.mobileLogoText}>Orderly</span>
          </div>

          <div className={styles.formHeader}>
            <h2>Verify your email</h2>
            <p>
              Enter the 6-digit code sent to{' '}
              <strong>{email || 'your email'}</strong>
            </p>
          </div>

          <form onSubmit={handleSubmit} className={styles.form}>
            {/* Email field — only shown if not pre-filled */}
            {!emailFromState && (
              <div className="form-group">
                <label className="form-label">Email address</label>
                <input
                  type="email"
                  className="form-input"
                  placeholder="you@restaurant.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
            )}

            {/* 6-digit OTP boxes */}
            <div className="form-group">
              <label className="form-label">Verification code</label>
              <div style={{ display: 'flex', gap: 8, justifyContent: 'space-between' }}>
                {digits.map((d, i) => (
                  <input
                    key={i}
                    ref={(el) => (inputRefs.current[i] = el)}
                    type="text"
                    inputMode="numeric"
                    pattern="\d*"
                    maxLength={6}
                    value={d}
                    onChange={(e) => handleDigitChange(i, e.target.value)}
                    onKeyDown={(e) => handleKeyDown(i, e)}
                    onFocus={(e) => e.target.select()}
                    autoFocus={i === 0}
                    style={{
                      width: 48,
                      height: 56,
                      textAlign: 'center',
                      fontSize: 22,
                      fontWeight: 700,
                      fontFamily: 'monospace',
                      borderRadius: 10,
                      border: `2px solid ${d ? 'var(--accent)' : 'var(--border)'}`,
                      background: 'var(--surface)',
                      color: 'var(--text-primary)',
                      outline: 'none',
                      transition: 'border-color .15s',
                      caretColor: 'transparent',
                    }}
                  />
                ))}
              </div>
            </div>

            <button
              type="submit"
              className="btn btn-primary btn-lg"
              style={{ width: '100%', justifyContent: 'center' }}
              disabled={loading || code.length !== 6}
            >
              {loading ? (
                <>
                  <div className="spinner" style={{ borderColor: 'rgba(255,255,255,.3)', borderTopColor: 'white' }} />
                  Verifying…
                </>
              ) : (
                'Verify email'
              )}
            </button>
          </form>

          {/* Resend */}
          <p className={styles.switchLink} style={{ display: 'flex', alignItems: 'center', gap: 6, justifyContent: 'center' }}>
            Didn't get it?{' '}
            {cooldown > 0 ? (
              <span style={{ color: 'var(--text-secondary)' }}>
                Resend in {cooldown}s
              </span>
            ) : (
              <button
                type="button"
                onClick={handleResend}
                style={{
                  background: 'none', border: 'none', cursor: 'pointer',
                  color: 'var(--accent)', fontWeight: 600, padding: 0,
                  display: 'inline-flex', alignItems: 'center', gap: 4,
                }}
              >
                <RotateCcw size={13} /> Resend code
              </button>
            )}
          </p>

          <p className={styles.switchLink}>
            <Link to="/login">← Back to sign in</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
