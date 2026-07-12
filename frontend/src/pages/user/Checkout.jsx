import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCart } from '../../contexts/CartContext';
import { useAuth } from '../../contexts/AuthContext';
import { orderApi, deliveryApi } from '../../services/api';

const AREAS_PAGE_SIZE = 10;

export default function Checkout() {
  const { items, total, clearCart } = useCart();
  const { user } = useAuth();
  const navigate = useNavigate();
  const productIds = items.map((i) => i.productId);
  const [areas, setAreas] = useState([]);
  const [areaPage, setAreaPage] = useState(0);
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
    deliveryApi.getAreas(productIds).then((res) => {
      setAreas(res.data);
      setAreaPage(0);
      setForm((prev) => {
        if (prev.zone && !res.data.some((a) => a.key === prev.zone)) {
          return { ...prev, zone: '' };
        }
        return prev;
      });
    });
  }, [productIds]);

  const sortedAreas = useMemo(
    () => [...areas].sort((a, b) => a.name.localeCompare(b.name)),
    [areas]
  );

  const totalPages = Math.max(1, Math.ceil(sortedAreas.length / AREAS_PAGE_SIZE));
  const pageAreas = sortedAreas.slice(
    areaPage * AREAS_PAGE_SIZE,
    (areaPage + 1) * AREAS_PAGE_SIZE
  );

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
          <label>Delivery Area</label>
          {!sortedAreas.length ? (
            <p className="alert alert-error" style={{ margin: 0 }}>
              No delivery area in common for your cart items. Remove a product or try again later.
            </p>
          ) : (
            <>
              <select required value={form.zone} onChange={(e) => setForm({ ...form, zone: e.target.value })}>
                <option value="">Select your area...</option>
                {pageAreas.map((a) => (
                  <option key={a.key} value={a.key}>
                    {a.name} ({a.price} ETB)
                  </option>
                ))}
              </select>
              {totalPages > 1 && (
                <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem', alignItems: 'center' }}>
                  <button
                    type="button"
                    className="btn btn-sm btn-outline"
                    disabled={areaPage === 0}
                    onClick={() => setAreaPage((p) => Math.max(0, p - 1))}
                  >
                    Previous
                  </button>
                  <span style={{ fontSize: '0.85rem', color: 'var(--color-muted)' }}>
                    Page {areaPage + 1} of {totalPages}
                  </span>
                  <button
                    type="button"
                    className="btn btn-sm btn-outline"
                    disabled={areaPage >= totalPages - 1}
                    onClick={() => setAreaPage((p) => Math.min(totalPages - 1, p + 1))}
                  >
                    Next
                  </button>
                </div>
              )}
            </>
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
            Delivery = 160 + (km × 16). Areas over 12 km add +250 ETB.
          </p>
        </div>

        <button type="submit" className="btn btn-primary" disabled={loading || !sortedAreas.length || !form.zone}>
          {loading ? 'Placing Order...' : 'Place Order'}
        </button>
      </form>
    </div>
  );
}
