import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import { useSubscription } from '../../hooks/useSubscription.js';
import api from '../../services/api.js';
import toast from 'react-hot-toast';
import { Save, Zap, Crown, Tag, AlertTriangle, CheckCircle, Clock, Store } from 'lucide-react';
import ImageUploader from '../../components/ImageUploader.jsx';
import styles from './SettingsPage.module.css';

// ── Inline subscription section ────────────────────────────────────────────────
function SubscriptionSection() {
  const navigate = useNavigate();
  const { isActive, isTrial, isExpired, isCancelled, isPro, isPremium, plan, daysRemaining, status } = useSubscription();

  const planLabel = {
    none:    'No Active Plan',
    trial:   'Trial',
    pro:     'Pro',
    premium: 'Premium',
  }[plan] || 'None';

  const statusColor = isActive
    ? isTrial && daysRemaining <= 3 ? '#D97706' : '#22C55E'
    : '#EF4444';

  const StatusIcon = isActive ? (isTrial && daysRemaining <= 3 ? Clock : CheckCircle) : AlertTriangle;

  return (
    <div style={{ marginTop: 24 }}>
      <div className="divider" />
      <p style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text)', marginBottom: 16, marginTop: 16 }}>
        Subscription
      </p>

      <div style={{
        background: 'var(--cream)',
        border: '1.5px solid var(--border)',
        borderRadius: 'var(--radius)',
        padding: '20px 20px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: 16,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{
            width: 44, height: 44, borderRadius: 12,
            background: isPremium ? '#FFF3EE' : isPro ? '#EFF6FF' : '#F3F4F6',
            color: isPremium ? 'var(--brand)' : isPro ? '#3B82F6' : 'var(--muted)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            {isPremium ? <Crown size={20} /> : <Zap size={20} />}
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--text)' }}>
              {planLabel}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.8125rem', color: statusColor }}>
              <StatusIcon size={13} />
              {isActive
                ? isTrial
                  ? `${daysRemaining} day${daysRemaining !== 1 ? 's' : ''} remaining`
                  : `Active · renews ${status?.subscriptionExpiresAt ? new Date(status.subscriptionExpiresAt).toLocaleDateString() : '—'}`
                : isExpired ? 'Expired' : isCancelled ? 'Cancelled' : 'Inactive'}
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          {!isActive || isExpired || isCancelled ? (
            <>
              <button className="btn btn-primary btn-sm" onClick={() => navigate('/dashboard/pricing')}>
                <Zap size={13} /> Upgrade
              </button>
              {!status?.trialUsed && (
                <button className="btn btn-secondary btn-sm" onClick={() => navigate('/dashboard/activate')}>
                  <Tag size={13} /> Use Promo Code
                </button>
              )}
            </>
          ) : isTrial ? (
            <button className="btn btn-primary btn-sm" onClick={() => navigate('/dashboard/pricing')}>
              <Zap size={13} /> Upgrade Now
            </button>
          ) : (
            <button className="btn btn-secondary btn-sm" onClick={() => navigate('/dashboard/pricing')}>
              Manage Plan
            </button>
          )}
        </div>
      </div>

      {!status?.trialUsed && plan === 'none' && (
        <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', marginTop: 10 }}>
          💡 Have a promo code? <button
            style={{ background: 'none', border: 'none', color: 'var(--brand)', fontWeight: 600, cursor: 'pointer', fontSize: 'inherit', padding: 0 }}
            onClick={() => navigate('/dashboard/activate')}
          >Activate a free trial →</button>
        </p>
      )}
    </div>
  );
}

