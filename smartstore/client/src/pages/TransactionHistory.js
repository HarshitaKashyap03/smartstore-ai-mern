import React, { useEffect, useState, useCallback } from 'react';
import api from '../api/axios';
import toast from 'react-hot-toast';
import './TransactionHistory.css';

export default function TransactionHistory() {
  const [data,       setData]       = useState({ sales: [], pagination: {}, summary: {} });
  const [loading,    setLoading]    = useState(true);
  const [receipt,    setReceipt]    = useState(null);
  const [page,       setPage]       = useState(1);
  const [search,     setSearch]     = useState('');
  const [cashier,    setCashier]    = useState('');
  const [startDate,  setStartDate]  = useState('');
  const [endDate,    setEndDate]    = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page, limit: 20 });
      if (search)    params.append('search',    search);
      if (cashier)   params.append('cashier',   cashier);
      if (startDate) params.append('startDate', startDate);
      if (endDate)   params.append('endDate',   endDate);
      const { data: res } = await api.get(`/billing/history?${params}`);
      setData(res);
    } catch(e) { toast.error('Failed to load transactions'); }
    finally { setLoading(false); }
  }, [page, search, cashier, startDate, endDate]);

  useEffect(() => { load(); }, [load]);

  const clearFilters = () => {
    setSearch('');
    setCashier(''); setStartDate(''); setEndDate('');
    setPage(1);
  };

  const handleExport = () => {
    const rows = data.sales.map(s =>
      `${s.receiptNumber},${new Date(s.createdAt).toLocaleString()},${s.cashierName},${s.items?.length || 0},$${s.subtotal?.toFixed(2)},$${s.tax?.toFixed(2)},$${s.discount?.toFixed(2)},$${s.total?.toFixed(2)}`
    );
    const csv = ['Receipt #,Date & Time,Cashier,Items,Subtotal,Tax,Discount,Total', ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'transaction_history.csv'; a.click();
    toast.success('Exported!');
  };

  const { sales, pagination, summary } = data;
  const hasFilters = search || cashier || startDate || endDate;

  return (
    <div className="th-page">

      {/* ── Summary cards ── */}
      <div className="th-summary mb-20">
        <div className="th-sum-card blue">
          <div className="th-sum-label">Total Orders</div>
          <div className="th-sum-value">{summary.totalOrders || 0}</div>
          <div className="th-sum-sub">{hasFilters ? 'filtered results' : 'all time'}</div>
        </div>
        <div className="th-sum-card green">
          <div className="th-sum-label">Total Revenue</div>
          <div className="th-sum-value">${summary.totalRevenue?.toLocaleString('en-US', { minimumFractionDigits:2 }) || '0.00'}</div>
          <div className="th-sum-sub">{hasFilters ? 'filtered results' : 'all time'}</div>
        </div>
        <div className="th-sum-card purple">
          <div className="th-sum-label">Avg Order Value</div>
          <div className="th-sum-value">${summary.avgOrderValue?.toFixed(2) || '0.00'}</div>
          <div className="th-sum-sub">per transaction</div>
        </div>
        <div className="th-sum-card amber">
          <div className="th-sum-label">Total Items Sold</div>
          <div className="th-sum-value">{summary.totalItems || 0}</div>
          <div className="th-sum-sub">line items</div>
        </div>
      </div>

      {/* ── Filters ── */}
      <div className="card mb-20">
        <div className="flex-between mb-16">
          <div className="section-title">Search & Filter</div>
          {hasFilters && (
            <button className="btn btn-ghost btn-sm" onClick={clearFilters}>✕ Clear Filters</button>
          )}
        </div>
        <div>
          <div className="th-filters">
            <div className="form-group" style={{ margin:0 }}>
              <label className="form-label">Receipt # Search</label>
              <input
                className="form-control"
                placeholder="Search receipt number..."
                value={search}
                onChange={e => { setSearch(e.target.value); setPage(1); }}
              />
            </div>
            <div className="form-group" style={{ margin:0 }}>
              <label className="form-label">Cashier Name</label>
              <input
                className="form-control"
                placeholder="Filter by cashier..."
                value={cashier}
                onChange={e => { setCashier(e.target.value); setPage(1); }}
              />
            </div>
            <div className="form-group" style={{ margin:0 }}>
              <label className="form-label">From Date</label>
              <input
                className="form-control"
                type="date"
                value={startDate}
                onChange={e => { setStartDate(e.target.value); setPage(1); }}
              />
            </div>
            <div className="form-group" style={{ margin:0 }}>
              <label className="form-label">To Date</label>
              <input
                className="form-control"
                type="date"
                value={endDate}
                onChange={e => { setEndDate(e.target.value); setPage(1); }}
              />
            </div>
            <div style={{ display:'flex', alignItems:'flex-end', gap:8 }}>
              <button type="button" className="btn btn-outline" onClick={handleExport}>↓ Export</button>
            </div>
          </div>
        </div>
      </div>

      {/* ── Table ── */}
      <div className="card">
        <div className="flex-between mb-16">
          <div className="section-title">
            Transaction History
            {pagination.total > 0 && (
              <span className="th-count">
                Showing {((page-1)*20)+1}–{Math.min(page*20, pagination.total)} of {pagination.total}
              </span>
            )}
          </div>
        </div>

        {loading ? (
          <div className="loading-wrap"><div className="spinner"/></div>
        ) : sales.length === 0 ? (
          <div style={{ textAlign:'center', color:'var(--text-muted)', padding:48, fontSize:13 }}>
            {hasFilters ? 'No transactions match your filters' : 'No transactions yet'}
          </div>
        ) : (
          <>
            <table className="table">
              <thead>
                <tr>
                  <th>Receipt #</th>
                  <th>Date & Time</th>
                  <th>Cashier</th>
                  <th>Items</th>
                  <th>Subtotal</th>
                  <th>Tax</th>
                  <th>Discount</th>
                  <th>Total</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {sales.map(sale => (
                  <tr key={sale._id}>
                    <td>
                      <code className="th-receipt-num">#{sale.receiptNumber}</code>
                      <span className="badge badge-green" style={{ marginLeft:6, fontSize:10 }}>RESOLVED</span>
                    </td>
                    <td style={{ fontSize:12, color:'var(--text-muted)', whiteSpace:'nowrap' }}>
                      {new Date(sale.createdAt).toLocaleString()}
                    </td>
                    <td style={{ fontSize:13 }}>{sale.cashierName}</td>
                    <td style={{ textAlign:'center' }}>{sale.items?.length || 0}</td>
                    <td>${sale.subtotal?.toFixed(2)}</td>
                    <td style={{ color:'var(--text-muted)' }}>${sale.tax?.toFixed(2)}</td>
                    <td style={{ color: sale.discount > 0 ? 'var(--accent-green)' : 'var(--text-muted)' }}>
                      {sale.discount > 0 ? `-$${sale.discount?.toFixed(2)}` : '—'}
                    </td>
                    <td><strong style={{ color:'var(--accent-green)' }}>${sale.total?.toFixed(2)}</strong></td>
                    <td>
                      <button className="btn btn-outline btn-sm" onClick={() => setReceipt(sale)}>
                        View Receipt
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* ── Pagination ── */}
            <div className="th-pagination">
              <button
                className="btn btn-ghost btn-sm"
                onClick={() => setPage(p => p - 1)}
                disabled={!pagination.hasPrev}
              >← Previous</button>
              <div className="th-page-nums">
                {Array.from({ length: pagination.totalPages }, (_, i) => i + 1)
                  .filter(p => p === 1 || p === pagination.totalPages || Math.abs(p - page) <= 2)
                  .map((p, idx, arr) => (
                    <React.Fragment key={p}>
                      {idx > 0 && arr[idx-1] !== p - 1 && <span className="th-ellipsis">…</span>}
                      <button
                        className={`btn btn-sm ${p === page ? 'btn-primary' : 'btn-ghost'}`}
                        onClick={() => setPage(p)}
                      >{p}</button>
                    </React.Fragment>
                  ))
                }
              </div>
              <button
                className="btn btn-ghost btn-sm"
                onClick={() => setPage(p => p + 1)}
                disabled={!pagination.hasNext}
              >Next →</button>
            </div>
          </>
        )}
      </div>

      {/* ── Receipt Modal ── */}
      {receipt && (
        <div className="modal-overlay" onClick={() => setReceipt(null)}>
          <div className="modal receipt-modal-th" onClick={e => e.stopPropagation()}>
            <div className="receipt-header-th">
              <div className="receipt-brand-th">
                <div className="receipt-logo-th">S</div>
                <div>
                  <div className="receipt-store-th">SmartStore </div>
                  <div className="receipt-tag-th">Intelligence at your storefront</div>
                </div>
              </div>
              <button className="btn btn-ghost btn-sm" onClick={() => setReceipt(null)}>✕</button>
            </div>
            <div className="receipt-meta-th">
              <div className="rm-row"><span>Receipt #</span><code>{receipt.receiptNumber}</code></div>
              <div className="rm-row"><span>Date</span><span>{new Date(receipt.createdAt).toLocaleString()}</span></div>
              <div className="rm-row"><span>Cashier</span><span>{receipt.cashierName}</span></div>
              <div className="rm-row"><span>Status</span><span className="badge badge-green">RESOLVED</span></div>
            </div>
            <div className="receipt-items-title-th">Items Purchased</div>
            <table className="table" style={{ fontSize:13 }}>
              <thead><tr><th>Product</th><th>Qty</th><th>Unit Price</th><th>Total</th></tr></thead>
              <tbody>
                {receipt.items?.map((item, i) => (
                  <tr key={i}>
                    <td>{item.name}</td>
                    <td>{item.qty}</td>
                    <td>${item.unitPrice?.toFixed(2)}</td>
                    <td><strong>${(item.unitPrice * item.qty).toFixed(2)}</strong></td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="receipt-totals-th">
              <div className="rt-row"><span>Subtotal</span><span>${receipt.subtotal?.toFixed(2)}</span></div>
              <div className="rt-row"><span>Tax (8%)</span><span>${receipt.tax?.toFixed(2)}</span></div>
              {receipt.discount > 0 && (
                <div className="rt-row" style={{ color:'var(--accent-green)' }}>
                  <span>Discount</span><span>-${receipt.discount?.toFixed(2)}</span>
                </div>
              )}
              <div className="rt-row grand"><span>TOTAL</span><strong>${receipt.total?.toFixed(2)}</strong></div>
            </div>
            <button
              className="btn btn-primary w-full"
              style={{ marginTop:16, justifyContent:'center' }}
              onClick={() => {
                const lines = [
                  'SmartStore AI — Receipt',
                  `Receipt #: ${receipt.receiptNumber}`,
                  `Date: ${new Date(receipt.createdAt).toLocaleString()}`,
                  `Cashier: ${receipt.cashierName}`,
                  '---',
                  ...receipt.items.map(i => `${i.name} x${i.qty}  $${(i.unitPrice * i.qty).toFixed(2)}`),
                  '---',
                  `Subtotal: $${receipt.subtotal?.toFixed(2)}`,
                  `Tax (8%): $${receipt.tax?.toFixed(2)}`,
                  receipt.discount > 0 ? `Discount: -$${receipt.discount?.toFixed(2)}` : '',
                  `TOTAL: $${receipt.total?.toFixed(2)}`,
                ].filter(Boolean).join('\n');
                const blob = new Blob([lines], { type:'text/plain' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url; a.download = `receipt_${receipt.receiptNumber}.txt`; a.click();
              }}
            >↓ Download Receipt</button>
          </div>
        </div>
      )}
    </div>
  );
}
