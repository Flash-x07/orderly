import { useLocation, Link } from 'react-router-dom';
import { CheckCircle, Clock } from 'lucide-react';
import styles from './OrderSuccessPage.module.css';

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

export default function OrderSuccessPage() {
  const { state } = useLocation();

  if (!state) return (
    <div className={styles.page}>
      <div className={styles.card}>
        <h2>Order not found</h2>
        <p>Something went wrong. Please scan the QR code again.</p>
      </div>
    </div>
  );

  const { order, message, restaurantName, tableNumber } = state;

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <div className={styles.iconWrap}>
          <CheckCircle size={52} strokeWidth={1.5} />
        </div>
        <h2>Order Placed!</h2>
        <p className={styles.message}>{message}</p>

        <div className={styles.details}>
          <div className={styles.detailRow}>
            <span>Order #</span>
            <span className={styles.mono}>{order.orderNumber}</span>
          </div>
          <div className={styles.detailRow}>
            <span>Restaurant</span>
            <span>{restaurantName}</span>
          </div>
          <div className={styles.detailRow}>
            <span>Table</span>
            <span>{tableNumber}</span>
          </div>
          <div className={styles.detailRow}>
            <span>Total</span>
            <span className={styles.total}>${order.total?.toFixed(2)}</span>
          </div>
        </div>

        <div className={styles.status}>
          <Clock size={18} />
          <span>Your order is being prepared</span>
        </div>

        <div className={styles.actions}>
          <Link to={-1} className="btn btn-primary" style={{ justifyContent: 'center' }}>
            <OrderlyIcon size={18} />
            Order more
          </Link>
        </div>
      </div>
    </div>
  );
}
