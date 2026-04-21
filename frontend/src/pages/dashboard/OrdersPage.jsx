import { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import { useSocket } from '../../hooks/useSocket.js';
import api from '../../services/api.js';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { ChevronDown, ChevronUp, CheckCircle, XCircle, Clock, UtensilsCrossed, Store } from 'lucide-react';
import styles from './OrdersPage.module.css';

const STATUSES = ['pending','accepted','preparing','ready','completed','rejected'];

const ACTIONS = {
  pending:   [{ label: 'Accept',  next: 'accepted',  cls: 'btn-primary' }, { label: 'Reject', next: 'rejected', cls: 'btn-danger' }],
  accepted:  [{ label: 'Start Preparing', next: 'preparing', cls: 'btn-primary' }, { label: 'Reject', next: 'rejected', cls: 'btn-danger' }],
  preparing: [{ label: 'Mark Ready', next: 'ready', cls: 'btn-primary' }],
  ready:     [{ label: 'Complete', next: 'completed', cls: 'btn-primary' }],
};

export default function OrdersPage() {
  const { user } = useAuth();
  const restaurantId = user?.restaurant?._id || user?.restaurant;

  const [orders, setOrders]       = useState([]);
  const [loading, setLoading]     = useState(true);
  const [filter, setFilter]       = useState('active'); // active | all | completed
  const [expanded, setExpanded]   = useState(null);
  const [updating, setUpdating]   = useState(null);

  const fetchOrders = useCallback(async () => {
    if (!restaurantId) { setLoading(false); return; }
    try {
      const status = filter === 'active' ? undefined : filter === 'completed' ? 'completed' : undefined;
      const res = await api.get(`/orders/restaurant/${restaurantId}?limit=100${status ? `&status=${status}` : ''}`);
      setOrders(res.data.orders);
    } catch (e) { toast.error('Failed to load orders.'); }
    finally { setLoading(false); }
  }, [restaurantId, filter]);

  useEffect(() => { fetchOrders(); }, [fetchOrders]);

  useSocket(restaurantId, {
    onNewOrder: ({ order }) => setOrders((prev) => [order, ...prev]),
    onOrderUpdated: ({ order }) => setOrders((prev) => prev.map((o) => o._id === order._id ? order : o)),
  });

  const updateStatus = async (orderId, status) => {
    setUpdating(orderId);
    try {
      await api.patch(`/orders/${orderId}/status`, { status });
      toast.success(`Order ${status}.`);
    } catch (e) {
      toast.error(e.response?.data?.error || 'Update failed.');
    } finally {
      setUpdating(null);
    }
  };

  const displayOrders = filter === 'active'
    ? orders.filter((o) => !['completed','rejected'].includes(o.status))
    : filter === 'completed'
    ? orders.filter((o) => o.status === 'completed')
    : orders;

  if (!restaurantId) return (
    <div className="card empty-state" style={{ marginTop: 32 }}>
      <Store size={40} />
      <h3>No restaurant yet</h3>
      <p>Create your restaurant first to start managing orders.</p>
      <Link to="/dashboard/setup" className="btn btn-primary btn-sm" style={{ marginTop: 8 }}>Create Restaurant</Link>
    </div>
  );

  return (
    <div className="fade-up">
      <div className={styles.header}>
        <div>
          <h2>Orders</h2>
          <p>Manage and track incoming orders in real time</p>
        </div>
        <div className={styles.filters}>
          {[['active','Active'],['all','All'],['completed','Completed']].map(([val, lbl]) => (
            <button key={val} className={`btn btn-sm ${filter === val ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setFilter(val)}>
              {lbl}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className={styles.loading}><div className="spinner" style={{ width: 28, height: 28 }} /></div>
      ) : displayOrders.length === 0 ? (
        <div className="card empty-state">
          <UtensilsCrossed size={48} />
          <h3>No orders here</h3>
          <p>New orders will appear here in real time.</p>
        </div>
      ) : (
        <div className={styles.ordersList}>
          {displayOrders.map((order) => (
            <div key={order._id} className={`card ${styles.orderCard}`}>
              <div className={styles.orderTop} onClick={() => setExpanded(expanded === order._id ? null : order._id)}>
                <div className={styles.orderMeta}>
                  <span className={styles.orderNum}>{order.orderNumber}</span>
                  <span className={styles.table}>Table {order.tableNumber}</span>
                  {order.customerName && order.customerName !== 'Guest' && (
                    <span className={styles.customer}>{order.customerName}</span>
                  )}
                </div>
                <div className={styles.orderRight}>
                  <span className={`badge badge-${order.status}`}>{order.status}</span>
                  <span className={styles.total}>${order.total.toFixed(2)}</span>
                  <span className={styles.time}>{format(new Date(order.createdAt), 'HH:mm')}</span>
                  {expanded === order._id ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </div>
              </div>

              {expanded === order._id && (
                <div className={styles.orderBody}>
                  <div className={styles.items}>
                    {order.items.map((item, i) => (
                      <div key={i} className={styles.item}>
                        <span className={styles.qty}>{item.quantity}×</span>
                        <span className={styles.itemName}>{item.name}</span>
                        {item.notes && <span className={styles.notes}>"{item.notes}"</span>}
                        <span className={styles.itemPrice}>${(item.price * item.quantity).toFixed(2)}</span>
                      </div>
                    ))}
                  </div>

                  {order.customerNote && (
                    <div className={styles.note}>
                      <strong>Note:</strong> {order.customerNote}
                    </div>
                  )}

                  <div className={styles.orderFooter}>
                    <div className={styles.totals}>
                      <span>Subtotal: ${order.subtotal.toFixed(2)}</span>
                      <span className={styles.totalBig}>Total: ${order.total.toFixed(2)}</span>
                    </div>
                    <div className={styles.actions}>
                      {(ACTIONS[order.status] || []).map((action) => (
                        <button
                          key={action.next}
                          className={`btn btn-sm ${action.cls}`}
                          onClick={() => updateStatus(order._id, action.next)}
                          disabled={updating === order._id}
                        >
                          {updating === order._id
                            ? <div className="spinner" />
                            : action.next === 'completed' ? <CheckCircle size={14} />
                            : action.next === 'rejected' ? <XCircle size={14} />
                            : <Clock size={14} />
                          }
                          {action.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
