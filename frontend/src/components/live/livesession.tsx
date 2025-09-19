import { useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';

interface LiveSessionProps {
  sessionId: string;
  userId: string;
  isHost: boolean;
}

export default function LiveSession({ sessionId, userId, isHost }: LiveSessionProps) {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const initWebRTC = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true,
        });
        setLocalStream(stream);
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      } catch (error) {
        console.error('Error accessing media devices:', error);
      }
    };

    initWebRTC();
  }, []);

  return (
    <div className="live-session-container">
      <video ref={videoRef} autoPlay muted className="local-video" />
      {/* Live session UI implementation */}
    </div>
  );
}