// ── No-restaurant banner ───────────────────────────────────────────────────────
function NoRestaurantBanner() {
  return (
    <div style={{
      background: '#FFF7ED',
      border: '1.5px solid #FDBA74',
      borderRadius: 'var(--radius)',
      padding: '24px 28px',
      display: 'flex',
      alignItems: 'flex-start',
      gap: 16,
      marginBottom: 28,
    }}>
      <Store size={28} style={{ color: '#EA580C', flexShrink: 0, marginTop: 2 }} />
      <div>
        <p style={{ fontWeight: 700, fontSize: '1rem', color: '#9A3412', marginBottom: 6 }}>
          No restaurant linked
        </p>
        <p style={{ color: '#C2410C', fontSize: '0.875rem', lineHeight: 1.6, marginBottom: 12 }}>
          Your account isn't linked to a restaurant yet — it may have been removed, or you
          haven't created one yet. Restaurant settings and logo upload are disabled until you
          create a restaurant.
        </p>
        <a
          href="/dashboard/setup"
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            background: '#EA580C', color: 'white', borderRadius: 8,
            padding: '8px 16px', fontSize: '0.875rem', fontWeight: 600,
            textDecoration: 'none',
          }}
        >
          Create your restaurant →
        </a>
      </div>
    </div>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────────
