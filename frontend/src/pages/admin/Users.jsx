import { useEffect, useState } from 'react';
import { userApi } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';

export default function AdminUsers() {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState([]);
  const [error, setError] = useState('');

  const load = () => userApi.getAll().then((res) => setUsers(res.data));
  useEffect(() => { load(); }, []);

  const handleRoleChange = async (id, role) => {
    setError('');
    try {
      await userApi.update(id, { role });
      setUsers((prev) => prev.map((u) => (u._id === id ? { ...u, role } : u)));
    } catch (err) {
      setError(err.message);
    }
  };

  const toggleBan = async (target) => {
    if (target.isActive && !window.confirm(`Ban ${target.name}? They will not be able to log in or order.`)) {
      return;
    }

    setError('');
    try {
      await userApi.update(target._id, { isActive: !target.isActive });
      setUsers((prev) =>
        prev.map((u) => (u._id === target._id ? { ...u, isActive: !target.isActive } : u))
      );
    } catch (err) {
      setError(err.message);
    }
  };

  const isProtected = (u) =>
    u.role === 'super_admin' || String(u._id) === String(currentUser?._id);

  return (
    <div>
      <h1 className="page-title">Users</h1>
      {error && <div className="alert alert-error">{error}</div>}
      <div className="card table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Phone</th>
              <th>Role</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u._id} style={{ opacity: u.isActive ? 1 : 0.65 }}>
                <td>{u.name}</td>
                <td>{u.email || '—'}</td>
                <td>{u.phone || '—'}</td>
                <td>
                  <select
                    value={u.role}
                    disabled={isProtected(u)}
                    onChange={(e) => handleRoleChange(u._id, e.target.value)}
                  >
                    <option value="user">User</option>
                    <option value="merchant">Merchant</option>
                    <option value="driver">Driver</option>
                    <option value="sub_admin">Sub Admin</option>
                    <option value="super_admin">Super Admin</option>
                  </select>
                </td>
                <td>{u.isActive ? '✅ Active' : '🚫 Banned'}</td>
                <td>
                  {!isProtected(u) && (
                    <button
                      type="button"
                      className={`btn btn-sm ${u.isActive ? 'btn-danger' : 'btn-primary'}`}
                      onClick={() => toggleBan(u)}
                    >
                      {u.isActive ? 'Ban User' : 'Unban User'}
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
