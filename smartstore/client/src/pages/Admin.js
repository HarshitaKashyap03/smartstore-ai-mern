import React, { useEffect, useState } from 'react';
import api from '../api/axios';
import toast from 'react-hot-toast';
import './Admin.css';

export default function Admin() {
  const [products,    setProducts]    = useState([]);
  const [users,       setUsers]       = useState([]);
  const [store,       setStore]       = useState({ name:'SmartStore Tech', currency:'USD ($)', timezone:'UTC+5:30', taxRate:'8.5' });
  const [loading,     setLoading]     = useState(true);
  const [backupOk,    setBackupOk]    = useState(true);
  const [adminSearch, setAdminSearch] = useState('');
  const [roleModal,   setRoleModal]   = useState(null);

  useEffect(() => {
    const load = async () => {
      try {
        const [prodR, userR] = await Promise.all([
          api.get('/products'),
          api.get('/auth/users'),
        ]);
        setProducts(prodR.data);
        setUsers(userR.data);
      } catch(e) { console.error(e); }
      finally { setLoading(false); }
    };
    load();
  }, []);

  const handleDeleteUser = async (id) => {
    if (!window.confirm('Delete this user?')) return;
    try {
      await api.delete(`/auth/users/${id}`);
      setUsers(u => u.filter(u => u._id !== id));
      toast.success('User deleted');
    } catch { toast.error('Failed'); }
  };

  const handleChangeRole = async (userId, newRole) => {
    try {
      const { data } = await api.put(`/auth/users/${userId}/role`, { role: newRole });
      toast.success(data.message);
      setUsers(prev => prev.map(u => u._id === userId ? { ...u, role: newRole } : u));
      setRoleModal(null);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to change role');
    }
  };

  const handleApplySettings = () => toast.success('Settings saved!');

  const exportAll = () => {
    const rows = products.map(p => `${p.name},${p.sku},${p.category},${p.stock},${p.price}`);
    const csv = ['Name,SKU,Category,Stock,Price', ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'smartstore_all_data.csv'; a.click();
    toast.success('Export started!');
  };

  if (loading) return <div className="loading-wrap"><div className="spinner"/></div>;

  return (
    <div>
      <div className="section-title mb-16">Admin Panel / System Settings</div>
      <div className="admin-grid">

        {/* Product & Inventory controls */}
        <div className="card">
          <div className="section-title mb-12">Product & Inventory (Advanced Controls)</div>
          <div className="flex gap-8 mb-12">
            <input
              className="form-control flex-1"
              placeholder="🔍 Search"
              value={adminSearch}
              onChange={e => setAdminSearch(e.target.value)}
            />
            <button className="btn btn-primary btn-sm" onClick={() => window.location.href='/inventory'}>
              Add New Product (+)
            </button>
          </div>
          <div className="flex gap-6 mb-12 flex-wrap">
            {['All', ...new Set(products.map(p => p.category))].map((c) => (
              <span
                key={c}
                className={`badge ${adminSearch === c || (c === 'All' && !adminSearch) ? 'badge-purple' : 'badge-blue'}`}
                style={{ cursor:'pointer' }}
                onClick={() => setAdminSearch(c === 'All' ? '' : c)}
              >{c}</span>
            ))}
          </div>
          <div className="admin-product-list">
            {products
              .filter(p => !adminSearch ||
                p.name.toLowerCase().includes(adminSearch.toLowerCase()) ||
                p.sku.toLowerCase().includes(adminSearch.toLowerCase()) ||
                p.category.toLowerCase().includes(adminSearch.toLowerCase())
              )
              .map(p => (
                <div key={p._id} className="admin-product-row">
                  <div className="product-thumb" style={{ width:28, height:28 }}>{p.name[0]}</div>
                  <span className="admin-pname">{p.name}</span>
                  <div className="admin-actions">
                    <button className="btn btn-primary btn-sm" onClick={() => window.location.href='/inventory'}>Edit Details</button>
                    <button className="btn btn-outline btn-sm" onClick={() => window.location.href='/pnl'}>View P&L</button>
                  </div>
                </div>
              ))
            }
          </div>
        </div>

        {/* User Management */}
        <div className="card">
          <div className="section-title mb-12">User Management (Staff Access)</div>
          <table className="table" style={{ fontSize:12 }}>
            <thead>
              <tr><th>Staff Name</th><th>Role</th><th>Status</th><th>Actions</th></tr>
            </thead>
            <tbody>
              {users.map(u => (
                <tr key={u._id}>
                  <td>
                    <div className="flex-center gap-8">
                      <div className="user-avatar-sm">{u.name[0]}</div>
                      {u.name}
                    </div>
                  </td>
                  <td>{u.role}</td>
                  <td>
                    <span className={`badge ${u.status === 'ACTIVE' ? 'badge-green' : 'badge-amber'}`}>
                      {u.status || 'ACTIVE'}
                    </span>
                  </td>
                  <td>
                    <div className="flex gap-6">
                      <button className="btn btn-outline btn-sm" onClick={() => setRoleModal(u)}>Change Role</button>
                      <button className="btn btn-danger btn-sm" onClick={() => handleDeleteUser(u._id)}>Delete</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Store Configuration */}
        <div className="card">
          <div className="section-title mb-12">Store Configuration & Settings</div>
          <div className="form-group">
            <label className="form-label">Store Name</label>
            <input className="form-control" value={store.name} onChange={e => setStore({...store, name:e.target.value})} />
          </div>
          <div className="form-group">
            <label className="form-label">Currency</label>
            <input className="form-control" value={store.currency} onChange={e => setStore({...store, currency:e.target.value})} />
          </div>
          <div className="form-group">
            <label className="form-label">Timezone</label>
            <input className="form-control" value={store.timezone} onChange={e => setStore({...store, timezone:e.target.value})} />
          </div>
          <div className="form-group">
            <label className="form-label">Tax Rate (%)</label>
            <input className="form-control" type="number" value={store.taxRate} onChange={e => setStore({...store, taxRate:e.target.value})} />
          </div>
          <button className="btn btn-primary w-full" onClick={handleApplySettings}>Apply Changes</button>
        </div>

        {/* System Status & Tools */}
        <div className="card">
          <div className="section-title mb-12">System Status & Tools</div>
          <div className="system-status-row">
            <span className="status-label">Data Export:</span>
            <button className="btn btn-primary btn-sm" onClick={exportAll}>Export All (CSV)</button>
          </div>
          <div className="system-status-row">
            <span className="status-label">Backup Status:</span>
            <span className={`badge ${backupOk ? 'badge-green' : 'badge-red'}`}>{backupOk ? '(OK)' : '(FAILED)'}</span>
          </div>
          <div className="system-status-row">
            <span className="status-label">Logs:</span>
            <button className="btn btn-outline btn-sm">View Activity Log</button>
          </div>
          <div className="system-status-row">
            <span className="status-label">Data Export Status:</span>
            <span className="badge badge-blue">Ready</span>
          </div>
          <div className="admin-stats mt-16">
            <div className="admin-stat"><div className="ast-val">{products.length}</div><div className="ast-lbl">Products</div></div>
            <div className="admin-stat"><div className="ast-val">{users.length}</div><div className="ast-lbl">Users</div></div>
            <div className="admin-stat"><div className="ast-val">99%</div><div className="ast-lbl">Uptime</div></div>
          </div>
        </div>
      </div>

      {/* Change Role Modal — inside the return div, not outside it */}
      {roleModal && (
        <div className="modal-overlay" onClick={() => setRoleModal(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">Change Role — {roleModal.name}</div>
            <p style={{ fontSize:13, color:'var(--text-secondary)', marginBottom:16 }}>
              Current role: <strong style={{ color:'var(--accent-blue)' }}>{roleModal.role}</strong>
            </p>
            <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
              {['Admin','Manager','Staff'].map(r => (
                <button
                  key={r}
                  className={`btn w-full ${roleModal.role === r ? 'btn-primary' : 'btn-ghost'}`}
                  style={{ justifyContent:'center' }}
                  onClick={() => handleChangeRole(roleModal._id, r)}
                  disabled={roleModal.role === r}
                >
                  {r === 'Admin'   ? '👑 ' : r === 'Manager' ? '🔧 ' : '👤 '}
                  {r}
                  {roleModal.role === r ? ' (current)' : ''}
                </button>
              ))}
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={() => setRoleModal(null)}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
