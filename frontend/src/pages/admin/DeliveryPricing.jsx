import { useEffect, useMemo, useState } from 'react';
import { deliveryApi } from '../../services/api';

function sortByName(a, b) {
  return String(a.name || '').localeCompare(String(b.name || ''));
}

export default function AdminDeliveryPricing() {
  const [zones, setZones] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const load = () => {
    setLoading(true);
    setError('');
    setMessage('');
    return deliveryApi
      .getPricing()
      .then((res) => setZones(res.data))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  const sortedZones = useMemo(() => [...zones].sort(sortByName), [zones]);

  const setFee = (key, fee) => {
    setZones((prev) =>
      prev.map((z) => (z.key === key ? { ...z, fee } : z))
    );
  };

  const save = async () => {
    setSaving(true);
    setError('');
    setMessage('');
    try {
      const payload = zones.map((z) => ({ key: z.key, fee: Number(z.fee) || 0 }));
      const res = await deliveryApi.updatePricing(payload);
      setZones(res.data);
      setMessage('Delivery fees updated.');
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <h1 className="page-title">Delivery Prices</h1>
      <p style={{ color: 'var(--color-muted)', marginBottom: '1rem', fontSize: '0.9rem' }}>
        Zones stay the same. You can adjust the delivery fee any time.
      </p>

      {message && <div className="alert alert-success">{message}</div>}
      {error && <div className="alert alert-error">{error}</div>}

      {loading ? (
        <p>Loading…</p>
      ) : (
        <div className="card table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Zone</th>
                <th style={{ width: 180 }}>Fee (ETB)</th>
              </tr>
            </thead>
            <tbody>
              {sortedZones.map((z) => (
                <tr key={z.key}>
                  <td>
                    <strong>{z.name}</strong>
                    <div style={{ color: 'var(--color-muted)', fontSize: '0.85rem' }}>{z.key}</div>
                  </td>
                  <td>
                    <input
                      type="number"
                      min={0}
                      value={z.fee}
                      onChange={(e) => setFee(z.key, parseInt(e.target.value, 10) || 0)}
                      style={{ width: '100%' }}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem', flexWrap: 'wrap' }}>
            <button type="button" className="btn btn-primary" onClick={save} disabled={saving}>
              {saving ? 'Saving…' : 'Save Prices'}
            </button>
            <button type="button" className="btn btn-outline" onClick={load} disabled={saving}>
              Reset
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

