import { Link } from 'react-router-dom';
import { useCart } from '../../contexts/CartContext';

export default function Cart() {
  const { items, updateQuantity, removeItem, total } = useCart();

  if (!items.length) {
    return (
      <div className="container" style={{ padding: '3rem 0', textAlign: 'center' }}>
        <h1 className="page-title">Your Cart</h1>
        <p className="empty-state">Your cart is empty.</p>
        <Link to="/products" className="btn btn-primary">Browse Products</Link>
      </div>
    );
  }

  return (
    <div className="container" style={{ padding: '2rem 0', maxWidth: 700 }}>
      <h1 className="page-title">Your Cart</h1>
      <div className="card">
        {items.map((item) => (
          <div
            key={`${item.productId}-${item.variantId}`}
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '0.75rem 0',
              borderBottom: '1px solid var(--color-border)',
            }}
          >
            <div>
              <strong>{item.productName}</strong>
              <span style={{ color: 'var(--color-muted)', marginLeft: '0.5rem' }}>
                ({item.quality})
              </span>
              <p style={{ fontSize: '0.85rem', color: 'var(--color-muted)' }}>
                {item.price} ETB/{item.unit}
              </p>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <input
                type="number"
                min={1}
                value={item.quantity}
                onChange={(e) => updateQuantity(item.productId, item.variantId, parseInt(e.target.value, 10))}
                style={{ width: 60, padding: '0.375rem', border: '1px solid var(--color-border)', borderRadius: 'var(--radius)' }}
              />
              <span style={{ fontWeight: 600, minWidth: 70, textAlign: 'right' }}>
                {item.price * item.quantity} ETB
              </span>
              <button
                className="btn btn-sm btn-danger"
                onClick={() => removeItem(item.productId, item.variantId)}
              >
                Remove
              </button>
            </div>
          </div>
        ))}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1.5rem' }}>
          <strong style={{ fontSize: '1.25rem' }}>Subtotal: {total} ETB</strong>
          <Link to="/checkout" className="btn btn-primary">Proceed to Checkout</Link>
        </div>
      </div>
    </div>
  );
}
