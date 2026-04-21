import { useState, useEffect } from 'react';
import api from '../../services/api.js';
import { Store, Users, ShoppingBag, DollarSign } from 'lucide-react';

export default function AdminDashboard() {
  const [stats, setStats] = useState(null);

  useEffect(() => {
    api.get('/admin/stats').then((r) => setStats(r.data)).catch(console.error);
  }, []);

  const CARDS = stats ? [
    { label: 'Total Restaurants', value: stats.totalRestaurants, icon: Store,       color: '#3B82F6', bg: '#EFF6FF' },
    { label: 'Restaurant Owners', value: stats.totalUsers,       icon: Users,       color: '#8B5CF6', bg: '#F5F3FF' },
    { label: 'Total Orders',      value: stats.totalOrders,      icon: ShoppingBag, color: '#F59E0B', bg: '#FFFBEB' },
    { label: 'Platform Revenue',  value: `$${stats.totalRevenue?.toFixed(2)}`, icon: DollarSign, color: '#22C55E', bg: '#F0FDF4' },
  ] : [];

  return (
    <div className="fade-up">
      <h2 style={{ marginBottom: 6 }}>Platform Overview</h2>
      <p style={{ color: 'var(--text-secondary)', marginBottom: 28, fontSize: '0.9rem' }}>Super admin dashboard</p>
      <div className="grid-4">
        {CARDS.map((c) => (
          <div key={c.label} className="card" style={{ padding: 22 }}>
            <div style={{ width: 44, height: 44, background: c.bg, color: c.color, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}>
              <c.icon size={20} />
            </div>
            <div style={{ fontFamily: "'DM Serif Display', serif", fontSize: '1.75rem', color: 'var(--text)' }}>{c.value}</div>
            <div style={{ fontSize: '0.825rem', color: 'var(--text-secondary)', fontWeight: 500 }}>{c.label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
