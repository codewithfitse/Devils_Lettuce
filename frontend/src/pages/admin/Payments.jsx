import { useEffect, useState } from 'react';
import { paymentApi } from '../../services/api';
import OrderStatusBadge from '../../components/OrderStatusBadge';
import PaymentVerificationPanel from '../../components/PaymentVerificationPanel';

export default function AdminPayments() {
  const [payments, setPayments] = useState([]);
  const [message, setMessage] = useState('');

  const load = () => paymentApi.getAll().then((res) => setPayments(res.data));
  useEffect(() => { load(); }, []);

  const hasProcessing = payments.some(
    (p) => p.status === 'pending' && ['pending', 'processing'].includes(p.verification?.status)
  );

  useEffect(() => {
    if (!hasProcessing) return undefined;
    const timer = setInterval(load, 4000);
    return () => clearInterval(timer);
  }, [hasProcessing]);

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
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
              <strong>{p.totalAmount} ETB</strong>
              <OrderStatusBadge status={p.status} />
            </div>
            <p style={{ fontSize: '0.85rem', color: 'var(--color-muted)' }}>
              By: {p.userId?.name} · Orders: {p.orderIds?.length} · Expires: {new Date(p.expiresAt).toLocaleString()}
            </p>
            {p.telebirrReference && (
              <p style={{ fontSize: '0.85rem', color: 'var(--color-muted)' }}>
                User reference: {p.telebirrReference}
              </p>
            )}
            {p.telebirrSmsText && (
              <details style={{ fontSize: '0.85rem', color: 'var(--color-muted)', marginTop: '0.35rem' }}>
                <summary>Pasted Telebirr SMS</summary>
                <pre
                  style={{
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-word',
                    marginTop: '0.35rem',
                    padding: '0.5rem',
                    background: 'var(--color-surface-elevated, rgba(0,0,0,0.04))',
                    borderRadius: '6px',
                    fontSize: '0.8rem',
                  }}
                >
                  {p.telebirrSmsText}
                </pre>
              </details>
            )}

            {p.duplicateViolation && (
              <div className="alert alert-error" style={{ marginTop: '0.75rem' }}>
                Duplicate receipt violation — this Telebirr transaction was already used.
                {p.duplicateOfPaymentId && (
                  <span> Original payment #{String(p.duplicateOfPaymentId).slice(-6)}.</span>
                )}
              </div>
            )}

            <PaymentVerificationPanel payment={p} />

            {p.proof && (
              <a href={p.proof} target="_blank" rel="noreferrer" className="payment-proof-link">
                Open full-size proof
              </a>
            )}
            {p.status === 'pending' && (
              <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.75rem', flexWrap: 'wrap' }}>
                <button type="button" className="btn btn-sm btn-primary" onClick={() => approve(p._id)}>Approve</button>
                <button type="button" className="btn btn-sm btn-danger" onClick={() => reject(p._id)}>Reject</button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
