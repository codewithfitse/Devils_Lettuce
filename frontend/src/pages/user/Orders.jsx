import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { orderApi } from '../../services/api';
import OrderStatusBadge from '../../components/OrderStatusBadge';
import OrderFilterTabs, { splitOrders } from '../../components/OrderFilterTabs';

export default function Orders() {
  const [orders, setOrders] = useState([]);
  const [tab, setTab] = useState('active');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    orderApi.getAll().then((res) => setOrders(res.data)).finally(() => setLoading(false));
  }, []);

  const acceptedOrders = orders.filter((o) => o.status === 'accepted');
  const { active, completed } = splitOrders(orders);
  const visible = tab === 'active' ? active : completed;

  return (
    <div className="container" style={{ padding: '2rem 0' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '0.75rem' }}>
        <h1 className="page-title" style={{ marginBottom: 0 }}>My Orders</h1>
        {acceptedOrders.length > 0 && (
          <Link to="/payment" className="btn btn-primary">Upload Payment ({acceptedOrders.length})</Link>
        )}
      </div>

      {loading ? (
        <p>Loading...</p>
      ) : orders.length ? (
        <>
          <OrderFilterTabs
            tab={tab}
            onTabChange={setTab}
            activeCount={active.length}
            completedCount={completed.length}
          />

          {!visible.length ? (
            <p className="empty-state">{tab === 'active' ? 'No active orders.' : 'No completed orders yet.'}</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {visible.map((order) => (
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
                    {order.deliveryFee > 0 && (
                      <span style={{ fontWeight: 400, color: 'var(--color-muted)' }}> (incl. {order.deliveryFee} ETB delivery)</span>
                    )}
                  </p>
                </div>
              ))}
            </div>
          )}
        </>
      ) : (
        <p className="empty-state">No orders yet.</p>
      )}
    </div>
  );
}
