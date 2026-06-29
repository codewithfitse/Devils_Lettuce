import { useEffect, useState } from 'react';
import { deliveryApi, orderApi } from '../../services/api';
import OrderStatusBadge from '../../components/OrderStatusBadge';

function OrderCard({ order, actions }) {
  return (
    <div className="card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <strong>#{order._id.slice(-6)}</strong>
        <OrderStatusBadge status={order.status} />
      </div>
      <p style={{ fontSize: '0.9rem' }}>
        Customer: {order.userId?.name} · {order.userId?.phone}
      </p>
      <p style={{ fontSize: '0.85rem', color: 'var(--color-muted)' }}>
        Merchant: {order.merchantId?.name}
      </p>
      <p style={{ fontSize: '0.85rem', color: 'var(--color-muted)' }}>
        📍 {order.location?.address} ({order.location?.zone})
      </p>
      <p style={{ fontWeight: 600 }}>
        {order.totalPrice + (order.deliveryFee || 0)} ETB
        <span style={{ fontWeight: 400, color: 'var(--color-muted)', marginLeft: '0.5rem' }}>
          (delivery fee: {order.deliveryFee || 0} ETB)
        </span>
      </p>
      {actions && <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.75rem' }}>{actions}</div>}
    </div>
  );
}

export default function DriverDeliveries() {
  const [available, setAvailable] = useState([]);
  const [mine, setMine] = useState([]);
  const [completed, setCompleted] = useState([]);
  const [tab, setTab] = useState('active');

  const load = () => {
    deliveryApi.getAvailable().then((res) => setAvailable(res.data));
    deliveryApi.getMine().then((res) => setMine(res.data));
    deliveryApi.getCompleted().then((res) => setCompleted(res.data));
  };

  useEffect(() => { load(); }, []);

  const claim = async (id) => {
    await orderApi.claim(id);
    load();
  };

  const start = async (id) => {
    await deliveryApi.start(id);
    load();
  };

  const complete = async (id) => {
    await deliveryApi.complete(id);
    load();
  };

  return (
    <div>
      <h1 className="page-title">Deliveries</h1>

      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
        <button
          type="button"
          className={`btn btn-sm ${tab === 'active' ? 'btn-primary' : 'btn-outline'}`}
          onClick={() => setTab('active')}
        >
          Active ({available.length + mine.length})
        </button>
        <button
          type="button"
          className={`btn btn-sm ${tab === 'completed' ? 'btn-primary' : 'btn-outline'}`}
          onClick={() => setTab('completed')}
        >
          Completed ({completed.length})
        </button>
      </div>

      {tab === 'active' ? (
        <>
          <h2 style={{ fontSize: '1.15rem', marginBottom: '1rem' }}>Available Orders</h2>
          <p style={{ color: 'var(--color-muted)', marginBottom: '1rem', fontSize: '0.9rem' }}>
            Pick an order you want to deliver. First come, first served.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '2rem' }}>
            {available.map((order) => (
              <OrderCard
                key={order._id}
                order={order}
                actions={
                  <button className="btn btn-sm btn-primary" onClick={() => claim(order._id)}>
                    Take This Order
                  </button>
                }
              />
            ))}
            {!available.length && <p className="empty-state">No orders available right now.</p>}
          </div>

          <h2 style={{ fontSize: '1.15rem', marginBottom: '1rem' }}>My Active Deliveries</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {mine.map((order) => (
              <OrderCard
                key={order._id}
                order={order}
                actions={
                  <>
                    {order.status === 'available_for_delivery' && (
                      <button className="btn btn-sm btn-primary" onClick={() => start(order._id)}>
                        Start Delivery
                      </button>
                    )}
                    {order.status === 'delivering' && (
                      <button className="btn btn-sm btn-primary" onClick={() => complete(order._id)}>
                        Mark Delivered
                      </button>
                    )}
                  </>
                }
              />
            ))}
            {!mine.length && <p className="empty-state">You have no active deliveries.</p>}
          </div>
        </>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {completed.map((order) => (
            <OrderCard key={order._id} order={order} />
          ))}
          {!completed.length && <p className="empty-state">No completed deliveries yet.</p>}
        </div>
      )}
    </div>
  );
}
