import { Link } from 'react-router-dom';
import { useCart } from '../../contexts/CartContext';

export default function Cart() {
  const { items, updateQuantity, removeItem, total } = useCart();

  if (!items.length) {
    return (
      <div className="container" style={{ padding: '2rem 0', textAlign: 'center' }}>
        <h1 className="page-title">Your Cart</h1>
        <p className="empty-state">Your cart is empty.</p>
        <Link to="/products" className="btn btn-primary">Browse Products</Link>
      </div>
    );
  }

  return (
    <div className="container" style={{ padding: '1.5rem 0', maxWidth: 700 }}>
      <h1 className="page-title">Your Cart</h1>
      <div className="card">
        {items.map((item) => (
          <div key={`${item.productId}-${item.variantId}`} className="cart-row">
            <div>
              <strong>{item.productName}</strong>
              <span style={{ color: 'var(--color-muted)', marginLeft: '0.5rem' }}>
                ({item.quality})
              </span>
              <p style={{ fontSize: '0.85rem', color: 'var(--color-muted)' }}>
                {item.price} ETB/{item.unit}
              </p>
            </div>
            <div className="cart-row-actions">
              <input
                type="number"
                min={1}
                value={item.quantity}
                onChange={(e) => updateQuantity(item.productId, item.variantId, parseInt(e.target.value, 10))}
              />
              <span style={{ fontWeight: 600, minWidth: 70 }}>
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
        <div className="cart-footer">
          <strong style={{ fontSize: '1.15rem' }}>Subtotal: {total} ETB</strong>
          <Link to="/checkout" className="btn btn-primary">Proceed to Checkout</Link>
        </div>
      </div>
    </div>
  );
}
