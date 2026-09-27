import React, { useState } from 'react';
import { MessageSquare, Mail, ArrowLeft, Send, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';

export default function ForgotPassword({ onNavigateLogin }) {
  const [email, setEmail] = useState('');
  const [fieldError, setFieldError] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');
    setFieldError('');

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email.trim()) {
      setFieldError('Please enter your email address.');
      setError('Please provide a valid registered email address.');
      return;
    } else if (!emailRegex.test(email.trim())) {
      setFieldError('Please enter a valid email address.');
      setError('The email format entered is invalid.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/auth/forgot_password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() })
      });
      const data = await res.json();
      if (data.status) {
        setMessage(data.message);
      } else {
        setError(data.message || 'Failed to request password reset.');
      }
    } catch (err) {
      setError('Connection error. Please try again.');
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
          <h1 className="auth-title">Reset Password</h1>
          <p className="auth-subtitle">Enter your email to receive a recovery link</p>
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
            gap: '10px'
          }}>
            <AlertCircle size={18} style={{ flexShrink: 0 }} />
            <span style={{ fontWeight: '500' }}>{error}</span>
          </div>
        )}

        {message && (
          <div style={{
            padding: '12px 14px',
            borderRadius: '12px',
            background: 'rgba(16, 185, 129, 0.12)',
            border: '1px solid rgba(16, 185, 129, 0.35)',
            color: '#10b981',
            fontSize: '13px',
            marginBottom: '18px',
            display: 'flex',
            alignItems: 'center',
            gap: '10px'
          }}>
            <CheckCircle size={18} style={{ flexShrink: 0 }} />
            <span style={{ fontWeight: '500' }}>{message}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate>
          <div className="form-group">
            <label className="form-label">Email Address</label>
            <div className="form-input-wrapper">
              <Mail className="form-input-icon" size={18} />
              <input
                type="email"
                className={`form-input ${fieldError ? 'input-error' : ''}`}
                placeholder="your.email@example.com"
                value={email}
                disabled={loading}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (fieldError) setFieldError('');
                }}
              />
            </div>
            {fieldError && (
              <span className="custom-field-error">{fieldError}</span>
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
                <span>Sending Link...</span>
              </>
            ) : (
              <>
                <span>Send Reset Link</span>
                <Send size={16} />
              </>
            )}
          </button>
        </form>

        <div style={{ textAlign: 'center', marginTop: '20px' }}>
          <button
            type="button"
            onClick={onNavigateLogin}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--text-secondary)',
              fontSize: '14px',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <ArrowLeft size={16} />
            <span>Back to login</span>
          </button>
        </div>
      </div>
    </div>
  );
}
