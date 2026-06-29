import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { productApi } from '../../services/api';
import { useCart } from '../../contexts/CartContext';

export default function ProductDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { addItem } = useCart();
  const [product, setProduct] = useState(null);
  const [selectedVariant, setSelectedVariant] = useState(null);
  const [quantity, setQuantity] = useState(1);

  useEffect(() => {
    productApi.getById(id).then((res) => {
      setProduct(res.data);
      if (res.data.variants?.length) setSelectedVariant(res.data.variants[0]);
    });
  }, [id]);

  if (!product) return <div className="container" style={{ padding: '2rem' }}>Loading...</div>;

  const handleAdd = () => {
    if (!selectedVariant) return;
    addItem(product, selectedVariant, quantity);
    navigate('/cart');
  };

  return (
    <div className="container" style={{ padding: '2rem 0' }}>
      <div className="card" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
        <div
          style={{
            height: 320,
            borderRadius: 'var(--radius)',
            background: product.image
              ? `url(${product.image}) center/cover`
              : 'linear-gradient(135deg, #2d6a4f, #52b788)',
          }}
        />
        <div>
          <h1 style={{ marginBottom: '0.5rem' }}>{product.name}</h1>
          <p style={{ color: 'var(--color-muted)', marginBottom: '1.5rem' }}>{product.description}</p>

          <div className="form-group">
            <label>Quality</label>
            <select
              value={selectedVariant?._id || ''}
              onChange={(e) => {
                const v = product.variants.find((v) => v._id === e.target.value);
                setSelectedVariant(v);
              }}
            >
              {product.variants.map((v) => (
                <option key={v._id} value={v._id}>
                  {v.quality} — {v.price} ETB/{v.unit} ({v.stock} in stock)
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label>Quantity</label>
            <input
              type="number"
              min={1}
              max={selectedVariant?.stock || 1}
              value={quantity}
              onChange={(e) => setQuantity(parseInt(e.target.value, 10) || 1)}
            />
          </div>

          <p style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '1rem' }}>
            Total: {(selectedVariant?.price || 0) * quantity} ETB
          </p>

          <button className="btn btn-primary" onClick={handleAdd} disabled={!selectedVariant?.stock}>
            Add to Cart
          </button>
        </div>
      </div>
    </div>
  );
}
