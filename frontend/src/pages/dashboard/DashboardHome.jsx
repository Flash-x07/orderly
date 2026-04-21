import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import { useSocket } from '../../hooks/useSocket.js';
import api from '../../services/api.js';
import { format } from 'date-fns';
import {
  ShoppingBag, TrendingUp, Clock, DollarSign,
  ArrowRight, RefreshCw, Store, PlusCircle,
} from 'lucide-react';
import styles from './DashboardHome.module.css';

const STATUS_LABEL = {
  pending: 'Pending', accepted: 'Accepted', preparing: 'Preparing',
  ready: 'Ready', completed: 'Completed', rejected: 'Rejected',
};

/**
 * NoRestaurantState
 * Shown when the user is logged in but has no restaurant linked.
 * Gives them a friendly landing area with a CTA to create one.
 */
function NoRestaurantState({ userName }) {
  return (
    <div className="fade-up" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', textAlign: 'center', padding: '24px 16px' }}>
      <div style={{
        width: 80, height: 80, borderRadius: 24,
        background: '#FFF3EE',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        marginBottom: 24,
      }}>
        <Store size={38} color="var(--brand, #FF6B35)" />
      </div>
      <h2 style={{ fontSize: '1.6rem', fontWeight: 800, marginBottom: 8, color: 'var(--text, #1C1917)' }}>
        Welcome, {userName?.split(' ')[0]}!
      </h2>
      <p style={{ color: 'var(--muted, #78716C)', maxWidth: 400, lineHeight: 1.6, marginBottom: 32 }}>
        You don't have a restaurant set up yet. Whenever you're ready, create one to start accepting orders and managing your menu.
      </p>
      <Link
        to="/dashboard/setup"
        className="btn btn-primary"
        style={{ gap: 8, fontSize: '1rem', padding: '12px 28px' }}
      >
        <PlusCircle size={18} /> Create your restaurant
      </Link>
    </div>
  );
}

export default function DashboardHome() {
  const { user } = useAuth();
  const restaurantId = user?.restaurant?._id || user?.restaurant;

  const [stats, setStats]   = useState(null);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    if (!restaurantId) {
      setLoading(false);
      return;
    }
    try {
      const [statsRes, ordersRes] = await Promise.all([
        api.get(`/orders/restaurant/${restaurantId}/stats`),
        api.get(`/orders/restaurant/${restaurantId}?limit=8`),
      ]);
      setStats(statsRes.data);
      setOrders(ordersRes.data.orders);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [restaurantId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Live updates
  useSocket(restaurantId, {
    onNewOrder: ({ order }) => {
      setOrders((prev) => [order, ...prev].slice(0, 8));
      setStats((s) => s ? { ...s, todayOrders: s.todayOrders + 1, pendingOrders: s.pendingOrders + 1 } : s);
    },
    onOrderUpdated: ({ order }) => {
      setOrders((prev) => prev.map((o) => o._id === order._id ? order : o));
    },
  });

  const STAT_CARDS = stats ? [
    { label: "Today's Orders",   value: stats.todayOrders,               icon: ShoppingBag, color: '#3B82F6', bg: '#EFF6FF' },
    { label: 'Active Orders',    value: stats.pendingOrders,             icon: Clock,       color: '#F59E0B', bg: '#FFFBEB' },
    { label: "This Week",        value: `$${stats.weeklyRevenue.toFixed(2)}`, icon: TrendingUp,  color: '#22C55E', bg: '#F0FDF4' },
    { label: 'Total Revenue',    value: `$${stats.totalRevenue.toFixed(2)}`,  icon: DollarSign,  color: '#8B5CF6', bg: '#F5F3FF' },
  ] : [];

  if (loading) return (
    <div className={styles.loadingState}>
      <div className="spinner" style={{ width: 32, height: 32 }} />
    </div>
  );

  // No restaurant — show friendly state, not a redirect
  if (!restaurantId) return <NoRestaurantState userName={user?.name} />;

  return (
    <div className="fade-up">
      <div className={styles.header}>
        <div>
          <h2>Good {getGreeting()}, {user?.name?.split(' ')[0]} 👋</h2>
          <p>{format(new Date(), 'EEEE, MMMM d, yyyy')}</p>
        </div>
        <button className="btn btn-secondary btn-sm" onClick={fetchData}>
          <RefreshCw size={14} /> Refresh
        </button>
      </div>

      {/* Stats grid */}
      <div className="grid-4" style={{ marginBottom: 32 }}>
        {STAT_CARDS.map((card) => (
          <div key={card.label} className={`card ${styles.statCard}`}>
            <div className={styles.statIcon} style={{ background: card.bg, color: card.color }}>
              <card.icon size={20} />
            </div>
            <div className={styles.statValue}>{card.value}</div>
            <div className={styles.statLabel}>{card.label}</div>
          </div>
        ))}
      </div>

      {/* Recent orders */}
      <div className="card" style={{ overflow: 'hidden' }}>
        <div className={styles.tableHeader}>
          <h3>Recent Orders</h3>
          <Link to="/dashboard/orders" className="btn btn-ghost btn-sm">
            View all <ArrowRight size={14} />
          </Link>
        </div>

        {orders.length === 0 ? (
          <div className="empty-state">
            <ShoppingBag size={40} />
            <p>No orders yet. Share your QR codes to get started!</p>
          </div>
        ) : (
          <div className={styles.table}>
            <div className={styles.tableHead}>
              <span>Order</span><span>Table</span><span>Items</span>
              <span>Total</span><span>Status</span><span>Time</span>
            </div>
            {orders.map((order) => (
              <div key={order._id} className={styles.tableRow}>
                <span className={styles.orderNum}>{order.orderNumber}</span>
                <span>Table {order.tableNumber}</span>
                <span>{order.items.length} item{order.items.length !== 1 ? 's' : ''}</span>
                <span className={styles.total}>${order.total.toFixed(2)}</span>
                <span><span className={`badge badge-${order.status}`}>{STATUS_LABEL[order.status]}</span></span>
                <span className={styles.time}>{format(new Date(order.createdAt), 'HH:mm')}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'morning';
  if (h < 18) return 'afternoon';
  return 'evening';
}
