/**
 * ExpiredPage
 * /dashboard/expired
 * Full-page block shown when subscription has lapsed.
 */

import { useNavigate } from 'react-router-dom';
import { ShieldOff, Tag, Zap } from 'lucide-react';
import styles from './Subscription.module.css';

export default function ExpiredPage() {
  const navigate = useNavigate();

  return (
    <div className={styles.centeredPage}>
      <div className={styles.promoCard} style={{ textAlign: 'center', maxWidth: 480 }}>
        <div className={styles.promoIconWrap} style={{ background: '#FEF2F2', color: '#DC2626', margin: '0 auto 20px' }}>
          <ShieldOff size={28} />
        </div>

        <h1 style={{ fontFamily: "'DM Serif Display', serif", fontSize: '1.75rem', marginBottom: 12 }}>
          Your trial has ended
        </h1>

        <p style={{ color: 'var(--text-secondary)', lineHeight: 1.7, marginBottom: 32 }}>
          Upgrade to continue using Orderly and keep your restaurant running
          smoothly with real-time orders, analytics, and QR table management.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <button
            className="btn btn-primary"
            style={{ width: '100%', padding: '14px', fontSize: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
            onClick={() => navigate('/dashboard/pricing')}
          >
            <Zap size={16} /> View Pricing Plans
          </button>

          <button
            className="btn btn-secondary"
            style={{ width: '100%', padding: '14px', fontSize: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
            onClick={() => navigate('/dashboard/activate')}
          >
            <Tag size={16} /> Redeem a Promo Code
          </button>
        </div>
      </div>
    </div>
  );
}
