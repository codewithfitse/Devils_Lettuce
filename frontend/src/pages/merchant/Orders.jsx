import { useEffect, useState } from 'react';
import { orderApi, deliveryApi } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import OrderStatusBadge from '../../components/OrderStatusBadge';

function getId(ref) {
  return ref?._id ? String(ref._id) : ref ? String(ref) : null;
}

export default function MerchantOrders() {
  const { user } = useAuth();
  const [orders, setOrders] = useState([]);
  const [error, setError] = useState('');

  const load = () => orderApi.getMerchant().then((res) => setOrders(res.data));
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
      <h1 className="page-title">My Orders</h1>
      <p style={{ color: 'var(--color-muted)', marginBottom: '1rem', fontSize: '0.9rem' }}>
        You only see and manage orders for your own products. After payment is confirmed, release to drivers or deliver yourself.
      </p>
      {error && <div className="alert alert-error">{error}</div>}

      {!orders.length ? (
        <p className="empty-state">No orders for your store yet.</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {orders.map((order) => {
            const driverId = getId(order.assignedDriverId);
            const isSelf = driverId === String(user._id);
            const hasDriver = Boolean(driverId);

            return (
              <div key={order._id} className="card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <strong>#{order._id.slice(-6)} — {order.userId?.name}</strong>
                  <OrderStatusBadge status={order.status} />
                </div>
                <ul style={{ margin: '0.5rem 0', paddingLeft: '1.25rem', fontSize: '0.9rem' }}>
                  {order.items.map((item, i) => (
                    <li key={i}>{item.productName} ({item.quality}) x{item.quantity}</li>
                  ))}
                </ul>
                <p style={{ fontWeight: 600 }}>{order.totalPrice + (order.deliveryFee || 0)} ETB</p>
                <p style={{ fontSize: '0.85rem', color: 'var(--color-muted)' }}>{order.location?.address}</p>

                {order.status === 'payment_pending' && (
                  <p style={{ fontSize: '0.85rem', color: 'var(--color-muted)', marginTop: '0.5rem' }}>
                    Payment pending — super admin must approve before delivery.
                  </p>
                )}
                {order.status === 'paid' && !hasDriver && (
                  <p style={{ fontSize: '0.85rem', color: 'var(--color-muted)', marginTop: '0.5rem' }}>
                    Payment confirmed — release to the driver pool or deliver it yourself.
                  </p>
                )}
                {order.status === 'available_for_delivery' && !hasDriver && (
                  <p style={{ fontSize: '0.85rem', color: 'var(--color-primary)', marginTop: '0.5rem' }}>
                    In driver pool — waiting for a driver to claim.
                  </p>
                )}
                {hasDriver && (
                  <p style={{ fontSize: '0.85rem', marginTop: '0.5rem' }}>
                    Driver: {order.assignedDriverId?.name || 'Assigned'}
                    {isSelf && ' (you)'}
                  </p>
                )}

                <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.75rem', flexWrap: 'wrap' }}>
                  {order.status === 'pending' && (
                    <>
                      <button className="btn btn-sm btn-primary" onClick={() => run(() => orderApi.accept(order._id))}>
                        Accept
                      </button>
                      <button className="btn btn-sm btn-danger" onClick={() => run(() => orderApi.reject(order._id, prompt('Rejection reason:') || ''))}>
                        Reject
                      </button>
                    </>
                  )}
                  {order.status === 'paid' && !hasDriver && (
                    <>
                      <button className="btn btn-sm btn-primary" onClick={() => run(() => orderApi.makeAvailable(order._id))}>
                        Release to Drivers
                      </button>
                      <button className="btn btn-sm btn-outline" onClick={() => run(() => orderApi.deliverSelf(order._id))}>
                        I'll Deliver Myself
                      </button>
                    </>
                  )}
                  {isSelf && ['paid', 'available_for_delivery'].includes(order.status) && (
                    <button className="btn btn-sm btn-primary" onClick={() => run(() => deliveryApi.start(order._id))}>
                      Start Delivery
                    </button>
                  )}
                  {order.status === 'delivering' && isSelf && (
                    <button className="btn btn-sm btn-primary" onClick={() => run(() => deliveryApi.complete(order._id))}>
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
