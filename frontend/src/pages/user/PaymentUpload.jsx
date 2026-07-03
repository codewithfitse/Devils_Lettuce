import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { orderApi, paymentApi } from '../../services/api';

export default function PaymentUpload() {
  const navigate = useNavigate();
  const [acceptedOrders, setAcceptedOrders] = useState([]);
  const [selected, setSelected] = useState([]);
  const [proof, setProof] = useState(null);
  const [reference, setReference] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    orderApi.getAll().then((res) => {
      const accepted = res.data.filter((o) => o.status === 'accepted');
      setAcceptedOrders(accepted);
      setSelected(accepted.map((o) => o._id));
    });
  }, []);

  const total = acceptedOrders
    .filter((o) => selected.includes(o._id))
    .reduce((sum, o) => sum + o.totalPrice + (o.deliveryFee || 0), 0);

  const toggleOrder = (id) => {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!proof || !selected.length) return;

    setLoading(true);
    setError('');
    try {
      const formData = new FormData();
      formData.append('proof', proof);
      formData.append('orderIds', JSON.stringify(selected));
      if (reference) formData.append('telebirrReference', reference);

      await paymentApi.create(formData);
      navigate('/orders');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (!acceptedOrders.length) {
    return (
      <div className="container" style={{ padding: '3rem 0', textAlign: 'center' }}>
        <h1 className="page-title">Upload Payment</h1>
        <p className="empty-state">No orders awaiting payment.</p>
      </div>
    );
  }

  return (
    <div className="container" style={{ padding: '2rem 0', maxWidth: 600 }}>
      <h1 className="page-title">Upload Telebirr Payment</h1>
      {error && <div className="alert alert-error">{error}</div>}

      <form onSubmit={handleSubmit} className="card">
        <p style={{ marginBottom: '1rem', color: 'var(--color-muted)' }}>
          Select accepted orders to pay for. One payment can cover multiple orders.
        </p>

        <p
          style={{
            marginBottom: '1rem',
            padding: '0.75rem 1rem',
            background: 'var(--color-surface-elevated, rgba(61, 139, 95, 0.12))',
            borderRadius: '8px',
            fontWeight: 600,
          }}
        >
          Telebirr Account: 0982863015
        </p>

        {acceptedOrders.map((order) => (
          <label key={order._id} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
            <input
              type="checkbox"
              checked={selected.includes(order._id)}
              onChange={() => toggleOrder(order._id)}
            />
            Order #{order._id.slice(-6)} — {order.totalPrice + (order.deliveryFee || 0)} ETB
          </label>
        ))}

        <p style={{ fontWeight: 700, margin: '1rem 0' }}>Total: {total} ETB</p>

        <div className="form-group">
          <label>Transaction Number (from receipt)</label>
          <input
            value={reference}
            onChange={(e) => setReference(e.target.value)}
            placeholder="e.g. DG38HZNHRO"
          />
          <p style={{ fontSize: '0.85rem', color: 'var(--color-muted)', marginTop: '0.35rem' }}>
            Find this on your Telebirr receipt under Transaction Number or Invoice No.
          </p>
        </div>

        <div className="form-group">
          <label>Payment Screenshot</label>
          <input type="file" accept="image/*" required onChange={(e) => setProof(e.target.files[0])} />
        </div>

        <button type="submit" className="btn btn-primary" disabled={loading || !selected.length}>
          {loading ? 'Uploading...' : 'Submit Payment'}
        </button>
      </form>
    </div>
  );
}
