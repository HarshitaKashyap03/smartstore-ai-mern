import React, { useEffect, useState } from 'react';
import { LineChart, Line, ResponsiveContainer } from 'recharts';
import api from '../api/axios';
import './PnL.css';

const Sparkline = ({ data, color }) => (
  <ResponsiveContainer width={80} height={32}>
    <LineChart data={data}>
      <Line type="monotone" dataKey="v" stroke={color} strokeWidth={1.5} dot={false} />
    </LineChart>
  </ResponsiveContainer>
);

export default function PnL() {
  const [pnl,     setPnl]     = useState(null);
  const [daily,   setDaily]   = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      try {
        const [pnlR, dailyR] = await Promise.all([
          api.get('/analytics/pnl'),
          api.get('/sales/daily'),
        ]);
        setPnl(pnlR.data);
        setDaily(dailyR.data);
      } catch(e) { console.error(e); }
      finally { setLoading(false); }
    };
    fetch();
  }, []);

  if (loading) return <div className="loading-wrap"><div className="spinner"/></div>;

  const sparkRevenue = daily.map(d => ({ v: d.total }));
  const sparkCost    = daily.map(d => ({ v: d.total * 0.68 }));

  return (
    <div className="grid-2">
      {/* Left: Revenue vs Cost */}
      <div className="card">
        <div className="section-title mb-16">Profit & Loss Summary</div>

        <div className="pnl-metric-row">
          <div>
            <div className="pnl-metric-label">Revenue Today</div>
            <div className="pnl-metric-value" style={{ color:'var(--accent-green)' }}>
              ${daily[daily.length-1]?.total?.toFixed(2) || '0.00'}
            </div>
            <div className="pnl-metric-change pos">+12% vs. Avg</div>
          </div>
          <Sparkline data={sparkRevenue} color="#10b981" />
        </div>

        <div className="pnl-metric-row">
          <div>
            <div className="pnl-metric-label">Cost Today</div>
            <div className="pnl-metric-value" style={{ color:'var(--accent-amber)' }}>
              ${(daily[daily.length-1]?.total * 0.68 || 0).toFixed(2)}
            </div>
            <div className="pnl-metric-change neg">-5% vs. Avg</div>
          </div>
          <Sparkline data={sparkCost} color="#f59e0b" />
        </div>

        {/* Monthly summary */}
        <div className="pnl-summary-card">
          <div className="pnl-summary-title">Monthly P&L Summary Card</div>
          <div className="pnl-total-profit">Total Profit:</div>
          <div className="pnl-profit-value">${pnl?.totalProfit?.toFixed(2) || '0.00'}</div>
          <div className="pnl-summary-rows">
            <div className="pnl-sum-row"><span>Total Revenue:</span><span>${pnl?.totalRevenue?.toFixed(2)}</span></div>
            <div className="pnl-sum-row"><span>Total Cost:</span><span>${pnl?.totalCost?.toFixed(2)}</span></div>
            <div className="pnl-sum-row">
              <span>Average Margin:</span>
              <span>
                {pnl?.avgMargin}%
                <span className="badge badge-blue" style={{ marginLeft:6, fontSize:10 }}>Confidence 88%</span>
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Right: Per-product margins */}
      <div className="card">
        <div className="section-title mb-16">Per-product Profit Margin</div>
        <table className="table">
          <thead>
            <tr><th>Product Name</th><th>Category</th><th>Qty Sold</th><th>Revenue</th><th>Cost</th><th>Avg Margin</th></tr>
          </thead>
          <tbody>
            {pnl?.products?.map((p, i) => (
              <tr key={i} className={p.margin < 0 ? 'loss-row' : ''}>
                <td>
                  <div className="product-name-cell">
                    <div className="product-thumb" style={{ background: p.margin < 0 ? 'rgba(239,68,68,0.1)' : undefined }}>
                      {p.name[0]}
                    </div>
                    <div>
                      {p.margin < 0 && <div style={{ fontSize:10, color:'var(--accent-red)', fontWeight:600 }}>Loss Item:</div>}
                      <span>{p.name}</span>
                    </div>
                  </div>
                </td>
                <td style={{ color:'var(--text-muted)', fontSize:12 }}>Electronics</td>
                <td>{p.qty}</td>
                <td>${p.revenue?.toFixed(2)}</td>
                <td>${p.cost?.toFixed(2)}</td>
                <td>
                  <span className={`badge ${p.margin >= 20 ? 'badge-green' : p.margin >= 0 ? 'badge-blue' : 'badge-red'}`}>
                    {p.margin}%
                  </span>
                </td>
              </tr>
            ))}
            {!pnl?.products?.length && (
              <tr><td colSpan={6} style={{ textAlign:'center', color:'var(--text-muted)', padding:30 }}>No sales data yet</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
