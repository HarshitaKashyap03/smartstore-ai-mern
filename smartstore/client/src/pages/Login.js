import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import './Login.css';

export default function Login() {
  const [tab,      setTab]      = useState('login');
  const [role,     setRole]     = useState('');
  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [name,     setName]     = useState('');
  const [showPw,   setShowPw]   = useState(false);
  const [remember, setRemember] = useState(false);
  const { login, register, loading } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (tab === 'login') {
      // Login: role selection is required to verify the user is logging in as correct role
      if (!role) { toast.error('Please select your role'); return; }
      const result = await login(email, password, role);
      if (result.ok) {
        toast.success('Authenticated successfully!');
        navigate('/');
      } else {
        toast.error(result.message);
      }
    } else {
      // Register: no role selection — server assigns role automatically
      if (!name.trim()) { toast.error('Name is required'); return; }
      if (password.length < 6) { toast.error('Password must be at least 6 characters'); return; }
      const result = await register(name, email, password);
      if (result.ok) {
        toast.success(result.message || 'Account created!');
        navigate('/');
      } else {
        toast.error(result.message);
      }
    }
  };

  return (
    <div className="login-page">
      <div className="login-bg">
        <div className="bg-glow bg-glow-1" />
        <div className="bg-glow bg-glow-2" />
        <div className="bg-grid" />
      </div>

      <div className="login-card">
        <div className="login-logo">
          <div className="login-logo-icon">S</div>
          <div>
            <div className="login-brand">SmartStore AI</div>
            <div className="login-tagline">Intelligence at your storefront.</div>
          </div>
        </div>

        <div className="login-tabs">
          <button className={`login-tab ${tab === 'login' ? 'active' : ''}`} onClick={() => setTab('login')}>Login</button>
          <button className={`login-tab ${tab === 'register' ? 'active' : ''}`} onClick={() => setTab('register')}>Register</button>
        </div>

        <form onSubmit={handleSubmit}>

          {/* Role dropdown — only shown on LOGIN tab */}
          {tab === 'login' && (
            <div className="form-group">
              <label className="form-label">Role Selection</label>
              <div className="role-select-wrap">
                <select className="form-control" value={role} onChange={e => setRole(e.target.value)}>
                  <option value="">Select Role</option>
                  <option value="Admin">Admin</option>
                  <option value="Manager">Manager</option>
                  <option value="Staff">Staff</option>
                </select>
              </div>
            </div>
          )}

          {/* Name — only on register tab */}
          {tab === 'register' && (
            <>
              <div className="form-group">
                <label className="form-label">Full Name</label>
                <input
                  className="form-control"
                  placeholder="Your name"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  required
                />
              </div>
              {/* Security notice on register tab */}
              <div className="register-notice">
                🔒 New accounts are created as <strong>Staff</strong> by default.
                Only an Admin can assign Manager or Admin roles from the Admin Panel.
              </div>
            </>
          )}

          <div className="form-group">
            <label className="form-label">Email Address</label>
            <input
              className="form-control"
              type="email"
              placeholder="email@smartstore.io"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Password</label>
            <div className="pw-wrap">
              <input
                className="form-control"
                type={showPw ? 'text' : 'password'}
                placeholder="••••••••••"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
              />
              <button type="button" className="pw-toggle" onClick={() => setShowPw(!showPw)}>
                {showPw ? '🙈' : '👁'}
              </button>
            </div>
          </div>

          {tab === 'login' && (
            <div className="login-row">
              <label className="checkbox-label">
                <input type="checkbox" checked={remember} onChange={e => setRemember(e.target.checked)} />
                <span>Remember Me</span>
              </label>
              <span className="forgot-link">Forgot Password?</span>
            </div>
          )}

          <button className="btn btn-primary w-full login-btn" type="submit" disabled={loading}>
            {loading ? '...' : tab === 'login' ? '⚡ Sign In' : '✦ Create Account'}
          </button>
        </form>
      </div>
    </div>
  );
}
