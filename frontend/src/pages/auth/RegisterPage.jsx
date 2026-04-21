import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import toast from 'react-hot-toast';
import { Mail, Lock, User, Store } from 'lucide-react';
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

export default function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm]       = useState({ name: '', email: '', password: '', restaurantName: '', currency: 'USD' });
  const [loading, setLoading] = useState(false);

  const set = (key) => (e) => setForm({ ...form, [key]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (form.password.length < 8) {
      toast.error('Password must be at least 8 characters.');
      return;
    }
    setLoading(true);
    try {
      const data = await register(form);
      toast.success('Account created! Check your email for a verification code 📧');
      // Admin → dashboard directly, owners → verify email first
      if (data.user?.role === 'admin') {
        navigate('/admin', { replace: true });
      } else {
        navigate('/verify-email', { replace: true, state: { email: form.email } });
      }
    } catch (err) {
      toast.error(err.response?.data?.error || 'Registration failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.page}>
      {/* Left decorative panel */}
      <div className={styles.art}>
        <div className={styles.artInner}>
          <div className={styles.brandMark}>
            <OrderlyIcon size={56} />
          </div>
          <h1>Start free today</h1>
          <p>Set up your restaurant in under 5 minutes. No credit card required.</p>
          <div className={styles.features}>
            {['Free plan available', 'Unlimited menu items', 'QR codes generated instantly', 'Real-time order alerts'].map((f) => (
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
          <div className={styles.mobileLogoWrap}>
            <OrderlyIcon size={44} />
            <span className={styles.mobileLogoText}>Orderly</span>
          </div>

          <div className={styles.formHeader}>
            <h2>Create account</h2>
            <p>Get your restaurant online in minutes</p>
          </div>

          <form onSubmit={handleSubmit} className={styles.form}>
            <div className="form-group">
              <label className="form-label">Your name</label>
              <div className={styles.inputWrap}>
                <User size={16} className={styles.inputIcon} />
                <input type="text" className={`form-input ${styles.inputPadded}`}
                  placeholder="John Doe" value={form.name} onChange={set('name')} required />
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Restaurant name</label>
              <div className={styles.inputWrap}>
                <Store size={16} className={styles.inputIcon} />
                <input type="text" className={`form-input ${styles.inputPadded}`}
                  placeholder="The Golden Fork" value={form.restaurantName} onChange={set('restaurantName')} required />
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Email</label>
              <div className={styles.inputWrap}>
                <Mail size={16} className={styles.inputIcon} />
                <input type="email" className={`form-input ${styles.inputPadded}`}
                  placeholder="you@restaurant.com" value={form.email} onChange={set('email')} required />
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Password</label>
              <div className={styles.inputWrap}>
                <Lock size={16} className={styles.inputIcon} />
                <input type="password" className={`form-input ${styles.inputPadded}`}
                  placeholder="Min. 8 characters" value={form.password} onChange={set('password')} required minLength={8} />
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Currency</label>
              <select className="form-input" value={form.currency} onChange={set('currency')}>
                <option value="USD">USD — US Dollar</option>
                <option value="EUR">EUR — Euro</option>
                <option value="GBP">GBP — British Pound</option>
                <option value="MAD">MAD — Moroccan Dirham</option>
                <option value="AED">AED — UAE Dirham</option>
                <option value="SAR">SAR — Saudi Riyal</option>
              </select>
            </div>

            <button
              type="submit"
              className="btn btn-primary btn-lg"
              style={{ width: '100%', justifyContent: 'center', marginTop: 8 }}
              disabled={loading}
            >
              {loading ? (
                <>
                  <div className="spinner" style={{ borderColor: 'rgba(255,255,255,.3)', borderTopColor: 'white' }} />
                  Creating…
                </>
              ) : (
                'Create my restaurant →'
              )}
            </button>
          </form>

          <p className={styles.switchLink}>
            Already have an account? <Link to="/login">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  );
}