import { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import { useSubscription } from '../../hooks/useSubscription.js';
import api from '../../services/api.js';
import toast from 'react-hot-toast';
import { QrCode, Download, RefreshCw, X, Store, Zap, Infinity } from 'lucide-react';
import styles from './TablesPage.module.css';

/** Returns the table cap and display info for the current plan. */
function usePlanTableLimit() {
  const { plan, isActive } = useSubscription();
  const effectivePlan = isActive ? plan : 'free';
  if (effectivePlan === 'premium') return { limit: null, label: 'Unlimited', isPremium: true };
  if (effectivePlan === 'pro' || effectivePlan === 'trial') return { limit: 20, label: '20 tables', isPremium: false };
  return { limit: 3, label: '3 tables', isPremium: false }; // free / expired / none
}

export default function TablesPage() {
  const { user }     = useAuth();
  const navigate     = useNavigate();
  const restaurantId = user?.restaurant?._id || user?.restaurant;
  const { limit: tableLimit, label: limitLabel, isPremium } = usePlanTableLimit();

  const [tables, setTables]         = useState([]);
  const [loading, setLoading]       = useState(true);
  const [count, setCount]           = useState(1);
  const [generating, setGenerating] = useState(false);
  const [preview, setPreview]       = useState(null);

  const fetchTables = useCallback(async () => {
    if (!restaurantId) { setLoading(false); return; }
    try {
      const res = await api.get(`/tables/${restaurantId}`);
      setTables(res.data.tables);
    } catch (e) { toast.error('Failed to load tables.'); }
    finally { setLoading(false); }
  }, [restaurantId]);

  useEffect(() => { fetchTables(); }, [fetchTables]);

  // Keep count input within allowed range whenever the plan changes
  useEffect(() => {
    if (tableLimit !== null && count > tableLimit) setCount(tableLimit);
  }, [tableLimit]);

  const maxAllowed = tableLimit ?? 200; // UI cap; backend enforces the real limit

  const handleGenerate = async () => {
    const n = Number(count);
    if (!n || n < 1) { toast.error('Enter a valid number of tables.'); return; }
    if (tableLimit !== null && n > tableLimit) {
      toast.error(`Your plan allows a maximum of ${tableLimit} tables.`);
      return;
    }
    if (!confirm(`This will regenerate all ${n} table QR codes. Continue?`)) return;

    setGenerating(true);
    try {
      const res = await api.post(`/tables/${restaurantId}/generate`, { count: n });
      if (res.data.tables?.length) {
        setTables(res.data.tables);
      } else {
        await fetchTables();
      }
      toast.success(`${n} tables generated!`);
    } catch (e) {
      const data = e.response?.data;
      if (data?.code === 'TABLE_LIMIT_REACHED') {
        toast.error(data.message);
      } else {
        toast.error(data?.message || data?.error || 'Generation failed.');
      }
    } finally {
      setGenerating(false);
    }
  };

  const downloadQR = (table) => {
    const link = document.createElement('a');
    link.href  = table.qrCodeImage;
    link.download = `table-${table.number}-qr.png`;
    link.click();
  };

  const downloadAll = () => {
    tables.forEach((t, i) => setTimeout(() => downloadQR(t), i * 120));
    toast.success('Downloading all QR codes…');
  };

  // ── No restaurant ──────────────────────────────────────────────────────────
  if (!restaurantId) return (
    <div className="card empty-state" style={{ marginTop: 32 }}>
      <Store size={40} />
      <h3>No restaurant yet</h3>
      <p>Create your restaurant first to generate table QR codes.</p>
      <Link to="/dashboard/setup" className="btn btn-primary btn-sm" style={{ marginTop: 8 }}>
        Create Restaurant
      </Link>
    </div>
  );

  return (
    <div className="fade-up">
      {/* Header */}
      <div className={styles.header}>
        <div>
          <h2>Tables &amp; QR Codes</h2>
          <p>Generate unique QR codes for each table in your restaurant</p>
        </div>
        {tables.length > 0 && (
          <button className="btn btn-secondary" onClick={downloadAll}>
            <Download size={16} /> Download All
          </button>
        )}
      </div>

      {/* Generate panel */}
      <div className={`card ${styles.generatePanel}`}>
        <div className={styles.generateInfo}>
          <QrCode size={32} style={{ color: 'var(--brand)' }} />
          <div>
            <h3>Generate QR Codes</h3>
            <p>Each table gets a unique QR code. Customers scan it to open your menu directly.</p>
            {/* Plan limit badge */}
            <div style={{
              display:    'inline-flex',
              alignItems: 'center',
              gap: 5,
              marginTop:  8,
              padding:    '3px 10px',
              borderRadius: 20,
              fontSize:   '0.78rem',
              fontWeight: 600,
              background: isPremium ? '#F0FDF4' : tableLimit <= 3 ? '#FFF7ED' : '#EFF6FF',
              color:      isPremium ? '#16A34A' : tableLimit <= 3 ? '#C2410C' : '#2563EB',
              border:     `1px solid ${isPremium ? '#BBF7D0' : tableLimit <= 3 ? '#FED7AA' : '#BFDBFE'}`,
            }}>
              {isPremium
                ? <><Infinity size={12} /> Unlimited tables (Premium)</>
                : <><Zap size={12} /> Up to {limitLabel} on your plan</>
              }
            </div>
          </div>
        </div>

        <div className={styles.generateControls}>
          <div className="form-group" style={{ minWidth: 140 }}>
            <label className="form-label">
              Number of tables
              {tableLimit !== null && (
                <span style={{ color: 'var(--muted)', fontWeight: 400, marginLeft: 4 }}>
                  (max {tableLimit})
                </span>
              )}
            </label>
            <input
              type="number"
              min={1}
              max={maxAllowed}
              className="form-input"
              value={count}
              onChange={(e) => {
                const val = Number(e.target.value);
                setCount(tableLimit !== null ? Math.min(val, tableLimit) : val);
              }}
            />
          </div>
          <button
            className="btn btn-primary"
            onClick={handleGenerate}
            disabled={generating}
            style={{ alignSelf: 'flex-end' }}
          >
            {generating
              ? <><div className="spinner" style={{ borderColor: 'rgba(255,255,255,.3)', borderTopColor: 'white' }} /> Generating…</>
              : <><RefreshCw size={16} /> Generate Tables</>
            }
          </button>
        </div>

        {/* Upgrade nudge for Free/capped plans */}
        {tableLimit !== null && tableLimit <= 3 && (
          <div style={{
            marginTop:  12,
            padding:    '10px 14px',
            background: '#FFF7ED',
            border:     '1px solid #FED7AA',
            borderRadius: 8,
            fontSize:   '0.82rem',
            color:      '#92400E',
            display:    'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
            flexWrap: 'wrap',
          }}>
            <span>
              <strong>Free plan:</strong> limited to 3 tables. Upgrade to Pro for up to 20, or Premium for unlimited.
            </span>
            <button
              className="btn btn-primary btn-sm"
              onClick={() => navigate('/dashboard/pricing')}
              style={{ whiteSpace: 'nowrap' }}
            >
              <Zap size={13} /> Upgrade
            </button>
          </div>
        )}
      </div>

      {/* Tables grid */}
      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 64 }}>
          <div className="spinner" style={{ width: 28, height: 28 }} />
        </div>
      ) : tables.length === 0 ? (
        <div className="card empty-state">
          <QrCode size={48} />
          <p>No tables yet. Generate QR codes to get started.</p>
        </div>
      ) : (
        <div className="grid-4">
          {tables.map((table) => (
            <div key={table._id} className={`card ${styles.tableCard}`} onClick={() => setPreview(table)}>
              <div className={styles.qrWrap}>
                <img src={table.qrCodeImage} alt={`Table ${table.number}`} />
              </div>
              <div className={styles.tableInfo}>
                <span className={styles.tableNum}>Table {table.number}</span>
                <button
                  className="btn btn-ghost btn-sm"
                  onClick={(e) => { e.stopPropagation(); downloadQR(table); }}
                >
                  <Download size={13} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* QR Preview modal */}
      {preview && (
        <div className={styles.modalOverlay} onClick={() => setPreview(null)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3>Table {preview.number}</h3>
              <button className={styles.closeBtn} onClick={() => setPreview(null)}>
                <X size={20} />
              </button>
            </div>
            <img src={preview.qrCodeImage} alt={`Table ${preview.number} QR`} className={styles.qrPreview} />
            <p className={styles.qrHint}>Customers scan this code to access your menu.</p>
            <button className="btn btn-primary" onClick={() => downloadQR(preview)} style={{ width: '100%', justifyContent: 'center' }}>
              <Download size={16} /> Download QR Code
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
