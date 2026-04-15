import React, { useEffect, useState } from 'react';
import api from '../api/axios';
import './Demand.css';

export default function Demand() {
  const [predictions, setPredictions] = useState([]);
  const [seasonal,    setSeasonal]    = useState([]);
  const [loading,     setLoading]     = useState(true);

  useEffect(() => {
    const fetch = async () => {
      try {
        const [predR, seasR] = await Promise.all([
          api.get('/predict'),
          api.get('/predict/seasonal'),
        ]);
        setPredictions(predR.data);
        setSeasonal(seasR.data);
      } catch(e) { console.error(e); }
      finally { setLoading(false); }
    };
    fetch();
  }, []);

  if (loading) return <div className="loading-wrap"><div className="spinner"/></div>;

  return (
    <div>
      <div className="card mb-20">
        <div className="flex-between mb-16">
          <div className="section-title">AI Demand Predictions (Next 30 Days)</div>
          <button className="btn btn-outline btn-sm">↓ Export to CSV</button>
        </div>
        <table className="table">
          <thead>
            <tr>
              <th>Product Name</th><th>Current Stock</th><th>Prediction (30d)</th>
              <th>Confidence</th><th>Seasonal Trend</th>
            </tr>
          </thead>
          <tbody>
            {predictions.map(p => (
              <tr key={p._id}>
                <td><strong>{p.name}</strong></td>
                <td>{p.currentStock}</td>
                <td>
                  <div className="predict-bar-wrap">
                    <div className="predict-bar" style={{ width: `${Math.min(100, (p.predicted30Days / 200) * 100)}%` }} />
                    <span className="predict-val">{p.predicted30Days}</span>
                  </div>
                </td>
                <td>
                  <span className={`badge ${p.confidence >= 90 ? 'badge-green' : p.confidence >= 80 ? 'badge-blue' : 'badge-amber'}`}>
                    {p.confidence}%
                  </span>
                </td>
                <td>
                  {p.seasonalTrend
                    ? <span className="seasonal-tag">✦ {p.seasonalTrend.label} {p.seasonalTrend.change}</span>
                    : <span style={{ color:'var(--text-muted)', fontSize:12 }}>—</span>
                  }
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="grid-2">
        {/* Seasonal Cards */}
        <div className="card">
          <div className="section-title mb-16">Seasonal Trend Cards</div>
          <div className="seasonal-grid">
            {seasonal.map((s, i) => (
              <div key={i} className="seasonal-card" style={{ borderColor: s.color + '40' }}>
                <div className="seasonal-icon" style={{ color: s.color }}>
                  {s.icon === 'ice-cream' ? '🍦' : s.icon === 'school' ? '🎒' : s.icon === 'tree' ? '🎄' : '🌧'}
                </div>
                <div className="seasonal-label">{s.label}</div>
                <div className="seasonal-change" style={{ color: s.color }}>{s.change}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Restock Recommendations */}
        <div className="card">
          <div className="section-title mb-16">Restock Recommendation List</div>
          <div className="restock-list">
            {predictions.filter(p => p.restockQty > 0).slice(0, 5).map(p => (
              <div key={p._id} className="restock-rec-row">
                <div className="rr-dot" />
                <div className="rr-text">
                  {p.restockQty > 80
                    ? <span className="text-urgent">Prioritize:</span>
                    : <span className="text-normal">Build Buffer:</span>
                  }
                  {' '}{p.name} (Next 30 Days, Qty +{p.restockQty})
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
