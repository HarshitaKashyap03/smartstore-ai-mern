import React, { useEffect, useState } from 'react';
import api from '../api/axios';
import './Customers.css';

const TREND_CONFIG = {
  'up':       { label: '↑ Trending Up',   color: 'var(--accent-green)',  bg: 'rgba(16,185,129,0.1)'  },
  'stable':   { label: '→ Stable',        color: 'var(--accent-blue)',   bg: 'rgba(59,130,246,0.1)'  },
  'down':     { label: '↓ Slowing Down',  color: 'var(--accent-red)',    bg: 'rgba(239,68,68,0.1)'   },
  'no-sales': { label: '— No Sales',      color: 'var(--text-muted)',    bg: 'rgba(100,116,139,0.08)' },
};

export default function Customers() {
  const [heatmap,      setHeatmap]      = useState({ products: [], matrix: {} });
  const [topViewed,    setTopViewed]    = useState([]);
  const [velocity,     setVelocity]     = useState([]);
  const [revContrib,   setRevContrib]   = useState({ products: [], totalRevenue: 0 });
  const [loading,      setLoading]      = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const [hmR, tvR, velR, revR] = await Promise.all([
          api.get('/customers/heatmap'),
          api.get('/customers/top-viewed'),
          api.get('/customers/velocity'),
          api.get('/customers/revenue-contribution'),
        ]);
        setHeatmap(hmR.data);
        setTopViewed(tvR.data);
        setVelocity(velR.data);
        setRevContrib(revR.data);
      } catch(e) { console.error(e); }
      finally { setLoading(false); }
    };
    load();
  }, []);

  const getCellColor = (val) => {
    if (val === 0) return 'transparent';
    if (val >= 80) return 'rgba(245,158,11,0.7)';
    if (val >= 60) return 'rgba(59,130,246,0.5)';
    if (val >= 40) return 'rgba(59,130,246,0.3)';
    return 'rgba(59,130,246,0.15)';
  };

  if (loading) return <div className="loading-wrap"><div className="spinner"/></div>;

  const maxRevenue = Math.max(...revContrib.products.map(p => p.revenue), 1);

  return (
    <div>
      {/* ── Heatmap ── */}
      <div className="card mb-20">
        <div className="flex-between mb-16">
          <div className="section-title">Frequently Bought Together Heatmap</div>
          <button className="btn btn-outline btn-sm">↓ Export to CSV</button>
        </div>
        <div className="heatmap-wrap">
          <table className="heatmap-table">
            <thead>
              <tr>
                <th className="heatmap-label">Product Name</th>
                {heatmap.products.map(p => (
                  <th key={p} className="heatmap-col-h">{p.length > 12 ? p.substring(0,12)+'…' : p}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {heatmap.products.map(row => (
                <tr key={row}>
                  <td className="heatmap-row-label">{row.length > 14 ? row.substring(0,14)+'…' : row}</td>
                  {heatmap.products.map(col => {
                    const val = heatmap.matrix[row]?.[col] || 0;
                    return (
                      <td key={col} className="heatmap-cell" style={{ background: getCellColor(val) }}>
                        {val > 0 && <span className="heatmap-val">{val}%</span>}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Bottom 3 cards ── */}
      <div className="grid-3">

        {/* Top Viewed */}
        <div className="card">
          <div className="section-title mb-16">Top Viewed Products (Last 30 Days)</div>
          {topViewed.length === 0 && (
            <div style={{ color:'var(--text-muted)', fontSize:12 }}>
              No views yet — open product detail pages to record views
            </div>
          )}
          {topViewed.map((item, i) => (
            <div key={i} className="topv-row">
              <span className="topv-rank">#{i+1}</span>
              <span className="topv-name">{item.name}</span>
              <span className="topv-views">{item.views} view{item.views !== 1 ? 's' : ''}</span>
            </div>
          ))}
        </div>

        {/* Sales Velocity */}
        <div className="card">
          <div className="section-title mb-4">Sales Velocity Trend</div>
          <div className="vel-subtitle mb-12">Last 7 days vs previous 7 days</div>
          <div className="vel-list">
            {velocity.map((p, i) => {
              const cfg = TREND_CONFIG[p.trend];
              return (
                <div key={i} className="vel-row">
                  <div className="vel-name">{p.name}</div>
                  <div className="vel-numbers">
                    <span className="vel-last7">{p.last7} sold</span>
                    <span className="vel-prev7">prev: {p.prev7}</span>
                  </div>
                  <div
                    className="vel-badge"
                    style={{ color: cfg.color, background: cfg.bg }}
                  >
                    {cfg.label}
                    {p.trend !== 'no-sales' && p.trend !== 'stable' && (
                      <span style={{ fontSize:10, marginLeft:4 }}>
                        {p.changePct > 0 ? '+' : ''}{p.changePct}%
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
            {velocity.length === 0 && (
              <div style={{ color:'var(--text-muted)', fontSize:12 }}>No sales data yet</div>
            )}
          </div>
        </div>

        {/* Revenue Contribution */}
        <div className="card">
          <div className="section-title mb-4">Revenue Contribution</div>
          <div className="vel-subtitle mb-12">
            Total: ${revContrib.totalRevenue?.toLocaleString('en-US', { minimumFractionDigits:2 })}
          </div>
          {revContrib.products.length === 0 && (
            <div style={{ color:'var(--text-muted)', fontSize:12 }}>No sales data yet</div>
          )}
          <div className="rev-contrib-list">
            {revContrib.products.map((p, i) => (
              <div key={i} className="rc-row">
                <div className="rc-header">
                  <span className="rc-name">{p.name}</span>
                  <span className="rc-pct">{p.pct}%</span>
                </div>
                <div className="rc-bar-track">
                  <div
                    className="rc-bar-fill"
                    style={{
                      width: `${(p.revenue / maxRevenue) * 100}%`,
                      background: i === 0 ? 'var(--accent-blue)'
                        : i === 1 ? 'var(--accent-cyan)'
                        : i === 2 ? 'var(--accent-green)'
                        : 'rgba(59,130,246,0.4)'
                    }}
                  />
                </div>
                <div className="rc-revenue">${p.revenue?.toLocaleString()}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
