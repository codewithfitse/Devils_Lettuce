import { Link } from 'react-router-dom';

export default function ProductCard({ product }) {
  const minPrice = product.variants?.length
    ? Math.min(...product.variants.map((v) => v.price))
    : 0;

  return (
    <div className="card card-product">
      <div
        className="card-product-image"
        style={product.image ? { backgroundImage: `url(${product.image})` } : undefined}
      />
      <div className="card-product-body">
        {product.isFeatured && (
          <span className="badge badge-featured" style={{ marginBottom: '0.5rem' }}>
            Featured
          </span>
        )}
        <h3 style={{ fontSize: '1.1rem', marginBottom: '0.25rem' }}>{product.name}</h3>
        <p className="text-muted" style={{ fontSize: '0.85rem', marginBottom: '0.75rem' }}>
          {product.description?.slice(0, 80)}
        </p>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span className="price">From {minPrice} ETB</span>
          <Link to={`/products/${product._id}`} className="btn btn-primary btn-sm">
            View
          </Link>
        </div>
      </div>
    </div>
  );
}
