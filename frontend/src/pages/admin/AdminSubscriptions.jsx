/**
 * AdminSubscriptions
 * /admin/subscriptions
 * Admin reviews pending subscription requests and approves or rejects them.
 * Real-time: new requests appear via socket without refresh.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { io }         from 'socket.io-client';
import api            from '../../services/api.js';
import toast          from 'react-hot-toast';
import {
  CreditCard, CheckCircle, XCircle, Clock,
  RefreshCw, User, Calendar, Zap, Crown,
} from 'lucide-react';
import styles from './Admin.module.css';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || '';

const PLAN_META = {
  pro:     { label: 'Pro',     Icon: Zap,   color: '#3B82F6', bg: '#EFF6FF' },
  premium: { label: 'Premium', Icon: Crown, color: '#FF6B35', bg: '#FFF3EE' },
};

const STATUS_META = {
  pending:  { label: 'Pending',  color: '#D97706', bg: '#FFFBEB' },
  approved: { label: 'Approved', color: '#16A34A', bg: '#F0FDF4' },
  rejected: { label: 'Rejected', color: '#DC2626', bg: '#FEF2F2' },
};

const fmt = (d) =>
  new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' });

export default function AdminSubscriptions() {
  const [requests,    setRequests]    = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [filter,      setFilter]      = useState('pending');
  const [actingOn,    setActingOn]    = useState(null);   // request id being processed
  const [rejectModal, setRejectModal] = useState(null);   // { requestId, userName, plan }
  const [rejectReason, setRejectReason] = useState('');
  const socketRef = useRef(null);

  // ── Fetch ──────────────────────────────────────────────────────────────────
  const fetchRequests = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get(`/subscription/admin/requests?status=${filter}`);
      setRequests(data.requests);
    } catch {
      toast.error('Failed to load requests.');
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => { fetchRequests(); }, [fetchRequests]);

  // ── Real-time: join admin room, receive new requests ───────────────────────
  useEffect(() => {
    const socket = io(SOCKET_URL, {
      transports: ['polling', 'websocket'],
      withCredentials: true,
    });
    socketRef.current = socket;
    socket.emit('join_admin_room');

    socket.on('subscription_request', (data) => {
      toast.custom((t) => (
        <div style={{
          background: '#1C1917', color: '#FDF8F4',
          padding: '14px 18px', borderRadius: 12,
          display: 'flex', alignItems: 'center', gap: 12,
          boxShadow: '0 8px 30px rgba(0,0,0,.25)',
        }}>
          <CreditCard size={18} style={{ color: '#FF6B35', flexShrink: 0 }} />
          <div>
            <strong style={{ fontSize: '.9rem' }}>New subscription request</strong>
            <div style={{ fontSize: '.8rem', opacity: .7, marginTop: 2 }}>
              {data.userName} wants {data.plan} ({data.billingCycle})
            </div>
          </div>
        </div>
      ), { duration: 8000 });

      // Prepend to list if we're showing pending
      if (filter === 'pending' || filter === 'all') {
        setRequests((prev) => [{
          _id:         data.requestId,
          user:        { _id: data.userId, name: data.userName, email: data.userEmail },
          plan:        data.plan,
          billingCycle: data.billingCycle,
          status:      'pending',
          createdAt:   data.createdAt,
        }, ...prev]);
      }
    });

    return () => { socket.disconnect(); };
  }, [filter]);

  // ── Approve ────────────────────────────────────────────────────────────────
  const handleApprove = async (requestId, userName, plan) => {
    setActingOn(requestId);
    try {
      await api.patch(`/subscription/admin/requests/${requestId}/approve`);
      toast.success(`✅ ${userName}'s ${plan} subscription approved!`);
      setRequests((prev) =>
        filter === 'pending'
          ? prev.filter((r) => r._id !== requestId)
          : prev.map((r) => r._id === requestId ? { ...r, status: 'approved' } : r)
      );
    } catch (err) {
      toast.error(err?.response?.data?.error || 'Failed to approve.');
    } finally {
      setActingOn(null);
    }
  };

  // ── Reject ─────────────────────────────────────────────────────────────────
  const openRejectModal = (request) => {
    setRejectModal({ requestId: request._id, userName: request.user.name, plan: request.plan });
    setRejectReason('');
  };

  const handleReject = async () => {
    if (!rejectModal) return;
    setActingOn(rejectModal.requestId);
    try {
      await api.patch(`/subscription/admin/requests/${rejectModal.requestId}/reject`, {
        reason: rejectReason,
      });
      toast.success(`❌ ${rejectModal.userName}'s request rejected.`);
      setRequests((prev) =>
        filter === 'pending'
          ? prev.filter((r) => r._id !== rejectModal.requestId)
          : prev.map((r) => r._id === rejectModal.requestId ? { ...r, status: 'rejected' } : r)
      );
      setRejectModal(null);
    } catch (err) {
      toast.error(err?.response?.data?.error || 'Failed to reject.');
    } finally {
      setActingOn(null);
    }
  };

  return (
    <div className="fade-up">

      {/* ── Header ── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h2 style={{ fontFamily: "'DM Serif Display', serif", fontSize: '1.6rem', marginBottom: 4 }}>
            Subscription Requests
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
            Review and approve or reject restaurant owner plan requests.
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn btn-secondary btn-sm" onClick={fetchRequests}>
            <RefreshCw size={14} /> Refresh
          </button>
        </div>
      </div>

      {/* ── Filter tabs ── */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 24 }}>
        {['pending', 'approved', 'rejected', 'all'].map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            style={{
              padding: '6px 16px', borderRadius: 20, border: 'none',
              fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer',
              background: filter === f ? 'var(--brand)' : 'var(--sand)',
              color:      filter === f ? 'white' : 'var(--text-secondary)',
              transition: 'all .15s',
              textTransform: 'capitalize',
            }}
          >
            {f}
          </button>
        ))}
      </div>

      {/* ── List ── */}
      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 48 }}>
          <div className="spinner" style={{ width: 28, height: 28 }} />
        </div>
      ) : requests.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '64px 24px', color: 'var(--text-secondary)' }}>
          <CreditCard size={40} style={{ marginBottom: 12, opacity: .3 }} />
          <p>No {filter === 'all' ? '' : filter} requests.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {requests.map((r) => {
            const plan   = PLAN_META[r.plan]   ?? PLAN_META.pro;
            const status = STATUS_META[r.status] ?? STATUS_META.pending;
            const PlanIcon = plan.Icon;
            const isBusy = actingOn === r._id;

            return (
              <div
                key={r._id}
                style={{
                  background: 'white',
                  border: `1.5px solid ${r.status === 'pending' ? 'var(--border)' : r.status === 'approved' ? '#BBF7D0' : '#FCA5A5'}`,
                  borderRadius: 'var(--radius)',
                  padding: '18px 20px',
                  display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap',
                }}
              >
                {/* Plan icon */}
                <div style={{ width: 40, height: 40, borderRadius: 10, background: plan.bg, color: plan.color, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <PlanIcon size={18} />
                </div>

                {/* User info */}
                <div style={{ minWidth: 180 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                    <User size={13} style={{ color: 'var(--muted)' }} />
                    <span style={{ fontWeight: 700, fontSize: '0.95rem' }}>{r.user?.name}</span>
                  </div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{r.user?.email}</div>
                </div>

                {/* Plan + cycle */}
                <div>
                  <span style={{ padding: '3px 10px', borderRadius: 20, fontSize: '0.75rem', fontWeight: 700, background: plan.bg, color: plan.color }}>
                    {plan.label}
                  </span>
                  <span style={{ marginLeft: 6, fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                    {r.billingCycle}
                  </span>
                </div>

                {/* Date */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: '0.8rem', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
                  <Calendar size={13} />
                  {fmt(r.createdAt)}
                </div>

                {/* Status badge */}
                <span style={{ padding: '4px 12px', borderRadius: 20, fontSize: '0.75rem', fontWeight: 700, background: status.bg, color: status.color, whiteSpace: 'nowrap' }}>
                  {r.status === 'pending' ? <><Clock size={11} style={{ display: 'inline', marginRight: 4 }} /></> : null}
                  {status.label}
                </span>

                {/* Actions (only for pending) */}
                {r.status === 'pending' && (
                  <div style={{ display: 'flex', gap: 8, marginLeft: 'auto' }}>
                    <button
                      onClick={() => handleApprove(r._id, r.user?.name, r.plan)}
                      disabled={isBusy}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 6,
                        padding: '8px 16px', borderRadius: 8, border: 'none',
                        background: '#16A34A', color: 'white',
                        fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer',
                        opacity: isBusy ? .6 : 1,
                      }}
                    >
                      {isBusy
                        ? <span className="spinner" style={{ width: 12, height: 12, borderColor: 'rgba(255,255,255,.3)', borderTopColor: '#fff' }} />
                        : <CheckCircle size={14} />}
                      Approve
                    </button>
                    <button
                      onClick={() => openRejectModal(r)}
                      disabled={isBusy}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 6,
                        padding: '8px 16px', borderRadius: 8, border: '1.5px solid #FCA5A5',
                        background: 'white', color: '#DC2626',
                        fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer',
                        opacity: isBusy ? .6 : 1,
                      }}
                    >
                      <XCircle size={14} /> Reject
                    </button>
                  </div>
                )}

                {/* Rejection reason */}
                {r.status === 'rejected' && r.rejectionReason && (
                  <div style={{ width: '100%', fontSize: '0.8rem', color: 'var(--muted)', paddingTop: 8, borderTop: '1px solid var(--border)' }}>
                    Reason: {r.rejectionReason}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ── Reject modal ── */}
      {rejectModal && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,.45)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 1000, padding: 16,
        }}>
          <div style={{
            background: 'white', borderRadius: 'var(--radius-lg)',
            padding: 32, maxWidth: 440, width: '100%',
            boxShadow: '0 20px 60px rgba(0,0,0,.2)',
          }}>
            <h3 style={{ fontFamily: "'DM Serif Display', serif", fontSize: '1.3rem', marginBottom: 8 }}>
              Reject request
            </h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: 20 }}>
              Rejecting <strong>{rejectModal.userName}</strong>'s <strong>{rejectModal.plan}</strong> request.
              They will be notified via email and real-time alert.
            </p>

            <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text)', display: 'block', marginBottom: 8 }}>
              Reason (optional)
            </label>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="e.g. Payment not received, please contact support."
              maxLength={300}
              rows={3}
              style={{
                width: '100%', padding: '10px 12px', borderRadius: 8,
                border: '1.5px solid var(--border)', fontSize: '0.9rem',
                resize: 'vertical', fontFamily: 'inherit', boxSizing: 'border-box',
              }}
            />

            <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
              <button
                onClick={handleReject}
                disabled={actingOn === rejectModal.requestId}
                style={{
                  flex: 1, padding: '12px', borderRadius: 8, border: 'none',
                  background: '#DC2626', color: 'white',
                  fontWeight: 700, fontSize: '0.9rem', cursor: 'pointer',
                }}
              >
                {actingOn === rejectModal.requestId
                  ? <span className="spinner" style={{ width: 14, height: 14, borderColor: 'rgba(255,255,255,.3)', borderTopColor: '#fff' }} />
                  : 'Confirm Reject'}
              </button>
              <button
                onClick={() => setRejectModal(null)}
                style={{
                  flex: 1, padding: '12px', borderRadius: 8,
                  border: '1.5px solid var(--border)', background: 'white',
                  fontWeight: 600, fontSize: '0.9rem', cursor: 'pointer',
                  color: 'var(--text)',
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
