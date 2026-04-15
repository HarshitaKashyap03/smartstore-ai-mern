import React, { useEffect, useState } from 'react';
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from 'recharts';
import api from '../api/axios';

const COLORS = ['#3b82f6','#06b6d4','#10b981','#f59e0b','#8b5cf6','#ef4444','#ec4899'];

export default function Analytics() {
  const [period,      setPeriod]      = useState('WEEKLY');
  const [dailySales,  setDailySales]  = useState([]);
  const [topProducts, setTopProducts] = useState([]);
  const [categories,  setCategories]  = useState([]);
  const [loading,     setLoading]     = useState(true);

  useEffect(() => {
    const fetch = async () => {
      try {
        const [daily, top, cat] = await Promise.all([
          api.get('/sales/daily'),
          api.get('/sales/top-products'),
          api.get('/analytics/category'),
        ]);
        setDailySales(daily.data);
        setTopProducts(top.data);
        setCategories(cat.data);
      } catch(e) { console.error(e); }
      finally { setLoading(false); }
    };
    fetch();
  }, [period]);

  if (loading) return <div className="loading-wrap"><div className="spinner"/></div>;

  return (
    <div>
      <div className="card mb-20">
        <div className="flex-between mb-16">
          <div className="flex gap-8">
            {['DAILY','WEEKLY','MONTHLY'].map(p => (
              <button key={p} className={`btn ${period===p?'btn-primary':'btn-ghost'} btn-sm`} onClick={() => setPeriod(p)}>{p}</button>
            ))}
          </div>
          <button className="btn btn-outline btn-sm">↓ Export to CSV</button>
        </div>

        <div className="section-title">Revenue Trends ({period.charAt(0)+period.slice(1).toLowerCase()})</div>
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={dailySales}>
            <CartesianGrid stroke="rgba(255,255,255,0.04)" vertical={false} />
            <XAxis dataKey="day" tick={{ fill:'#64748b', fontSize:11 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill:'#64748b', fontSize:11 }} axisLine={false} tickLine={false} tickFormatter={v => `$${v}`} />
            <Tooltip contentStyle={{ background:'var(--bg-card)', border:'1px solid var(--border)', borderRadius:'8px', color:'var(--text-primary)' }} />
            <Line type="monotone" dataKey="total" stroke="#3b82f6" strokeWidth={2.5} dot={{ fill:'#3b82f6', r:4 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="grid-2">
        <div className="card">
          <div className="section-title mb-16">Product-wise Sales (Units Sold)</div>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={topProducts} barSize={28}>
              <CartesianGrid stroke="rgba(255,255,255,0.04)" vertical={false} />
              <XAxis dataKey="name" tick={{ fill:'#64748b', fontSize:10 }} axisLine={false} tickLine={false}
                tickFormatter={v => v.length > 12 ? v.substring(0,12)+'…' : v} />
              <YAxis tick={{ fill:'#64748b', fontSize:11 }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ background:'var(--bg-card)', border:'1px solid var(--border)', borderRadius:'8px', color:'var(--text-primary)' }} />
              <Bar dataKey="qty" fill="#3b82f6" radius={[4,4,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="card">
          <div className="section-title mb-16">Category Breakdown (Sales Value)</div>
          {categories.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={categories} cx="40%" cy="50%" innerRadius={55} outerRadius={90} dataKey="value" paddingAngle={3}>
                  {categories.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Legend layout="vertical" align="right" verticalAlign="middle"
                  formatter={v => <span style={{ fontSize:11, color:'var(--text-secondary)' }}>{v}</span>} />
                <Tooltip contentStyle={{ background:'var(--bg-card)', border:'1px solid var(--border)', borderRadius:'8px', color:'var(--text-primary)' }}
                  formatter={(v) => [`$${v.toFixed(2)}`, 'Revenue']} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div style={{ color:'var(--text-muted)', fontSize:13, textAlign:'center', paddingTop:60 }}>No sales data yet</div>
          )}
        </div>
      </div>
    </div>
  );
}
