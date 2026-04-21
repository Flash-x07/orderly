import { useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import { useSocket } from '../../hooks/useSocket.js';
import { useSubscription } from '../../hooks/useSubscription.js';
import SubscriptionBanner from '../subscription/SubscriptionBanner.jsx';
import toast from 'react-hot-toast';
import {
  LayoutDashboard, ClipboardList, UtensilsCrossed,
  QrCode, Settings, LogOut, Bell, Menu, X, Tag, Zap, PlusCircle,
} from 'lucide-react';
import styles from './Dashboard.module.css';

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

const NAV = [
  { to: '/dashboard',          icon: LayoutDashboard, label: 'Overview'  },
  { to: '/dashboard/orders',   icon: ClipboardList,   label: 'Orders'    },
  { to: '/dashboard/menu',     icon: UtensilsCrossed, label: 'Menu'      },
  { to: '/dashboard/tables',   icon: QrCode,          label: 'Tables'    },
  { to: '/dashboard/settings', icon: Settings,        label: 'Settings'  },
];

/**
 * RestaurantAvatar
 * Shows the restaurant logo if available, otherwise falls back to the first
 * letter of the restaurant name — same size and style as before.
 */
function RestaurantAvatar({ restaurant, className }) {
  const logo = restaurant?.logo;
  const letter = (restaurant?.name || 'R')[0].toUpperCase();

  if (logo) {
    return (
      <div className={className} style={{ padding: 0, overflow: 'hidden' }}>
        <img
          src={logo}
          alt={restaurant?.name || 'Restaurant logo'}
          style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 'inherit' }}
        />
      </div>
    );
  }

  return <div className={className}>{letter}</div>;
}

