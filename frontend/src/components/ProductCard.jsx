import { Link } from 'react-router-dom';
import { useCart } from '../contexts/CartContext';

export default function ProductCard({ product, onAddToCart }) {
  const { count } = useCart();
  const minPrice = product.variants?.length
    ? Math.min(...product.variants.map((v) => v.price))
    : 0;

  return (
    <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
      <div
        style={{
          height: 160,
          background: product.image
            ? `url(${product.image}) center/cover`
            : 'linear-gradient(135deg, #2d6a4f, #52b788)',
        }}
      />
      <div style={{ padding: '1rem' }}>
        {product.isFeatured && (
          <span className="badge" style={{ background: '#f4a261', color: '#fff', marginBottom: '0.5rem' }}>
            Featured
          </span>
        )}
        <h3 style={{ fontSize: '1.1rem', marginBottom: '0.25rem' }}>{product.name}</h3>
        <p style={{ color: 'var(--color-muted)', fontSize: '0.85rem', marginBottom: '0.75rem' }}>
          {product.description?.slice(0, 80)}
        </p>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontWeight: 700, color: 'var(--color-primary)' }}>
            From {minPrice} ETB
          </span>
          <Link to={`/products/${product._id}`} className="btn btn-primary btn-sm">
            View
          </Link>
        </div>
      </div>
    </div>
  );
}
