import { useEffect, useState } from 'react';
import { productApi } from '../../services/api';

const emptyVariant = { quality: 'High', price: 0, stock: 0, unit: 'kg' };

export default function MerchantProducts() {
  const [products, setProducts] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', description: '', variants: [{ ...emptyVariant }] });
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const load = () => productApi.getMine().then((res) => setProducts(res.data));
  useEffect(() => { load(); }, []);

  const handleImageChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) {
      setImageFile(null);
      setImagePreview(null);
      return;
    }
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const resetForm = () => {
    setForm({ name: '', description: '', variants: [{ ...emptyVariant }] });
    setImageFile(null);
    setImagePreview(null);
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await productApi.create(form, imageFile);
      setShowForm(false);
      resetForm();
      load();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const addVariant = () => {
    setForm({ ...form, variants: [...form.variants, { ...emptyVariant }] });
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h1 className="page-title" style={{ marginBottom: 0 }}>My Products</h1>
        <button type="button" className="btn btn-primary" onClick={() => { setShowForm(!showForm); if (showForm) resetForm(); }}>
          {showForm ? 'Cancel' : '+ Add Product'}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="card" style={{ marginBottom: '1.5rem' }}>
          {error && <div className="alert alert-error">{error}</div>}

          <div className="form-group">
            <label>Product name</label>
            <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </div>

          <div className="form-group">
            <label>Description</label>
            <textarea rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </div>

          <div className="form-group">
            <label>Product photo</label>
            <p className="text-muted" style={{ fontSize: '0.85rem', marginBottom: '0.5rem' }}>
              Optional, but strongly recommended — products with photos get more orders.
              Without a photo, a default placeholder is shown.
            </p>
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={handleImageChange}
            />
            {imagePreview && (
              <img
                src={imagePreview}
                alt="Preview"
                style={{
                  marginTop: '0.75rem',
                  width: '100%',
                  maxWidth: 280,
                  height: 180,
                  objectFit: 'cover',
                  borderRadius: 'var(--radius)',
                  border: '1px solid var(--color-border)',
                }}
              />
            )}
          </div>

          <h3 style={{ marginBottom: '0.75rem', fontFamily: 'var(--font-display)' }}>Variants</h3>
          {form.variants.map((v, i) => (
            <div key={i} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: '0.5rem', marginBottom: '0.5rem' }}>
              <input placeholder="Quality" required value={v.quality} onChange={(e) => {
                const variants = [...form.variants];
                variants[i].quality = e.target.value;
                setForm({ ...form, variants });
              }} />
              <input type="number" placeholder="Price" required min={0} value={v.price} onChange={(e) => {
                const variants = [...form.variants];
                variants[i].price = parseFloat(e.target.value) || 0;
                setForm({ ...form, variants });
              }} />
              <input type="number" placeholder="Stock" required min={0} value={v.stock} onChange={(e) => {
                const variants = [...form.variants];
                variants[i].stock = parseInt(e.target.value, 10) || 0;
                setForm({ ...form, variants });
              }} />
              <select value={v.unit} onChange={(e) => {
                const variants = [...form.variants];
                variants[i].unit = e.target.value;
                setForm({ ...form, variants });
              }}>
                <option value="kg">kg</option>
                <option value="piece">piece</option>
              </select>
            </div>
          ))}
          <button type="button" className="btn btn-outline btn-sm" onClick={addVariant} style={{ marginBottom: '1rem' }}>
            + Add Variant
          </button>
          <br />
          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? 'Creating...' : 'Create Product'}
          </button>
        </form>
      )}

      <div className="grid grid-2">
        {products.map((p) => (
          <div key={p._id} className="card card-product">
            {p.image ? (
              <div className="card-product-image" style={{ height: 140, backgroundImage: `url(${p.image})` }} />
            ) : (
              <div className="card-product-image" style={{ height: 140 }} />
            )}
            <div className="card-product-body">
              <h3>{p.name}</h3>
              <p className="text-muted" style={{ fontSize: '0.85rem' }}>
                {p.isApproved ? '✅ Approved' : '⏳ Pending approval'} · {p.variants?.length} variants
                {!p.image && ' · No photo'}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
