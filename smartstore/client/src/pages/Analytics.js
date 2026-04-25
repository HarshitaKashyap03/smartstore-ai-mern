import React, { useEffect, useState } from 'react';
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend
} from 'recharts';
import api from '../api/axios';
import './Analytics.css';

const COLORS = ['#3b82f6','#06b6d4','#10b981','#f59e0b','#8b5cf6','#ef4444','#ec4899'];

const PERIOD_LABELS = {
  DAILY:   'Today (2-hour blocks)',
  WEEKLY:  'Last 7 Days',
  MONTHLY: 'Last 30 Days',
};

export default function Analytics() {
  const [period,      setPeriod]      = useState('WEEKLY');
  const [trendData,   setTrendData]   = useState([]);
  const [topProducts, setTopProducts] = useState([]);
  const [categories,  setCategories]  = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [trendLoading,setTrendLoading]= useState(false);

  // Fetch top products + categories once — they don't change with period
  useEffect(() => {
    const load = async () => {
      try {
        const [top, cat] = await Promise.all([
          api.get('/sales/top-products'),
          api.get('/analytics/category'),
        ]);
        setTopProducts(top.data);
        setCategories(cat.data);
      } catch(e) { console.error(e); }
      finally { setLoading(false); }
    };
    load();
  }, []);

  // Fetch trend data whenever period changes
  useEffect(() => {
    const load = async () => {
      setTrendLoading(true);
      try {
        const { data } = await api.get(`/sales/trend?period=${period}`);
        setTrendData(data);
      } catch(e) { console.error(e); }
      finally { setTrendLoading(false); }
    };
    load();
  }, [period]); // ← reruns every time period changes

  // Summary stats from trend data
  const totalRevenue = trendData.reduce((s, d) => s + d.total, 0);
  const totalOrders  = trendData.reduce((s, d) => s + d.orders, 0);
  const peakDay      = trendData.reduce((best, d) => d.total > (best?.total || 0) ? d : best, null);

  if (loading) return <div className="loading-wrap"><div className="spinner"/></div>;

  return (
    <div>
      {/* ── Period selector + trend chart ── */}
      <div className="card mb-20">
        <div className="flex-between mb-16">
          <div className="flex gap-8">
            {['DAILY','WEEKLY','MONTHLY'].map(p => (
              <button
                key={p}
                className={`btn ${period === p ? 'btn-primary' : 'btn-ghost'} btn-sm`}
                onClick={() => setPeriod(p)}
              >{p}</button>
            ))}
          </div>
          <div className="flex gap-12" style={{ alignItems:'center' }}>
            <span style={{ fontSize:12, color:'var(--text-muted)' }}>{PERIOD_LABELS[period]}</span>
          </div>
        </div>

        {/* Summary mini stats */}
        <div className="analytics-summary mb-16">
          <div className="as-item">
            <div className="as-label">Total Revenue</div>
            <div className="as-value">${totalRevenue.toLocaleString('en-US', { minimumFractionDigits:2, maximumFractionDigits:2 })}</div>
          </div>
          <div className="as-divider"/>
          <div className="as-item">
            <div className="as-label">Total Orders</div>
            <div className="as-value">{totalOrders}</div>
          </div>
          <div className="as-divider"/>
          <div className="as-item">
            <div className="as-label">Peak {period === 'DAILY' ? 'Hour' : 'Day'}</div>
            <div className="as-value">{peakDay?.label || '—'}</div>
          </div>
          <div className="as-divider"/>
          <div className="as-item">
            <div className="as-label">Peak Revenue</div>
            <div className="as-value">${peakDay?.total?.toFixed(2) || '0.00'}</div>
          </div>
        </div>

        {/* Chart */}
        <div className="section-title mb-12">
          Revenue Trends ({period.charAt(0) + period.slice(1).toLowerCase()})
        </div>

        {trendLoading ? (
          <div style={{ height:220, display:'flex', alignItems:'center', justifyContent:'center' }}>
            <div className="spinner"/>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={trendData}>
              <CartesianGrid stroke="rgba(255,255,255,0.04)" vertical={false} />
              <XAxis
                dataKey="label"
                tick={{ fill:'#64748b', fontSize: period === 'MONTHLY' ? 9 : 11 }}
                axisLine={false} tickLine={false}
                interval={period === 'MONTHLY' ? 4 : 0}
              />
              <YAxis
                tick={{ fill:'#64748b', fontSize:11 }}
                axisLine={false} tickLine={false}
                tickFormatter={v => `$${v}`}
              />
              <Tooltip
                contentStyle={{ background:'var(--bg-card)', border:'1px solid var(--border)', borderRadius:'8px', color:'var(--text-primary)', fontSize:12 }}
                formatter={(v, name) => name === 'total' ? [`$${v.toFixed(2)}`, 'Revenue'] : [v, 'Orders']}
                labelStyle={{ color:'var(--text-muted)', marginBottom:4 }}
              />
              <Line
                type="monotone"
                dataKey="total"
                stroke="#3b82f6"
                strokeWidth={2.5}
                dot={{ fill:'#3b82f6', r: period === 'MONTHLY' ? 2 : 4 }}
                activeDot={{ r:6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* ── Bottom charts ── */}
      <div className="grid-2">
        <div className="card">
          <div className="section-title mb-16">Product-wise Sales (Units Sold)</div>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={topProducts} barSize={28}>
              <CartesianGrid stroke="rgba(255,255,255,0.04)" vertical={false} />
              <XAxis
                dataKey="name"
                tick={{ fill:'#64748b', fontSize:10 }}
                axisLine={false} tickLine={false}
                tickFormatter={v => v.length > 12 ? v.substring(0,12)+'…' : v}
              />
              <YAxis tick={{ fill:'#64748b', fontSize:11 }} axisLine={false} tickLine={false} />
              <Tooltip
                contentStyle={{ background:'var(--bg-card)', border:'1px solid var(--border)', borderRadius:'8px', color:'var(--text-primary)' }}
              />
              <Bar dataKey="qty" fill="#3b82f6" radius={[4,4,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="card">
          <div className="section-title mb-16">Category Breakdown (Sales Value)</div>
          {categories.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={categories}
                  cx="40%" cy="50%"
                  innerRadius={55} outerRadius={90}
                  dataKey="value" paddingAngle={3}
                >
                  {categories.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Legend
                  layout="vertical" align="right" verticalAlign="middle"
                  formatter={v => <span style={{ fontSize:11, color:'var(--text-secondary)' }}>{v}</span>}
                />
                <Tooltip
                  contentStyle={{ background:'var(--bg-card)', border:'1px solid var(--border)', borderRadius:'8px', color:'var(--text-primary)' }}
                  formatter={v => [`$${v.toFixed(2)}`, 'Revenue']}
                />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div style={{ color:'var(--text-muted)', fontSize:13, textAlign:'center', paddingTop:60 }}>
              No sales data yet
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
