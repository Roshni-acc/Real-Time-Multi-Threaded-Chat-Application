import React, { useState } from 'react';
import { MessageSquare, Lock, User, ArrowRight, AlertCircle, Eye, EyeOff, Loader2 } from 'lucide-react';

export default function Login({ onLoginSuccess, onNavigateRegister, onNavigateForgot }) {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const validate = () => {
    const errors = {};
    if (!identifier.trim()) {
      errors.identifier = 'Please enter your username or email address.';
    }
    if (!password) {
      errors.password = 'Please enter your password.';
    }
    return errors;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    const validationErrors = validate();
    if (Object.keys(validationErrors).length > 0) {
      setFieldErrors(validationErrors);
      setError('Please fill in both username/email and password.');
      return;
    }

    setFieldErrors({});
    setLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: identifier.trim(), password })
      });
      const data = await res.json();
      if (data.status) {
        onLoginSuccess(data.data.user);
      } else {
        setError(data.message || 'Login failed. Please check your credentials.');
      }
    } catch (err) {
      setError('Network connection error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-wrapper">
      <div className="glass-panel auth-card">
        <div className="auth-brand">
          <div className="auth-brand-logo">
            <MessageSquare size={28} />
          </div>
          <h1 className="auth-title">Welcome Back</h1>
          <p className="auth-subtitle">Sign in to multi-threaded chat workspace</p>
        </div>

        {error && (
          <div style={{
            padding: '12px 14px',
            borderRadius: '12px',
            background: 'rgba(239, 68, 68, 0.12)',
            border: '1px solid rgba(239, 68, 68, 0.35)',
            color: '#ef4444',
            fontSize: '13px',
            marginBottom: '18px',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            boxShadow: '0 2px 8px rgba(239, 68, 68, 0.1)'
          }}>
            <AlertCircle size={18} style={{ flexShrink: 0 }} />
            <span style={{ fontWeight: '500' }}>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate>
          <div className="form-group">
            <label className="form-label">Username or Email</label>
            <div className="form-input-wrapper">
              <User className="form-input-icon" size={18} />
              <input
                type="text"
                className={`form-input ${fieldErrors.identifier ? 'input-error' : ''}`}
                placeholder="Enter your username or email"
                value={identifier}
                disabled={loading}
                onChange={(e) => {
                  setIdentifier(e.target.value);
                  if (fieldErrors.identifier) setFieldErrors((prev) => ({ ...prev, identifier: '' }));
                }}
              />
            </div>
            {fieldErrors.identifier && (
              <span className="custom-field-error">{fieldErrors.identifier}</span>
            )}
          </div>

          <div className="form-group">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <label className="form-label">Password</label>
              <button
                type="button"
                onClick={onNavigateForgot}
                style={{ background: 'none', border: 'none', color: 'var(--accent-primary)', fontSize: '12px', cursor: 'pointer', fontWeight: '500' }}
              >
                Forgot password?
              </button>
            </div>
            <div className="form-input-wrapper" style={{ position: 'relative' }}>
              <Lock className="form-input-icon" size={18} />
              <input
                type={showPassword ? "text" : "password"}
                className={`form-input ${fieldErrors.password ? 'input-error' : ''}`}
                style={{ paddingRight: '42px' }}
                placeholder="Enter your password"
                value={password}
                disabled={loading}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (fieldErrors.password) setFieldErrors((prev) => ({ ...prev, password: '' }));
                }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: 'absolute',
                  right: '12px',
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-muted)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center'
                }}
                title={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            {fieldErrors.password && (
              <span className="custom-field-error">{fieldErrors.password}</span>
            )}
          </div>

          <button
            type="submit"
            className="btn-primary"
            disabled={loading}
            style={{ marginTop: '14px', opacity: loading ? 0.75 : 1, cursor: loading ? 'not-allowed' : 'pointer' }}
          >
            {loading ? (
              <>
                <Loader2 size={18} className="spinner-icon" />
                <span>Signing in...</span>
              </>
            ) : (
              <>
                <span>Sign In</span>
                <ArrowRight size={18} />
              </>
            )}
          </button>
        </form>

        <div style={{ textAlign: 'center', marginTop: '24px', fontSize: '14px', color: 'var(--text-secondary)' }}>
          Don't have an account?{' '}
          <button
            type="button"
            onClick={onNavigateRegister}
            style={{ background: 'none', border: 'none', color: 'var(--accent-primary)', fontWeight: '600', cursor: 'pointer' }}
          >
            Create account
          </button>
        </div>
      </div>
    </div>
  );
}
