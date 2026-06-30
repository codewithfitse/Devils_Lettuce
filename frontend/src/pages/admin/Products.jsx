import { useEffect, useState } from 'react';
import { productApi } from '../../services/api';

export default function AdminProducts() {
  const [products, setProducts] = useState([]);
  const [error, setError] = useState('');

  const load = () => productApi.getAll({ approvedOnly: false, includeInactive: true }).then((res) => setProducts(res.data));
  useEffect(() => { load(); }, []);

  const run = async (action) => {
    setError('');
    try {
      await action();
      load();
    } catch (err) {
      setError(err.message);
    }
  };

  const approve = (id) => run(() => productApi.approve(id));
  const toggleFeatured = (id, current) => run(() => productApi.update(id, { isFeatured: !current }));
  const toggleVisible = (id, current) => run(() => productApi.update(id, { isActive: !current }));
  const handleDelete = (id, name) => {
    if (!window.confirm(`Delete "${name}" from the store?`)) return;
    run(() => productApi.delete(id));
  };

  return (
    <div>
      <h1 className="page-title">Products</h1>
      {error && <div className="alert alert-error">{error}</div>}
      <div className="card table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Owner</th>
              <th>Variants</th>
              <th>Approved</th>
              <th>Visible</th>
              <th>Featured</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {products.map((p) => (
              <tr key={p._id} style={{ opacity: p.isActive ? 1 : 0.6 }}>
                <td>{p.name}</td>
                <td>{p.ownerId?.name || '—'}</td>
                <td>{p.variants?.length || 0}</td>
                <td>{p.isApproved ? '✅' : '⏳'}</td>
                <td>{p.isActive ? '👁 Yes' : '🚫 Hidden'}</td>
                <td>{p.isFeatured ? '⭐' : '—'}</td>
                <td style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                  {!p.isApproved && (
                    <button className="btn btn-sm btn-primary" onClick={() => approve(p._id)}>Approve</button>
                  )}
                  <button className="btn btn-sm btn-outline" onClick={() => toggleVisible(p._id, p.isActive)}>
                    {p.isActive ? 'Hide' : 'Show'}
                  </button>
                  <button className="btn btn-sm btn-outline" onClick={() => toggleFeatured(p._id, p.isFeatured)}>
                    {p.isFeatured ? 'Unfeature' : 'Feature'}
                  </button>
                  <button className="btn btn-sm btn-danger" onClick={() => handleDelete(p._id, p.name)}>
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
