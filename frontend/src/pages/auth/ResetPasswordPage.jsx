import { useState, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import api from '../../services/api.js';
import toast from 'react-hot-toast';
import { Lock, Eye, EyeOff, CheckCircle } from 'lucide-react';
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

export default function ResetPasswordPage() {
  const navigate  = useNavigate();
  const location  = useLocation();

  const emailFromState = location.state?.email || '';

  const [email, setEmail]       = useState(emailFromState);
  const [digits, setDigits]     = useState(['', '', '', '', '', '']);
  const [password, setPassword] = useState('');
  const [confirm, setConfirm]   = useState('');
  const [showPw, setShowPw]     = useState(false);
  const [loading, setLoading]   = useState(false);
  const [done, setDone]         = useState(false);
  const inputRefs = useRef([]);

  // ── OTP input helpers ────────────────────────────────────────────────────────
  const handleDigitChange = (i, val) => {
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
      toast.error('Please enter the full 6-digit code.');
      return;
    }
    if (password !== confirm) {
      toast.error('Passwords do not match.');
      return;
    }
    if (password.length < 8) {
      toast.error('Password must be at least 8 characters.');
      return;
    }
    setLoading(true);
    try {
      await api.post('/auth/reset-password', { email, code, password });
      setDone(true);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Reset failed. Code may have expired.');
      setDigits(['', '', '', '', '', '']);
      inputRefs.current[0]?.focus();
    } finally {
      setLoading(false);
    }
  };

  // ── Strength indicator ───────────────────────────────────────────────────────
  const strength = password.length >= 12 ? 4 : password.length >= 10 ? 3 : password.length >= 8 ? 2 : password.length >= 4 ? 1 : 0;
  const strengthColors = ['var(--border)', '#EF4444', '#F59E0B', '#3B82F6', '#22C55E'];
  const strengthLabels = ['', 'Weak', 'Fair', 'Good', 'Strong'];

  return (
    <div className={styles.page}>
      {/* Left decorative panel */}
      <div className={styles.art}>
        <div className={styles.artInner}>
          <div className={styles.brandMark}>
            <OrderlyIcon size={56} />
          </div>
          <h1>New password</h1>
          <p>Enter the code from your email and choose a strong new password.</p>
          <div className={styles.features}>
            {['Min. 8 characters', 'Use letters + numbers', 'Keep it unique'].map((f) => (
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

          {done ? (
            /* ── Success state ────────────────────────────────────── */
            <div className={styles.sentState}>
              <div className={styles.sentIcon}>
                <CheckCircle size={48} strokeWidth={1.5} />
              </div>
              <h2>Password updated!</h2>
              <p>Your password has been reset successfully. You can now sign in with your new password.</p>
              <Link
                to="/login"
                className="btn btn-primary"
                style={{ justifyContent: 'center', width: '100%', marginTop: 16 }}
              >
                Sign in now →
              </Link>
            </div>
          ) : (
            /* ── Reset form ───────────────────────────────────────── */
            <>
              <div className={styles.formHeader}>
                <h2>Reset password</h2>
                <p>Enter the 6-digit code from your email and your new password</p>
              </div>

              <form onSubmit={handleSubmit} className={styles.form}>
                {/* Email — pre-filled from state, editable if needed */}
                <div className="form-group">
                  <label className="form-label">Email address</label>
                  <input
                    type="email"
                    className="form-input"
                    placeholder="you@restaurant.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    autoFocus={!emailFromState}
                  />
                </div>

                {/* 6-digit OTP boxes */}
                <div className="form-group">
                  <label className="form-label">Reset code</label>
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
                        autoFocus={!!emailFromState && i === 0}
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

                {/* New password */}
                <div className="form-group">
                  <label className="form-label">New password</label>
                  <div className={styles.inputWrap}>
                    <Lock size={16} className={styles.inputIcon} />
                    <input
                      type={showPw ? 'text' : 'password'}
                      className={`form-input ${styles.inputPadded} ${styles.inputPaddedRight}`}
                      placeholder="Min. 8 characters"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      minLength={8}
                    />
                    <button
                      type="button"
                      className={styles.eyeBtn}
                      onClick={() => setShowPw(!showPw)}
                      tabIndex={-1}
                    >
                      {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                {/* Confirm password */}
                <div className="form-group">
                  <label className="form-label">Confirm password</label>
                  <div className={styles.inputWrap}>
                    <Lock size={16} className={styles.inputIcon} />
                    <input
                      type={showPw ? 'text' : 'password'}
                      className={`form-input ${styles.inputPadded}`}
                      placeholder="Same password again"
                      value={confirm}
                      onChange={(e) => setConfirm(e.target.value)}
                      required
                    />
                  </div>
                </div>

                {/* Password strength bar */}
                {password && (
                  <div style={{ marginTop: -8, marginBottom: 4 }}>
                    <div style={{ display: 'flex', gap: 4 }}>
                      {[1, 2, 3, 4].map((n) => (
                        <div
                          key={n}
                          style={{
                            flex: 1, height: 4, borderRadius: 99,
                            background: strength >= n ? strengthColors[strength] : 'var(--border)',
                            transition: 'background .2s',
                          }}
                        />
                      ))}
                    </div>
                    {strength > 0 && (
                      <p style={{ margin: '4px 0 0', fontSize: 12, color: strengthColors[strength] }}>
                        {strengthLabels[strength]}
                      </p>
                    )}
                  </div>
                )}

                <button
                  type="submit"
                  className="btn btn-primary btn-lg"
                  style={{ width: '100%', justifyContent: 'center' }}
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <div className="spinner" style={{ borderColor: 'rgba(255,255,255,.3)', borderTopColor: 'white' }} />
                      Resetting…
                    </>
                  ) : (
                    'Reset password'
                  )}
                </button>
              </form>

              <p className={styles.switchLink}>
                <Link to="/forgot-password">← Request a new code</Link>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
