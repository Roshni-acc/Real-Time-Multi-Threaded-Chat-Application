import React, { useState, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import Peer from 'peerjs';

import Login from './components/Auth/Login';
import Register from './components/Auth/Register';
import ForgotPassword from './components/Auth/ForgotPassword';
import Sidebar from './components/Chat/Sidebar';
import ChatArea from './components/Chat/ChatArea';
import MemberListDrawer from './components/Chat/MemberListDrawer';
import ProfileModal from './components/Modals/ProfileModal';
import CreateRoomModal from './components/Modals/CreateRoomModal';
import JoinRoomModal from './components/Modals/JoinRoomModal';
import CallModal from './components/Calls/CallModal';

export default function App() {
  const [user, setUser] = useState(null);
  const [authView, setAuthView] = useState('login'); // 'login' | 'register' | 'forgot'
  const [loadingAuth, setLoadingAuth] = useState(true);

  const [rooms, setRooms] = useState([]);
  const [activeRoomId, setActiveRoomId] = useState(null);
  const [currentRoom, setCurrentRoom] = useState(null);
  const [members, setMembers] = useState([]);
  const [messages, setMessages] = useState([]);

  // Modals & Panels
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isJoinModalOpen, setIsJoinModalOpen] = useState(false);
  const [isMembersDrawerOpen, setIsMembersDrawerOpen] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  // Calling & PeerJS
  const [incomingCall, setIncomingCall] = useState(null);
  const [activeCall, setActiveCall] = useState(null);
  const [localStream, setLocalStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);

  // Theme & Toast
  const [theme, setTheme] = useState(localStorage.getItem('chat_theme') || 'dark');
  const [toast, setToast] = useState(null);

  const socketRef = useRef(null);
  const peerRef = useRef(null);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('chat_theme', theme);
  }, [theme]);

  const showToast = (message, type = 'info') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  // 1. Initial Auth Check
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const res = await fetch('/api/auth/me');
        const data = await res.json();
        if (data.status) {
          setUser(data.data.user);
          if (data.data.active_room_id) {
            setActiveRoomId(data.data.active_room_id);
          }
        }
      } catch (err) {
        console.error("Auth check error:", err);
      } finally {
        setLoadingAuth(false);
      }
    };
    checkAuth();
  }, []);

  // 2. Initialize Socket.IO connection when user is authenticated
  useEffect(() => {
    if (!user) return;

    const socketUrl = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
      ? 'http://localhost:5001'
      : window.location.origin;

    const socket = io(socketUrl, {
      withCredentials: true,
      transports: ['websocket', 'polling']
    });
    socketRef.current = socket;

    socket.on('message', (msg) => {
      setMessages((prev) => [...prev, msg]);
    });

    socket.on('room_deleted', (data) => {
      showToast(data.message, 'error');
      fetchRooms();
      setCurrentRoom(null);
      setActiveRoomId(null);
    });

    socket.on('user_kicked', (data) => {
      if (data.username === user.username) {
        showToast('You have been removed from the room.', 'error');
        fetchRooms();
        setCurrentRoom(null);
        setActiveRoomId(null);
      }
    });

    socket.on('call-started', (data) => {
      if (data.to && data.to !== user.username) return;
      setIncomingCall(data);
    });

    socket.on('call-rejected', () => {
      showToast('Call was declined', 'error');
      setIncomingCall(null);
      setActiveCall(null);
    });

    socket.on('user-left-call', () => {
      showToast('Call ended', 'info');
      setActiveCall(null);
      if (localStream) {
        localStream.getTracks().forEach(track => track.stop());
        setLocalStream(null);
      }
      setRemoteStream(null);
    });

    return () => {
      socket.disconnect();
    };
  }, [user]);

  // 3. Fetch Rooms
  const fetchRooms = async () => {
    if (!user) return;
    try {
      const res = await fetch('/api/rooms');
      const data = await res.json();
      if (data.status) {
        setRooms(data.data.rooms || []);
        if (!activeRoomId && data.data.rooms.length > 0) {
          setActiveRoomId(data.data.rooms[0]._id);
        }
      }
    } catch (err) {
      console.error("Fetch rooms error:", err);
    }
  };

  useEffect(() => {
    fetchRooms();
  }, [user]);

  // 4. Fetch Active Room Details when activeRoomId changes
  useEffect(() => {
    if (!activeRoomId || !user) return;

    const fetchRoomDetail = async () => {
      try {
        const res = await fetch(`/api/rooms/${activeRoomId}`);
        const data = await res.json();
        if (data.status) {
          setCurrentRoom(data.data.room);
          setMembers(data.data.members || []);
          setMessages(data.data.messages || []);

          if (socketRef.current) {
            socketRef.current.emit('join', { room: activeRoomId });
          }
        }
      } catch (err) {
        console.error("Fetch room detail error:", err);
      }
    };

    fetchRoomDetail();
  }, [activeRoomId, user]);

  // Actions
  const handleSelectRoom = (roomId) => {
    setActiveRoomId(roomId);
  };

  const handleSendMessage = (type, messageText, fileInfo = null) => {
    if (!socketRef.current || !activeRoomId) return;
    socketRef.current.emit('message', {
      room_id: activeRoomId,
      message: messageText,
      message_type: type,
      file_info: fileInfo
    });
  };

  const handleCreateRoom = async (roomName) => {
    const res = await fetch('/api/rooms/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ room_name: roomName })
    });
    const data = await res.json();
    if (data.status) {
      showToast(data.message);
      await fetchRooms();
      if (data.data.room_id) {
        setActiveRoomId(data.data.room_id);
      }
    }
    return data;
  };

  const handleJoinRoom = async (roomCode) => {
    const res = await fetch('/api/rooms/join', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ room_code: roomCode })
    });
    const data = await res.json();
    if (data.status) {
      showToast(data.message);
      await fetchRooms();
      if (data.data.room_id) {
        setActiveRoomId(data.data.room_id);
      }
    }
    return data;
  };

  const handleRenameRoom = async (roomId, newName) => {
    const res = await fetch(`/api/rooms/${roomId}/rename`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ room_name: newName })
    });
    const data = await res.json();
    if (data.status) {
      showToast(data.message);
      setCurrentRoom(prev => prev ? { ...prev, room_name: newName } : null);
      fetchRooms();
    } else {
      showToast(data.message, 'error');
    }
  };

  const handlePromoteMember = async (roomId, username) => {
    const res = await fetch(`/api/rooms/${roomId}/promote/${username}`, { method: 'POST' });
    const data = await res.json();
    if (data.status) {
      showToast(data.message);
      setCurrentRoom(prev => prev ? { ...prev, admins: [...(prev.admins || []), username] } : null);
    } else {
      showToast(data.message, 'error');
    }
  };

  const handleKickMember = async (roomId, username) => {
    const res = await fetch(`/api/rooms/${roomId}/kick/${username}`, { method: 'POST' });
    const data = await res.json();
    if (data.status) {
      showToast(data.message);
      setMembers(prev => prev.filter(m => m.username !== username));
    } else {
      showToast(data.message, 'error');
    }
  };

  const handleLeaveRoom = async (roomId) => {
    const res = await fetch(`/api/rooms/${roomId}/leave`, { method: 'POST' });
    const data = await res.json();
    if (data.status) {
      showToast(data.message);
      fetchRooms();
      setCurrentRoom(null);
      setActiveRoomId(null);
    }
  };

  const handleDeleteRoom = async (roomId) => {
    const res = await fetch(`/api/rooms/${roomId}`, { method: 'DELETE' });
    const data = await res.json();
    if (data.status) {
      showToast(data.message);
      fetchRooms();
      setCurrentRoom(null);
      setActiveRoomId(null);
    }
  };

  const handleUpdateProfile = async (formData) => {
    const res = await fetch('/api/profile', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formData)
    });
    const data = await res.json();
    if (data.status) {
      setUser(data.data.user);
    }
    return data;
  };

  const handleUploadDp = async (formData) => {
    const res = await fetch('/api/upload_dp', {
      method: 'POST',
      body: formData
    });
    const data = await res.json();
    if (data.status) {
      setUser(prev => prev ? { ...prev, dp: data.data.dp } : null);
    }
    return data;
  };

  const handleUploadChatFile = async (file) => {
    const formData = new FormData();
    formData.append('file', file);
    const res = await fetch('/api/upload_chat_file', {
      method: 'POST',
      body: formData
    });
    return await res.json();
  };

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    setUser(null);
    setCurrentRoom(null);
    setRooms([]);
  };

  // WebRTC Calling
  const handleStartCall = async (type) => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: type === 'video',
        audio: true
      });
      setLocalStream(stream);

      if (!peerRef.current) {
        peerRef.current = new Peer();
      }

      peerRef.current.on('open', (id) => {
        if (socketRef.current) {
          socketRef.current.emit('start-call', {
            callType: type,
            peerId: id
          });
        }
        setActiveCall({ type, peerId: id });
      });
    } catch (err) {
      showToast('Could not access camera/microphone', 'error');
    }
  };

  const handleAcceptCall = async () => {
    if (!incomingCall) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: incomingCall.callType === 'video',
        audio: true
      });
      setLocalStream(stream);

      if (!peerRef.current) {
        peerRef.current = new Peer();
      }

      peerRef.current.on('open', (id) => {
        if (socketRef.current) {
          socketRef.current.emit('accept-call', {
            to: incomingCall.caller,
            peerId: id
          });
        }
        setActiveCall({ type: incomingCall.callType, peerId: id });
        setIncomingCall(null);
      });
    } catch (err) {
      showToast('Could not access media devices', 'error');
    }
  };

  const handleRejectCall = () => {
    if (socketRef.current && incomingCall) {
      socketRef.current.emit('reject-call', { to: incomingCall.caller });
    }
    setIncomingCall(null);
  };

  const handleEndCall = () => {
    if (socketRef.current) {
      socketRef.current.emit('end-call', {});
    }
    if (localStream) {
      localStream.getTracks().forEach(track => track.stop());
      setLocalStream(null);
    }
    setRemoteStream(null);
    setActiveCall(null);
  };

  if (loadingAuth) {
    return (
      <div style={{ display: 'flex', height: '100vh', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-primary)' }}>
        <div style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>Loading chat application...</div>
      </div>
    );
  }

  if (!user) {
    if (authView === 'register') {
      return <Register onRegisterSuccess={(usr) => setUser(usr)} onNavigateLogin={() => setAuthView('login')} />;
    }
    if (authView === 'forgot') {
      return <ForgotPassword onNavigateLogin={() => setAuthView('login')} />;
    }
    return (
      <Login
        onLoginSuccess={(usr) => setUser(usr)}
        onNavigateRegister={() => setAuthView('register')}
        onNavigateForgot={() => setAuthView('forgot')}
      />
    );
  }

  return (
    <div className="app-container">
      {toast && (
        <div style={{
          position: 'fixed',
          top: '20px',
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 999,
          background: toast.type === 'error' ? 'var(--danger)' : 'var(--accent-primary)',
          color: '#fff',
          padding: '10px 20px',
          borderRadius: '30px',
          fontSize: '14px',
          fontWeight: '500',
          boxShadow: 'var(--shadow-md)'
        }}>
          {toast.message}
        </div>
      )}

      <Sidebar
        user={user}
        rooms={rooms}
        activeRoomId={activeRoomId}
        onSelectRoom={handleSelectRoom}
        onOpenCreateModal={() => setIsCreateModalOpen(true)}
        onOpenJoinModal={() => setIsJoinModalOpen(true)}
        onOpenProfileModal={() => setIsProfileModalOpen(true)}
        onLogout={handleLogout}
        theme={theme}
        onToggleTheme={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
        isOpen={isMobileSidebarOpen}
        onCloseMobileSidebar={() => setIsMobileSidebarOpen(false)}
      />

      <ChatArea
        currentRoom={currentRoom}
        messages={messages}
        members={members}
        user={user}
        onSendMessage={handleSendMessage}
        onUploadFile={handleUploadChatFile}
        onStartCall={handleStartCall}
        onToggleMembersDrawer={() => setIsMembersDrawerOpen(!isMembersDrawerOpen)}
        onToggleMobileSidebar={() => setIsMobileSidebarOpen(!isMobileSidebarOpen)}
        onRenameRoom={handleRenameRoom}
        onDeleteRoom={handleDeleteRoom}
        onLeaveRoom={handleLeaveRoom}
        showToast={showToast}
      />

      <MemberListDrawer
        currentRoom={currentRoom}
        members={members}
        user={user}
        isOpen={isMembersDrawerOpen}
        onClose={() => setIsMembersDrawerOpen(false)}
        onPromoteMember={handlePromoteMember}
        onKickMember={handleKickMember}
      />

      <CreateRoomModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onCreateRoom={handleCreateRoom}
      />

      <JoinRoomModal
        isOpen={isJoinModalOpen}
        onClose={() => setIsJoinModalOpen(false)}
        onJoinRoom={handleJoinRoom}
      />

      <ProfileModal
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
        user={user}
        onUpdateProfile={handleUpdateProfile}
        onUploadDp={handleUploadDp}
        showToast={showToast}
      />

      <CallModal
        incomingCall={incomingCall}
        activeCall={activeCall}
        localStream={localStream}
        remoteStream={remoteStream}
        onAcceptCall={handleAcceptCall}
        onRejectCall={handleRejectCall}
        onEndCall={handleEndCall}
      />
    </div>
  );
}
