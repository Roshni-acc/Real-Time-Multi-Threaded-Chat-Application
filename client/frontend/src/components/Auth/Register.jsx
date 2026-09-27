import React, { useState } from 'react';
import { MessageSquare, Lock, User, Mail, ArrowRight, AlertCircle, Eye, EyeOff, Loader2 } from 'lucide-react';

export default function Register({ onRegisterSuccess, onNavigateLogin }) {
  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    username: '',
    password: '',
    confirm_password: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (fieldErrors[name]) {
      setFieldErrors((prev) => ({ ...prev, [name]: '' }));
    }
  };

  const validate = () => {
    const errors = {};
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!formData.full_name.trim()) {
      errors.full_name = 'Please enter your full name.';
    }

    if (!formData.email.trim()) {
      errors.email = 'Please enter your email address.';
    } else if (!emailRegex.test(formData.email.trim())) {
      errors.email = 'Please enter a valid email address (e.g. name@example.com).';
    }

    if (!formData.username.trim()) {
      errors.username = 'Please choose a username handle.';
    } else if (formData.username.trim().length < 3) {
      errors.username = 'Username must be at least 3 characters long.';
    }

    if (!formData.password) {
      errors.password = 'Please enter a password.';
    } else if (formData.password.length < 6) {
      errors.password = 'Password must be at least 6 characters long.';
    }

    if (!formData.confirm_password) {
      errors.confirm_password = 'Please re-enter your password to confirm.';
    } else if (formData.password !== formData.confirm_password) {
      errors.confirm_password = 'Passwords do not match. Please check and try again.';
    }

    return errors;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    const validationErrors = validate();
    if (Object.keys(validationErrors).length > 0) {
      setFieldErrors(validationErrors);
      setError('Please resolve the highlighted validation errors below.');
      return;
    }

    setFieldErrors({});
    setLoading(true);

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      const data = await res.json();
      if (data.status) {
        onRegisterSuccess(data.data.user);
      } else {
        setError(data.message || 'Registration failed. Please check your information.');
      }
    } catch (err) {
      setError('Network connection error. Please check your internet connection.');
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
          <h1 className="auth-title">Create Account</h1>
          <p className="auth-subtitle">Join the real-time multi-threaded chat platform</p>
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
            <label className="form-label">Full Name</label>
            <div className="form-input-wrapper">
              <User className="form-input-icon" size={18} />
              <input
                type="text"
                name="full_name"
                className={`form-input ${fieldErrors.full_name ? 'input-error' : ''}`}
                placeholder="e.g. Roshni Singh"
                value={formData.full_name}
                disabled={loading}
                onChange={handleChange}
              />
            </div>
            {fieldErrors.full_name && (
              <span className="custom-field-error">{fieldErrors.full_name}</span>
            )}
          </div>

          <div className="form-group">
            <label className="form-label">Email Address</label>
            <div className="form-input-wrapper">
              <Mail className="form-input-icon" size={18} />
              <input
                type="email"
                name="email"
                className={`form-input ${fieldErrors.email ? 'input-error' : ''}`}
                placeholder="name@example.com"
                value={formData.email}
                disabled={loading}
                onChange={handleChange}
              />
            </div>
            {fieldErrors.email && (
              <span className="custom-field-error">{fieldErrors.email}</span>
            )}
          </div>

          <div className="form-group">
            <label className="form-label">Username</label>
            <div className="form-input-wrapper">
              <User className="form-input-icon" size={18} />
              <input
                type="text"
                name="username"
                className={`form-input ${fieldErrors.username ? 'input-error' : ''}`}
                placeholder="Choose a unique handle"
                value={formData.username}
                disabled={loading}
                onChange={handleChange}
              />
            </div>
            {fieldErrors.username && (
              <span className="custom-field-error">{fieldErrors.username}</span>
            )}
          </div>

          <div className="form-group">
            <label className="form-label">Password</label>
            <div className="form-input-wrapper" style={{ position: 'relative' }}>
              <Lock className="form-input-icon" size={18} />
              <input
                type={showPassword ? "text" : "password"}
                name="password"
                className={`form-input ${fieldErrors.password ? 'input-error' : ''}`}
                style={{ paddingRight: '42px' }}
                placeholder="At least 6 characters"
                value={formData.password}
                disabled={loading}
                onChange={handleChange}
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

          <div className="form-group">
            <label className="form-label">Confirm Password</label>
            <div className="form-input-wrapper" style={{ position: 'relative' }}>
              <Lock className="form-input-icon" size={18} />
              <input
                type={showConfirmPassword ? "text" : "password"}
                name="confirm_password"
                className={`form-input ${fieldErrors.confirm_password ? 'input-error' : ''}`}
                style={{ paddingRight: '42px' }}
                placeholder="Re-enter password"
                value={formData.confirm_password}
                disabled={loading}
                onChange={handleChange}
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
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
                title={showConfirmPassword ? "Hide password" : "Show password"}
              >
                {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            {fieldErrors.confirm_password && (
              <span className="custom-field-error">{fieldErrors.confirm_password}</span>
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
                <span>Creating Account...</span>
              </>
            ) : (
              <>
                <span>Get Started</span>
                <ArrowRight size={18} />
              </>
            )}
          </button>
        </form>

        <div style={{ textAlign: 'center', marginTop: '20px', fontSize: '14px', color: 'var(--text-secondary)' }}>
          Already have an account?{' '}
          <button
            type="button"
            onClick={onNavigateLogin}
            style={{ background: 'none', border: 'none', color: 'var(--accent-primary)', fontWeight: '600', cursor: 'pointer' }}
          >
            Sign in
          </button>
        </div>
      </div>
    </div>
  );
}
