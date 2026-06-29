import { useEffect, useState } from 'react';
import { productApi } from '../../services/api';
import ProductCard from '../../components/ProductCard';

export default function Products() {
  const [products, setProducts] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    productApi.getAll({ search: search || undefined })
      .then((res) => setProducts(res.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [search]);

  return (
    <div className="container" style={{ padding: '2rem 0' }}>
      <h1 className="page-title">All Products</h1>
      <input
        type="search"
        placeholder="Search fruits..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        style={{ maxWidth: 400, marginBottom: '1.5rem', padding: '0.625rem 1rem', border: '1px solid var(--color-border)', borderRadius: 'var(--radius)', width: '100%' }}
      />
      {loading ? (
        <p>Loading...</p>
      ) : products.length ? (
        <div className="grid grid-3">
          {products.map((p) => <ProductCard key={p._id} product={p} />)}
        </div>
      ) : (
        <p className="empty-state">No products found.</p>
      )}
    </div>
  );
}
