import { useEffect, useState } from 'react';
import { productApi } from '../../services/api';

export default function AdminProducts() {
  const [products, setProducts] = useState([]);

  const load = () => productApi.getAll({ approvedOnly: false }).then((res) => setProducts(res.data));
  useEffect(() => { load(); }, []);

  const approve = async (id) => {
    await productApi.approve(id);
    load();
  };

  const toggleFeatured = async (id, current) => {
    await productApi.update(id, { isFeatured: !current });
    load();
  };

  return (
    <div>
      <h1 className="page-title">Products</h1>
      <div className="card" style={{ overflow: 'auto' }}>
        <table className="table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Owner</th>
              <th>Variants</th>
              <th>Approved</th>
              <th>Featured</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {products.map((p) => (
              <tr key={p._id}>
                <td>{p.name}</td>
                <td>{p.ownerId?.name || '—'}</td>
                <td>{p.variants?.length || 0}</td>
                <td>{p.isApproved ? '✅' : '⏳'}</td>
                <td>{p.isFeatured ? '⭐' : '—'}</td>
                <td style={{ display: 'flex', gap: '0.5rem' }}>
                  {!p.isApproved && (
                    <button className="btn btn-sm btn-primary" onClick={() => approve(p._id)}>Approve</button>
                  )}
                  <button className="btn btn-sm btn-outline" onClick={() => toggleFeatured(p._id, p.isFeatured)}>
                    {p.isFeatured ? 'Unfeature' : 'Feature'}
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
