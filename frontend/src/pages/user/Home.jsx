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
      <section
        style={{
          background: 'linear-gradient(135deg, var(--color-primary-dark), var(--color-primary))',
          color: 'white',
          padding: '4rem 0',
          textAlign: 'center',
        }}
      >
        <div className="container">
          <h1 style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>Fresh Fruits, Delivered Fast</h1>
          <p style={{ fontSize: '1.15rem', opacity: 0.9, marginBottom: '2rem', maxWidth: 600, margin: '0 auto 2rem' }}>
            Order premium quality fruits from local merchants across Addis Ababa.
            Pay via Telebirr and get it delivered to your door.
          </p>
          <Link to="/products" className="btn" style={{ background: 'var(--color-accent)', color: '#212529', fontSize: '1rem' }}>
            Browse Products
          </Link>
        </div>
      </section>

      <section className="container" style={{ padding: '3rem 0' }}>
        <h2 style={{ marginBottom: '1.5rem' }}>Featured Products</h2>
        {loading ? (
          <p>Loading...</p>
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