export default function DashboardLayout() {
  const { user, logout }    = useAuth();
  const navigate             = useNavigate();
  const [open, setOpen]      = useState(false);
  const [notifs, setNotifs]  = useState([]);
  const restaurantId = user?.restaurant?._id || (
    typeof user?.restaurant === 'string' ? user.restaurant : null
  );
  const { isActive, isTrial, isExpired, daysRemaining, plan } = useSubscription();

  useSocket(restaurantId, {
    onNewOrder: ({ order, message }) => {
      setNotifs((n) => [order, ...n].slice(0, 10));
      toast.custom((t) => (
        <div style={{
          background: '#1C1917', color: '#FDF8F4', padding: '14px 18px',
          borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '12px',
          boxShadow: '0 8px 30px rgba(0,0,0,.25)',
          animation: t.visible ? 'fadeIn .3s ease' : 'none',
        }}>
          <Bell size={18} style={{ color: '#FF6B35', flexShrink: 0 }} />
          <div>
            <strong style={{ fontSize: '.9rem' }}>{message}</strong>
            <div style={{ fontSize: '.8rem', opacity: .7, marginTop: 2 }}>
              Table {order.tableNumber} · {order.items.length} item(s) · ${order.total.toFixed(2)}
            </div>
          </div>
        </div>
      ), { duration: 6000 });
      try {
        const ctx = new (window.AudioContext || window.webkitAudioContext)();
        const o = ctx.createOscillator(); const g = ctx.createGain();
        o.connect(g); g.connect(ctx.destination);
        o.frequency.value = 880; g.gain.value = 0.3;
        o.start(); o.stop(ctx.currentTime + 0.15);
      } catch (_) {}
    },
  });

  const handleLogout = () => { logout(); navigate('/login'); };

  return (
    <div className={styles.layout}>
      <aside className={`${styles.sidebar} ${open ? styles.sidebarOpen : ''}`}>
        <div className={styles.sidebarTop}>
          <div className={styles.logoWrap}>
            <OrderlyIcon size={36} />
            <span className={styles.logoText}>Orderly</span>
          </div>
          <button className={styles.closeBtn} onClick={() => setOpen(false)}>
            <X size={20} />
          </button>
        </div>

        {/* Restaurant profile card + subscription status */}
        <div className={styles.restaurantInfo}>
          <RestaurantAvatar
            restaurant={user?.restaurant}
            className={styles.restaurantAvatar}
          />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className={styles.restaurantName}>
              {user?.restaurant?.name || (restaurantId ? 'My Restaurant' : 'No Restaurant')}
            </div>
            <div className={styles.restaurantPlan} style={{
              color: !restaurantId ? '#EA580C' : isExpired ? '#EF4444' : isTrial ? '#D97706' : '#22C55E',
            }}>
              {!restaurantId
                ? 'Not set up yet'
                : plan === 'none' || isExpired
                  ? '⚠ No active plan'
                  : isTrial
                    ? `Trial · ${daysRemaining}d left`
                    : `${plan} plan`}
            </div>
          </div>
        </div>

        {/* Create Restaurant CTA — only shown when user has no restaurant */}
        {!restaurantId && (
          <button
            style={{
              margin: '0 16px 12px',
              padding: '10px 16px',
              background: 'var(--brand)',
              color: 'white',
              border: 'none',
              borderRadius: '10px',
              fontSize: '0.8rem',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            }}
            onClick={() => { navigate('/dashboard/setup'); setOpen(false); }}
          >
            <PlusCircle size={14} /> Create Restaurant
          </button>
        )}

        {/* Quick upgrade CTA if expired/no plan */}
        {(!isActive || isExpired) && (
          <button
            style={{
              margin: '0 16px 12px',
              padding: '10px 16px',
              background: 'var(--brand)',
              color: 'white',
              border: 'none',
              borderRadius: '10px',
              fontSize: '0.8rem',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            }}
            onClick={() => { navigate('/dashboard/pricing'); setOpen(false); }}
          >
            <Zap size={14} /> Upgrade Now
          </button>
        )}

        {/* Promo code link for users who haven't used trial */}
        {!user?.trialUsed && plan === 'none' && (
          <button
            style={{
              margin: '0 16px 12px',
              padding: '8px 16px',
              background: 'rgba(255,255,255,.08)',
              color: 'rgba(255,255,255,.75)',
              border: '1px solid rgba(255,255,255,.15)',
              borderRadius: '10px',
              fontSize: '0.8rem',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            }}
            onClick={() => { navigate('/dashboard/activate'); setOpen(false); }}
          >
            <Tag size={13} /> Have a promo code?
          </button>
        )}

        <nav className={styles.nav}>
          {NAV.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/dashboard'}
              className={({ isActive }) => `${styles.navLink} ${isActive ? styles.navLinkActive : ''}`}
              onClick={() => setOpen(false)}
            >
              <Icon size={18} />
              {label}
              {label === 'Orders' && notifs.length > 0 && (
                <span className={styles.badge}>{notifs.length}</span>
              )}
            </NavLink>
          ))}
        </nav>

        <button className={styles.logoutBtn} onClick={handleLogout}>
          <LogOut size={16} /> Sign out
        </button>
      </aside>

      {open && <div className={styles.overlay} onClick={() => setOpen(false)} />}

      <div className={styles.main}>
        <header className={styles.topbar}>
          <button className={styles.menuBtn} onClick={() => setOpen(true)}>
            <Menu size={22} />
          </button>
          <div className={styles.topbarLogo}>
            <OrderlyIcon size={34} />
            <span style={{ fontFamily: "'DM Serif Display', serif", fontSize: '1.1rem', color: 'var(--text)' }}>Orderly</span>
          </div>
          <div className={styles.topbarRight}>
            <div className={styles.liveBadge}>
              <span className="live-dot" /> Live
            </div>
            {/* User avatar in topbar — shows photo or initial */}
            <div className={styles.userAvatar} title={user?.name}>
              {user?.avatar
                ? <img src={user.avatar} alt={user.name} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} />
                : user?.name?.[0]?.toUpperCase()
              }
            </div>
          </div>
        </header>
        <main className={styles.content}>
          <SubscriptionBanner />
          <Outlet />
        </main>
      </div>
    </div>
  );
}