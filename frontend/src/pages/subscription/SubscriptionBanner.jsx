/**
 * SubscriptionBanner
 * Inline alert shown at the top of dashboard pages when trial is expiring
 * or subscription has lapsed. Pass `compact` to suppress in tight layouts.
 */

import { useNavigate } from 'react-router-dom';
import { AlertTriangle, Clock } from 'lucide-react';
import { useSubscription } from '../../hooks/useSubscription.js';
import styles from './Subscription.module.css';

export default function SubscriptionBanner() {
  const navigate = useNavigate();
  const { isActive, isExpired, isCancelled, isTrial, daysRemaining } = useSubscription();

  // Nothing to show for healthy subscriptions with >3 days left
  if (isActive && (!isTrial || daysRemaining > 3)) return null;

  if (isExpired || isCancelled) {
    return (
      <div className={`${styles.banner} ${styles.bannerExpired}`}>
        <AlertTriangle size={20} className={styles.bannerIcon} />
        <div className={styles.bannerContent}>
          <div className={styles.bannerTitle}>Your subscription has expired</div>
          <div className={styles.bannerMessage}>
            Upgrade to restore full access to your dashboard.
          </div>
        </div>
        <button
          className={`${styles.bannerCta} ${styles.bannerCtaExpired}`}
          onClick={() => navigate('/dashboard/pricing')}
        >
          Upgrade Now
        </button>
      </div>
    );
  }

  // Trial ending soon
  if (isTrial && daysRemaining <= 3) {
    return (
      <div className={`${styles.banner} ${styles.bannerTrial}`}>
        <Clock size={20} className={styles.bannerIcon} />
        <div className={styles.bannerContent}>
          <div className={styles.bannerTitle}>
            {daysRemaining === 0 ? 'Trial expires today!' : `Trial ends in ${daysRemaining} day${daysRemaining !== 1 ? 's' : ''}`}
          </div>
          <div className={styles.bannerMessage}>
            Upgrade now to keep uninterrupted access.
          </div>
        </div>
        <button
          className={`${styles.bannerCta} ${styles.bannerCtaTrial}`}
          onClick={() => navigate('/dashboard/pricing')}
        >
          View Plans
        </button>
      </div>
    );
  }

  return null;
}
