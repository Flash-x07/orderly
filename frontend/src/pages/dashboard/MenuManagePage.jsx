import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import api from '../../services/api.js';
import toast from 'react-hot-toast';
import { Plus, Pencil, Trash2, ToggleLeft, ToggleRight, X, ImageOff, Store } from 'lucide-react';
import ImageUploader from '../../components/ImageUploader.jsx';
import styles from './MenuManagePage.module.css';

const EMPTY_FORM = {
  name: '', description: '', price: '', category: '',
  image: '', tags: '', preparationTime: 15, isFeatured: false,
};

export default function MenuManagePage() {
  const { user } = useAuth();
  const restaurantId = user?.restaurant?._id || user?.restaurant;

  const [items, setItems]         = useState([]);
  const [loading, setLoading]     = useState(true);
  const [modal, setModal]         = useState(false);
  const [editItem, setEditItem]   = useState(null);
  const [form, setForm]           = useState(EMPTY_FORM);
  const [saving, setSaving]       = useState(false);
  const [filterCat, setFilterCat] = useState('all');

  const fetchItems = useCallback(async () => {
    if (!restaurantId) { setLoading(false); return; }
    try {
      const res = await api.get(`/menu/${restaurantId}/all`);
      setItems(res.data.items);
    } catch { toast.error('Failed to load menu.'); }
    finally { setLoading(false); }
  }, [restaurantId]);

  useEffect(() => { fetchItems(); }, [fetchItems]);

  const openAdd = () => { setEditItem(null); setForm(EMPTY_FORM); setModal(true); };
  const openEdit = (item) => {
    setEditItem(item);
    setForm({ ...item, tags: item.tags?.join(', ') || '', price: String(item.price) });
    setModal(true);
  };
  const closeModal = () => { setModal(false); setEditItem(null); };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    const payload = {
      ...form,
      price: parseFloat(form.price),
      tags: form.tags.split(',').map((t) => t.trim()).filter(Boolean),
    };
    try {
      if (editItem) {
        await api.put(`/menu/${restaurantId}/${editItem._id}`, payload);
        toast.success('Item updated.');
      } else {
        await api.post(`/menu/${restaurantId}`, payload);
        toast.success('Item added.');
      }
      closeModal();
      fetchItems();
    } catch (e) {
      toast.error(e.response?.data?.error || 'Save failed.');
    } finally { setSaving(false); }
  };

  const handleDelete = async (item) => {
    if (!confirm(`Delete "${item.name}"?`)) return;
    try {
      await api.delete(`/menu/${restaurantId}/${item._id}`);
      toast.success('Item deleted.');
      setItems((prev) => prev.filter((i) => i._id !== item._id));
    } catch { toast.error('Delete failed.'); }
  };

  const handleToggle = async (item) => {
    try {
      const res = await api.patch(`/menu/${restaurantId}/${item._id}/toggle`);
      setItems((prev) => prev.map((i) => i._id === item._id ? res.data.item : i));
    } catch { toast.error('Toggle failed.'); }
  };

  const categories = ['all', ...new Set(items.map((i) => i.category))];
  const displayed  = filterCat === 'all' ? items : items.filter((i) => i.category === filterCat);

  if (!restaurantId) return (
    <div className="card empty-state" style={{ marginTop: 32 }}>
      <Store size={40} />
      <h3>No restaurant yet</h3>
      <p>Create your restaurant first to start building your menu.</p>
      <Link to="/dashboard/setup" className="btn btn-primary btn-sm" style={{ marginTop: 8 }}>Create Restaurant</Link>
    </div>
  );

  return (
    <div className="fade-up">
      <div className={styles.header}>
        <div>
          <h2>Menu</h2>
          <p>Manage your restaurant's menu items</p>
        </div>
        <button className="btn btn-primary" onClick={openAdd}><Plus size={16} /> Add Item</button>
      </div>

      {/* Category filter */}
      <div className={styles.catFilter}>
        {categories.map((cat) => (
          <button key={cat}
            className={`btn btn-sm ${filterCat === cat ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setFilterCat(cat)}
            style={{ textTransform: 'capitalize' }}>
            {cat}
          </button>
        ))}
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 80 }}>
          <div className="spinner" style={{ width: 28, height: 28 }} />
        </div>
      ) : displayed.length === 0 ? (
        <div className="card empty-state">
          <p>No items yet. Add your first menu item!</p>
          <button className="btn btn-primary" onClick={openAdd}><Plus size={16} /> Add Item</button>
        </div>
      ) : (
        <div className="grid-3">
          {displayed.map((item) => (
            <div key={item._id}
              className={`card ${styles.itemCard} ${!item.isAvailable ? styles.unavailable : ''}`}>
              {item.image ? (
                <div className={styles.itemImg}>
                  <img src={item.image} alt={item.name}
                    onError={(e) => { e.target.style.display = 'none'; }} />
                </div>
              ) : (
                <div className={styles.itemImgPlaceholder}>
                  <ImageOff size={22} />
                </div>
              )}
              <div className={styles.itemBody}>
                <div className={styles.itemTop}>
                  <div>
                    <div className={styles.itemName}>{item.name}</div>
                    <div className={styles.itemCat}>{item.category}</div>
                  </div>
                  <div className={styles.itemPrice}>${item.price.toFixed(2)}</div>
                </div>
                {item.description && <p className={styles.itemDesc}>{item.description}</p>}
                {item.tags?.length > 0 && (
                  <div className={styles.tags}>
                    {item.tags.map((t) => <span key={t} className={styles.tag}>{t}</span>)}
                  </div>
                )}
                <div className={styles.itemActions}>
                  <button className="btn btn-ghost btn-sm" onClick={() => handleToggle(item)}
                    title="Toggle availability">
                    {item.isAvailable
                      ? <ToggleRight size={18} style={{ color: 'var(--success)' }} />
                      : <ToggleLeft size={18} />}
                    {item.isAvailable ? 'Available' : 'Hidden'}
                  </button>
                  <button className="btn btn-ghost btn-sm" onClick={() => openEdit(item)}>
                    <Pencil size={14} />
                  </button>
                  <button className="btn btn-ghost btn-sm"
                    onClick={() => handleDelete(item)}
                    style={{ color: 'var(--danger)' }}>
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Modal ─────────────────────────────────── */}
      {modal && (
        <div className={styles.overlay} onClick={closeModal}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3>{editItem ? 'Edit Item' : 'New Menu Item'}</h3>
              <button className={styles.closeBtn} onClick={closeModal}><X size={20} /></button>
            </div>

            <form onSubmit={handleSave} className={styles.form}>
              <div className="grid-2">
                <div className="form-group">
                  <label className="form-label">Name *</label>
                  <input className="form-input" value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })} required />
                </div>
                <div className="form-group">
                  <label className="form-label">Category *</label>
                  <input className="form-input" placeholder="Pizza, Drinks, etc."
                    value={form.category}
                    onChange={(e) => setForm({ ...form, category: e.target.value })} required />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Description</label>
                <textarea className="form-input" rows={2} value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })} />
              </div>

              <div className="grid-2">
                <div className="form-group">
                  <label className="form-label">Price *</label>
                  <input type="number" step="0.01" min="0" className="form-input"
                    value={form.price}
                    onChange={(e) => setForm({ ...form, price: e.target.value })} required />
                </div>
                <div className="form-group">
                  <label className="form-label">Prep time (min)</label>
                  <input type="number" min="1" className="form-input"
                    value={form.preparationTime}
                    onChange={(e) => setForm({ ...form, preparationTime: Number(e.target.value) })} />
                </div>
              </div>

              {/* ── Image Upload ── */}
              <div className="form-group">
                <label className="form-label">Item Image <span style={{ fontWeight: 400, color: 'var(--text-secondary)' }}>(optional)</span></label>
                <ImageUploader
                  currentImage={form.image}
                  onImage={(dataUrl) => setForm({ ...form, image: dataUrl })}
                  shape="rect"
                  label=""
                  maxSizeMB={2}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Tags (comma-separated)</label>
                <input className="form-input" placeholder="spicy, vegan, popular"
                  value={form.tags}
                  onChange={(e) => setForm({ ...form, tags: e.target.value })} />
              </div>

              <label className={styles.checkLabel}>
                <input type="checkbox" checked={form.isFeatured}
                  onChange={(e) => setForm({ ...form, isFeatured: e.target.checked })} />
                Featured item
              </label>

              <div className={styles.formActions}>
                <button type="button" className="btn btn-secondary" onClick={closeModal}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving
                    ? <div className="spinner" style={{ borderColor: 'rgba(255,255,255,.3)', borderTopColor: 'white' }} />
                    : null}
                  {editItem ? 'Save Changes' : 'Add Item'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
