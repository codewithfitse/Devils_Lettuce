import { useEffect, useState } from 'react';
import { paymentApi } from '../../services/api';
import OrderStatusBadge from '../../components/OrderStatusBadge';

export default function AdminPayments() {
  const [payments, setPayments] = useState([]);
  const [message, setMessage] = useState('');

  const load = () => paymentApi.getAll().then((res) => setPayments(res.data));
  useEffect(() => { load(); }, []);

  const approve = async (id) => {
    await paymentApi.approve(id);
    setMessage('Payment approved. Go to Admin → Orders to release delivery or deliver yourself.');
    load();
  };
  const reject = async (id) => {
    const reason = prompt('Rejection reason:');
    if (reason) { await paymentApi.reject(id, reason); load(); }
  };

  return (
    <div>
      <h1 className="page-title">Payments</h1>
      {message && <div className="alert alert-success">{message}</div>}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {payments.map((p) => (
          <div key={p._id} className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <strong>{p.totalAmount} ETB</strong>
              <OrderStatusBadge status={p.status} />
            </div>
            <p style={{ fontSize: '0.85rem', color: 'var(--color-muted)' }}>
              By: {p.userId?.name} · Orders: {p.orderIds?.length} · Expires: {new Date(p.expiresAt).toLocaleString()}
            </p>
            {p.proof && (
              <a href={p.proof} target="_blank" rel="noreferrer" style={{ display: 'block', margin: '0.75rem 0' }}>
                View Payment Proof
              </a>
            )}
            {p.status === 'pending' && (
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button className="btn btn-sm btn-primary" onClick={() => approve(p._id)}>Approve</button>
                <button className="btn btn-sm btn-danger" onClick={() => reject(p._id)}>Reject</button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
