import { useEffect, useState } from 'react';
import { productApi, deliveryApi } from '../../services/api';
import { formatZoneFee } from '../../components/ZonePicker';

const emptyVariant = { quality: 'High', price: 0, stock: 0, unit: 'kg' };

function DeliveryOptionsEditor({ zones, options, onChange }) {
  const selectedKeys = new Set((options || []).map((o) => o.key));

  const getFee = (key) => options?.find((o) => o.key === key)?.fee ?? 0;
  const getName = (key) => zones.find((z) => z.key === key)?.name || key;

  const toggle = (key) => {
    const current = options || [];
    const isOn = selectedKeys.has(key);

    if (isOn) {
      if (current.length <= 1) {
        alert('At least one delivery place must stay enabled');
        return;
      }
      onChange(current.filter((o) => o.key !== key));
    } else {
      const z = zones.find((x) => x.key === key);
      const next = [
        ...current,
        {
          key,
          name: z?.name || getName(key),
          fee: z?.fee ?? getFee(key),
        },
      ];
      onChange(next);
    }
  };

  const setFee = (key, fee) => {
    const next = (options || []).map((o) => (o.key === key ? { ...o, fee } : o));
    onChange(next);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
      {zones.map((z) => {
        const on = selectedKeys.has(z.key);
        if (!on) {
          return (
            <label
              key={z.key}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.6rem',
                padding: '0.5rem 0.65rem',
                borderRadius: 'var(--radius)',
                border: '1px solid var(--color-border)',
                cursor: 'pointer',
                background: 'transparent',
              }}
            >
              <input
                type="checkbox"
                checked={on}
                onChange={() => toggle(z.key)}
              />
              <span style={{ flex: 1 }}>{z.name}</span>
              <span style={{ fontSize: '0.85rem', color: 'var(--color-muted)' }}>
                {formatZoneFee(z.fee)} (default)
              </span>
            </label>
          );
        }

        const fee = getFee(z.key);
        return (
          <div
            key={z.key}
            style={{
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius)',
              padding: '0.5rem 0.65rem',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <input type="checkbox" checked={on} onChange={() => toggle(z.key)} />
              <span style={{ flex: 1 }}>{z.name}</span>
              <span style={{ fontSize: '0.85rem', color: 'var(--color-muted)' }}>Set fee:</span>
            </div>
            <div style={{ marginTop: '0.45rem', display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
              <input
                type="number"
                min={0}
                value={fee}
                onChange={(e) => setFee(z.key, parseFloat(e.target.value) || 0)}
                style={{ width: 140 }}
              />
              <span style={{ color: 'var(--color-muted)' }}>ETB</span>
            </div>
          </div>
        );
      })}

      <p style={{ fontSize: '0.8rem', color: 'var(--color-muted)', margin: 0 }}>
        Tick at least one place. Each place has its own delivery fee for this product.
      </p>
    </div>
  );
}

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
        <label>Delivery places *</label>
        <DeliveryOptionsEditor
          zones={allZones}
          options={form.deliveryOptions || []}
          onChange={(deliveryOptions) =>
            setForm({
              ...form,
              deliveryOptions,
              // Keep legacy deliveryZones in sync so old checkout logic keeps working.
              deliveryZones: (deliveryOptions || []).map((o) => o.key),
            })
          }
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
      <button type="submit" className="btn btn-primary" disabled={loading || !form.deliveryOptions?.length}>
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
    deliveryOptions: [],
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
    setForm({
      name: '',
      description: '',
      variants: [{ ...emptyVariant }],
      deliveryZones: [],
      deliveryOptions: [],
    });
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

    const initialOptions =
      product.deliveryOptions?.length > 0
        ? product.deliveryOptions
        : (product.deliveryZones || []).map((zoneKey) => {
            const z = allZones.find((x) => x.key === zoneKey);
            return {
              key: zoneKey,
              name: z?.name || zoneKey,
              fee: z?.fee ?? 0,
            };
          });

    setForm({
      name: product.name,
      description: product.description || '',
      deliveryOptions: initialOptions,
      deliveryZones: (initialOptions || []).map((o) => o.key),
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
    if (!form.deliveryOptions?.length) {
      setError('Select at least one delivery place');
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
    const z = allZones.find((x) => x.key === zoneKey);

    // If product already uses deliveryOptions, preserve the per-place fee while toggling.
    if (product.deliveryOptions?.length > 0) {
      const current = product.deliveryOptions || [];
      const isOn = current.some((o) => o.key === zoneKey);

      let nextOptions;
      if (isOn) {
        if (current.length <= 1) {
          alert('At least one delivery place must stay enabled');
          return;
        }
        nextOptions = current.filter((o) => o.key !== zoneKey);
      } else {
        nextOptions = [
          ...current,
          { key: zoneKey, name: z?.name || zoneKey, fee: z?.fee ?? 0 },
        ];
      }
      const nextKeys = nextOptions.map((o) => o.key);
      await productApi.update(product._id, {
        deliveryOptions: nextOptions,
        deliveryZones: nextKeys,
      });
      load();
      return;
    }

    // Legacy mode (deliveryZones only)
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
                      const on = p.deliveryOptions?.length > 0 ? p.deliveryOptions.some((o) => o.key === z.key) : (p.deliveryZones || []).includes(z.key);
                      return (
                        <button
                          key={z.key}
                          type="button"
                          className={`btn btn-sm ${on ? 'btn-primary' : 'btn-outline'}`}
                          style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem' }}
                          onClick={() => toggleProductZone(p, z.key)}
                          title={
                            p.deliveryOptions?.length > 0
                              ? `Fee: ${formatZoneFee(p.deliveryOptions.find((o) => o.key === z.key)?.fee ?? z.fee)}`
                              : formatZoneFee(z.fee)
                          }
                        >
                          {on ? '✓ ' : ''}{z.name}
                        </button>
                      );
                    })}
                  </div>
                  {(!p.deliveryOptions?.length && !p.deliveryZones?.length) && (
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