export default function SettingsPage() {
  const { user, updateUser, updateRestaurantData } = useAuth();

  // Resolve restaurant ID safely — null if restaurant was deleted
  const restaurantId = user?.restaurant?._id || (
    typeof user?.restaurant === 'string' ? user.restaurant : null
  );
  const restaurantMissing = !restaurantId;

  const [rForm, setRForm] = useState({
    name: '', description: '', cuisine: '', phone: '', currency: 'USD',
    settings: { estimatedPrepTime: 20, orderConfirmationMessage: '' },
  });
  const [uForm, setUForm] = useState({ name: '', currentPassword: '', newPassword: '' });

  const [pendingAvatar, setPendingAvatar] = useState(null);
  const [pendingLogo,   setPendingLogo]   = useState(null);

  const [saving1, setSaving1] = useState(false);
  const [saving2, setSaving2] = useState(false);
  const [savingLogo,   setSavingLogo]   = useState(false);
  const [savingAvatar, setSavingAvatar] = useState(false);

  // ── Fetch restaurant settings once on mount (only if restaurant exists) ──────
  // Use a ref to guarantee the error toast fires at most once per mount.
  const loadErrorShown = useRef(false);

  useEffect(() => {
    if (!restaurantId) return; // nothing to fetch — restaurant is gone

    let cancelled = false;

    const fetchRestaurant = async () => {
      try {
        const res = await api.get(`/restaurants/${restaurantId}`);
        if (cancelled) return;

        // Backend may return { success: false, code: 'RESTAURANT_NOT_FOUND' }
        if (res.data?.code === 'RESTAURANT_NOT_FOUND') return;

        const r = res.data.restaurant;
        setRForm({
          name:        r.name        || '',
          description: r.description || '',
          cuisine:     r.cuisine     || '',
          phone:       r.phone       || '',
          currency:    r.currency    || 'USD',
          settings: {
            estimatedPrepTime:        r.settings?.estimatedPrepTime        || 20,
            orderConfirmationMessage: r.settings?.orderConfirmationMessage || '',
          },
        });
        loadErrorShown.current = false; // reset on success
      } catch (err) {
        if (cancelled) return;
        // Only show one toast — prevent repeated errors on re-renders
        if (!loadErrorShown.current) {
          loadErrorShown.current = true;
          // Silently ignore RESTAURANT_NOT_FOUND (handled by banner above)
          if (err.response?.data?.code !== 'RESTAURANT_NOT_FOUND') {
            toast.error('Failed to load restaurant settings.');
          }
        }
      }
    };

    fetchRestaurant();
    return () => { cancelled = true; };
    // Intentionally omit restaurantId from deps after first fetch —
    // restaurantId is stable; including it would cause loops if parent re-renders.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [restaurantId]);

  // Sync user name into profile form whenever user changes
  useEffect(() => {
    setUForm((f) => ({ ...f, name: user?.name || '' }));
  }, [user?.name]);

  // ── Save restaurant general settings ──────────────────────────────────────────
  const saveRestaurant = async (e) => {
    e.preventDefault();
    if (restaurantMissing) return;
    setSaving1(true);
    try {
      await api.put(`/restaurants/${restaurantId}`, rForm);
      toast.success('Restaurant settings saved.');
    } catch (err) {
      const code = err.response?.data?.code;
      if (code === 'RESTAURANT_NOT_FOUND') {
        toast.error('Restaurant no longer exists. Please contact support.');
      } else {
        toast.error('Save failed.');
      }
    } finally { setSaving1(false); }
  };

  // ── Save restaurant logo ───────────────────────────────────────────────────────
  const saveLogo = async () => {
    if (pendingLogo === null || restaurantMissing) return;
    setSavingLogo(true);
    try {
      const { data } = await api.put(`/restaurants/${restaurantId}/logo`, { logo: pendingLogo });
      updateRestaurantData({ logo: data.logo });
      setPendingLogo(null);
      toast.success('Logo updated!');
    } catch (err) {
      const code = err.response?.data?.code;
      if (code === 'RESTAURANT_NOT_FOUND') {
        toast.error('Restaurant no longer exists.');
      } else {
        toast.error('Failed to update logo.');
      }
    } finally {
      setSavingLogo(false);
    }
  };

  // ── Save profile (name + password) ────────────────────────────────────────────
  const saveProfile = async (e) => {
    e.preventDefault();
    setSaving2(true);
    try {
      const payload = { name: uForm.name };
      if (uForm.currentPassword) {
        payload.currentPassword = uForm.currentPassword;
        payload.newPassword = uForm.newPassword;
      }
      await api.put('/auth/profile', payload);
      updateUser({ name: uForm.name });
      toast.success('Profile updated.');
      setUForm((f) => ({ ...f, currentPassword: '', newPassword: '' }));
    } catch (e) {
      toast.error(e.response?.data?.error || 'Update failed.');
    } finally { setSaving2(false); }
  };

  // ── Save avatar ────────────────────────────────────────────────────────────────
  const saveAvatar = async () => {
    if (pendingAvatar === null) return;
    setSavingAvatar(true);
    try {
      const { data } = await api.put('/auth/avatar', { avatar: pendingAvatar });
      updateUser({ avatar: data.avatar });
      setPendingAvatar(null);
      toast.success('Profile photo updated!');
    } catch {
      toast.error('Failed to update photo.');
    } finally {
      setSavingAvatar(false);
    }
  };

  const setNested = (outer, key) => (e) =>
    setRForm((f) => ({ ...f, [outer]: { ...f[outer], [key]: e.target.value } }));

  // Computed display values
  const currentAvatar    = pendingAvatar !== null ? pendingAvatar : (user?.avatar || '');
  const currentLogo      = pendingLogo   !== null ? pendingLogo   : (user?.restaurant?.logo || '');
  const initials         = (user?.name || 'U').split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);
  const restaurantLetter = (user?.restaurant?.name || 'R')[0].toUpperCase();

  return (
    <div className="fade-up">
      <h2 style={{ marginBottom: 6 }}>Settings</h2>
      <p style={{ color: 'var(--text-secondary)', marginBottom: 32, fontSize: '0.9rem' }}>
        Manage your restaurant and account settings
      </p>

      {/* ── Missing restaurant warning ── */}
      {restaurantMissing && <NoRestaurantBanner />}

      <div className={styles.grid}>
        {/* ── Restaurant Settings ── */}
        <div className="card" style={{ padding: 28 }}>
          <h3 style={{ marginBottom: 24, fontSize: '1.125rem' }}>Restaurant Profile</h3>
          <form onSubmit={saveRestaurant} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div className="form-group">
              <label className="form-label">Restaurant Name</label>
              <input className="form-input" value={rForm.name}
                onChange={(e) => setRForm({ ...rForm, name: e.target.value })}
                required disabled={restaurantMissing} />
            </div>
            <div className="form-group">
              <label className="form-label">Description</label>
              <textarea className="form-input" rows={3} value={rForm.description}
                onChange={(e) => setRForm({ ...rForm, description: e.target.value })}
                disabled={restaurantMissing} />
            </div>
            <div className="grid-2">
              <div className="form-group">
                <label className="form-label">Cuisine Type</label>
                <input className="form-input" placeholder="Italian, Mexican..." value={rForm.cuisine}
                  onChange={(e) => setRForm({ ...rForm, cuisine: e.target.value })}
                  disabled={restaurantMissing} />
              </div>
              <div className="form-group">
                <label className="form-label">Phone</label>
                <input className="form-input" value={rForm.phone}
                  onChange={(e) => setRForm({ ...rForm, phone: e.target.value })}
                  disabled={restaurantMissing} />
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Currency</label>
              <select className="form-input" value={rForm.currency}
                onChange={(e) => setRForm({ ...rForm, currency: e.target.value })}
                disabled={restaurantMissing}>
                {['USD', 'EUR', 'GBP', 'MAD', 'AED', 'SAR'].map((c) => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div className="divider" />
            <h3 style={{ fontSize: '1rem' }}>Order Settings</h3>
            <div className="form-group">
              <label className="form-label">Estimated Prep Time (minutes)</label>
              <input type="number" min={1} max={120} className="form-input"
                value={rForm.settings.estimatedPrepTime}
                onChange={setNested('settings', 'estimatedPrepTime')}
                disabled={restaurantMissing} />
            </div>
            <div className="form-group">
              <label className="form-label">Order Confirmation Message</label>
              <textarea className="form-input" rows={2}
                value={rForm.settings.orderConfirmationMessage}
                onChange={setNested('settings', 'orderConfirmationMessage')}
                placeholder="Your order is being prepared!"
                disabled={restaurantMissing} />
            </div>
            <button
              type="submit"
              className="btn btn-primary"
              style={{ alignSelf: 'flex-start' }}
              disabled={saving1 || restaurantMissing}
              title={restaurantMissing ? 'Restaurant no longer exists' : undefined}
            >
              {saving1 ? <div className="spinner" style={{ borderColor: 'rgba(255,255,255,.3)', borderTopColor: 'white' }} /> : <Save size={15} />}
              Save Restaurant Settings
            </button>
          </form>

          {/* ── Restaurant Logo Upload ── */}
          <div className="divider" style={{ margin: '28px 0' }} />
          <h3 style={{ marginBottom: 6, fontSize: '1rem' }}>Restaurant Logo</h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.825rem', marginBottom: 16 }}>
            Shown in the sidebar. JPG, PNG or WEBP · max 2 MB
            {restaurantMissing && (
              <span style={{ color: '#EA580C', fontWeight: 600 }}> · Disabled (no restaurant)</span>
            )}
          </p>
          <div className={styles.avatarSection} style={{ opacity: restaurantMissing ? 0.5 : 1, pointerEvents: restaurantMissing ? 'none' : 'auto' }}>
            <div className={styles.avatarPreview}>
              {currentLogo ? (
                <img src={currentLogo} alt="Restaurant logo" className={styles.avatarImg} />
              ) : (
                <div className={styles.avatarFallback}>
                  <span>{restaurantLetter}</span>
                </div>
              )}
            </div>
            <div style={{ flex: 1 }}>
              <ImageUploader
                currentImage=""
                onImage={(dataUrl) => !restaurantMissing && setPendingLogo(dataUrl || '')}
                shape="rect"
                label=""
                maxSizeMB={2}
              />
              {pendingLogo !== null && (
                <div style={{ marginTop: 10, display: 'flex', gap: 8, alignItems: 'center' }}>
                  <button
                    type="button"
                    className="btn btn-primary btn-sm"
                    onClick={saveLogo}
                    disabled={savingLogo || restaurantMissing}
                  >
                    {savingLogo
                      ? <div className="spinner" style={{ borderColor: 'rgba(255,255,255,.3)', borderTopColor: 'white', width: 14, height: 14 }} />
                      : <Save size={13} />}
                    Save Logo
                  </button>
                  <button
                    type="button"
                    className={styles.removeAvatarBtn}
                    onClick={() => setPendingLogo(null)}
                  >
                    Cancel
                  </button>
                </div>
              )}
              {!pendingLogo && currentLogo && !restaurantMissing && (
                <button
                  type="button"
                  className={styles.removeAvatarBtn}
                  style={{ marginTop: 8 }}
                  onClick={() => setPendingLogo('')}
                >
                  Remove logo
                </button>
              )}
            </div>
          </div>
        </div>

        {/* ── Account Settings ── */}
        <div className="card" style={{ padding: 28 }}>
          <h3 style={{ marginBottom: 24, fontSize: '1.125rem' }}>My Account</h3>

          {/* ── Profile Photo ── */}
          <div style={{ marginBottom: 20 }}>
            <p style={{ fontWeight: 600, fontSize: '0.875rem', color: 'var(--text)', marginBottom: 4 }}>Profile Photo</p>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', marginBottom: 12 }}>
              Shown in the top bar. JPG, PNG or WEBP · max 2 MB
            </p>
            <div className={styles.avatarSection}>
              <div className={styles.avatarPreview}>
                {currentAvatar ? (
                  <img src={currentAvatar} alt="Profile" className={styles.avatarImg} />
                ) : (
                  <div className={styles.avatarFallback}>
                    <span>{initials}</span>
                  </div>
                )}
              </div>
              <div style={{ flex: 1 }}>
                <ImageUploader
                  currentImage=""
                  onImage={(dataUrl) => setPendingAvatar(dataUrl || '')}
                  shape="rect"
                  label=""
                  maxSizeMB={2}
                />
                {pendingAvatar !== null && (
                  <div style={{ marginTop: 10, display: 'flex', gap: 8, alignItems: 'center' }}>
                    <button
                      type="button"
                      className="btn btn-primary btn-sm"
                      onClick={saveAvatar}
                      disabled={savingAvatar}
                    >
                      {savingAvatar
                        ? <div className="spinner" style={{ borderColor: 'rgba(255,255,255,.3)', borderTopColor: 'white', width: 14, height: 14 }} />
                        : <Save size={13} />}
                      Save Photo
                    </button>
                    <button
                      type="button"
                      className={styles.removeAvatarBtn}
                      onClick={() => setPendingAvatar(null)}
                    >
                      Cancel
                    </button>
                  </div>
                )}
                {!pendingAvatar && currentAvatar && (
                  <button
                    type="button"
                    className={styles.removeAvatarBtn}
                    style={{ marginTop: 8 }}
                    onClick={() => setPendingAvatar('')}
                  >
                    Remove photo
                  </button>
                )}
              </div>
            </div>
          </div>

          <div className="divider" />

          {/* ── Profile form (name + password) ── */}
          <form onSubmit={saveProfile} style={{ display: 'flex', flexDirection: 'column', gap: 16, marginTop: 16 }}>
            <div className="form-group">
              <label className="form-label">Full Name</label>
              <input className="form-input" value={uForm.name}
                onChange={(e) => setUForm({ ...uForm, name: e.target.value })} required />
            </div>
            <div className="form-group">
              <label className="form-label">Email</label>
              <input className="form-input" value={user?.email || ''} disabled style={{ opacity: 0.6 }} />
            </div>
            <div className="divider" />
            <p style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text)' }}>Change Password</p>
            <div className="form-group">
              <label className="form-label">Current Password</label>
              <input type="password" className="form-input" value={uForm.currentPassword}
                onChange={(e) => setUForm({ ...uForm, currentPassword: e.target.value })} />
            </div>
            <div className="form-group">
              <label className="form-label">New Password</label>
              <input type="password" className="form-input" placeholder="Min. 8 characters"
                value={uForm.newPassword}
                onChange={(e) => setUForm({ ...uForm, newPassword: e.target.value })} minLength={8} />
            </div>
            <button type="submit" className="btn btn-primary" style={{ alignSelf: 'flex-start' }} disabled={saving2}>
              {saving2 ? <div className="spinner" style={{ borderColor: 'rgba(255,255,255,.3)', borderTopColor: 'white' }} /> : <Save size={15} />}
              Save Account
            </button>
          </form>

          {/* ── Subscription ── */}
          <SubscriptionSection />
        </div>
      </div>
    </div>
  );
}
