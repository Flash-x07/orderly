import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../../services/api.js';
import toast from 'react-hot-toast';
import { Mail, ArrowLeft, CheckCircle } from 'lucide-react';
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

export default function ForgotPasswordPage() {
  const navigate      = useNavigate();
  const [email, setEmail]     = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent]       = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      // Always returns the same safe message regardless of whether email exists
      await api.post('/auth/forgot-password', { email });
      setSent(true);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleContinueToReset = () => {
    // Pass email via navigation state so reset page can pre-fill it
    navigate('/reset-password', { state: { email } });
  };

  return (
    <div className={styles.page}>
      {/* Left decorative panel */}
      <div className={styles.art}>
        <div className={styles.artInner}>
          <div className={styles.brandMark}>
            <OrderlyIcon size={56} />
          </div>
          <h1>Password reset</h1>
          <p>Enter your email and we'll send you a 6-digit code to reset your password.</p>
          <div className={styles.features}>
            {[
              'Secure 6-digit reset code',
              'Code expires in 10 minutes',
              'No account? Create one free',
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

          {sent ? (
            /* ── Success / sent state ────────────────────────────── */
            <div className={styles.sentState}>
              <div className={styles.sentIcon}>
                <CheckCircle size={48} strokeWidth={1.5} />
              </div>
              <h2>Check your email</h2>
              <p>
                If <strong>{email}</strong> is registered, we've sent a 6-digit
                reset code. It expires in <strong>10 minutes</strong>.
              </p>
              <p className={styles.spamNote}>Didn't get it? Check your spam folder.</p>

              <button
                onClick={handleContinueToReset}
                className="btn btn-primary"
                style={{ justifyContent: 'center', width: '100%', marginTop: 8 }}
              >
                Enter reset code →
              </button>

              <button
                type="button"
                onClick={() => { setSent(false); }}
                style={{
                  marginTop: 12, background: 'none', border: 'none',
                  cursor: 'pointer', color: 'var(--text-secondary)',
                  fontSize: 14, width: '100%', textAlign: 'center',
                }}
              >
                Use a different email
              </button>
            </div>
          ) : (
            /* ── Email entry form ────────────────────────────────── */
            <>
              <div className={styles.formHeader}>
                <h2>Forgot password?</h2>
                <p>We'll send a 6-digit reset code to your email</p>
              </div>

              <form onSubmit={handleSubmit} className={styles.form}>
                <div className="form-group">
                  <label className="form-label">Email address</label>
                  <div className={styles.inputWrap}>
                    <Mail size={16} className={styles.inputIcon} />
                    <input
                      type="email"
                      className={`form-input ${styles.inputPadded}`}
                      placeholder="you@restaurant.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      autoFocus
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  className="btn btn-primary btn-lg"
                  style={{ width: '100%', justifyContent: 'center' }}
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <div className="spinner" style={{ borderColor: 'rgba(255,255,255,.3)', borderTopColor: 'white' }} />
                      Sending…
                    </>
                  ) : (
                    'Send reset code'
                  )}
                </button>
              </form>

              <p className={styles.switchLink}>
                <Link to="/login">
                  <ArrowLeft size={13} style={{ display: 'inline', verticalAlign: 'middle' }} /> Back to sign in
                </Link>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
