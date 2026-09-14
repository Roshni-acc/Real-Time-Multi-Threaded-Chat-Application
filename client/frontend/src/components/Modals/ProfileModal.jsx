import React, { useState, useRef } from 'react';
import { X, Camera, User, Mail, Save, AlertCircle } from 'lucide-react';

export default function ProfileModal({ isOpen, onClose, user, onUpdateProfile, onUploadDp, showToast }) {
  const [fullName, setFullName] = useState(user?.full_name || '');
  const [username, setUsername] = useState(user?.username || '');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const fileInputRef = useRef(null);

  if (!isOpen) return null;

  const handleDpChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('profile_photo', file);

    try {
      const res = await onUploadDp(formData);
      if (res.status) {
        showToast('Profile photo updated!');
      } else {
        showToast(res.message || 'Failed to update photo', 'error');
      }
    } catch (err) {
      showToast('Error uploading photo', 'error');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!fullName.trim() || !username.trim()) {
      setError('Full name and username are required.');
      return;
    }

    setLoading(true);
    try {
      const res = await onUpdateProfile({ full_name: fullName.trim(), username: username.trim() });
      if (res.status) {
        showToast('Profile updated successfully!');
        onClose();
      } else {
        setError(res.message || 'Failed to update profile.');
      }
    } catch (err) {
      setError('Error updating profile.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">Your Profile Settings</h2>
          <button className="btn-icon" style={{ width: '32px', height: '32px' }} onClick={onClose}>
            <X size={16} />
          </button>
        </div>

        {error && (
          <div style={{ color: 'var(--danger)', fontSize: '13px', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '24px' }}>
          <div style={{ position: 'relative', cursor: 'pointer' }} onClick={() => fileInputRef.current?.click()}>
            <img
              src={user?.dp || '/static/uploads/2.jpg'}
              alt="Profile"
              style={{ width: '80px', height: '80px', borderRadius: '20px', objectFit: 'cover', border: '3px solid var(--accent-primary)' }}
              onError={(e) => { e.target.src = '/static/uploads/2.jpg'; }}
            />
            <div style={{
              position: 'absolute',
              bottom: '-4px',
              right: '-4px',
              background: 'var(--accent-gradient)',
              color: '#fff',
              borderRadius: '50%',
              padding: '6px',
              boxShadow: 'var(--shadow-sm)'
            }}>
              <Camera size={14} />
            </div>
          </div>
          <input
            type="file"
            ref={fileInputRef}
            style={{ display: 'none' }}
            accept="image/*"
            onChange={handleDpChange}
          />
          <span style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '8px' }}>Click photo to change avatar</span>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Full Name</label>
            <div className="form-input-wrapper">
              <User className="form-input-icon" size={18} />
              <input
                type="text"
                className="form-input"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Username</label>
            <div className="form-input-wrapper">
              <User className="form-input-icon" size={18} />
              <input
                type="text"
                className="form-input"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Email Address (Read-only)</label>
            <div className="form-input-wrapper">
              <Mail className="form-input-icon" size={18} />
              <input
                type="email"
                className="form-input"
                value={user?.email || ''}
                disabled
                style={{ opacity: 0.6 }}
              />
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '20px' }}>
            <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn-primary" style={{ width: 'auto' }} disabled={loading}>
              <Save size={16} />
              <span>{loading ? 'Saving...' : 'Save Profile'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
