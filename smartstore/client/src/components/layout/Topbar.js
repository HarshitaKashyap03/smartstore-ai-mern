import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api from '../../api/axios';
import './Topbar.css';

const PAGE_TITLES = {
  '/':          'Dashboard',
  '/inventory': 'Inventory Management',
  '/analytics': 'Sales Analytics',
  '/demand':    'Demand Prediction',
  '/customers': 'Customer Behavior',
  '/recommend': 'Product Recommendation',
  '/alerts':    'Alerts & Notifications',
  '/billing':   'Smart Billing',
  '/pnl':       'Profit & Loss',
  '/admin':     'Admin Panel / Settings',
};

// Helper: convert array of objects to CSV string
function toCSV(headers, rows) {
  const headerLine = headers.join(',');
  const dataLines  = rows.map(row => headers.map(h => {
    const val = row[h] ?? '';
    // Wrap in quotes if value contains comma or newline
    return String(val).includes(',') ? `"${val}"` : val;
  }).join(','));
  return [headerLine, ...dataLines].join('\n');
}

// Helper: trigger browser download
function downloadCSV(csv, filename) {
  const blob = new Blob([csv], { type: 'text/csv' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export default function Topbar() {
  const { user }   = useAuth();
  const location   = useLocation();
  const navigate   = useNavigate();
  const title      = PAGE_TITLES[location.pathname] || 'SmartStore AI';
  const [pendingCount, setPendingCount] = useState(0);
  const [exporting,    setExporting]    = useState(false);

  const fetchCount = async () => {
    try {
      const { data } = await api.get('/alerts/count');
      setPendingCount(data.pending || 0);
    } catch {}
  };

  useEffect(() => {
    fetchCount();
    const id = setInterval(fetchCount, 30000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (location.pathname !== '/alerts') fetchCount();
  }, [location.pathname]);

  // ── Page-aware export ─────────────────────────────────────
  const handleExport = async () => {
    setExporting(true);
    try {
      const path = location.pathname;

      // ── Dashboard ──
      if (path === '/') {
        const { data } = await api.get('/analytics/kpi');
        const csv = toCSV(
          ['Metric', 'Value'],
          [
            { Metric: 'Total Revenue Today',  Value: `$${data.totalRevenue}` },
            { Metric: 'Total Orders Today',   Value: data.totalOrders },
            { Metric: 'Low Stock Count',      Value: data.lowStockCount },
            { Metric: 'Top Product',          Value: data.topProduct?.name || 'N/A' },
            { Metric: 'Top Product Units',    Value: data.topProduct?.qty || 0 },
            { Metric: 'Revenue Change',       Value: `${data.revenueChange}%` },
            { Metric: 'Orders Change',        Value: `${data.ordersChange}%` },
          ]
        );
        downloadCSV(csv, 'dashboard_export.csv');
      }

      // ── Inventory ──
      else if (path === '/inventory') {
        const { data } = await api.get('/products');
        const csv = toCSV(
          ['Product Name', 'SKU', 'Category', 'Stock', 'Min Stock', 'Price', 'Cost Price', 'Status'],
          data.map(p => ({
            'Product Name': p.name,
            'SKU':          p.sku,
            'Category':     p.category,
            'Stock':        p.stock,
            'Min Stock':    p.minStock,
            'Price':        `$${p.price}`,
            'Cost Price':   `$${p.costPrice}`,
            'Status':       p.status,
          }))
        );
        downloadCSV(csv, 'inventory_export.csv');
      }

      // ── Sales Analytics ──
      else if (path === '/analytics') {
        const [dailyR, topR, catR] = await Promise.all([
          api.get('/sales/daily'),
          api.get('/sales/top-products'),
          api.get('/analytics/category'),
        ]);
        // Combine into one CSV with sections
        const daily = toCSV(['Day', 'Revenue', 'Orders'],
          dailyR.data.map(d => ({ Day: d.day, Revenue: `$${d.total}`, Orders: d.orders }))
        );
        const top = toCSV(['Product Name', 'Units Sold'],
          topR.data.map(p => ({ 'Product Name': p.name, 'Units Sold': p.qty }))
        );
        const cat = toCSV(['Category', 'Revenue'],
          catR.data.map(c => ({ Category: c.name, Revenue: `$${c.value}` }))
        );
        const combined = `DAILY SALES (Last 7 Days)\n${daily}\n\nTOP PRODUCTS\n${top}\n\nCATEGORY BREAKDOWN\n${cat}`;
        downloadCSV(combined, 'sales_analytics_export.csv');
      }

      // ── Demand Prediction ──
      else if (path === '/demand') {
        const { data } = await api.get('/predict');
        const csv = toCSV(
          ['Product Name', 'Current Stock', 'Predicted 30 Days', 'Confidence %', 'Restock Qty'],
          data.map(p => ({
            'Product Name':      p.name,
            'Current Stock':     p.currentStock,
            'Predicted 30 Days': p.predicted30Days,
            'Confidence %':      p.confidence,
            'Restock Qty':       p.restockQty,
          }))
        );
        downloadCSV(csv, 'demand_prediction_export.csv');
      }

      // ── Customer Behavior ──
      else if (path === '/customers') {
        const [tvR, patR] = await Promise.all([
          api.get('/customers/top-viewed'),
          api.get('/customers/patterns'),
        ]);
        const tv = toCSV(['Product Name', 'Total Views'],
          tvR.data.map(p => ({ 'Product Name': p.name, 'Total Views': p.views }))
        );
        const pat = toCSV(['Product Pair', 'Co-purchase Count', 'Confidence %'],
          patR.data.map(p => ({ 'Product Pair': p.pair, 'Co-purchase Count': p.count, 'Confidence %': p.pct }))
        );
        const combined = `TOP VIEWED PRODUCTS\n${tv}\n\nPURCHASE PATTERNS\n${pat}`;
        downloadCSV(combined, 'customer_behavior_export.csv');
      }

      // ── Alerts ──
      else if (path === '/alerts') {
        const { data } = await api.get('/alerts');
        const csv = toCSV(
          ['Type', 'Product', 'Message', 'Status', 'Date'],
          data.map(a => ({
            'Type':    a.type,
            'Product': a.productName || 'System',
            'Message': a.message,
            'Status':  a.status,
            'Date':    new Date(a.createdAt).toLocaleString(),
          }))
        );
        downloadCSV(csv, 'alerts_export.csv');
      }

      // ── Smart Billing ──
      else if (path === '/billing') {
        const { data } = await api.get('/billing');
        const csv = toCSV(
          ['Receipt #', 'Date', 'Cashier', 'Items Count', 'Subtotal', 'Tax', 'Discount', 'Total'],
          data.map(s => ({
            'Receipt #':    s.receiptNumber,
            'Date':         new Date(s.createdAt).toLocaleString(),
            'Cashier':      s.cashierName,
            'Items Count':  s.items?.length || 0,
            'Subtotal':     `$${s.subtotal?.toFixed(2)}`,
            'Tax':          `$${s.tax?.toFixed(2)}`,
            'Discount':     `$${s.discount?.toFixed(2)}`,
            'Total':        `$${s.total?.toFixed(2)}`,
          }))
        );
        downloadCSV(csv, 'billing_export.csv');
      }

      // ── Profit & Loss ──
      else if (path === '/pnl') {
        const { data } = await api.get('/analytics/pnl');
        const summary = toCSV(
          ['Metric', 'Value'],
          [
            { Metric: 'Total Revenue',  Value: `$${data.totalRevenue}` },
            { Metric: 'Total Cost',     Value: `$${data.totalCost}` },
            { Metric: 'Total Profit',   Value: `$${data.totalProfit}` },
            { Metric: 'Average Margin', Value: `${data.avgMargin}%` },
          ]
        );
        const products = toCSV(
          ['Product Name', 'Qty Sold', 'Revenue', 'Cost', 'Margin %'],
          (data.products || []).map(p => ({
            'Product Name': p.name,
            'Qty Sold':     p.qty,
            'Revenue':      `$${p.revenue}`,
            'Cost':         `$${p.cost}`,
            'Margin %':     `${p.margin}%`,
          }))
        );
        const combined = `P&L SUMMARY\n${summary}\n\nPER-PRODUCT BREAKDOWN\n${products}`;
        downloadCSV(combined, 'profit_loss_export.csv');
      }

      // ── Admin Panel ──
      else if (path === '/admin') {
        const [prodR, userR] = await Promise.all([
          api.get('/products'),
          api.get('/auth/users'),
        ]);
        const products = toCSV(
          ['Product Name', 'SKU', 'Category', 'Stock', 'Price', 'Status'],
          prodR.data.map(p => ({
            'Product Name': p.name,
            'SKU':          p.sku,
            'Category':     p.category,
            'Stock':        p.stock,
            'Price':        `$${p.price}`,
            'Status':       p.status,
          }))
        );
        const users = toCSV(
          ['Name', 'Email', 'Role', 'Status'],
          userR.data.map(u => ({
            'Name':   u.name,
            'Email':  u.email,
            'Role':   u.role,
            'Status': u.status || 'ACTIVE',
          }))
        );
        const combined = `PRODUCTS\n${products}\n\nUSERS\n${users}`;
        downloadCSV(combined, 'admin_export.csv');
      }

      // ── Recommendations ──
      else if (path === '/recommend') {
        const { data } = await api.get('/predict/recommend');
        const csv = toCSV(
          ['From Product', 'To Product', 'Confidence %', 'Co-purchase Count'],
          data.map(r => ({
            'From Product':      r.from,
            'To Product':        r.to,
            'Confidence %':      r.confidence,
            'Co-purchase Count': r.count,
          }))
        );
        downloadCSV(csv, 'recommendations_export.csv');
      }

      else {
        // Fallback — should never happen
        const { data } = await api.get('/analytics/kpi');
        const csv = toCSV(['Metric','Value'], [
          { Metric: 'Total Revenue', Value: `$${data.totalRevenue}` },
          { Metric: 'Total Orders',  Value: data.totalOrders },
        ]);
        downloadCSV(csv, 'export.csv');
      }

    } catch(err) {
      console.error('Export failed:', err);
    } finally {
      setExporting(false);
    }
  };

  return (
    <header className="topbar">
      <div className="topbar-left">
        <div className="topbar-brand">
          <span className="brand-icon">S</span>
          <span className="brand-name">SmartStore AI</span>
        </div>
        <span className="topbar-sep">/</span>
        <span className="topbar-title">{title}</span>
      </div>

      <div className="topbar-center">
        
      </div>

      <div className="topbar-right">
        <button
          className="btn btn-outline btn-sm"
          onClick={handleExport}
          disabled={exporting}
          style={{ opacity: exporting ? 0.6 : 1 }}
        >
          {exporting ? '...' : '↓ Data Export'}
        </button>

        <div
          className="notif-btn"
          onClick={() => navigate('/alerts')}
          title={pendingCount > 0 ? `${pendingCount} pending alert(s)` : 'No pending alerts'}
          style={{ cursor:'pointer' }}
        >
          <span>🔔</span>
          {pendingCount > 0 && (
            <span className="notif-badge">{pendingCount > 99 ? '99+' : pendingCount}</span>
          )}
        </div>

        <div className="user-chip">
          <div className="user-chip-avatar">{user?.name?.[0]}</div>
          <span>{user?.role}</span>
          <span className="chevron">∨</span>
        </div>
      </div>
    </header>
  );
}
