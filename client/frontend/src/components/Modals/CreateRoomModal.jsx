import React, { useState } from 'react';
import { X, Plus, MessageSquare } from 'lucide-react';

export default function CreateRoomModal({ isOpen, onClose, onCreateRoom }) {
  const [roomName, setRoomName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!roomName.trim() || roomName.trim().length < 3) {
      setError('Room name must be at least 3 characters long.');
      return;
    }

    setLoading(true);
    try {
      const res = await onCreateRoom(roomName.trim());
      if (res.status) {
        setRoomName('');
        onClose();
      } else {
        setError(res.message || 'Failed to create room.');
      }
    } catch (err) {
      setError('Error creating room.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">Create New Group Chat</h2>
          <button className="btn-icon" style={{ width: '32px', height: '32px' }} onClick={onClose}>
            <X size={16} />
          </button>
        </div>

        {error && (
          <div style={{ color: 'var(--danger)', fontSize: '13px', marginBottom: '12px' }}>{error}</div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Group Room Name</label>
            <div className="form-input-wrapper">
              <MessageSquare className="form-input-icon" size={18} />
              <input
                type="text"
                className="form-input"
                placeholder="e.g. Developer Team Chat"
                value={roomName}
                onChange={(e) => setRoomName(e.target.value)}
              />
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '20px' }}>
            <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn-primary" style={{ width: 'auto' }} disabled={loading}>
              <Plus size={16} />
              <span>{loading ? 'Creating...' : 'Create Room'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
