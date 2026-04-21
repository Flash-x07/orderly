import { useState, useEffect } from 'react';
import api from '../../services/api.js';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { ToggleLeft, ToggleRight, Search, Trash2 } from 'lucide-react';

export default function AdminRestaurants() {
  const [restaurants, setRestaurants] = useState([]);
  const [loading, setLoading]         = useState(true);
  const [search, setSearch]           = useState('');
  const [deletingId, setDeletingId]   = useState(null);

  const fetchData = async (q = '') => {
    setLoading(true);
    try {
      const res = await api.get(`/admin/restaurants?search=${q}&limit=50`);
      setRestaurants(res.data.restaurants);
    } catch (e) { toast.error('Failed to load.'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, []);

  const toggle = async (id) => {
    try {
      const res = await api.patch(`/admin/restaurants/${id}/toggle`);
      setRestaurants((prev) => prev.map((r) => r._id === id ? res.data.restaurant : r));
      toast.success(res.data.message);
    } catch (e) { toast.error('Failed.'); }
  };

  const updatePlan = async (userId, plan) => {
    try {
      // When assigning a real plan, also set status to active so the user gets access
      const status = ['pro', 'premium', 'trial'].includes(plan) ? 'active' : undefined;
      await api.patch(`/admin/users/${userId}/plan`, { plan, ...(status ? { status } : {}) });
      toast.success(`Plan updated to ${plan}.`);
      fetchData(search);
    } catch (e) { toast.error('Failed to update plan.'); }
  };

  const deleteRestaurant = async (id, name) => {
    if (!window.confirm(`Are you sure you want to permanently delete "${name}"?\nThis will delete all tables, menu items, and orders.`)) return;
    setDeletingId(id);
    try {
      await api.delete(`/admin/restaurants/${id}`);
      toast.success(`"${name}" deleted successfully.`);
      setRestaurants((prev) => prev.filter((r) => r._id !== id));
    } catch (e) {
      toast.error(e?.response?.data?.error || 'Failed to delete.');
    } finally {
      setDeletingId(null);
    }
  };

  // Plan badge colors
  const planColor = {
    free:    { bg: '#F3F4F6', color: '#6B7280' },
    trial:   { bg: '#FEF3C7', color: '#D97706' },
    pro:     { bg: '#EFF6FF', color: '#3B82F6' },
    premium: { bg: '#FFF3EE', color: '#FF6B35' },
  };

  return (
    <div className="fade-up">
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24, flexWrap: 'wrap' }}>
        <h2 style={{ flex: 1 }}>Restaurants</h2>
        <div style={{ position: 'relative' }}>
          <Search size={15} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--muted)' }} />
          <input
            className="form-input"
            placeholder="Search…"
            style={{ paddingLeft: 36, width: 220 }}
            value={search}
            onChange={(e) => { setSearch(e.target.value); fetchData(e.target.value); }}
          />
        </div>
      </div>

      {/* Legend */}
      <div style={{ display: 'flex', gap: 20, marginBottom: 16, fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
        <span>🟢 <strong>Active</strong> = restaurant is visible to customers</span>
        <span>🔴 <strong>Disabled</strong> = restaurant is hidden from customers</span>
      </div>

      <div className="card" style={{ overflow: 'hidden' }}>
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 64 }}>
            <div className="spinner" style={{ width: 28, height: 28 }} />
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
              <thead>
                <tr style={{ background: 'var(--cream)', textAlign: 'left' }}>
                  {['Restaurant', 'Owner', 'Plan', 'Visibility', 'Created', 'Actions'].map((h) => (
                    <th key={h} style={{ padding: '12px 16px', color: 'var(--text-secondary)', fontWeight: 600, fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.04em', whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {restaurants.map((r) => {
                  const plan = r.owner?.subscriptionPlan || 'free';
                  const pc   = planColor[plan] || planColor.free;
                  return (
                    <tr key={r._id} style={{ borderTop: '1px solid var(--border)' }}>
                      <td style={{ padding: '12px 16px', fontWeight: 600 }}>{r.name}</td>
                      <td style={{ padding: '12px 16px', color: 'var(--text-secondary)' }}>
                        {r.owner?.name}<br /><small>{r.owner?.email}</small>
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <select
                          style={{
                            border: `1px solid ${pc.color}`,
                            borderRadius: 6,
                            padding: '4px 8px',
                            fontSize: '0.8rem',
                            cursor: 'pointer',
                            background: pc.bg,
                            color: pc.color,
                            fontWeight: 600,
                          }}
                          value={plan}
                          onChange={(e) => updatePlan(r.owner._id, e.target.value)}
                        >
                          {['free', 'trial', 'pro', 'premium'].map((p) => (
                            <option key={p} value={p}>{p}</option>
                          ))}
                        </select>
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <span className={`badge ${r.isActive ? 'badge-completed' : 'badge-rejected'}`}>
                          {r.isActive ? 'Visible' : 'Hidden'}
                        </span>
                      </td>
                      <td style={{ padding: '12px 16px', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
                        {format(new Date(r.createdAt), 'MMM d, yyyy')}
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                          {/* Toggle visibility */}
                          <button
                            className="btn btn-ghost btn-sm"
                            onClick={() => toggle(r._id)}
                            title={r.isActive ? 'Hide from customers' : 'Show to customers'}
                          >
                            {r.isActive
                              ? <ToggleRight size={20} style={{ color: 'var(--success)' }} />
                              : <ToggleLeft size={20} style={{ color: 'var(--muted)' }} />
                            }
                          </button>

                          {/* Delete */}
                          <button
                            className="btn btn-ghost btn-sm"
                            onClick={() => deleteRestaurant(r._id, r.name)}
                            disabled={deletingId === r._id}
                            title="Delete restaurant permanently"
                            style={{ color: '#EF4444' }}
                          >
                            {deletingId === r._id
                              ? <div className="spinner" style={{ width: 14, height: 14 }} />
                              : <Trash2 size={16} />
                            }
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {restaurants.length === 0 && (
              <div className="empty-state"><p>No restaurants found.</p></div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}