/**
 * PricingPage
 * /dashboard/pricing
 *
 * CHANGED: "Get Pro / Premium" now submits a request for admin approval
 * instead of granting access immediately. User sees a "pending" state
 * and gets a real-time notification when approved or rejected.
 */

import { useState, useEffect } from 'react';
import { useNavigate }         from 'react-router-dom';
import { useAuth }             from '../../context/AuthContext.jsx';
import { useSubscription }     from '../../hooks/useSubscription.js';
import api                     from '../../services/api.js';
import toast                   from 'react-hot-toast';
import {
  Check, Zap, Crown, Tag, ArrowRight,
  BarChart2, Bell, Users, Headphones, Clock,
} from 'lucide-react';
import styles from './Subscription.module.css';

const PLANS = [
  {
    id:    'pro',
    name:  'Pro',
    icon:  Zap,
    color: '#3B82F6',
    bg:    '#EFF6FF',
    priceWeekly:  9,
    priceMonthly: 29,
    description: 'Everything you need to run a modern restaurant.',
    features: [
      'Unlimited menu items',
      'Real-time order tracking',
      'QR code table management',
      'Basic analytics dashboard',
      'Email support',
    ],
  },
  {
    id:      'premium',
    name:    'Premium',
    icon:    Crown,
    color:   '#FF6B35',
    bg:      '#FFF3EE',
    priceWeekly:  19,
    priceMonthly: 59,
    description: 'Full power for high-volume restaurants.',
    popular: true,
    features: [
      'Everything in Pro',
      'Advanced analytics & exports',
      'Multi-staff notifications',
      'Custom branding',
      'Priority support',
      'Early access to new features',
    ],
  },
];

