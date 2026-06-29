import { useEffect, useState } from 'react';
import { userApi } from '../../services/api';

export default function AdminUsers() {
  const [users, setUsers] = useState([]);

  useEffect(() => {
    userApi.getAll().then((res) => setUsers(res.data));
  }, []);

  const handleRoleChange = async (id, role) => {
    await userApi.update(id, { role });
    setUsers((prev) => prev.map((u) => (u._id === id ? { ...u, role } : u)));
  };

  return (
    <div>
      <h1 className="page-title">Users</h1>
      <div className="card" style={{ overflow: 'auto' }}>
        <table className="table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Phone</th>
              <th>Role</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u._id}>
                <td>{u.name}</td>
                <td>{u.email || '—'}</td>
                <td>{u.phone || '—'}</td>
                <td>
                  <select value={u.role} onChange={(e) => handleRoleChange(u._id, e.target.value)}>
                    <option value="user">User</option>
                    <option value="merchant">Merchant</option>
                    <option value="driver">Driver</option>
                    <option value="sub_admin">Sub Admin</option>
                    <option value="super_admin">Super Admin</option>
                  </select>
                </td>
                <td>{u.isActive ? '✅ Active' : '❌ Inactive'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
