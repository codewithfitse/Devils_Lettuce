import { useEffect, useState } from 'react';
import { productApi } from '../../services/api';

const emptyVariant = { quality: 'High', price: 0, stock: 0, unit: 'kg' };

export default function MerchantProducts() {
  const [products, setProducts] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', description: '', variants: [{ ...emptyVariant }] });

  const load = () => productApi.getMine().then((res) => setProducts(res.data));
  useEffect(() => { load(); }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    await productApi.create(form);
    setShowForm(false);
    setForm({ name: '', description: '', variants: [{ ...emptyVariant }] });
    load();
  };

  const addVariant = () => {
    setForm({ ...form, variants: [...form.variants, { ...emptyVariant }] });
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h1 className="page-title" style={{ marginBottom: 0 }}>My Products</h1>
        <button className="btn btn-primary" onClick={() => setShowForm(!showForm)}>
          {showForm ? 'Cancel' : '+ Add Product'}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="card" style={{ marginBottom: '1.5rem' }}>
          <div className="form-group">
            <label>Name</label>
            <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </div>
          <div className="form-group">
            <label>Description</label>
            <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </div>
          <h3 style={{ marginBottom: '0.75rem' }}>Variants</h3>
          {form.variants.map((v, i) => (
            <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '0.5rem', marginBottom: '0.5rem' }}>
              <input placeholder="Quality" value={v.quality} onChange={(e) => {
                const variants = [...form.variants];
                variants[i].quality = e.target.value;
                setForm({ ...form, variants });
              }} />
              <input type="number" placeholder="Price" value={v.price} onChange={(e) => {
                const variants = [...form.variants];
                variants[i].price = parseFloat(e.target.value);
                setForm({ ...form, variants });
              }} />
              <input type="number" placeholder="Stock" value={v.stock} onChange={(e) => {
                const variants = [...form.variants];
                variants[i].stock = parseInt(e.target.value, 10);
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
          <button type="submit" className="btn btn-primary">Create Product</button>
        </form>
      )}

      <div className="grid grid-2">
        {products.map((p) => (
          <div key={p._id} className="card">
            <h3>{p.name}</h3>
            <p style={{ color: 'var(--color-muted)', fontSize: '0.85rem' }}>
              {p.isApproved ? '✅ Approved' : '⏳ Pending approval'} · {p.variants?.length} variants
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
