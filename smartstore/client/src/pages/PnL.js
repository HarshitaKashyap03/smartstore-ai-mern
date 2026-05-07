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
  const [pnl,       setPnl]       = useState(null);
  const [todayPnl,  setTodayPnl]  = useState(null);
  const [daily,     setDaily]     = useState([]);
  const [loading,   setLoading]   = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const [pnlR, dailyR, todayR] = await Promise.all([
          api.get('/analytics/pnl'),
          api.get('/sales/daily'),
          api.get('/analytics/today-pnl'),
        ]);
        setPnl(pnlR.data);
        setDaily(dailyR.data);
        setTodayPnl(todayR.data);
      } catch(e) { console.error(e); }
      finally { setLoading(false); }
    };
    load();
  }, []);

  if (loading) return <div className="loading-wrap"><div className="spinner"/></div>;

  // Sparklines use last 7 days real revenue from daily sales
  const sparkRevenue = daily.map(d => ({ v: d.total }));
  const sparkCost    = daily.map(d => ({ v: parseFloat((d.total * (pnl?.totalCost / pnl?.totalRevenue || 0)).toFixed(2)) }));
  return (
    <div className="grid-2">
      {/* Left: Revenue vs Cost */}
      <div className="card">
        <div className="section-title mb-16">Profit & Loss Summary</div>

        {/* Today Revenue */}
        <div className="pnl-metric-row">
          <div>
            <div className="pnl-metric-label">Revenue Today</div>
            <div className="pnl-metric-value" style={{ color:'var(--accent-green)' }}>
              ${todayPnl?.todayRevenue?.toFixed(2) || '0.00'}
            </div>
            
          </div>
          <Sparkline data={sparkRevenue} color="#10b981" />
        </div>

        
        {/* Today Cost */}
        <div className="pnl-metric-row">
          <div>
            <div className="pnl-metric-label">Cost Today</div>
            <div className="pnl-metric-value" style={{ color:'var(--accent-amber)' }}>
              ${todayPnl?.todayCost?.toFixed(2) || '0.00'}
            </div>  
          </div>
          <Sparkline data={sparkCost} color="#f59e0b" />
        </div>

        {/* Today Profit */}
        <div className="pnl-metric-row">
          <div>
            <div className="pnl-metric-label">Profit Today</div>
            <div
              className="pnl-metric-value"
              style={{ color: (todayPnl?.todayProfit || 0) >= 0 ? 'var(--accent-blue)' : 'var(--accent-red)' }}
            >
              ${todayPnl?.todayProfit?.toFixed(2) || '0.00'}
            </div>
           
          </div>
        </div>

        {/* All-time summary */}
        <div className="pnl-summary-card">
          <div className="pnl-summary-title">All-Time P&L Summary</div>
          <div className="pnl-total-profit">Total Profit:</div>
          <div className="pnl-profit-value">${pnl?.totalProfit?.toFixed(2) || '0.00'}</div>
          <div className="pnl-summary-rows">
            <div className="pnl-sum-row">
              <span>Total Revenue:</span>
              <span>${pnl?.totalRevenue?.toFixed(2)}</span>
            </div>
            <div className="pnl-sum-row">
              <span>Total Cost:</span>
              <span>${pnl?.totalCost?.toFixed(2)}</span>
            </div>
            
          </div>
        </div>
      </div>

      {/* Right: Per-product margins */}
      <div className="card">
        <div className="section-title mb-16">Per-product Profit Margin</div>
        <table className="table">
          <thead>
            <tr>
              <th>Product Name</th>
              <th>Qty Sold</th>
              <th>Revenue</th>
              <th>Cost</th>
              <th>Profit</th>
              
            </tr>
          </thead>
          <tbody>
            {pnl?.products?.map((p, i) => (
              <tr key={i} className={p.margin < 0 ? 'loss-row' : ''}>
                <td>
                  <div className="product-name-cell">
                    <div
                      className="product-thumb"
                      style={{ background: p.margin < 0 ? 'rgba(239,68,68,0.1)' : undefined }}
                    >
                      {p.name[0]}
                    </div>
                    <div>
                      {p.margin < 0 && (
                        <div style={{ fontSize:10, color:'var(--accent-red)', fontWeight:600 }}>
                          Loss Item
                        </div>
                      )}
                      <span>{p.name}</span>
                    </div>
                  </div>
                </td>
                <td>{p.qty}</td>
                <td>${p.revenue?.toFixed(2)}</td>
                <td>${p.cost?.toFixed(2)}</td>
                <td style={{
                  color: (p.revenue - p.cost) >= 0 ? 'var(--accent-green)' : 'var(--accent-red)',
                  fontWeight: 600
                }}>
                  ${(p.revenue - p.cost).toFixed(2)}
                </td>
                
              </tr>
            ))}
            {!pnl?.products?.length && (
              <tr>
                <td colSpan={5} style={{ textAlign:'center', color:'var(--text-muted)', padding:30 }}>
                  No sales data yet
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
