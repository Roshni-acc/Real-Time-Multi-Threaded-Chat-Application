import React from 'react';
import { X, ShieldAlert, UserMinus, Crown } from 'lucide-react';

export default function MemberListDrawer({
  currentRoom,
  members,
  user,
  isOpen,
  onClose,
  onPromoteMember,
  onKickMember
}) {
  if (!isOpen) return null;

  const isAdmin = currentRoom?.admins?.includes(user?.username);

  return (
    <div className="member-drawer">
      <div className="member-header">
        <span>Room Members ({members.length})</span>
        <button className="btn-icon" style={{ width: '32px', height: '32px' }} onClick={onClose}>
          <X size={16} />
        </button>
      </div>

      <div className="member-list">
        {members.map((m) => {
          const isMemberAdmin = currentRoom?.admins?.includes(m.username);
          const isCreator = currentRoom?.creator === m.username;
          const isSelf = m.username === user?.username;

          return (
            <div key={m.username} className="member-card">
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <img
                  src={m.dp || '/static/uploads/2.jpg'}
                  alt="Avatar"
                  style={{ width: '36px', height: '36px', borderRadius: '10px', objectFit: 'cover' }}
                  onError={(e) => { e.target.src = '/static/uploads/2.jpg'; }}
                />
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <span style={{ fontSize: '14px', fontWeight: '600' }}>
                    {m.full_name || m.username} {isSelf && '(You)'}
                  </span>
                  <div style={{ display: 'flex', gap: '4px', marginTop: '2px' }}>
                    {isCreator && <span className="member-badge" style={{ background: '#f59e0b' }}>Creator</span>}
                    {isMemberAdmin && <span className="member-badge">Admin</span>}
                  </div>
                </div>
              </div>

              {isAdmin && !isSelf && !isCreator && (
                <div style={{ display: 'flex', gap: '4px' }}>
                  {!isMemberAdmin && (
                    <button
                      className="btn-icon"
                      style={{ width: '28px', height: '28px' }}
                      title="Promote to Admin"
                      onClick={() => onPromoteMember(currentRoom._id, m.username)}
                    >
                      <Crown size={14} style={{ color: '#f59e0b' }} />
                    </button>
                  )}
                  <button
                    className="btn-icon"
                    style={{ width: '28px', height: '28px', color: 'var(--danger)' }}
                    title="Kick Member"
                    onClick={() => onKickMember(currentRoom._id, m.username)}
                  >
                    <UserMinus size={14} />
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
