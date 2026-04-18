import React from 'react';
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

export default function Topbar({ alertCount = 0 }) {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const title = PAGE_TITLES[location.pathname] || 'SmartStore AI';

  const handleExport = async () => {
    const { data } = await api.get('/analytics/kpi');
    const csv = `Metric,Value\nTotal Revenue,${data.totalRevenue}\nTotal Orders,${data.totalOrders}\nLow Stock Count,${data.lowStockCount}`;
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'smartstore_export.csv'; a.click();
  };

  const handleNotificationClick = () => {
    navigate('/alerts');
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
        <button className="btn btn-outline btn-sm" onClick={handleExport}>
          ↓ Data Export
        </button>
        <button
          type="button"
          className="notif-btn"
          onClick={handleNotificationClick}
          aria-label="Open alerts page"
          title="Open alerts"
        >
          <span>🔔</span>
          {alertCount > 0 && <span className="notif-badge">{alertCount}</span>}
        </button>
        <div className="user-chip">
          <div className="user-chip-avatar">{user?.name?.[0]}</div>
          <span>{user?.role}</span>
          <span className="chevron">∨</span>
        </div>
      </div>
    </header>
  );
}
