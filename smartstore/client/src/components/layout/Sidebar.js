import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import './Sidebar.css';

const navItems = [
  { path: '/',           label: 'Dashboard',     icon: '⊞' },
  { path: '/inventory',  label: 'Inventory',      icon: '📦' },
  { path: '/analytics',  label: 'Sales Analytics',icon: '📊' },
  { path: '/demand',     label: 'Demand Predict', icon: '🧠' },
  { path: '/customers',  label: 'Customer Behavior',icon:'👥' },
  { path: '/recommend',  label: 'Recommendations',icon: '🛒' },
  { path: '/alerts',     label: 'Alerts',         icon: '🔔' },
  { path: '/billing',    label: 'Smart Billing',  icon: '🧾' },
  { path: '/pnl',        label: 'Profit & Loss',  icon: '📈' },
  { path: '/admin',      label: 'Admin Panel',    icon: '⚙️',  adminOnly: true },
];

export default function Sidebar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => { logout(); navigate('/login'); };

  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <div className="logo-icon">S</div>
        <div>
          <div className="logo-text">SmartStore</div>
          <div className="logo-sub">AI</div>
        </div>
      </div>

      <nav className="sidebar-nav">
        {navItems.filter(i => !i.adminOnly || user?.role === 'Admin').map(item => (
          <NavLink
            key={item.path}
            to={item.path}
            end={item.path === '/'}
            className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
          >
            <span className="nav-icon">{item.icon}</span>
            <span className="nav-label">{item.label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="sidebar-footer">
        <div className="user-info">
          <div className="user-avatar">{user?.name?.[0] || 'U'}</div>
          <div>
            <div className="user-name">{user?.name}</div>
            <div className="user-role">{user?.role}</div>
          </div>
        </div>
        <button className="btn btn-ghost btn-sm w-full mt-8" onClick={handleLogout}>
          Sign Out
        </button>
      </div>
    </aside>
  );
}
