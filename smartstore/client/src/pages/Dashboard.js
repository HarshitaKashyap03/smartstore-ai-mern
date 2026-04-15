import React, { useEffect, useState } from 'react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import api from '../api/axios';
import './Dashboard.css';

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload?.length) {
    return (
      <div className="chart-tooltip">
        <div className="ct-label">{label}</div>
        <div className="ct-value">${payload[0].value?.toFixed(2)}</div>
      </div>
    );
  }
  return null;
};

export default function Dashboard() {
  const [kpi,          setKpi]          = useState(null);
  const [dailySales,   setDailySales]   = useState([]);
  const [topProducts,  setTopProducts]  = useState([]);
  const [alerts,       setAlerts]       = useState([]);
  const [loading,      setLoading]      = useState(true);

  useEffect(() => {
    const fetch = async () => {
      try {
        const [kpiR, dailyR, topR, alertsR] = await Promise.all([
          api.get('/analytics/kpi'),
          api.get('/sales/daily'),
          api.get('/sales/top-products'),
          api.get('/alerts?status=PENDING'),
        ]);
        setKpi(kpiR.data);
        setDailySales(dailyR.data);
        setTopProducts(topR.data);
        setAlerts(alertsR.data.slice(0, 3));
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
    };
    fetch();
    const id = setInterval(fetch, 30000);
    return () => clearInterval(id);
  }, []);

  if (loading) return <div className="loading-wrap"><div className="spinner" /><span>Loading dashboard...</span></div>;

  return (
    <div className="dashboard">
      {/* KPI Row */}
      <div className="grid-4 mb-20">
        <div className="kpi-card blue">
          <div className="kpi-label">Total Revenue Today</div>
          <div className="kpi-value">${kpi?.totalRevenue || '0.00'}</div>
          <div className={`kpi-change ${kpi?.revenueChange >= 0 ? 'pos' : 'neg'}`}>
            {kpi?.revenueChange >= 0 ? '+' : ''}{kpi?.revenueChange}% vs avg
          </div>
          <div className="kpi-icon">📊</div>
        </div>
        <div className="kpi-card green">
          <div className="kpi-label">Total Orders Today</div>
          <div className="kpi-value">{kpi?.totalOrders || 0}</div>
          <div className={`kpi-change ${kpi?.ordersChange >= 0 ? 'pos' : 'neg'}`}>
            {kpi?.ordersChange >= 0 ? '+' : ''}{kpi?.ordersChange}% vs avg
          </div>
          <div className="kpi-icon">🛒</div>
        </div>
        <div className="kpi-card amber">
          <div className="kpi-label">Low Stock Count</div>
          <div className="kpi-value">{kpi?.lowStockCount || 0}</div>
          <div className="kpi-change neg">Needs attention</div>
          <div className="kpi-icon">⚠️</div>
        </div>
        <div className="kpi-card purple">
          <div className="kpi-label">Top Product</div>
          <div className="kpi-value" style={{ fontSize: '16px', marginTop: '4px' }}>
            {kpi?.topProduct?.name || 'N/A'}
          </div>
          <div className="kpi-change pos">{kpi?.topProduct?.qty || 0} units sold</div>
          <div className="kpi-icon">🏆</div>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid-2">
        {/* Sales Chart */}
        <div className="card">
          <div className="flex-between mb-16">
            <div className="section-title">Quick Sales Graph (Last 7 Days)</div>
            <span className="badge badge-blue">LAST 7 DAYS</span>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={dailySales}>
              <CartesianGrid stroke="rgba(255,255,255,0.04)" vertical={false} />
              <XAxis dataKey="day" tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={v => `$${v}`} />
              <Tooltip content={<CustomTooltip />} />
              <Line type="monotone" dataKey="total" stroke="#3b82f6" strokeWidth={2.5} dot={{ fill: '#3b82f6', r: 4 }} activeDot={{ r: 6 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Top Products */}
        <div className="card">
          <div className="flex-between mb-16">
            <div className="section-title">Top 5 Products Widget</div>
            <span className="badge badge-gray">UNITS SOLD</span>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={topProducts} barSize={32}>
              <CartesianGrid stroke="rgba(255,255,255,0.04)" vertical={false} />
              <XAxis dataKey="name" tick={{ fill: '#64748b', fontSize: 10 }} axisLine={false} tickLine={false}
                tickFormatter={v => v.length > 10 ? v.substring(0, 10) + '…' : v} />
              <YAxis tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip cursor={{ fill: 'rgba(59,130,246,0.08)' }}
                contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '8px', color: 'var(--text-primary)' }} />
              <Bar dataKey="qty" fill="#3b82f6" radius={[4,4,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Alerts Panel */}
      <div className="card mt-20">
        <div className="flex-between mb-16">
          <div className="section-title">Recent Alerts Panel</div>
          <span className="text-muted" style={{ fontSize: 12, cursor: 'pointer' }}>···</span>
        </div>
        {alerts.length === 0 && <div className="text-muted" style={{ fontSize: 13 }}>No pending alerts</div>}
        {alerts.map(alert => (
          <div key={alert._id} className="alert-row">
            <div className="alert-dot" style={{ background: alert.type === 'Low Stock' ? 'var(--accent-red)' : alert.type === 'Demand Spike' ? 'var(--accent-amber)' : 'var(--accent-green)' }} />
            <div className="alert-content">
              <span className={`badge ${alert.type === 'Low Stock' ? 'badge-red' : alert.type === 'Demand Spike' ? 'badge-amber' : 'badge-green'}`}>
                [{alert.type.toUpperCase()}]
              </span>
              <span className="alert-msg">{alert.message}</span>
              <span className="alert-time">{new Date(alert.createdAt).toLocaleTimeString()}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
