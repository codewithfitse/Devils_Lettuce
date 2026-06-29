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
    <div className="container page-section">
      <h1 className="page-title">All Products</h1>
      <input
        type="search"
        className="search-input"
        placeholder="Search fruits..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
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
