import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { orderApi } from '../../services/api';
import OrderStatusBadge from '../../components/OrderStatusBadge';

export default function Orders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    orderApi.getAll().then((res) => setOrders(res.data)).finally(() => setLoading(false));
  }, []);

  const acceptedOrders = orders.filter((o) => o.status === 'accepted');

  return (
    <div className="container" style={{ padding: '2rem 0' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h1 className="page-title" style={{ marginBottom: 0 }}>My Orders</h1>
        {acceptedOrders.length > 0 && (
          <Link to="/payment" className="btn btn-primary">Upload Payment ({acceptedOrders.length})</Link>
        )}
      </div>

      {loading ? (
        <p>Loading...</p>
      ) : orders.length ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {orders.map((order) => (
            <div key={order._id} className="card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                <span style={{ fontWeight: 600 }}>Order #{order._id.slice(-6)}</span>
                <OrderStatusBadge status={order.status} />
              </div>
              <p style={{ fontSize: '0.85rem', color: 'var(--color-muted)' }}>
                Merchant: {order.merchantId?.name || 'N/A'} · {new Date(order.createdAt).toLocaleDateString()}
              </p>
              <ul style={{ margin: '0.75rem 0', paddingLeft: '1.25rem' }}>
                {order.items.map((item, i) => (
                  <li key={i}>{item.productName} ({item.quality}) x{item.quantity} — {item.price * item.quantity} ETB</li>
                ))}
              </ul>
              <p style={{ fontWeight: 600 }}>
                Total: {order.totalPrice + (order.deliveryFee || 0)} ETB
                {order.deliveryFee > 0 && <span style={{ fontWeight: 400, color: 'var(--color-muted)' }}> (incl. {order.deliveryFee} ETB delivery)</span>}
              </p>
            </div>
          ))}
        </div>
      ) : (
        <p className="empty-state">No orders yet.</p>
      )}
    </div>
  );
}
