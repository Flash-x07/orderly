import { useState, useEffect } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import api from '../../services/api.js';
import toast from 'react-hot-toast';
import { ShoppingCart, Plus, Minus, X, ChevronRight, Search, Star } from 'lucide-react';
import styles from './MenuPage.module.css';

export default function MenuPage() {
  const { restaurantId } = useParams();
  const [searchParams]   = useSearchParams();
  const navigate         = useNavigate();
  const tableToken       = searchParams.get('table'); // QR token

  const [restaurant, setRestaurant] = useState(null);
  const [menu, setMenu]             = useState({});
  const [categories, setCategories] = useState([]);
  const [activeCategory, setActiveCategory] = useState('');
  const [search, setSearch]         = useState('');
  const [cart, setCart]             = useState([]);
  const [cartOpen, setCartOpen]     = useState(false);
  const [tableNumber, setTableNumber] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [customerNote, setCustomerNote] = useState('');
  const [loading, setLoading]       = useState(true);
  const [ordering, setOrdering]     = useState(false);
  const [checkoutStep, setCheckoutStep] = useState(false);

  const [unavailable, setUnavailable] = useState(false);

  useEffect(() => {
    const fetchMenu = async () => {
      try {
        const res = await api.get(`/menu/${restaurantId}`);
        setRestaurant(res.data.restaurant);
        setMenu(res.data.menu);
        setCategories(res.data.categories);
        if (res.data.categories.length) setActiveCategory(res.data.categories[0]);

        // If QR token, resolve table number
        if (tableToken) {
          try {
            const tRes = await api.get(`/tables/verify/${tableToken}`);
            setTableNumber(tRes.data.tableNumber);
          } catch (_) {}
        }
      } catch (e) {
        if (e.response?.status === 403) {
          setUnavailable(true);
        } else {
          toast.error('Menu not available.');
        }
      } finally {
        setLoading(false);
      }
    };
    fetchMenu();
  }, [restaurantId, tableToken]);

  // Cart operations
  const addToCart = (item) => {
    setCart((prev) => {
      const existing = prev.find((c) => c._id === item._id);
      if (existing) return prev.map((c) => c._id === item._id ? { ...c, quantity: c.quantity + 1 } : c);
      return [...prev, { ...item, quantity: 1, notes: '' }];
    });
    // Subtle feedback
    toast.success(`Added ${item.name}`, { duration: 1200, icon: '✓' });
  };

  const removeFromCart = (id) => setCart((prev) => prev.filter((c) => c._id !== id));

  const updateQty = (id, delta) => {
    setCart((prev) => prev.map((c) => c._id === id
      ? { ...c, quantity: Math.max(0, c.quantity + delta) }
      : c).filter((c) => c.quantity > 0)
    );
  };

  const cartCount  = cart.reduce((s, c) => s + c.quantity, 0);
  const cartTotal  = cart.reduce((s, c) => s + c.price * c.quantity, 0);
  const currency   = restaurant?.currency || 'USD';

  const fmt = (n) => new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(n);

  const placeOrder = async () => {
    if (!tableNumber) { toast.error('Please enter your table number.'); return; }
    if (cart.length === 0) { toast.error('Your cart is empty.'); return; }

    setOrdering(true);
    try {
      const res = await api.post('/orders', {
        restaurantId,
        tableNumber,
        customerName: customerName || 'Guest',
        customerNote,
        items: cart.map((c) => ({ menuItemId: c._id, quantity: c.quantity, notes: c.notes, name: c.name })),
      });
      navigate('/order-success', {
        state: {
          order: res.data.order,
          message: res.data.message,
          restaurantName: restaurant.name,
          tableNumber,
        },
      });
    } catch (e) {
      toast.error(e.response?.data?.error || 'Order failed. Please try again.');
    } finally {
      setOrdering(false);
    }
  };

  // Search filter
  const searchResults = search
    ? Object.values(menu).flat().filter((i) =>
        i.name.toLowerCase().includes(search.toLowerCase()) ||
        i.description?.toLowerCase().includes(search.toLowerCase())
      )
    : null;

  if (loading) return (
    <div className={styles.loadingPage}>
      <div className={styles.loadingSpinner} />
      <p>Loading menu…</p>
    </div>
  );

  if (unavailable) return (
    <div className={styles.errorPage}>
      <h2>Restaurant Unavailable</h2>
      <p>This restaurant is currently not accepting orders. Please check back later.</p>
    </div>
  );

  if (!restaurant) return (
    <div className={styles.errorPage}>
      <h2>Menu not found</h2>
      <p>This QR code may be invalid or the restaurant is unavailable.</p>
    </div>
  );

  return (
    <div className={styles.page} style={{ '--primary': restaurant.theme?.primaryColor || '#FF6B35' }}>
      {/* ── Header ── */}
      <header className={styles.header}>
        {restaurant.logo && <img src={restaurant.logo} alt={restaurant.name} className={styles.logo} />}
        <div className={styles.headerText}>
          <h1 className={styles.restaurantName}>{restaurant.name}</h1>
          {restaurant.description && <p className={styles.restaurantDesc}>{restaurant.description}</p>}
          {tableNumber && <span className={styles.tableBadge}>Table {tableNumber}</span>}
        </div>
      </header>

      {/* ── Search ── */}
      <div className={styles.searchWrap}>
        <Search size={16} className={styles.searchIcon} />
        <input
          className={styles.searchInput}
          placeholder="Search menu…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        {search && <button className={styles.clearSearch} onClick={() => setSearch('')}><X size={14} /></button>}
      </div>

      {/* ── Category tabs ── */}
      {!search && (
        <div className={styles.catTabs}>
          {categories.map((cat) => (
            <button
              key={cat}
              className={`${styles.catTab} ${activeCategory === cat ? styles.catTabActive : ''}`}
              onClick={() => setActiveCategory(cat)}
            >
              {cat}
            </button>
          ))}
        </div>
      )}

      {/* ── Menu items ── */}
      <main className={styles.main}>
        {search ? (
          <>
            <p className={styles.searchResultsLabel}>{searchResults.length} result{searchResults.length !== 1 ? 's' : ''} for "{search}"</p>
            <div className={styles.itemsGrid}>
              {searchResults.map((item) => <MenuItemCard key={item._id} item={item} cart={cart} onAdd={addToCart} onUpdate={updateQty} fmt={fmt} />)}
            </div>
          </>
        ) : (
          categories.map((cat) => (
            <section
              key={cat}
              id={`cat-${cat}`}
              className={`${styles.section} ${activeCategory !== cat ? styles.sectionHidden : ''}`}
            >
              <h2 className={styles.catTitle}>{cat}</h2>
              <div className={styles.itemsGrid}>
                {(menu[cat] || []).map((item) => (
                  <MenuItemCard key={item._id} item={item} cart={cart} onAdd={addToCart} onUpdate={updateQty} fmt={fmt} />
                ))}
              </div>
            </section>
          ))
        )}
      </main>

      {/* ── Floating Cart Button ── */}
      {cartCount > 0 && !cartOpen && (
        <button className={styles.cartBtn} onClick={() => { setCartOpen(true); setCheckoutStep(false); }}>
          <ShoppingCart size={20} />
          <span>{cartCount} item{cartCount !== 1 ? 's' : ''}</span>
          <span className={styles.cartTotal}>{fmt(cartTotal)}</span>
          <ChevronRight size={18} />
        </button>
      )}

      {/* ── Cart Drawer ── */}
      {cartOpen && (
        <div className={styles.cartOverlay} onClick={() => setCartOpen(false)}>
          <div className={styles.cartDrawer} onClick={(e) => e.stopPropagation()}>
            <div className={styles.cartHeader}>
              <h3>{checkoutStep ? 'Checkout' : 'Your Order'}</h3>
              <button className={styles.cartClose} onClick={() => setCartOpen(false)}><X size={20} /></button>
            </div>

            {!checkoutStep ? (
              <>
                {/* Cart items */}
                <div className={styles.cartItems}>
                  {cart.map((item) => (
                    <div key={item._id} className={styles.cartItem}>
                      <div className={styles.cartItemInfo}>
                        <span className={styles.cartItemName}>{item.name}</span>
                        <span className={styles.cartItemPrice}>{fmt(item.price * item.quantity)}</span>
                      </div>
                      <div className={styles.qtyControl}>
                        <button className={styles.qtyBtn} onClick={() => updateQty(item._id, -1)}><Minus size={14} /></button>
                        <span className={styles.qty}>{item.quantity}</span>
                        <button className={styles.qtyBtn} onClick={() => updateQty(item._id, 1)}><Plus size={14} /></button>
                      </div>
                    </div>
                  ))}
                </div>
                <div className={styles.cartFooter}>
                  <div className={styles.cartSummary}>
                    <span>Subtotal</span><span>{fmt(cartTotal)}</span>
                  </div>
                  <button className={styles.checkoutBtn} onClick={() => setCheckoutStep(true)}>
                    Proceed to Order <ChevronRight size={16} />
                  </button>
                </div>
              </>
            ) : (
              /* Checkout step */
              <div className={styles.checkoutForm}>
                {!tableToken && (
                  <div className="form-group">
                    <label className="form-label">Table Number *</label>
                    <input className="form-input" placeholder="e.g. 5" value={tableNumber}
                      onChange={(e) => setTableNumber(e.target.value)} required />
                  </div>
                )}
                {tableNumber && (
                  <div className={styles.tableConfirm}>
                    <span>📍 Table {tableNumber}</span>
                  </div>
                )}
                <div className="form-group">
                  <label className="form-label">Your name (optional)</label>
                  <input className="form-input" placeholder="For the waiter to know your name"
                    value={customerName} onChange={(e) => setCustomerName(e.target.value)} />
                </div>
                <div className="form-group">
                  <label className="form-label">Special instructions (optional)</label>
                  <textarea className="form-input" rows={3} placeholder="Allergies, preferences…"
                    value={customerNote} onChange={(e) => setCustomerNote(e.target.value)} />
                </div>
                {/* Order summary */}
                <div className={styles.miniSummary}>
                  {cart.map((item) => (
                    <div key={item._id} className={styles.miniItem}>
                      <span>{item.quantity}× {item.name}</span>
                      <span>{fmt(item.price * item.quantity)}</span>
                    </div>
                  ))}
                  <div className={styles.miniTotal}>
                    <span>Total</span><span>{fmt(cartTotal)}</span>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 10 }}>
                  <button className="btn btn-secondary" onClick={() => setCheckoutStep(false)} style={{ flex: 1, justifyContent: 'center' }}>
                    ← Back
                  </button>
                  <button className={styles.placeOrderBtn} onClick={placeOrder} disabled={ordering} style={{ flex: 2 }}>
                    {ordering ? <div className="spinner" style={{ borderColor: 'rgba(255,255,255,.3)', borderTopColor: 'white' }} /> : '🍽️'}
                    {ordering ? 'Placing order…' : 'Place Order'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Menu Item Card component ── */
function MenuItemCard({ item, cart, onAdd, onUpdate, fmt }) {
  const inCart = cart.find((c) => c._id === item._id);
  return (
    <div className={styles.itemCard}>
      {item.image && (
        <div className={styles.itemImg}>
          <img src={item.image} alt={item.name} loading="lazy" onError={(e) => e.target.parentNode.style.display = 'none'} />
        </div>
      )}
      <div className={styles.itemContent}>
        <div className={styles.itemHeader}>
          <div>
            <span className={styles.itemName}>{item.name}</span>
            {item.isFeatured && <span className={styles.featured}><Star size={10} fill="currentColor" /> Featured</span>}
          </div>
          <span className={styles.itemPrice}>{fmt(item.price)}</span>
        </div>
        {item.description && <p className={styles.itemDesc}>{item.description}</p>}
        {item.tags?.length > 0 && (
          <div className={styles.itemTags}>
            {item.tags.map((t) => <span key={t} className={styles.tag}>{t}</span>)}
          </div>
        )}
        <div className={styles.itemAction}>
          {inCart ? (
            <div className={styles.inlineQty}>
              <button className={styles.qtyBtn} onClick={() => onUpdate(item._id, -1)}><Minus size={14} /></button>
              <span>{inCart.quantity}</span>
              <button className={styles.qtyBtn} onClick={() => onUpdate(item._id, 1)}><Plus size={14} /></button>
            </div>
          ) : (
            <button className={styles.addBtn} onClick={() => onAdd(item)}>
              <Plus size={16} /> Add
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
