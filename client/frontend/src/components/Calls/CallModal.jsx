import React, { useEffect, useRef } from 'react';
import { Phone, Video, PhoneOff, Mic, MicOff, VideoOff, Check } from 'lucide-react';

export default function CallModal({
  incomingCall,
  activeCall,
  localStream,
  remoteStream,
  onAcceptCall,
  onRejectCall,
  onEndCall
}) {
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);

  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream]);

  useEffect(() => {
    if (remoteVideoRef.current && remoteStream) {
      remoteVideoRef.current.srcObject = remoteStream;
    }
  }, [remoteStream]);

  if (!incomingCall && !activeCall) return null;

  if (incomingCall && !activeCall) {
    return (
      <div className="glass-panel call-overlay" style={{ textAlign: 'center' }}>
        <div style={{
          width: '56px',
          height: '56px',
          borderRadius: '50%',
          background: 'var(--accent-gradient)',
          color: '#fff',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 12px'
        }}>
          {incomingCall.callType === 'video' ? <Video size={24} /> : <Phone size={24} />}
        </div>
        <h3 style={{ fontSize: '18px', fontWeight: '700' }}>{incomingCall.caller} is calling...</h3>
        <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
          Incoming {incomingCall.callType === 'video' ? 'Video' : 'Voice'} Call
        </p>

        <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', marginTop: '16px' }}>
          <button
            className="btn-primary"
            style={{ background: 'var(--success)', padding: '10px 20px', borderRadius: '30px' }}
            onClick={onAcceptCall}
          >
            <Check size={18} />
            <span>Accept</span>
          </button>
          <button
            className="btn-primary"
            style={{ background: 'var(--danger)', padding: '10px 20px', borderRadius: '30px' }}
            onClick={onRejectCall}
          >
            <PhoneOff size={18} />
            <span>Decline</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="glass-panel call-overlay" style={{ width: '400px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h4 style={{ fontSize: '15px', fontWeight: '700' }}>Active Call</h4>
          <span style={{ fontSize: '12px', color: 'var(--success)' }}>Connected</span>
        </div>
        <button
          className="btn-primary"
          style={{ background: 'var(--danger)', padding: '8px 14px', borderRadius: '20px', fontSize: '12px' }}
          onClick={onEndCall}
        >
          <PhoneOff size={14} />
          <span>End</span>
        </button>
      </div>

      <div className="video-grid">
        <video
          ref={localVideoRef}
          autoPlay
          muted
          playsInline
          className="video-box"
          style={{ border: '2px solid var(--accent-primary)' }}
        />
        <video
          ref={remoteVideoRef}
          autoPlay
          playsInline
          className="video-box"
          style={{ border: '2px solid var(--border-color)' }}
        />
      </div>
    </div>
  );
}
