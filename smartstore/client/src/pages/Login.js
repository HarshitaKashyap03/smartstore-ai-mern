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
    if (!role) { toast.error('Please select a role'); return; }
    let result;
    if (tab === 'login') {
      result = await login(email, password, role);
    } else {
      if (!name.trim()) { toast.error('Name is required'); return; }
      result = await register(name, email, password, role);
    }
    if (result.ok) {
      toast.success('Authenticated successfully!');
      navigate('/');
    } else {
      toast.error(result.message);
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

          {tab === 'register' && (
            <div className="form-group">
              <label className="form-label">Full Name</label>
              <input className="form-control" placeholder="Your name" value={name} onChange={e => setName(e.target.value)} required />
            </div>
          )}

          <div className="form-group">
            <label className="form-label">Email Address</label>
            <input className="form-control" type="email" placeholder="email@smartstore.io" value={email} onChange={e => setEmail(e.target.value)} required />
          </div>

          <div className="form-group">
            <label className="form-label">Password</label>
            <div className="pw-wrap">
              <input className="form-control" type={showPw ? 'text' : 'password'} placeholder="••••••••••" value={password} onChange={e => setPassword(e.target.value)} required />
              <button type="button" className="pw-toggle" onClick={() => setShowPw(!showPw)}>{showPw ? '🙈' : '👁'}</button>
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
            {loading ? '...' : `⚡ Sign In`}
          </button>
        </form>

        <div className="demo-creds">
          <div className="demo-title">Demo Credentials</div>
          <div className="demo-row"><span className="badge badge-purple">Admin</span><code>admin@smartstore.io / admin123</code></div>
          <div className="demo-row"><span className="badge badge-blue">Manager</span><code>manager@smartstore.io / manager123</code></div>
        </div>
      </div>
    </div>
  );
}
