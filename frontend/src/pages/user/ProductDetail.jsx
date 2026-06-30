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
    <div className="container page-section">
      <div className="card product-detail-grid">
        <div
          className="card-product-image product-detail-image"
          style={product.image ? { backgroundImage: `url(${product.image})` } : undefined}
        />
        <div>
          <h1 className="section-title" style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>{product.name}</h1>
          <p className="text-muted" style={{ marginBottom: '1.5rem' }}>{product.description}</p>

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

          <p className="price" style={{ fontSize: '1.25rem', marginBottom: '1rem' }}>
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
