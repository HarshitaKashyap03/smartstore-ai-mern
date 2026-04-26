import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './context/AuthContext';

import Login      from './pages/Login';
import Dashboard  from './pages/Dashboard';
import Inventory  from './pages/Inventory';
import Analytics  from './pages/Analytics';
import Demand     from './pages/Demand';
import Customers  from './pages/Customers';
import Alerts     from './pages/Alerts';
import Billing    from './pages/Billing';
import PnL        from './pages/PnL';
import Admin         from './pages/Admin';
import ProductDetail       from './pages/ProductDetail';
import TransactionHistory  from './pages/TransactionHistory';

import Sidebar    from './components/layout/Sidebar';
import Topbar     from './components/layout/Topbar';

import './styles/global.css';

function ProtectedRoute({ children, adminOnly }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (adminOnly && user.role !== 'Admin') return <Navigate to="/" replace />;
  return children;
}

function AppLayout({ children }) {
  return (
    <div className="app-layout">
      <Sidebar />
      <div className="main-content">
        <Topbar />
        <div className="page-body">{children}</div>
      </div>
    </div>
  );
}

function AppRoutes() {
  const { user } = useAuth();
  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/" replace /> : <Login />} />
      <Route path="/" element={<ProtectedRoute><AppLayout><Dashboard /></AppLayout></ProtectedRoute>} />
      <Route path="/inventory" element={<ProtectedRoute><AppLayout><Inventory /></AppLayout></ProtectedRoute>} />
      <Route path="/analytics" element={<ProtectedRoute><AppLayout><Analytics /></AppLayout></ProtectedRoute>} />
      <Route path="/demand"    element={<ProtectedRoute><AppLayout><Demand /></AppLayout></ProtectedRoute>} />
      <Route path="/customers" element={<ProtectedRoute><AppLayout><Customers /></AppLayout></ProtectedRoute>} />
      <Route path="/alerts"    element={<ProtectedRoute><AppLayout><Alerts /></AppLayout></ProtectedRoute>} />
      <Route path="/billing"   element={<ProtectedRoute><AppLayout><Billing /></AppLayout></ProtectedRoute>} />
      <Route path="/pnl"       element={<ProtectedRoute><AppLayout><PnL /></AppLayout></ProtectedRoute>} />
      <Route path="/transactions" element={<ProtectedRoute><AppLayout><TransactionHistory /></AppLayout></ProtectedRoute>} />
      <Route path="/products/:id" element={<ProtectedRoute><AppLayout><ProductDetail /></AppLayout></ProtectedRoute>} />
      <Route path="/admin"     element={<ProtectedRoute adminOnly><AppLayout><Admin /></AppLayout></ProtectedRoute>} />
      <Route path="*"          element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppRoutes />
        <Toaster
          position="top-right"
          toastOptions={{
            style: { background:'#0d1a35', border:'1px solid rgba(59,130,246,0.3)', color:'#e2e8f0', fontFamily:'Space Grotesk, sans-serif', fontSize:'13px' },
            success: { iconTheme: { primary:'#10b981', secondary:'#0d1a35' } },
            error:   { iconTheme: { primary:'#ef4444', secondary:'#0d1a35' } },
          }}
        />
      </BrowserRouter>
    </AuthProvider>
  );
}
