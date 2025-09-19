import React, { useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from '../contexts/AuthContext';

interface LiveSessionProps {
  sessionId: string;
  onExit: () => void;
}

const LiveSession: React.FC<LiveSessionProps> = ({ sessionId, onExit }) => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStreams, setRemoteStreams] = useState<Map<string, MediaStream>>(new Map());
  const [chatMessages, setChatMessages] = useState<any[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const { user } = useAuth();

  const peerConnections = useRef<Map<string, RTCPeerConnection>>(new Map());

  useEffect(() => {
    const newSocket = io(process.env.NEXT_PUBLIC_WS_URL, {
      auth: { token: localStorage.getItem('token') }
    });
    
    setSocket(newSocket);

    // Initialize media
    initializeMedia();

    // Socket event handlers
    newSocket.on('connect', () => setIsConnected(true));
    newSocket.on('disconnect', () => setIsConnected(false));
    newSocket.on('user-joined', handleUserJoined);
    newSocket.on('user-left', handleUserLeft);
    newSocket.on('webrtc-offer', handleOffer);
    newSocket.on('webrtc-answer', handleAnswer);
    newSocket.on('ice-candidate', handleICECandidate);
    newSocket.on('chat-message', handleChatMessage);
    newSocket.on('session-ended', handleSessionEnded);

    // Join session
    newSocket.emit('join-session', { sessionId });

    return () => {
      newSocket.disconnect();
      cleanupMedia();
    };
  }, [sessionId]);

  const initializeMedia = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true
      });
      
      setLocalStream(stream);
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }
    } catch (error) {
      console.error('Error accessing media devices:', error);
    }
  };

  const cleanupMedia = () => {
    if (localStream) {
      localStream.getTracks().forEach(track => track.stop());
    }
    peerConnections.current.forEach(pc => pc.close());
  };

  const createPeerConnection = (userId: string): RTCPeerConnection => {
    const configuration = {
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' }
      ]
    };

    const pc = new RTCPeerConnection(configuration);
    
    // Add local stream to connection
    if (localStream) {
      localStream.getTracks().forEach(track => {
        pc.addTrack(track, localStream);
      });
    }

    // Handle remote stream
    pc.ontrack = (event) => {
      const remoteStream = event.streams[0];
      setRemoteStreams(prev => new Map(prev.set(userId, remoteStream)));
    };

    // Handle ICE candidates
    pc.onicecandidate = (event) => {
      if (event.candidate && socket) {
        socket.emit('ice-candidate', {
          candidate: event.candidate,
          targetUserId: userId,
          sessionId
        });
      }
    };

    peerConnections.current.set(userId, pc);
    return pc;
  };

  const handleUserJoined = async ({ userId }: { userId: string }) => {
    if (userId === user?.id) return;

    const pc = createPeerConnection(userId);
    
    // Create offer if we're the host
    if (user?.role === 'writer') {
      try {
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        
        socket?.emit('webrtc-offer', {
          offer,
          targetUserId: userId,
          sessionId
        });
      } catch (error) {
        console.error('Error creating offer:', error);
      }
    }
  };

  const handleOffer = async ({ offer, fromUserId }: { offer: any; fromUserId: string }) => {
    const pc = createPeerConnection(fromUserId);
    
    try {
      await pc.setRemoteDescription(offer);
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      
      socket?.emit('webrtc-answer', {
        answer,
        targetUserId: fromUserId,
        sessionId
      });
    } catch (error) {
      console.error('Error handling offer:', error);
    }
  };

  const handleAnswer = async ({ answer, fromUserId }: { answer: any; fromUserId: string }) => {
    const pc = peerConnections.current.get(fromUserId);
    if (pc) {
      await pc.setRemoteDescription(answer);
    }
  };

  const handleICECandidate = async ({ candidate, fromUserId }: { candidate: any; fromUserId: string }) => {
    const pc = peerConnections.current.get(fromUserId);
    if (pc) {
      await pc.addIceCandidate(candidate);
    }
  };

  const handleChatMessage = (message: any) => {
    setChatMessages(prev => [...prev, message]);
  };

  const sendChatMessage = (message: string) => {
    socket?.emit('chat-message', { message, sessionId });
  };

  const handleSessionEnded = () => {
    alert('The host has ended the session');
    onExit();
  };

  const handleUserLeft = ({ userId }: { userId: string }) => {
    peerConnections.current.get(userId)?.close();
    peerConnections.current.delete(userId);
    setRemoteStreams(prev => {
      const newMap = new Map(prev);
      newMap.delete(userId);
      return newMap;
    });
  };

  return (
    <div className="live-session-container">
      <div className="video-container">
        <div className="local-video">
          <video ref={localVideoRef} autoPlay muted playsInline />
        </div>
        <div className="remote-videos">
          {Array.from(remoteStreams.entries()).map(([userId, stream]) => (
            <div key={userId} className="remote-video">
              <video
                ref={video => {
                  if (video) video.srcObject = stream;
                }}
                autoPlay
                playsInline
              />
            </div>
          ))}
        </div>
      </div>
      
      <div className="chat-container">
        <div className="chat-messages">
          {chatMessages.map(msg => (
            <div key={msg.id} className="chat-message">
              <span className="username">{msg.userId}</span>
              <span className="message">{msg.message}</span>
            </div>
          ))}
        </div>
        <div className="chat-input">
          <input
            type="text"
            placeholder="Type a message..."
            onKeyPress={(e) => {
              if (e.key === 'Enter') {
                sendChatMessage(e.currentTarget.value);
                e.currentTarget.value = '';
              }
            }}
          />
        </div>
      </div>

      <div className="session-controls">
        <button onClick={onExit}>Leave Session</button>
        {user?.role === 'writer' && (
          <button onClick={() => socket?.emit('end-session', { sessionId })}>
            End Session
          </button>
        )}
      </div>
    </div>
  );
};

export default LiveSession;