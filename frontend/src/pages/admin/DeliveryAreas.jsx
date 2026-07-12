import { useEffect, useMemo, useState } from 'react';
import { areaApi } from '../../services/api';
import { calculateDeliveryPrice, resolveAreaPrice, getAutomaticExtraFee } from '../../utils/deliveryPricing';

function sortByName(a, b) {
  return String(a.name || '').localeCompare(String(b.name || ''));
}

function previewPrice(km, extraFee, priceOverride) {
  return resolveAreaPrice({
    km: Number(km) || 0,
    extraFee: Number(extraFee) || 0,
    priceOverride: priceOverride === '' || priceOverride == null ? null : Number(priceOverride),
  });
}

export default function AdminDeliveryAreas() {
  const [areas, setAreas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [form, setForm] = useState({ name: '', km: '', zone: 'Zone 1', extraFee: '0', priceOverride: '' });
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({ name: '', km: '', zone: '', extraFee: '0', priceOverride: '' });

  const load = () => {
    setLoading(true);
    setError('');
    setMessage('');
    return areaApi
      .getAll()
      .then((res) => setAreas(res.data))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  const sortedAreas = useMemo(() => [...areas].sort(sortByName), [areas]);

  const addArea = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    setMessage('');
    try {
      await areaApi.create({
        name: form.name.trim(),
        km: Number(form.km),
        zone: form.zone.trim(),
        extraFee: Number(form.extraFee) || 0,
        priceOverride: form.priceOverride === '' ? null : Number(form.priceOverride),
      });
      setForm({ name: '', km: '', zone: form.zone, extraFee: '0', priceOverride: '' });
      setMessage('Area added.');
      load();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const startEdit = (area) => {
    setEditingId(area._id);
    setEditForm({
      name: area.name,
      km: String(area.km),
      zone: area.zone,
      extraFee: String(area.extraFee ?? 0),
      priceOverride: area.priceOverride != null ? String(area.priceOverride) : '',
    });
  };

  const saveEdit = async (id) => {
    setSaving(true);
    setError('');
    setMessage('');
    try {
      await areaApi.update(id, {
        name: editForm.name.trim(),
        km: Number(editForm.km),
        zone: editForm.zone.trim(),
        extraFee: Number(editForm.extraFee) || 0,
        priceOverride: editForm.priceOverride === '' ? null : Number(editForm.priceOverride),
      });
      setEditingId(null);
      setMessage('Area updated.');
      load();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id, name) => {
    if (!window.confirm(`Delete area "${name}"?`)) return;
    setError('');
    setMessage('');
    try {
      await areaApi.delete(id);
      setMessage('Area deleted.');
      load();
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div>
      <h1 className="page-title">Delivery Areas</h1>
      <p style={{ color: 'var(--color-muted)', marginBottom: '1rem', fontSize: '0.9rem' }}>
        Default price: 160 + (km × 16). Areas over 12 km automatically get +250 ETB.
        You can set a custom price to override everything, or add a manual extra fee on top.
      </p>

      {message && <div className="alert alert-success">{message}</div>}
      {error && <div className="alert alert-error">{error}</div>}

      <form className="card" style={{ padding: '1rem', marginBottom: '1rem' }} onSubmit={addArea}>
        <h3 style={{ marginTop: 0 }}>Add area</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '0.75rem', alignItems: 'end' }}>
          <div className="form-group" style={{ margin: 0 }}>
            <label>Name</label>
            <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </div>
          <div className="form-group" style={{ margin: 0 }}>
            <label>km</label>
            <input required type="number" min="0" step="0.5" value={form.km} onChange={(e) => setForm({ ...form, km: e.target.value })} />
          </div>
          <div className="form-group" style={{ margin: 0 }}>
            <label>Zone group</label>
            <input required value={form.zone} onChange={(e) => setForm({ ...form, zone: e.target.value })} />
          </div>
          <div className="form-group" style={{ margin: 0 }}>
            <label>Extra fee (ETB)</label>
            <input type="number" min="0" value={form.extraFee} onChange={(e) => setForm({ ...form, extraFee: e.target.value })} />
          </div>
          <div className="form-group" style={{ margin: 0 }}>
            <label>Custom price</label>
            <input type="number" min="0" placeholder="Auto" value={form.priceOverride} onChange={(e) => setForm({ ...form, priceOverride: e.target.value })} />
          </div>
          <button type="submit" className="btn btn-primary" disabled={saving}>Add</button>
        </div>
        <p style={{ fontSize: '0.8rem', color: 'var(--color-muted)', margin: '0.75rem 0 0' }}>
          Preview: {previewPrice(form.km, form.extraFee, form.priceOverride)} ETB
        </p>
      </form>

      {loading ? (
        <p>Loading…</p>
      ) : (
        <div className="card table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Zone</th>
                <th>km</th>
                <th>Formula</th>
                <th>Auto +250</th>
                <th>Manual extra</th>
                <th>Custom</th>
                <th>Final (ETB)</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {sortedAreas.map((a) => (
                <tr key={a._id}>
                  {editingId === a._id ? (
                    <>
                      <td><input value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} /></td>
                      <td><input value={editForm.zone} onChange={(e) => setEditForm({ ...editForm, zone: e.target.value })} /></td>
                      <td><input type="number" min="0" step="0.5" value={editForm.km} onChange={(e) => setEditForm({ ...editForm, km: e.target.value })} /></td>
                      <td>{calculateDeliveryPrice(Number(editForm.km) || 0)}</td>
                      <td>{getAutomaticExtraFee(Number(editForm.km) || 0) ? '+250' : '—'}</td>
                      <td><input type="number" min="0" value={editForm.extraFee} onChange={(e) => setEditForm({ ...editForm, extraFee: e.target.value })} style={{ width: 70 }} /></td>
                      <td><input type="number" min="0" placeholder="Auto" value={editForm.priceOverride} onChange={(e) => setEditForm({ ...editForm, priceOverride: e.target.value })} style={{ width: 80 }} /></td>
                      <td>{previewPrice(editForm.km, editForm.extraFee, editForm.priceOverride)}</td>
                      <td style={{ display: 'flex', gap: '0.5rem' }}>
                        <button type="button" className="btn btn-sm btn-primary" disabled={saving} onClick={() => saveEdit(a._id)}>Save</button>
                        <button type="button" className="btn btn-sm btn-outline" onClick={() => setEditingId(null)}>Cancel</button>
                      </td>
                    </>
                  ) : (
                    <>
                      <td>{a.name}</td>
                      <td>{a.zone}</td>
                      <td>{a.km}</td>
                      <td>{a.formulaPrice ?? calculateDeliveryPrice(a.km)}</td>
                      <td>{(a.automaticExtraFee ?? getAutomaticExtraFee(a.km)) ? '+250' : '—'}</td>
                      <td>{a.extraFee ? `+${a.extraFee}` : '—'}</td>
                      <td>{a.priceOverride != null ? a.priceOverride : '—'}</td>
                      <td><strong>{a.price}</strong></td>
                      <td style={{ display: 'flex', gap: '0.5rem' }}>
                        <button type="button" className="btn btn-sm btn-outline" onClick={() => startEdit(a)}>Edit</button>
                        <button type="button" className="btn btn-sm btn-danger" onClick={() => remove(a._id, a.name)}>Delete</button>
                      </td>
                    </>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
