/**
 * PromoCodePage
 * /dashboard/activate
 * Shown to users with no active subscription so they can redeem a trial code.
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import api from '../../services/api.js';
import toast from 'react-hot-toast';
import { Tag, ArrowRight, Sparkles, ShieldCheck, Clock } from 'lucide-react';
import styles from './Subscription.module.css';

export default function PromoCodePage() {
  const { updateUser }        = useAuth();
  const navigate               = useNavigate();
  const [code, setCode]        = useState('');
  const [loading, setLoading]  = useState(false);
  const [success, setSuccess]  = useState(null);   // { message, expiresAt, daysRemaining }

  const handleRedeem = async (e) => {
    e.preventDefault();
    if (!code.trim()) return;

    setLoading(true);
    try {
      const { data } = await api.post('/promo/redeem', { code: code.trim() });
      setSuccess(data);

      // Sync auth context
      updateUser({
        subscriptionPlan:      'trial',
        subscriptionStatus:    'active',
        subscriptionExpiresAt: data.subscriptionExpiresAt,
        trialUsed:             true,
        plan:                  'trial',
      });

      toast.success('Trial activated! Enjoy your free access.');
      setTimeout(() => navigate('/dashboard'), 2000);
    } catch (err) {
      const msg = err?.response?.data?.error || 'Failed to redeem code. Please try again.';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className={styles.centeredPage}>
        <div className={styles.successCard}>
          <div className={styles.successIcon}><Sparkles size={32} /></div>
          <h2>Trial Activated!</h2>
          <p>{success.message}</p>
          <p className={styles.expiryNote}>
            Access expires on{' '}
            <strong>{new Date(success.subscriptionExpiresAt).toLocaleDateString('en-US', {
              year: 'numeric', month: 'long', day: 'numeric',
            })}</strong>
          </p>
          <p className={styles.redirectNote}>Redirecting to dashboard…</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.centeredPage}>
      <div className={styles.promoCard}>
        {/* Header */}
        <div className={styles.promoHeader}>
          <div className={styles.promoIconWrap}><Tag size={28} /></div>
          <h1>Activate Your Trial</h1>
          <p>Enter a promo code to get free access. No credit card required.</p>
        </div>

        {/* Form */}
        <form className={styles.promoForm} onSubmit={handleRedeem}>
          <div className={styles.codeInputWrap}>
            <Tag size={16} className={styles.inputIcon} />
            <input
              type="text"
              className={styles.codeInput}
              placeholder="YOURCODE"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              maxLength={32}
              autoFocus
              autoComplete="off"
              spellCheck={false}
              disabled={loading}
            />
          </div>

          <button
            type="submit"
            className={`btn btn-primary ${styles.redeemBtn}`}
            disabled={loading || !code.trim()}
          >
            {loading ? (
              <><span className="spinner" style={{ width: 16, height: 16, borderColor: 'rgba(255,255,255,.3)', borderTopColor: '#fff' }} /> Activating…</>
            ) : (
              <>Activate Trial <ArrowRight size={16} /></>
            )}
          </button>
        </form>

        {/* Trust badges */}
        <div className={styles.trustRow}>
          <div className={styles.trustItem}>
            <ShieldCheck size={15} />
            <span>No credit card needed</span>
          </div>
          <div className={styles.trustItem}>
            <Clock size={15} />
            <span>One trial per account</span>
          </div>
        </div>

        {/* Upgrade link */}
        <p className={styles.upgradeHint}>
          Don't have a code?{' '}
          <button
            className={styles.linkBtn}
            onClick={() => navigate('/dashboard/pricing')}
          >
            View paid plans →
          </button>
        </p>
      </div>
    </div>
  );
}
