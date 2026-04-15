import React, { useEffect, useState } from 'react';
import api from '../api/axios';
import toast from 'react-hot-toast';
import './Alerts.css';

const TYPE_COLORS = {
  'Low Stock':    { badge: 'badge-amber', dot: '#f59e0b' },
  'Overstock':    { badge: 'badge-blue',  dot: '#3b82f6' },
  'Non-Selling':  { badge: 'badge-red',   dot: '#ef4444' },
  'Demand Spike': { badge: 'badge-purple',dot: '#8b5cf6' },
  'New Order':    { badge: 'badge-green', dot: '#10b981' },
};

export default function Alerts() {
  const [alerts,   setAlerts]   = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [filter,   setFilter]   = useState('All');
  const [search,   setSearch]   = useState('');

  const load = async () => {
    try {
      const params = {};
      if (filter !== 'All') params.type = filter;
      const { data } = await api.get('/alerts', { params });
      setAlerts(data);
    } catch(e) { toast.error('Failed to load alerts'); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [filter]);

  const handleResolve = async (id) => {
    try {
      await api.patch(`/alerts/${id}/resolve`);
      toast.success('Alert resolved');
      load();
    } catch { toast.error('Failed to resolve'); }
  };

  const handleDelete = async (id) => {
    try {
      await api.delete(`/alerts/${id}`);
      toast.success('Alert removed');
      load();
    } catch { toast.error('Failed to delete'); }
  };

  const filtered = alerts.filter(a =>
    !search || a.productName?.toLowerCase().includes(search.toLowerCase()) || a.message?.toLowerCase().includes(search.toLowerCase())
  );

  const types = ['All', 'Low Stock', 'Overstock', 'Non-Selling', 'Demand Spike'];

  return (
    <div className="card">
      <div className="flex-between mb-16">
        <div className="section-title">System Alerts & Notifications Feed</div>
        <div className="flex gap-8">
          <input className="form-control" style={{ width: 180 }} placeholder="🔍 Search" value={search} onChange={e => setSearch(e.target.value)} />
          <button className="btn btn-outline btn-sm">↓ Export Alerts</button>
        </div>
      </div>

      {/* Filters */}
      <div className="alerts-filters mb-16">
        <div className="form-group" style={{ margin:0 }}>
          <label className="form-label" style={{ marginBottom:4 }}>Filter by Type</label>
          <div className="filter-tabs">
            {types.map(t => (
              <button key={t} className={`filter-tab ${filter===t?'active':''}`} onClick={() => setFilter(t)}>{t}</button>
            ))}
          </div>
        </div>
      </div>

      {loading ? <div className="loading-wrap"><div className="spinner"/></div> : (
        <div className="alerts-list">
          {filtered.length === 0 && (
            <div style={{ textAlign:'center', color:'var(--text-muted)', padding:40, fontSize:13 }}>
              No alerts found
            </div>
          )}
          {filtered.map(alert => {
            const colors = TYPE_COLORS[alert.type] || TYPE_COLORS['New Order'];
            return (
              <div key={alert._id} className={`alert-card ${alert.status === 'RESOLVED' ? 'resolved' : ''}`}>
                <div className="alert-card-left">
                  <div className="alert-type-dot" style={{ background: colors.dot }} />
                  <div className="alert-product-thumb">{(alert.productName || '?')[0]}</div>
                  <div>
                    <div className="alert-product-name">
                      <span className={`badge ${colors.badge}`}>{alert.type}</span>
                      <span className="alc-name">{alert.productName || 'System'}</span>
                    </div>
                    <div className="alert-message">{alert.message}</div>
                    {alert.metadata?.currentStock !== undefined && (
                      <div className="alert-meta">
                        Current Stock: {alert.metadata.currentStock}; Minimum Stock: {alert.metadata.minStock}
                      </div>
                    )}
                    {alert.metadata?.confidence && (
                      <div className="alert-meta">Confidence: {alert.metadata.confidence}%</div>
                    )}
                  </div>
                </div>
                <div className="alert-card-right">
                  <span className={`badge ${alert.status === 'RESOLVED' ? 'badge-green' : alert.status === 'REVIEW' ? 'badge-purple' : 'badge-amber'}`}>
                    {alert.status}
                  </span>
                  <div className="alert-time">{new Date(alert.createdAt).toLocaleString()}</div>
                  <div className="flex gap-8">
                    {alert.status !== 'RESOLVED' && (
                      <button className="btn btn-primary btn-sm" onClick={() => handleResolve(alert._id)}>Resolve</button>
                    )}
                    <button className="btn btn-danger btn-sm" onClick={() => handleDelete(alert._id)}>Delete</button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
