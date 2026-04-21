import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import { LayoutDashboard, Store, LogOut, Tag, CreditCard } from 'lucide-react';
import styles from './Admin.module.css';

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

export default function AdminLayout() {
  const { logout } = useAuth();
  const navigate = useNavigate();

  return (
    <div className={styles.layout}>
      <aside className={styles.sidebar}>
        {/* ✅ Real logo in admin sidebar */}
        <div className={styles.logo}>
          <OrderlyIcon size={44} />
          <span className={styles.logoText}>Orderly</span>
        </div>
        <div className={styles.adminBadge}>Admin Panel</div>
        <nav className={styles.nav}>
          <NavLink to="/admin" end className={({ isActive }) => `${styles.link} ${isActive ? styles.active : ''}`}>
            <LayoutDashboard size={16} /> Dashboard
          </NavLink>
          <NavLink to="/admin/restaurants" className={({ isActive }) => `${styles.link} ${isActive ? styles.active : ''}`}>
            <Store size={16} /> Restaurants
          </NavLink>
          <NavLink to="/admin/promo" className={({ isActive }) => `${styles.link} ${isActive ? styles.active : ''}`}>
            <Tag size={16} /> Promo Codes
          </NavLink>
          <NavLink to="/admin/subscriptions" className={({ isActive }) => `${styles.link} ${isActive ? styles.active : ''}`}>
            <CreditCard size={16} /> Subscriptions
          </NavLink>
        </nav>
        <button className={styles.logout} onClick={() => { logout(); navigate('/login'); }}>
          <LogOut size={14} /> Sign out
        </button>
      </aside>
      <main className={styles.main}>
        <Outlet />
      </main>
    </div>
  );
}