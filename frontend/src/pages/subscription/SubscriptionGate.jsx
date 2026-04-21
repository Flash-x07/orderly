/**
 * SubscriptionGate
 * Wraps any premium feature. If the subscription is not active,
 * renders a blurred overlay with an upgrade prompt instead.
 *
 * Usage:
 *   <SubscriptionGate>
 *     <SomePremiumFeature />
 *   </SubscriptionGate>
 */

import { useNavigate } from 'react-router-dom';
import { Lock } from 'lucide-react';
import { useSubscription } from '../../hooks/useSubscription.js';
import styles from './Subscription.module.css';

export default function SubscriptionGate({ children, message }) {
  const navigate = useNavigate();
  const { isActive, loading } = useSubscription();

  if (loading) return children;     // don't flash gate while loading

  if (isActive) return children;

  return (
    <div className={styles.featureGate}>
      <div style={{ opacity: 0.3, pointerEvents: 'none', userSelect: 'none' }}>
        {children}
      </div>
      <div className={styles.featureGateOverlay}>
        <Lock size={28} style={{ color: 'var(--brand)' }} />
        <p>{message || 'This feature requires an active subscription.'}</p>
        <button
          className="btn btn-primary btn-sm"
          onClick={() => navigate('/dashboard/pricing')}
        >
          View Plans
        </button>
      </div>
    </div>
  );
}
