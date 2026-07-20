import OrderStatusBadge from './OrderStatusBadge';
import { orderAddressLabel, orderMapUrl } from '../utils/orderLocation';
import { orderApi, deliveryApi } from '../services/api';

function getId(ref) {
  return ref?._id ? String(ref._id) : ref ? String(ref) : null;
}

function statusHint(status) {
  switch (status) {
    case 'pending':
      return 'Waiting for merchant to accept.';
    case 'accepted':
      return 'Waiting for customer payment.';
    case 'payment_pending':
      return 'Payment uploaded — approve under Admin → Payments.';
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

export default function OrderManagementCard({ order, user, run, showMerchant = false }) {
  const driverId = getId(order.assignedDriverId);
  const isSelf = driverId === String(user._id);
  const hasDriver = Boolean(driverId);
  const mapsUrl = orderMapUrl(order);
  const phone = order.phone || order.userId?.phone;

  return (
    <div className="card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
        <strong>
          #{order._id.slice(-6)}
          {!showMerchant && order.userId?.name ? ` — ${order.userId.name}` : ''}
        </strong>
        <OrderStatusBadge status={order.status} />
      </div>

      {showMerchant && (
        <p style={{ fontSize: '0.85rem', color: 'var(--color-muted)', marginTop: '0.35rem' }}>
          {order.userId?.name} → {order.merchantId?.name} · {order.totalPrice + (order.deliveryFee || 0)} ETB
        </p>
      )}

      <ul style={{ margin: '0.5rem 0', paddingLeft: '1.25rem', fontSize: '0.9rem' }}>
        {order.items?.map((item, i) => (
          <li key={i}>
            {item.productName} ({item.quality}) x{item.quantity} {item.unit}
          </li>
        ))}
      </ul>

      {!showMerchant && (
        <p style={{ fontWeight: 600 }}>{order.totalPrice + (order.deliveryFee || 0)} ETB</p>
      )}

      {phone && (
        <p style={{ fontSize: '0.9rem', marginTop: '0.35rem' }}>
          <strong>Phone:</strong>{' '}
          <a href={`tel:${phone}`} style={{ color: 'var(--color-primary)' }}>
            {phone}
          </a>
        </p>
      )}

      <p style={{ fontSize: '0.85rem', color: 'var(--color-muted)' }}>
        📍 {orderAddressLabel(order)}
        {order.location?.zone ? ` (${order.location.zone})` : ''}
      </p>

      {mapsUrl && (
        <p style={{ marginTop: '0.35rem' }}>
          <a href={mapsUrl} target="_blank" rel="noreferrer" className="btn btn-sm btn-outline">
            Open Map
          </a>
        </p>
      )}

      <p style={{ fontSize: '0.85rem', marginTop: '0.5rem', color: 'var(--color-muted)' }}>
        {statusHint(order.status)}
      </p>

      {hasDriver && (
        <p style={{ fontSize: '0.85rem', marginTop: '0.35rem' }}>
          Driver: {order.assignedDriverId?.name || 'Assigned'}
          {isSelf && ' (you)'}
        </p>
      )}

      <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.75rem', flexWrap: 'wrap' }}>
        {order.status === 'pending' && (
          <>
            <button
              type="button"
              className="btn btn-sm btn-primary"
              onClick={() => run(() => orderApi.accept(order._id))}
            >
              Accept
            </button>
            <button
              type="button"
              className="btn btn-sm btn-danger"
              onClick={() => {
                const reason = prompt('Rejection reason:');
                if (reason) run(() => orderApi.reject(order._id, reason));
              }}
            >
              Reject
            </button>
          </>
        )}
        {order.status === 'paid' && !hasDriver && (
          <>
            <button
              type="button"
              className="btn btn-sm btn-primary"
              onClick={() => run(() => orderApi.makeAvailable(order._id))}
            >
              Release to Drivers
            </button>
            <button
              type="button"
              className="btn btn-sm btn-outline"
              onClick={() => run(() => orderApi.deliverSelf(order._id))}
            >
              I'll Deliver Myself
            </button>
          </>
        )}
        {isSelf && ['paid', 'available_for_delivery'].includes(order.status) && (
          <button
            type="button"
            className="btn btn-sm btn-primary"
            onClick={() => run(() => deliveryApi.start(order._id))}
          >
            Start Delivery
          </button>
        )}
        {order.status === 'delivering' && isSelf && (
          <button
            type="button"
            className="btn btn-sm btn-primary"
            onClick={() => run(() => deliveryApi.complete(order._id))}
          >
            Mark Delivered
          </button>
        )}
      </div>
    </div>
  );
}
