import { useEffect, useState } from 'react';
import { orderApi, deliveryApi } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import OrderStatusBadge from '../../components/OrderStatusBadge';

function getId(ref) {
  return ref?._id ? String(ref._id) : ref ? String(ref) : null;
}

function statusHint(status) {
  switch (status) {
    case 'pending':
      return 'Waiting for merchant to accept.';
    case 'accepted':
      return 'Waiting for customer to upload payment.';
    case 'payment_pending':
      return 'Payment uploaded — approve it under Admin → Payments.';
    case 'paid':
      return 'Payment confirmed — release to drivers or deliver yourself.';
    case 'available_for_delivery':
      return 'In driver pool — waiting for a driver to claim.';
    case 'delivering':
      return 'Out for delivery.';
    case 'completed':
      return 'Delivered.';
    case 'cancelled':
      return 'Order was cancelled.';
    default:
      return '';
  }
}

export default function AdminOrders() {
  const { user } = useAuth();
  const [orders, setOrders] = useState([]);
  const [error, setError] = useState('');

  const load = () => orderApi.getAll().then((res) => setOrders(res.data));
  useEffect(() => { load(); }, []);

  const run = async (action) => {
    setError('');
    try {
      await action();
      load();
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div>
      <h1 className="page-title">All Orders</h1>
      <p style={{ color: 'var(--color-muted)', marginBottom: '1rem', fontSize: '0.9rem' }}>
        Full access to all orders across every merchant. Super admin can manage any sub-admin's orders.
      </p>
      {error && <div className="alert alert-error">{error}</div>}

      {!orders.length ? (
        <p className="empty-state">No orders yet.</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {orders.map((order) => {
            const driverId = getId(order.assignedDriverId);
            const isSelf = driverId === String(user._id);
            const hasDriver = Boolean(driverId);

            return (
              <div key={order._id} className="card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <strong>#{order._id.slice(-6)}</strong>
                  <OrderStatusBadge status={order.status} />
                </div>
                <p style={{ fontSize: '0.85rem', color: 'var(--color-muted)' }}>
                  {order.userId?.name} → {order.merchantId?.name} · {order.totalPrice + (order.deliveryFee || 0)} ETB
                </p>
                <p style={{ fontSize: '0.85rem', color: 'var(--color-muted)' }}>
                  📍 {order.location?.address} ({order.location?.zone})
                </p>
                <p style={{ fontSize: '0.85rem', marginTop: '0.5rem' }}>{statusHint(order.status)}</p>

                {hasDriver && (
                  <p style={{ fontSize: '0.85rem', marginTop: '0.35rem' }}>
                    Driver: {order.assignedDriverId?.name || 'Assigned'}
                    {isSelf && ' (you)'}
                  </p>
                )}

                <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.75rem', flexWrap: 'wrap' }}>
                  {order.status === 'paid' && !hasDriver && (
                    <>
                      <button
                        className="btn btn-sm btn-primary"
                        onClick={() => run(() => orderApi.makeAvailable(order._id))}
                      >
                        Release to Drivers
                      </button>
                      <button
                        className="btn btn-sm btn-outline"
                        onClick={() => run(() => orderApi.deliverSelf(order._id))}
                      >
                        I'll Deliver Myself
                      </button>
                    </>
                  )}
                  {isSelf && ['paid', 'available_for_delivery'].includes(order.status) && (
                    <button
                      className="btn btn-sm btn-primary"
                      onClick={() => run(() => deliveryApi.start(order._id))}
                    >
                      Start Delivery
                    </button>
                  )}
                  {order.status === 'delivering' && isSelf && (
                    <button
                      className="btn btn-sm btn-primary"
                      onClick={() => run(() => deliveryApi.complete(order._id))}
                    >
                      Mark Delivered
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
