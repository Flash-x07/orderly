/**
 * SetupRestaurantPage
 * ─────────────────────────────────────────────────────────────────────────────
 * Optional page — reached only when the user explicitly chooses to create a
 * restaurant (e.g. via the sidebar CTA or the DashboardHome empty state).
 * It is no longer shown automatically after login.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import api from '../../services/api.js';
import toast from 'react-hot-toast';
import { Store, ArrowRight, ArrowLeft, LogOut } from 'lucide-react';

export default function SetupRestaurantPage() {
  const { user, logout, setRestaurant } = useAuth();
  const navigate = useNavigate();

  const [name, setName]         = useState('');
  const [currency, setCurrency] = useState('USD');
  const [loading, setLoading]   = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error('Please enter a restaurant name.');
      return;
    }
    setLoading(true);
    try {
      const { data } = await api.post('/restaurants', { name: name.trim(), currency });
      // Update context so the user immediately has a restaurant
      setRestaurant(data.restaurant);
      toast.success('Restaurant created! Welcome to your dashboard.');
      navigate('/dashboard', { replace: true });
    } catch (err) {
      const msg = err?.response?.data?.error || 'Failed to create restaurant.';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'var(--cream, #FDF8F4)',
      padding: '24px 16px',
    }}>
      <div style={{
        width: '100%',
        maxWidth: 480,
        background: 'white',
        borderRadius: 20,
        padding: '48px 40px',
        boxShadow: '0 4px 40px rgba(0,0,0,.08)',
        border: '1px solid var(--border, #EDE8E3)',
      }}>
        {/* Back link */}
        <button
          onClick={() => navigate('/dashboard')}
          style={{
            background: 'none',
            border: 'none',
            color: 'var(--muted)',
            fontSize: '0.875rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            padding: 0,
            marginBottom: 28,
          }}
        >
          <ArrowLeft size={14} /> Back to dashboard
        </button>

        {/* Icon */}
        <div style={{
          width: 64, height: 64, borderRadius: 18,
          background: '#FFF3EE',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          marginBottom: 24,
        }}>
          <Store size={30} color="var(--brand, #FF6B35)" />
        </div>

        {/* Heading */}
        <h1 style={{ fontSize: '1.6rem', fontWeight: 800, marginBottom: 8, color: 'var(--text, #1C1917)' }}>
          Create your restaurant
        </h1>
        <p style={{ color: 'var(--muted, #78716C)', marginBottom: 32, lineHeight: 1.6 }}>
          Hi {user?.name?.split(' ')[0]}! Set up your restaurant to start managing orders, your menu, and table QR codes.
        </p>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 20 }}>
            <label
              htmlFor="rname"
              style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, marginBottom: 8, color: 'var(--text)' }}
            >
              Restaurant name
            </label>
            <input
              id="rname"
              className="form-input"
              type="text"
              placeholder="e.g. The Golden Fork"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
              required
              style={{ width: '100%' }}
            />
          </div>

          <div style={{ marginBottom: 32 }}>
            <label
              htmlFor="currency"
              style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, marginBottom: 8, color: 'var(--text)' }}
            >
              Currency
            </label>
            <select
              id="currency"
              className="form-input"
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
              style={{ width: '100%' }}
            >
              {['USD', 'EUR', 'GBP', 'CAD', 'AUD', 'MAD', 'AED', 'SAR', 'INR', 'TRY'].map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            style={{ width: '100%', gap: 8 }}
            disabled={loading}
          >
            {loading ? (
              <><div className="spinner" style={{ width: 16, height: 16, borderColor: 'rgba(255,255,255,.4)', borderTopColor: '#fff' }} /> Creating…</>
            ) : (
              <>Create Restaurant <ArrowRight size={16} /></>
            )}
          </button>
        </form>

        <button
          onClick={handleLogout}
          style={{
            marginTop: 24,
            background: 'none',
            border: 'none',
            color: 'var(--muted)',
            fontSize: '0.875rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            padding: 0,
          }}
        >
          <LogOut size={14} /> Sign out
        </button>
      </div>
    </div>
  );
}

