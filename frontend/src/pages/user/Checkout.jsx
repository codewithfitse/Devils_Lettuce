import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCart } from '../../contexts/CartContext';
import { useAuth } from '../../contexts/AuthContext';
import { orderApi, deliveryApi } from '../../services/api';

export default function Checkout() {
  const { items, total, clearCart } = useCart();
  const { user } = useAuth();
  const navigate = useNavigate();
  const productIds = items.map((i) => i.productId);
  const [zones, setZones] = useState([]);
  const [form, setForm] = useState({
    phone: user?.phone || '',
    address: '',
    zone: '',
    notes: '',
  });
  const [deliveryFee, setDeliveryFee] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    deliveryApi.getZones(productIds).then((res) => {
      setZones(res.data);
      setForm((prev) => {
        if (prev.zone && !res.data.some((z) => z.key === prev.zone)) {
          return { ...prev, zone: '' };
        }
        return prev;
      });
    });
  }, [productIds]);

  useEffect(() => {
    if (form.zone) {
      deliveryApi.estimate(form.zone, productIds).then((res) => setDeliveryFee(res.data.fee));
    } else {
      setDeliveryFee(0);
    }
  }, [form.zone, productIds]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const cartItems = items.map((i) => ({
        productId: i.productId,
        variantId: i.variantId,
        quantity: i.quantity,
      }));

      await orderApi.create({
        cartItems,
        phone: form.phone,
        notes: form.notes,
        location: { address: form.address, zone: form.zone },
      });

      clearCart();
      navigate('/orders');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (!items.length) {
    navigate('/cart');
    return null;
  }

  return (
    <div className="container" style={{ padding: '2rem 0', maxWidth: 600 }}>
      <h1 className="page-title">Checkout</h1>
      {error && <div className="alert alert-error">{error}</div>}

      <form onSubmit={handleSubmit} className="card">
        <div className="form-group">
          <label>Phone Number</label>
          <input required value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
        </div>
        <div className="form-group">
          <label>Delivery Address (text or map link)</label>
          <textarea
            required
            rows={3}
            value={form.address}
            onChange={(e) => setForm({ ...form, address: e.target.value })}
            placeholder="House / landmark OR share Google/Apple/OSM map link"
          />
          <p style={{ fontSize: '0.8rem', color: 'var(--color-muted)', marginTop: '0.35rem' }}>
            You can paste a map share link. We automatically read coordinates when possible.
          </p>
        </div>
        <div className="form-group">
          <label>Delivery Zone</label>
          {!zones.length ? (
            <p className="alert alert-error" style={{ margin: 0 }}>
              No delivery area in common for your cart items. Remove a product or try again later.
            </p>
          ) : (
            <select required value={form.zone} onChange={(e) => setForm({ ...form, zone: e.target.value })}>
              <option value="">Select zone...</option>
              {zones.map((z) => (
                <option key={z.key} value={z.key}>
                  {z.name} ({z.fee === 0 ? 'Free' : `+${z.fee} ETB`})
                </option>
              ))}
            </select>
          )}
        </div>
        <div className="form-group">
          <label>Notes (optional)</label>
          <textarea rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
        </div>

        <div style={{ marginBottom: '1.5rem' }}>
          <p>Subtotal: <strong>{total} ETB</strong></p>
          <p>Delivery: <strong>{deliveryFee} ETB</strong></p>
          <p style={{ fontSize: '1.15rem' }}>Grand Total: <strong>{total + deliveryFee} ETB</strong></p>
          <p style={{ fontSize: '0.85rem', color: 'var(--color-muted)', marginTop: '0.5rem' }}>
            Note: Orders from multiple merchants will be split. You only pay for accepted orders.
          </p>
        </div>

        <button type="submit" className="btn btn-primary" disabled={loading || !zones.length || !form.zone}>
          {loading ? 'Placing Order...' : 'Place Order'}
        </button>
      </form>
    </div>
  );
}
