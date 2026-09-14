import React, { useState, useEffect, useRef } from 'react';
import {
  Send, Paperclip, Smile, Phone, Video, Users, Copy, Check,
  Edit2, Trash2, LogOut, Menu, FileText, Image as ImageIcon, Bot, Sparkles
} from 'lucide-react';

export default function ChatArea({
  currentRoom,
  messages,
  members,
  user,
  onSendMessage,
  onUploadFile,
  onStartCall,
  onToggleMembersDrawer,
  onToggleMobileSidebar,
  onRenameRoom,
  onDeleteRoom,
  onLeaveRoom,
  showToast
}) {
  const [inputText, setInputText] = useState('');
  const [copied, setCopied] = useState(false);
  const [isEditingName, setIsEditingName] = useState(false);
  const [newRoomName, setNewRoomName] = useState('');
  const [showStickerPicker, setShowStickerPicker] = useState(false);
  const [uploading, setUploading] = useState(false);

  const fileInputRef = useRef(null);
  const messagesEndRef = useRef(null);

  const stickers = [
    'https://cdn-icons-png.flaticon.com/512/742/742751.png',
    'https://cdn-icons-png.flaticon.com/512/742/742752.png',
    'https://cdn-icons-png.flaticon.com/512/742/742760.png',
    'https://cdn-icons-png.flaticon.com/512/742/742920.png',
    'https://cdn-icons-png.flaticon.com/512/742/742787.png'
  ];

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (currentRoom) {
      setNewRoomName(currentRoom.room_name);
      setIsEditingName(false);
    }
  }, [currentRoom]);

  const handleCopyCode = () => {
    if (currentRoom?.room_code) {
      navigator.clipboard.writeText(currentRoom.room_code);
      setCopied(true);
      showToast('Room code copied to clipboard!');
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleSend = () => {
    if (!inputText.trim()) return;
    onSendMessage('text', inputText.trim());
    setInputText('');
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleSend();
    }
  };

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const res = await onUploadFile(file);
      if (res.status) {
        onSendMessage('file', file.name, { filename: res.data.filename, url: res.data.url });
        showToast('File attached successfully!');
      } else {
        showToast(res.message || 'File upload failed', 'error');
      }
    } catch (err) {
      showToast('Failed to upload file', 'error');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleSaveRename = () => {
    if (!newRoomName.trim()) return;
    onRenameRoom(currentRoom._id, newRoomName.trim());
    setIsEditingName(false);
  };

  const handleAskAI = () => {
    setInputText((prev) => prev.startsWith('@ai') ? prev : `@ai summarize`);
  };

  if (!currentRoom) {
    return (
      <div className="chat-area" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>
          <Menu size={48} style={{ marginBottom: '12px', opacity: 0.5 }} />
          <h3>Select or Create a Chat Group</h3>
          <p style={{ fontSize: '13px', marginTop: '6px' }}>Choose a room from the sidebar to start chatting</p>
        </div>
      </div>
    );
  }

  const isAdmin = currentRoom.admins?.includes(user?.username);

  return (
    <div className="chat-area">
      {/* Header */}
      <div className="chat-header">
        <div className="header-left">
          <button className="btn-icon mobile-only" onClick={onToggleMobileSidebar}>
            <Menu size={20} />
          </button>

          <div className="chat-title-group">
            {isEditingName ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <input
                  type="text"
                  className="form-input"
                  style={{ padding: '4px 10px', fontSize: '15px' }}
                  value={newRoomName}
                  onChange={(e) => setNewRoomName(e.target.value)}
                />
                <button className="btn-primary" style={{ padding: '6px 12px', fontSize: '12px' }} onClick={handleSaveRename}>Save</button>
                <button className="btn-secondary" style={{ padding: '6px 12px', fontSize: '12px' }} onClick={() => setIsEditingName(false)}>Cancel</button>
              </div>
            ) : (
              <div className="chat-title">
                <span>{currentRoom.room_name}</span>
                {isAdmin && (
                  <button className="btn-icon" style={{ width: '28px', height: '28px' }} onClick={() => setIsEditingName(true)} title="Rename Room">
                    <Edit2 size={14} />
                  </button>
                )}
              </div>
            )}

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
              <span className="room-code-badge" onClick={handleCopyCode} title="Click to copy room code">
                Code: {currentRoom.room_code}
                {copied ? <Check size={12} /> : <Copy size={12} />}
              </span>
              <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>• {members.length} members</span>
            </div>
          </div>
        </div>

        <div className="header-actions">
          <button
            className="btn-secondary"
            style={{ padding: '6px 12px', fontSize: '12px', gap: '4px', background: 'var(--accent-gradient)', color: '#fff', border: 'none' }}
            onClick={handleAskAI}
            title="Ask AI Assistant"
          >
            <Sparkles size={14} />
            <span>@AI Bot</span>
          </button>
          <button className="btn-icon" onClick={() => onStartCall('voice')} title="Voice Call">
            <Phone size={18} />
          </button>
          <button className="btn-icon" onClick={() => onStartCall('video')} title="Video Call">
            <Video size={18} />
          </button>
          <button className="btn-icon" onClick={onToggleMembersDrawer} title="Room Members">
            <Users size={18} />
          </button>

          {isAdmin && (
            <button className="btn-icon" style={{ color: 'var(--danger)' }} onClick={() => onDeleteRoom(currentRoom._id)} title="Delete Room">
              <Trash2 size={18} />
            </button>
          )}

          <button className="btn-icon" onClick={() => onLeaveRoom(currentRoom._id)} title="Leave Room">
            <LogOut size={18} />
          </button>
        </div>
      </div>

      {/* Message Feed */}
      <div className="message-stream">
        {messages.map((msg, index) => {
          const isSystem = msg.username === 'System' || msg.sender === 'System' || msg.message_type === 'system';
          const isAi = msg.username === 'AI Bot' || msg.sender === 'AI Bot' || msg.message_type === 'ai';
          const isOwn = msg.sender === user?.username || msg.username === user?.username;

          if (isSystem) {
            return (
              <div key={msg._id || index} className="system-message-wrapper">
                <div className="system-message">{msg.message}</div>
              </div>
            );
          }

          if (isAi) {
            return (
              <div key={msg._id || index} className="message-wrapper" style={{ alignSelf: 'flex-start', maxWidth: '80%' }}>
                <div className="msg-header" style={{ color: 'var(--accent-secondary)' }}>
                  <div style={{
                    width: '24px', height: '24px', borderRadius: '50%', background: 'var(--accent-gradient)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff'
                  }}>
                    <Bot size={14} />
                  </div>
                  <strong>AI Assistant Bot</strong>
                  <span className="member-badge" style={{ fontSize: '9px', background: 'var(--accent-gradient)' }}>AI</span>
                </div>
                <div className="msg-bubble" style={{
                  background: 'var(--bg-secondary)',
                  border: '1.5px solid var(--accent-primary)',
                  boxShadow: 'var(--shadow-md)',
                  whiteSpace: 'pre-wrap'
                }}>
                  <p>{msg.message}</p>
                  <span className="msg-time">{msg.time_formatted || 'IST'}</span>
                </div>
              </div>
            );
          }

          const dpUrl = msg.dp || (msg.profile_photo ? `/static/uploads/${msg.profile_photo}` : '/static/uploads/2.jpg');

          return (
            <div key={msg._id || index} className={`message-wrapper ${isOwn ? 'own' : ''}`}>
              {!isOwn && (
                <div className="msg-header">
                  <img src={dpUrl} alt="DP" className="msg-avatar" onError={(e) => { e.target.src = '/static/uploads/2.jpg'; }} />
                  <strong>{msg.username || msg.sender}</strong>
                </div>
              )}

              <div className="msg-bubble">
                {msg.message_type === 'sticker' ? (
                  <img src={msg.message} alt="Sticker" style={{ width: '120px', height: '120px', objectFit: 'contain' }} />
                ) : msg.message_type === 'file' && msg.file_info ? (
                  <div className="file-attachment">
                    <Paperclip size={18} />
                    <a href={msg.file_info.url} target="_blank" rel="noreferrer">
                      {msg.file_info.filename || 'Attached File'}
                    </a>
                  </div>
                ) : msg.message_type === 'call' ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontStyle: 'italic' }}>
                    {msg.message.includes('video') ? <Video size={16} /> : <Phone size={16} />}
                    <span>{msg.message}</span>
                  </div>
                ) : (
                  <p>{msg.message}</p>
                )}

                <span className="msg-time">{msg.time_formatted || 'IST'}</span>
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Bar */}
      <div className="chat-input-bar">
        <input
          type="file"
          ref={fileInputRef}
          style={{ display: 'none' }}
          onChange={handleFileChange}
        />
        <button
          className="btn-icon"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          title="Attach File"
        >
          <Paperclip size={18} />
        </button>

        <div style={{ position: 'relative' }}>
          <button
            className="btn-icon"
            onClick={() => setShowStickerPicker(!showStickerPicker)}
            title="Stickers"
          >
            <Smile size={18} />
          </button>

          {showStickerPicker && (
            <div className="glass-panel" style={{
              position: 'absolute',
              bottom: '50px',
              left: '0',
              padding: '12px',
              display: 'flex',
              gap: '8px',
              zIndex: 50,
              borderRadius: '12px'
            }}>
              {stickers.map((stk, i) => (
                <img
                  key={i}
                  src={stk}
                  alt="Sticker"
                  style={{ width: '40px', height: '40px', cursor: 'pointer' }}
                  onClick={() => {
                    onSendMessage('sticker', stk);
                    setShowStickerPicker(false);
                  }}
                />
              ))}
            </div>
          )}
        </div>

        <div className="chat-input-wrapper">
          <input
            type="text"
            placeholder="Type a message or @ai to ask AI Assistant..."
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyPress={handleKeyPress}
          />
        </div>

        <button className="btn-primary" style={{ width: '42px', height: '42px', padding: '0' }} onClick={handleSend}>
          <Send size={18} />
        </button>
      </div>
    </div>
  );
}
