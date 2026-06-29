import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCart } from '../../contexts/CartContext';
import { useAuth } from '../../contexts/AuthContext';
import { orderApi, deliveryApi } from '../../services/api';

export default function Checkout() {
  const { items, total, clearCart } = useCart();
  const { user } = useAuth();
  const navigate = useNavigate();
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
    deliveryApi.getZones().then((res) => setZones(res.data));
  }, []);

  useEffect(() => {
    if (form.zone) {
      deliveryApi.estimate(form.zone).then((res) => setDeliveryFee(res.data.fee));
    }
  }, [form.zone]);

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
          <label>Delivery Address</label>
          <textarea required rows={3} value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
        </div>
        <div className="form-group">
          <label>Delivery Zone</label>
          <select required value={form.zone} onChange={(e) => setForm({ ...form, zone: e.target.value })}>
            <option value="">Select zone...</option>
            {zones.map((z) => (
              <option key={z.key} value={z.key}>{z.name} (+{z.fee} ETB)</option>
            ))}
          </select>
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

        <button type="submit" className="btn btn-primary" disabled={loading}>
          {loading ? 'Placing Order...' : 'Place Order'}
        </button>
      </form>
    </div>
  );
}
