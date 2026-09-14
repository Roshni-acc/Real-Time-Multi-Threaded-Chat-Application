import React, { useState } from 'react';
import { X, Hash, LogIn } from 'lucide-react';

export default function JoinRoomModal({ isOpen, onClose, onJoinRoom }) {
  const [roomCode, setRoomCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!roomCode.trim()) {
      setError('Please enter an 8-character room code.');
      return;
    }

    setLoading(true);
    try {
      const res = await onJoinRoom(roomCode.trim());
      if (res.status) {
        setRoomCode('');
        onClose();
      } else {
        setError(res.message || 'Room code not found.');
      }
    } catch (err) {
      setError('Error joining room.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">Join Group by Room Code</h2>
          <button className="btn-icon" style={{ width: '32px', height: '32px' }} onClick={onClose}>
            <X size={16} />
          </button>
        </div>

        {error && (
          <div style={{ color: 'var(--danger)', fontSize: '13px', marginBottom: '12px' }}>{error}</div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">8-Character Room Code</label>
            <div className="form-input-wrapper">
              <Hash className="form-input-icon" size={18} />
              <input
                type="text"
                className="form-input"
                placeholder="e.g. A1B2C3D4"
                value={roomCode}
                onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                maxLength={12}
              />
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '20px' }}>
            <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn-primary" style={{ width: 'auto' }} disabled={loading}>
              <LogIn size={16} />
              <span>{loading ? 'Joining...' : 'Join Group'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
