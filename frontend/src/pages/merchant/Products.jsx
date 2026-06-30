import { useEffect, useState } from 'react';
import { productApi, deliveryApi } from '../../services/api';
import ZonePicker, { formatZoneFee } from '../../components/ZonePicker';

const emptyVariant = { quality: 'High', price: 0, stock: 0, unit: 'kg' };

function ProductForm({
  form,
  setForm,
  allZones,
  imageFile,
  setImageFile,
  imagePreview,
  setImagePreview,
  onSubmit,
  loading,
  error,
  submitLabel,
}) {
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

  const addVariant = () => {
    setForm({ ...form, variants: [...form.variants, { ...emptyVariant }] });
  };

  const removeVariant = (index) => {
    if (form.variants.length <= 1) return;
    setForm({ ...form, variants: form.variants.filter((_, i) => i !== index) });
  };

  return (
    <form onSubmit={onSubmit} className="card" style={{ marginBottom: '1.5rem' }}>
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
        <label>Delivery areas *</label>
        <ZonePicker
          zones={allZones}
          selected={form.deliveryZones || []}
          onChange={(deliveryZones) => setForm({ ...form, deliveryZones })}
          idPrefix="form-zone"
        />
      </div>

      <div className="form-group">
        <label>Product photo</label>
        <input type="file" accept="image/jpeg,image/png,image/webp" onChange={handleImageChange} />
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
        <div key={i} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))', gap: '0.5rem', marginBottom: '0.5rem', alignItems: 'end' }}>
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
          {form.variants.length > 1 && (
            <button type="button" className="btn btn-sm btn-danger" onClick={() => removeVariant(i)}>Remove</button>
          )}
        </div>
      ))}
      <button type="button" className="btn btn-outline btn-sm" onClick={addVariant} style={{ marginBottom: '1rem' }}>
        + Add Variant
      </button>
      <br />
      <button type="submit" className="btn btn-primary" disabled={loading || !form.deliveryZones?.length}>
        {loading ? 'Saving...' : submitLabel}
      </button>
    </form>
  );
}

export default function MerchantProducts() {
  const [products, setProducts] = useState([]);
  const [allZones, setAllZones] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({
    name: '',
    description: '',
    variants: [{ ...emptyVariant }],
    deliveryZones: [],
  });
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const load = () => productApi.getMine().then((res) => setProducts(res.data));

  useEffect(() => {
    load();
    deliveryApi.getZones().then((res) => setAllZones(res.data));
  }, []);

  const resetForm = () => {
    setForm({ name: '', description: '', variants: [{ ...emptyVariant }], deliveryZones: [] });
    setImageFile(null);
    setImagePreview(null);
    setError('');
    setEditingId(null);
  };

  const startCreate = () => {
    resetForm();
    setShowForm(true);
  };

  const startEdit = (product) => {
    resetForm();
    setEditingId(product._id);
    setShowForm(true);
    setForm({
      name: product.name,
      description: product.description || '',
      deliveryZones: product.deliveryZones?.length ? [...product.deliveryZones] : [],
      variants: product.variants?.length
        ? product.variants.map((v) => ({
            quality: v.quality,
            price: v.price,
            stock: v.stock,
            unit: v.unit || 'kg',
          }))
        : [{ ...emptyVariant }],
    });
    setImagePreview(product.image || null);
  };

  const cancelForm = () => {
    setShowForm(false);
    resetForm();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.deliveryZones?.length) {
      setError('Select at least one delivery area');
      return;
    }
    setLoading(true);
    setError('');
    try {
      if (editingId) {
        await productApi.update(editingId, form, imageFile);
      } else {
        await productApi.create(form, imageFile);
      }
      setShowForm(false);
      resetForm();
      load();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const toggleProductZone = async (product, zoneKey) => {
    const current = product.deliveryZones || [];
    let next;
    if (current.includes(zoneKey)) {
      if (current.length <= 1) {
        alert('At least one delivery area must stay enabled');
        return;
      }
      next = current.filter((z) => z !== zoneKey);
    } else {
      next = [...current, zoneKey];
    }
    try {
      await productApi.update(product._id, { deliveryZones: next });
      load();
    } catch (err) {
      alert(err.message);
    }
  };

  const toggleVisibility = async (product) => {
    try {
      await productApi.update(product._id, { isActive: !product.isActive });
      load();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleDelete = async (product) => {
    if (!window.confirm(`Delete "${product.name}"? It will be hidden from the store.`)) return;
    try {
      await productApi.delete(product._id);
      load();
    } catch (err) {
      alert(err.message);
    }
  };

  const zoneLabel = (key) => allZones.find((z) => z.key === key)?.name || key;

  return (
    <div>
      <div className="page-header-row">
        <h1 className="page-title" style={{ marginBottom: 0 }}>My Products</h1>
        <button type="button" className="btn btn-primary" onClick={() => (showForm ? cancelForm() : startCreate())}>
          {showForm ? 'Cancel' : '+ Add Product'}
        </button>
      </div>

      {showForm && (
        <ProductForm
          form={form}
          setForm={setForm}
          allZones={allZones}
          imageFile={imageFile}
          setImageFile={setImageFile}
          imagePreview={imagePreview}
          setImagePreview={setImagePreview}
          onSubmit={handleSubmit}
          loading={loading}
          error={error}
          submitLabel={editingId ? 'Save Changes' : 'Create Product'}
        />
      )}

      {!products.length ? (
        <p className="empty-state">No products yet. Add your first product above.</p>
      ) : (
        <div className="grid grid-2">
          {products.map((p) => (
            <div key={p._id} className="card card-product" style={{ opacity: p.isActive ? 1 : 0.65 }}>
              {p.image ? (
                <div className="card-product-image" style={{ height: 140, backgroundImage: `url(${p.image})` }} />
              ) : (
                <div className="card-product-image" style={{ height: 140 }} />
              )}
              <div className="card-product-body">
                <h3>{p.name}</h3>
                <p className="text-muted" style={{ fontSize: '0.85rem' }}>
                  {p.isApproved ? '✅ Approved' : '⏳ Pending approval'}
                  {' · '}{p.variants?.length} variants
                  {!p.image && ' · No photo'}
                  {!p.isActive && ' · Hidden'}
                </p>

                <div style={{ marginTop: '0.75rem' }}>
                  <p style={{ fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.35rem' }}>Delivery areas</p>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem' }}>
                    {allZones.map((z) => {
                      const on = (p.deliveryZones || []).includes(z.key);
                      return (
                        <button
                          key={z.key}
                          type="button"
                          className={`btn btn-sm ${on ? 'btn-primary' : 'btn-outline'}`}
                          style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem' }}
                          onClick={() => toggleProductZone(p, z.key)}
                          title={formatZoneFee(z.fee)}
                        >
                          {on ? '✓ ' : ''}{z.name}
                        </button>
                      );
                    })}
                  </div>
                  {!p.deliveryZones?.length && (
                    <p style={{ fontSize: '0.75rem', color: 'var(--color-muted)', marginTop: '0.35rem' }}>
                      No areas set — edit product to choose delivery zones
                    </p>
                  )}
                </div>

                <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.75rem', flexWrap: 'wrap' }}>
                  <button type="button" className="btn btn-sm btn-outline" onClick={() => startEdit(p)}>
                    Edit
                  </button>
                  <button type="button" className="btn btn-sm btn-outline" onClick={() => toggleVisibility(p)}>
                    {p.isActive ? 'Hide' : 'Show'}
                  </button>
                  <button type="button" className="btn btn-sm btn-danger" onClick={() => handleDelete(p)}>
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
