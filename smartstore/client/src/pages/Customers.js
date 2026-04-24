import React, { useEffect, useState } from 'react';
import api from '../api/axios';
import './Customers.css';

export default function Customers() {
  const [heatmap,   setHeatmap]   = useState({ products: [], matrix: {} });
  const [topViewed, setTopViewed] = useState([]);
  const [patterns,  setPatterns]  = useState([]);
  const [loading,   setLoading]   = useState(true);

  useEffect(() => {
    const fetch = async () => {
      try {
        const [hmR, tvR, patR] = await Promise.all([
          api.get('/customers/heatmap'),
          api.get('/customers/top-viewed'),
          api.get('/customers/patterns'),
        ]);
        setHeatmap(hmR.data);
        setTopViewed(tvR.data);
        setPatterns(patR.data);
      } catch(e) { console.error(e); }
      finally { setLoading(false); }
    };
    fetch();
  }, []);

  const getCellColor = (val) => {
    if (val === 0) return 'transparent';
    if (val >= 80) return 'rgba(245,158,11,0.7)';
    if (val >= 60) return 'rgba(59,130,246,0.5)';
    if (val >= 40) return 'rgba(59,130,246,0.3)';
    return 'rgba(59,130,246,0.15)';
  };

  if (loading) return <div className="loading-wrap"><div className="spinner"/></div>;

  return (
    <div>
      <div className="card mb-20">
        <div className="flex-between mb-16">
          <div className="section-title">Frequently Bought Together Heatmap</div>
          
        </div>
        <div className="heatmap-wrap">
          <table className="heatmap-table">
            <thead>
              <tr>
                <th className="heatmap-label">Product Name</th>
                {heatmap.products.map(p => <th key={p} className="heatmap-col-h">{p.length > 12 ? p.substring(0,12)+'…' : p}</th>)}
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

      <div className="grid-3">
        {/* Top Viewed */}
        <div className="card">
          <div className="section-title mb-16">Top Viewed Products (Last 30 Days)</div>
          {topViewed.map((item, i) => (
            <div key={i} className="topv-row">
              <span className="topv-icon">{i === 0 ? '⊙' : i === 1 ? '✦' : '≡'}</span>
              <span className="topv-name">{item.name}</span>
              <span className="topv-views">{item.views > 1000 ? (item.views/1000000).toFixed(0)+'M' : item.views}</span>
            </div>
          ))}
          {topViewed.length === 0 && <div style={{ color:'var(--text-muted)',fontSize:12 }}>No view data yet</div>}
        </div>

        {/* Purchase Patterns */}
        <div className="card">
          <div className="section-title mb-16">Purchase Pattern Cards</div>
          <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
            {patterns.slice(0,2).map((p, i) => (
              <div key={i} className="pattern-card">
                <div className="pattern-icon">🛒</div>
                <div className="pattern-text">{p.pair} bought together <strong>{p.pct}%</strong> of the time</div>
              </div>
            ))}
            {patterns.length === 0 && <div style={{ color:'var(--text-muted)',fontSize:12 }}>Sell more to see patterns</div>}
          </div>
        </div>

        {/* Placement Suggestions */}
        <div className="card">
          <div className="section-title mb-16">Product Placement Suggestions</div>
          <table className="table" style={{ fontSize:12 }}>
            <thead><tr><th>Product Name</th><th>Suggested</th></tr></thead>
            <tbody>
              {patterns.slice(0,3).map((p, i) => {
                const [a, b] = p.pair.split(' + ');
                return (
                  <tr key={i}>
                    <td>{a}</td>
                    <td>
                      <div>{b}</div>
                      <div style={{ color:'var(--text-muted)', fontSize:11 }}>Confidence: {p.pct}%</div>
                      <div style={{ color:'var(--accent-green)', fontSize:11 }}>Expected Sales Spike: +15%</div>
                    </td>
                  </tr>
                );
              })}
              {patterns.length === 0 && <tr><td colSpan={2} style={{ color:'var(--text-muted)' }}>No patterns yet</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
