import React, { useEffect, useState } from 'react';
import api from '../api/axios';
import './Demand.css';

// Format lastSoldAt into a human-readable relative time
function timeAgo(dateStr) {
  if (!dateStr) return null;
  const diff = Date.now() - new Date(dateStr).getTime();
  const days  = Math.floor(diff / 86400000);
  const hours = Math.floor(diff / 3600000);
  const mins  = Math.floor(diff / 60000);
  if (days > 30)  return `${Math.floor(days/30)}mo ago`;
  if (days >= 1)  return `${days}d ago`;
  if (hours >= 1) return `${hours}h ago`;
  return `${mins}m ago`;
}

// Coverage badge — colour based on urgency
function CoverageBadge({ days }) {
  if (days === null) return <span className="coverage-tag coverage-unknown">No sales data</span>;
  if (days <= 7)     return <span className="coverage-tag coverage-critical">⚠ {days} days left</span>;
  if (days <= 14)    return <span className="coverage-tag coverage-low">{days} days left</span>;
  if (days <= 30)    return <span className="coverage-tag coverage-medium">{days} days left</span>;
  return               <span className="coverage-tag coverage-good">{days}+ days</span>;
}

export default function Demand() {
  const [predictions, setPredictions] = useState([]);
  const [loading,     setLoading]     = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const { data } = await api.get('/predict');
        setPredictions(data);
      } catch(e) { console.error(e); }
      finally { setLoading(false); }
    };
    load();
  }, []);

  if (loading) return <div className="loading-wrap"><div className="spinner"/></div>;

  const maxPrediction = Math.max(...predictions.map(p => p.predicted30Days), 1);
  const restockNeeded = predictions.filter(p => p.restockQty > 0);

  return (
    <div>
      {/* ── Main predictions table ── */}
      <div className="card mb-20">
        <div className="section-title mb-16">AI Demand Predictions (Next 30 Days)</div>
        <table className="table">
          <thead>
            <tr>
              <th>Product Name</th>
              <th>Current Stock</th>
              <th>Predicted Demand (30d)</th>
              <th>Stock Coverage</th>
              <th>Last Sold</th>
            </tr>
          </thead>
          <tbody>
            {predictions.map(p => (
              <tr key={p._id}>
                <td>
                  <div style={{ display:'flex', flexDirection:'column', gap:2 }}>
                    <strong>{p.name}</strong>
                    <span style={{ fontSize:11, color:'var(--text-muted)' }}>{p.category}</span>
                  </div>
                </td>
                <td>
                  <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                    <span style={{ fontWeight:600 }}>{p.currentStock}</span>
                    {p.currentStock <= p.minStock && (
                      <span className="badge badge-red" style={{ fontSize:10 }}>LOW</span>
                    )}
                  </div>
                </td>
                <td>
                  {p.hasSalesData ? (
                    <div className="predict-bar-wrap">
                      <div
                        className="predict-bar"
                        style={{ width: `${Math.max(4, (p.predicted30Days / maxPrediction) * 100)}%` }}
                      />
                      <span className="predict-val">{p.predicted30Days} units</span>
                    </div>
                  ) : (
                    <span style={{ fontSize:12, color:'var(--text-muted)' }}>— No sales yet</span>
                  )}
                </td>
                <td>
                  <CoverageBadge days={p.coverageDays} />
                </td>
                <td>
                  {p.lastSoldAt ? (
                    <div style={{ display:'flex', flexDirection:'column', gap:2 }}>
                      <span style={{ fontSize:13, color:'var(--text-primary)' }}>
                        {timeAgo(p.lastSoldAt)}
                      </span>
                      <span style={{ fontSize:11, color:'var(--text-muted)' }}>
                        {new Date(p.lastSoldAt).toLocaleDateString()}
                      </span>
                    </div>
                  ) : (
                    <span style={{ fontSize:12, color:'var(--text-muted)' }}>Never sold</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ── Bottom row ── */}
      <div className="grid-2">

        {/* Coverage legend */}
        <div className="card">
          <div className="section-title mb-16">Stock Coverage Guide</div>
          <div className="coverage-legend">
            <div className="legend-row">
              <span className="coverage-tag coverage-critical">⚠ 1–7 days left</span>
              <span className="legend-desc">Critical — order immediately, stock will run out within a week</span>
            </div>
            <div className="legend-row">
              <span className="coverage-tag coverage-low">8–14 days left</span>
              <span className="legend-desc">Low — place order soon to avoid stockout</span>
            </div>
            <div className="legend-row">
              <span className="coverage-tag coverage-medium">15–30 days left</span>
              <span className="legend-desc">Moderate — monitor closely, order within 2 weeks</span>
            </div>
            <div className="legend-row">
              <span className="coverage-tag coverage-good">30+ days</span>
              <span className="legend-desc">Healthy — sufficient stock for the next month</span>
            </div>
            <div className="legend-row">
              <span className="coverage-tag coverage-unknown">No sales data</span>
              <span className="legend-desc">Product has no sales history — coverage cannot be calculated</span>
            </div>
          </div>
          
        </div>

        {/* Restock list */}
        <div className="card">
          <div className="section-title mb-16">Restock Recommendation List</div>
          {restockNeeded.length === 0 ? (
            <div className="no-restock">
              <div className="no-restock-icon">✓</div>
              <div className="no-restock-text">All products have sufficient stock based on predicted demand</div>
            </div>
          ) : (
            <div className="restock-list">
              {restockNeeded.map(p => (
                <div key={p._id} className="restock-rec-row">
                  <div className={`rr-dot ${p.restockQty > 80 ? 'dot-urgent' : 'dot-normal'}`} />
                  <div className="rr-text">
                    <span className={p.restockQty > 80 ? 'text-urgent' : 'text-normal'}>
                      {p.restockQty > 80 ? 'Prioritize:' : 'Build Buffer:'}
                    </span>
                    {' '}<strong>{p.name}</strong>
                    <span style={{ color:'var(--text-muted)' }}> — order +{p.restockQty} units</span>
                    {p.coverageDays !== null && p.coverageDays <= 14 && (
                      <span className="rr-urgency"> · only {p.coverageDays}d of stock left</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
