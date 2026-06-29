import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { productApi } from '../../services/api';
import ProductCard from '../../components/ProductCard';

export default function Home() {
  const [featured, setFeatured] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    productApi.getAll({ featured: true })
      .then((res) => setFeatured(res.data.slice(0, 6)))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <section className="hero">
        <div className="container hero-content">
          <img src="/logo.png" alt="Devil's Lettuce" className="hero-logo" />
          <p className="hero-tagline">Quality · Trust · Relief</p>
          <h1>Premium Fruits, Delivered Fast</h1>
          <p>
            Order top-quality fruits from trusted merchants across Addis Ababa.
            Pay via Telebirr — delivered to your door.
          </p>
          <Link to="/products" className="btn btn-primary" style={{ fontSize: '1rem' }}>
            Browse Products
          </Link>
        </div>
      </section>

      <section className="container page-section">
        <h2 className="section-title">Featured Products</h2>
        {loading ? (
          <p className="text-muted">Loading...</p>
        ) : featured.length ? (
          <div className="grid grid-3">
            {featured.map((p) => <ProductCard key={p._id} product={p} />)}
          </div>
        ) : (
          <p className="empty-state">No featured products yet. Check back soon!</p>
        )}
      </section>
    </div>
  );
}
