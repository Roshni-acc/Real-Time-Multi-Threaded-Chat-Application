import React, { useState } from 'react';
import { Plus, Hash, Search, LogOut, Sun, Moon, User, X, MessageSquare, Sparkles } from 'lucide-react';

export default function Sidebar({
  user,
  rooms = [],
  activeRoomId,
  onSelectRoom,
  onOpenCreateModal,
  onOpenJoinModal,
  onOpenProfileModal,
  onLogout,
  theme,
  onToggleTheme,
  isOpen,
  onCloseMobileSidebar
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [sidebarWidth, setSidebarWidth] = useState(() => {
    try {
      const saved = localStorage.getItem('chat_sidebar_width');
      const parsed = saved ? parseInt(saved, 10) : 320;
      return (isNaN(parsed) || parsed < 220 || parsed > 480) ? 320 : parsed;
    } catch (e) {
      return 320;
    }
  });
  const [isResizing, setIsResizing] = useState(false);

  const startResizing = (e) => {
    e.preventDefault();
    setIsResizing(true);
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';

    const onMouseMove = (moveEvent) => {
      const newWidth = Math.min(Math.max(moveEvent.clientX, 220), 480);
      setSidebarWidth(newWidth);
      localStorage.setItem('chat_sidebar_width', newWidth.toString());
    };

    const onMouseUp = () => {
      setIsResizing(false);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  };

  const handleResetWidth = () => {
    setSidebarWidth(320);
    localStorage.setItem('chat_sidebar_width', '320');
  };

  const safeRooms = Array.isArray(rooms) ? rooms : [];
  const filteredRooms = safeRooms.filter(r => {
    if (!r) return false;
    const name = (r.room_name || '').toLowerCase();
    const code = (r.room_code || '').toLowerCase();
    const query = (searchTerm || '').toLowerCase();
    return name.includes(query) || code.includes(query);
  });

  return (
    <aside
      className={`sidebar ${isOpen ? 'open' : ''}`}
      style={{
        width: `${sidebarWidth}px`,
        flexShrink: 0,
        position: 'relative'
      }}
    >
      <div
        className={`sidebar-resizer ${isResizing ? 'resizing' : ''}`}
        onMouseDown={startResizing}
        onDoubleClick={handleResetWidth}
        title="Drag left/right to resize sidebar (Double-click to reset)"
      />
      <div className="sidebar-header">
        <div className="sidebar-user" onClick={onOpenProfileModal} title="Click to view & edit profile">
          <img
            src={user?.dp || '/static/uploads/2.jpg'}
            alt="DP"
            className="user-avatar"
            onError={(e) => { e.target.src = '/static/uploads/2.jpg'; }}
          />
          <div className="user-meta">
            <span className="user-name">{user?.full_name || user?.username || 'User'}</span>
            <span className="user-status">Online</span>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <button className="btn-icon" onClick={onToggleTheme} title={theme === 'dark' ? 'Switch to Light Theme' : 'Switch to Dark Theme'}>
            {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
          </button>
          <button className="btn-icon" onClick={onLogout} title="Logout Cleanly">
            <LogOut size={18} />
          </button>
          {isOpen && (
            <button className="btn-icon mobile-only" onClick={onCloseMobileSidebar} title="Close Sidebar">
              <X size={18} />
            </button>
          )}
        </div>
      </div>

      <div className="sidebar-actions">
        <button
          className="btn-primary"
          style={{ flex: 1, padding: '10px 14px', fontSize: '13px' }}
          onClick={() => {
            onOpenCreateModal();
            if (onCloseMobileSidebar) onCloseMobileSidebar();
          }}
        >
          <Plus size={16} />
          <span>New Group</span>
        </button>
        <button
          className="btn-secondary"
          style={{ padding: '10px 14px', fontSize: '13px' }}
          onClick={() => {
            onOpenJoinModal();
            if (onCloseMobileSidebar) onCloseMobileSidebar();
          }}
        >
          <Hash size={16} />
          <span>Join Code</span>
        </button>
      </div>

      <div className="sidebar-search">
        <div className="search-input-wrapper">
          <Search className="search-icon" size={16} />
          <input
            type="text"
            placeholder="Search chat groups..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              style={{
                position: 'absolute',
                right: '10px',
                background: 'none',
                border: 'none',
                color: 'var(--text-muted)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center'
              }}
            >
              <X size={14} />
            </button>
          )}
        </div>
      </div>

      <div className="room-list">
        {filteredRooms.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '32px 16px', color: 'var(--text-secondary)' }}>
            <div style={{
              width: '48px',
              height: '48px',
              borderRadius: '14px',
              background: 'var(--bg-tertiary)',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '12px',
              color: 'var(--accent-primary)'
            }}>
              <MessageSquare size={24} />
            </div>
            <p style={{ fontSize: '14px', fontWeight: '600', color: 'var(--text-primary)', marginBottom: '4px' }}>
              {searchTerm ? 'No matching groups' : 'No Chat Groups Yet'}
            </p>
            <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '16px' }}>
              {searchTerm ? 'Try searching another keyword' : 'Create a group or enter a room code to get started.'}
            </p>
            {!searchTerm && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <button
                  className="btn-primary"
                  style={{ fontSize: '12px', padding: '8px 12px' }}
                  onClick={onOpenCreateModal}
                >
                  <Plus size={14} />
                  <span>Create First Group</span>
                </button>
              </div>
            )}
          </div>
        ) : (
          filteredRooms.map((room) => {
            if (!room || !room._id) return null;
            const isActive = room._id === activeRoomId;
            const memberCount = Array.isArray(room.members) ? room.members.length : 1;
            return (
              <div
                key={room._id}
                className={`room-item ${isActive ? 'active' : ''}`}
                onClick={() => {
                  onSelectRoom(room._id);
                  if (onCloseMobileSidebar) onCloseMobileSidebar();
                }}
              >
                <div className="room-info">
                  <span className="room-name">{room.room_name || 'Unnamed Group'}</span>
                  <span className="room-code">Code: {room.room_code || 'N/A'}</span>
                </div>
                <div className="room-meta" style={{ fontSize: '11px', opacity: 0.8, fontWeight: '500' }}>
                  {memberCount} {memberCount === 1 ? 'member' : 'members'}
                </div>
              </div>
            );
          })
        )}
      </div>
    </aside>
  );
}
