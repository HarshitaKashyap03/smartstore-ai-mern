import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, BarChart, Bar } from 'recharts';
import api from '../api/axios';
import toast from 'react-hot-toast';
import './ProductDetail.css';

export default function ProductDetail() {
  const { id }     = useParams();
  const navigate   = useNavigate();
  const [data,     setData]    = useState(null);
  const [loading,  setLoading] = useState(true);
  const [chartType,setChart]   = useState('qty'); // 'qty' or 'revenue'

  useEffect(() => {
    const load = async () => {
      try {
        const { data: res } = await api.get(`/products/${id}/detail`);
        setData(res);
      } catch(e) {
        toast.error('Product not found');
        navigate('/inventory');
      } finally { setLoading(false); }
    };
    load();
  }, [id]);

  if (loading) return <div className="loading-wrap"><div className="spinner"/><span>Loading product...</span></div>;
  if (!data)   return null;

  const { product, stats, salesHistory } = data;

  const statusColor = product.status === 'In Stock' ? 'var(--accent-green)'
    : product.status === 'Low' ? 'var(--accent-amber)'
    : 'var(--accent-red)';

  // Last 7 days for the sparkline summary
  const last7 = salesHistory.slice(-7);

  return (
    <div className="product-detail">

      {/* ── Back button ── */}
      <button className="btn btn-ghost btn-sm pd-back" onClick={() => navigate(-1)}>
        ← Back
      </button>

      {/* ── Header card ── */}
      <div className="card pd-header mb-20">
        <div className="pd-header-left">
          <div className="pd-avatar">{product.name[0]}</div>
          <div>
            <h1 className="pd-name">{product.name}</h1>
            <div className="pd-meta">
              <span className="badge badge-blue">{product.category}</span>
              <code className="pd-sku">{product.sku}</code>
              <span className="badge" style={{ background: statusColor + '22', color: statusColor, border: `1px solid ${statusColor}44` }}>
                {product.status}
              </span>
            </div>
          </div>
        </div>
        <div className="pd-header-right">
          <div className="pd-price-block">
            <div className="pd-price-label">Selling Price</div>
            <div className="pd-price">${product.price?.toFixed(2)}</div>
          </div>
          <div className="pd-price-block">
            <div className="pd-price-label">Cost Price</div>
            <div className="pd-cost">${product.costPrice?.toFixed(2)}</div>
          </div>
          <div className="pd-price-block">
            <div className="pd-price-label">Profit / Unit</div>
            <div className="pd-profit">${stats.profitPerUnit?.toFixed(2)}</div>
          </div>
        </div>
      </div>

      {/* ── Stats row ── */}
      <div className="pd-stats-grid mb-20">
        <div className="pd-stat-card blue">
          <div className="pd-stat-label">Total Units Sold</div>
          <div className="pd-stat-value">{stats.totalUnitsSold}</div>
          <div className="pd-stat-sub">all time</div>
        </div>
        <div className="pd-stat-card green">
          <div className="pd-stat-label">Total Revenue</div>
          <div className="pd-stat-value">${stats.totalRevenue?.toLocaleString()}</div>
          <div className="pd-stat-sub">all time</div>
        </div>
        <div className="pd-stat-card purple">
          <div className="pd-stat-label">Total Profit</div>
          <div className="pd-stat-value">${stats.totalProfit?.toLocaleString()}</div>
          <div className="pd-stat-sub">{stats.marginPct}% margin</div>
        </div>
        <div className="pd-stat-card amber">
          <div className="pd-stat-label">Stock Remaining</div>
          <div className="pd-stat-value">{product.stock}</div>
          <div className="pd-stat-sub">min: {product.minStock} units</div>
        </div>
        <div className="pd-stat-card gray">
          <div className="pd-stat-label">Total Transactions</div>
          <div className="pd-stat-value">{stats.totalTransactions}</div>
          <div className="pd-stat-sub">orders containing this item</div>
        </div>
        <div className="pd-stat-card gray">
          <div className="pd-stat-label">Total Views</div>
          <div className="pd-stat-value">{product.totalViews}</div>
          <div className="pd-stat-sub">times this page was opened</div>
        </div>
      </div>

      {/* ── Sales chart ── */}
      <div className="card mb-20">
        <div className="flex-between mb-16">
          <div className="section-title">Sales History (Last 30 Days)</div>
          <div className="flex gap-8">
            <button
              className={`btn btn-sm ${chartType === 'qty' ? 'btn-primary' : 'btn-ghost'}`}
              onClick={() => setChart('qty')}
            >Units Sold</button>
            <button
              className={`btn btn-sm ${chartType === 'revenue' ? 'btn-primary' : 'btn-ghost'}`}
              onClick={() => setChart('revenue')}
            >Revenue</button>
          </div>
        </div>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={salesHistory} barSize={12}>
            <CartesianGrid stroke="rgba(255,255,255,0.04)" vertical={false} />
            <XAxis
              dataKey="date"
              tick={{ fill:'#64748b', fontSize:10 }}
              axisLine={false} tickLine={false}
              interval={4}
            />
            <YAxis
              tick={{ fill:'#64748b', fontSize:11 }}
              axisLine={false} tickLine={false}
              tickFormatter={v => chartType === 'revenue' ? `$${v}` : v}
            />
            <Tooltip
              contentStyle={{ background:'var(--bg-card)', border:'1px solid var(--border)', borderRadius:'8px', color:'var(--text-primary)', fontSize:12 }}
              formatter={v => chartType === 'revenue' ? [`$${v}`, 'Revenue'] : [v, 'Units']}
            />
            <Bar dataKey={chartType} fill="#3b82f6" radius={[3,3,0,0]} />
          </BarChart>
        </ResponsiveContainer>

        {/* Last 7 days summary */}
        <div className="pd-last7">
          <div className="pd-last7-title">Last 7 Days Breakdown</div>
          <div className="pd-last7-grid">
            {last7.map((d, i) => (
              <div key={i} className="pd-day-col">
                <div className="pd-day-bar-wrap">
                  <div
                    className="pd-day-bar"
                    style={{ height: `${Math.max(4, (d.qty / Math.max(...last7.map(x => x.qty), 1)) * 48)}px` }}
                  />
                </div>
                <div className="pd-day-qty">{d.qty}</div>
                <div className="pd-day-label">{d.date}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Product info ── */}
      <div className="card">
        <div className="section-title mb-16">Product Information</div>
        <div className="pd-info-grid">
          <div className="pd-info-row"><span>Product Name</span><strong>{product.name}</strong></div>
          <div className="pd-info-row"><span>SKU</span><code>{product.sku}</code></div>
          <div className="pd-info-row"><span>Category</span><span>{product.category}</span></div>
          <div className="pd-info-row"><span>Current Stock</span><strong style={{ color: statusColor }}>{product.stock} units</strong></div>
          <div className="pd-info-row"><span>Minimum Stock</span><span>{product.minStock} units</span></div>
          <div className="pd-info-row"><span>Selling Price</span><span>${product.price?.toFixed(2)}</span></div>
          <div className="pd-info-row"><span>Cost Price</span><span>${product.costPrice?.toFixed(2)}</span></div>
          <div className="pd-info-row"><span>Profit per Unit</span><span style={{ color:'var(--accent-green)' }}>${stats.profitPerUnit?.toFixed(2)}</span></div>
          <div className="pd-info-row"><span>Profit Margin</span><span style={{ color:'var(--accent-green)' }}>{stats.marginPct}%</span></div>
          <div className="pd-info-row"><span>Last Sold</span><span>{product.lastSoldAt ? new Date(product.lastSoldAt).toLocaleString() : 'Never'}</span></div>
          <div className="pd-info-row"><span>Added to Store</span><span>{new Date(product.createdAt).toLocaleDateString()}</span></div>
          <div className="pd-info-row"><span>Status</span>
            <span className="badge" style={{ background: statusColor+'22', color: statusColor, border:`1px solid ${statusColor}44` }}>
              {product.status}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