export default function PricingPage() {
  const { refreshSubscription }                            = useAuth();
  const { plan: currentPlan, isTrial, daysRemaining,
          subscriptionStatus, pendingRequest, refetch }    = useSubscription();
  const navigate                                           = useNavigate();

  const [cycle, setCycle]             = useState('monthly');
  const [loadingPlan, setLoadingPlan] = useState(null);

  // ── Real-time: listen for approval / rejection ──────────────────────────────
  useEffect(() => {
    // Import socket lazily so non-socket pages don't break
    import('../../hooks/useSocket.js').then(({ default: _unused }) => {}).catch(() => {});

    const handler = async (event) => {
      if (event.detail?.type === 'subscription_approved') {
        toast.success('🎉 Your subscription has been approved!');
        await refreshSubscription();
        await refetch();
        navigate('/dashboard');
      }
      if (event.detail?.type === 'subscription_rejected') {
        toast.error('Your subscription request was not approved.');
        await refreshSubscription();
        await refetch();
      }
    };
    window.addEventListener('orderly_socket', handler);
    return () => window.removeEventListener('orderly_socket', handler);
  }, [refreshSubscription, refetch, navigate]);

  const handleRequest = async (planId) => {
    setLoadingPlan(planId);
    try {
      await api.post('/subscription/request', { plan: planId, billingCycle: cycle });
      await refreshSubscription();
      await refetch();
      toast.success('Request submitted! You\'ll be notified once the admin reviews it.', { duration: 5000 });
    } catch (err) {
      const msg = err?.response?.data?.error || 'Request failed. Please try again.';
      toast.error(msg);
    } finally {
      setLoadingPlan(null);
    }
  };

  const isPending = subscriptionStatus === 'pending';

  return (
    <div className={`${styles.pricingPage} fade-up`}>

      {/* Trial expiry banner */}
      {isTrial && daysRemaining <= 3 && (
        <div className={styles.trialWarning}>
          <Bell size={16} />
          {daysRemaining === 0
            ? 'Your trial expires today! Request a plan now.'
            : `Your trial expires in ${daysRemaining} day${daysRemaining !== 1 ? 's' : ''}. Request a plan to keep access.`}
        </div>
      )}

      {/* Pending approval banner */}
      {isPending && pendingRequest && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 12,
          background: '#FFFBEB', border: '1px solid #FDE68A',
          borderRadius: 'var(--radius)', padding: '14px 18px', marginBottom: 28,
          fontSize: '0.9rem', color: '#92400E',
        }}>
          <Clock size={18} style={{ flexShrink: 0 }} />
          <div>
            <strong>Request pending admin approval</strong>
            <div style={{ fontSize: '0.825rem', marginTop: 2, opacity: .85 }}>
              You requested <strong>{pendingRequest.plan}</strong> ({pendingRequest.billingCycle}).
              You'll receive an email and notification once reviewed.
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className={styles.pricingHeader}>
        <h1>Choose Your Plan</h1>
        <p>Submit a request — our admin will review and activate your subscription.</p>

        <div className={styles.cycleToggle}>
          <button
            className={`${styles.cycleBtn} ${cycle === 'weekly' ? styles.cycleBtnActive : ''}`}
            onClick={() => setCycle('weekly')}
          >
            Weekly
          </button>
          <button
            className={`${styles.cycleBtn} ${cycle === 'monthly' ? styles.cycleBtnActive : ''}`}
            onClick={() => setCycle('monthly')}
          >
            Monthly
            <span className={styles.saveBadge}>Save 50%</span>
          </button>
        </div>
      </div>

      {/* Plan cards */}
      <div className={styles.plansGrid}>
        {PLANS.map((p) => {
          const Icon      = p.icon;
          const price     = cycle === 'weekly' ? p.priceWeekly : p.priceMonthly;
          const isCurrent = currentPlan === p.id && subscriptionStatus === 'active';
          const isThisPending = isPending && pendingRequest?.plan === p.id;
          const isLoading = loadingPlan === p.id;

          return (
            <div
              key={p.id}
              className={`${styles.planCard} ${p.popular ? styles.planCardPopular : ''} ${isCurrent ? styles.planCardCurrent : ''}`}
            >
              {p.popular    && <div className={styles.popularBadge}>Most Popular</div>}
              {isCurrent    && <div className={styles.currentBadge}>Current Plan</div>}
              {isThisPending && (
                <div className={styles.currentBadge} style={{ background: '#D97706' }}>
                  Pending Approval
                </div>
              )}

              <div className={styles.planIconWrap} style={{ background: p.bg, color: p.color }}>
                <Icon size={24} />
              </div>

              <h2 className={styles.planName}>{p.name}</h2>
              <p className={styles.planDesc}>{p.description}</p>

              <div className={styles.planPrice}>
                <span className={styles.priceCurrency}>$</span>
                <span className={styles.priceAmount}>{price}</span>
                <span className={styles.pricePer}>/{cycle === 'weekly' ? 'wk' : 'mo'}</span>
              </div>

              <ul className={styles.featureList}>
                {p.features.map((f) => (
                  <li key={f} className={styles.featureItem}>
                    <Check size={15} className={styles.featureCheck} />
                    {f}
                  </li>
                ))}
              </ul>

              <button
                className={`${styles.upgradeBtn} ${p.popular ? styles.upgradeBtnPrimary : styles.upgradeBtnSecondary}`}
                onClick={() => handleRequest(p.id)}
                disabled={isLoading || isCurrent || isPending}
              >
                {isLoading ? (
                  <><span className="spinner" style={{ width: 14, height: 14, borderColor: 'rgba(255,255,255,.3)', borderTopColor: '#fff' }} /> Submitting…</>
                ) : isCurrent ? (
                  '✓ Current Plan'
                ) : isThisPending ? (
                  <><Clock size={14} /> Awaiting Approval</>
                ) : isPending ? (
                  'Request Pending'
                ) : (
                  <>Request {p.name} <ArrowRight size={14} /></>
                )}
              </button>
            </div>
          );
        })}
      </div>

      {/* Promo code link */}
      <div className={styles.promoLink}>
        <Tag size={14} />
        <span>Have a promo code? </span>
        <button className={styles.linkBtn} onClick={() => navigate('/dashboard/activate')}>
          Activate a free trial →
        </button>
      </div>

      {/* Feature highlights */}
      <div className={styles.featureHighlights}>
        {[
          { icon: BarChart2,   label: 'Real-time analytics'  },
          { icon: Bell,        label: 'Instant order alerts'  },
          { icon: Users,       label: 'Staff notifications'   },
          { icon: Headphones,  label: 'Dedicated support'     },
        ].map(({ icon: I, label }) => (
          <div className={styles.highlight} key={label}>
            <I size={20} /><span>{label}</span>
          </div>
        ))}
      </div>

      <p className={styles.stripeNote}>
        🔒 Admin-reviewed subscriptions · No hidden fees · Cancel anytime
      </p>
    </div>
  );
}
