import React, { useState } from 'react';
import { Plus, Hash, Search, LogOut, Sun, Moon, User, X, MessageSquare } from 'lucide-react';

export default function Sidebar({
  user,
  rooms,
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
    const saved = localStorage.getItem('chat_sidebar_width');
    return saved ? parseInt(saved, 10) : 320;
  });
  const [isResizing, setIsResizing] = useState(false);

  const startResizing = (e) => {
    e.preventDefault();
    setIsResizing(true);
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';

    const onMouseMove = (moveEvent) => {
      // Constrain sidebar width between 220px (min) and 480px (max)
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

  const filteredRooms = rooms.filter(r =>
    r.room_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (r.room_code && r.room_code.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <aside
      className={`sidebar ${isOpen ? 'open' : ''}`}
      style={{
        width: typeof window !== 'undefined' && window.innerWidth <= 768 ? undefined : `${sidebarWidth}px`,
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
        <div className="sidebar-user" onClick={onOpenProfileModal}>
          <img
            src={user?.dp || '/static/uploads/2.jpg'}
            alt="DP"
            className="user-avatar"
            onError={(e) => { e.target.src = '/static/uploads/2.jpg'; }}
          />
          <div className="user-meta">
            <span className="user-name">{user?.full_name || user?.username}</span>
            <span className="user-status">Online</span>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <button className="btn-icon" onClick={onToggleTheme} title="Toggle Theme">
            {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
          </button>
          <button className="btn-icon" onClick={onLogout} title="Logout">
            <LogOut size={18} />
          </button>
          {isOpen && (
            <button className="btn-icon mobile-only" onClick={onCloseMobileSidebar}>
              <X size={18} />
            </button>
          )}
        </div>
      </div>

      <div className="sidebar-actions">
        <button
          className="btn-primary"
          style={{ flex: 1, padding: '10px 14px', fontSize: '13px' }}
          onClick={onOpenCreateModal}
        >
          <Plus size={16} />
          <span>New Group</span>
        </button>
        <button
          className="btn-secondary"
          style={{ padding: '10px 14px', fontSize: '13px' }}
          onClick={onOpenJoinModal}
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
        </div>
      </div>

      <div className="room-list">
        {filteredRooms.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '24px 12px', color: 'var(--text-muted)', fontSize: '13px' }}>
            {searchTerm ? 'No rooms match your search' : 'No rooms joined yet. Create or join one!'}
          </div>
        ) : (
          filteredRooms.map((room) => {
            const isActive = room._id === activeRoomId;
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
                  <span className="room-name">{room.room_name}</span>
                  <span className="room-code">Code: {room.room_code}</span>
                </div>
                <div className="room-meta" style={{ fontSize: '11px', opacity: 0.7 }}>
                  {room.members ? `${room.members.length} members` : ''}
                </div>
              </div>
            );
          })
        )}
      </div>
    </aside>
  );
}
