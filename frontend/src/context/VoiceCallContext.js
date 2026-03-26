import { createContext, useContext, useEffect, useState, useRef, useCallback } from 'react';

const VoiceCallContext = createContext(null);

export function useVoiceCall() {
  return useContext(VoiceCallContext);
}

const ICE_SERVERS = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' }
];

export function VoiceCallProvider({ children, myRole }) {
  const [callState, setCallState] = useState('idle'); // idle, calling, ringing, connected
  const [peerRole, setPeerRole] = useState(null);
  const [onlinePeers, setOnlinePeers] = useState([]);
  const [isMuted, setIsMuted] = useState(false);
  const [callDuration, setCallDuration] = useState(0);

  const ws = useRef(null);
  const pc = useRef(null);
  const localStream = useRef(null);
  const remoteAudio = useRef(null);
  const reconnectTimer = useRef(null);
  const durationTimer = useRef(null);
  const pingTimer = useRef(null);

  const connectWs = useCallback(() => {
    if (ws.current?.readyState === WebSocket.OPEN) return;
    const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const backendUrl = process.env.REACT_APP_BACKEND_URL?.replace(/^https?:/, '') || '';
    const wsUrl = `${wsProtocol}${backendUrl}/api/ws/voice/${myRole}`;

    try {
      ws.current = new WebSocket(wsUrl);

      ws.current.onopen = () => {
        pingTimer.current = setInterval(() => {
          if (ws.current?.readyState === WebSocket.OPEN) ws.current.send('ping');
        }, 25000);
      };

      ws.current.onmessage = async (event) => {
        if (event.data === 'pong') return;
        const msg = JSON.parse(event.data);

        switch (msg.type) {
          case 'online_peers':
            setOnlinePeers(msg.peers || []);
            break;
          case 'peer_online':
            setOnlinePeers(prev => [...new Set([...prev, msg.role])]);
            break;
          case 'peer_offline':
            setOnlinePeers(prev => prev.filter(r => r !== msg.role));
            if (msg.role === peerRole && callState !== 'idle') {
              endCall();
            }
            break;
          case 'offer':
            setPeerRole(msg.from);
            setCallState('ringing');
            break;
          case 'answer':
            if (pc.current) {
              await pc.current.setRemoteDescription(new RTCSessionDescription(msg.sdp));
            }
            break;
          case 'ice-candidate':
            if (pc.current && msg.candidate) {
              try {
                await pc.current.addIceCandidate(new RTCIceCandidate(msg.candidate));
              } catch {}
            }
            break;
          case 'call-rejected':
            endCall();
            break;
          case 'call-ended':
            endCall();
            break;
          default:
            break;
        }
      };

      ws.current.onclose = () => {
        if (pingTimer.current) clearInterval(pingTimer.current);
        reconnectTimer.current = setTimeout(connectWs, 3000);
      };
    } catch {}
  }, [myRole, peerRole, callState]);

  useEffect(() => {
    if (myRole) connectWs();
    return () => {
      if (reconnectTimer.current) clearTimeout(reconnectTimer.current);
      if (pingTimer.current) clearInterval(pingTimer.current);
      if (ws.current) ws.current.close();
      endCall();
    };
  }, [myRole]);

  // Update the message handler when peerRole/callState changes
  useEffect(() => {
    if (!ws.current) return;
    const handler = async (event) => {
      if (event.data === 'pong') return;
      const msg = JSON.parse(event.data);
      switch (msg.type) {
        case 'online_peers':
          setOnlinePeers(msg.peers || []);
          break;
        case 'peer_online':
          setOnlinePeers(prev => [...new Set([...prev, msg.role])]);
          break;
        case 'peer_offline':
          setOnlinePeers(prev => prev.filter(r => r !== msg.role));
          break;
        case 'offer':
          setPeerRole(msg.from);
          setCallState('ringing');
          // Store the offer for when user accepts
          ws.current._pendingOffer = msg.sdp;
          break;
        case 'answer':
          if (pc.current) {
            await pc.current.setRemoteDescription(new RTCSessionDescription(msg.sdp));
            setCallState('connected');
            startDurationTimer();
          }
          break;
        case 'ice-candidate':
          if (pc.current && msg.candidate) {
            try { await pc.current.addIceCandidate(new RTCIceCandidate(msg.candidate)); } catch {}
          }
          break;
        case 'call-rejected':
        case 'call-ended':
          endCall();
          break;
        default: break;
      }
    };
    ws.current.onmessage = handler;
  }, [peerRole, callState]);

  const startDurationTimer = () => {
    setCallDuration(0);
    durationTimer.current = setInterval(() => {
      setCallDuration(prev => prev + 1);
    }, 1000);
  };

  const sendSignal = (msg) => {
    if (ws.current?.readyState === WebSocket.OPEN) {
      ws.current.send(JSON.stringify(msg));
    }
  };

  const createPeerConnection = async (targetRole) => {
    pc.current = new RTCPeerConnection({ iceServers: ICE_SERVERS });

    pc.current.onicecandidate = (event) => {
      if (event.candidate) {
        sendSignal({ type: 'ice-candidate', target: targetRole, candidate: event.candidate });
      }
    };

    pc.current.ontrack = (event) => {
      if (!remoteAudio.current) {
        remoteAudio.current = new Audio();
        remoteAudio.current.autoplay = true;
      }
      remoteAudio.current.srcObject = event.streams[0];
    };

    pc.current.onconnectionstatechange = () => {
      if (pc.current?.connectionState === 'disconnected' || pc.current?.connectionState === 'failed') {
        endCall();
      }
    };

    // Get microphone
    localStream.current = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
    localStream.current.getTracks().forEach(track => {
      pc.current.addTrack(track, localStream.current);
    });

    return pc.current;
  };

  const startCall = async (targetRole) => {
    if (callState !== 'idle') return;
    setPeerRole(targetRole);
    setCallState('calling');

    try {
      const peerConn = await createPeerConnection(targetRole);
      const offer = await peerConn.createOffer();
      await peerConn.setLocalDescription(offer);

      sendSignal({ type: 'offer', target: targetRole, sdp: offer });
    } catch (err) {
      console.error('Call failed:', err);
      endCall();
    }
  };

  const acceptCall = async () => {
    if (callState !== 'ringing' || !peerRole) return;
    setCallState('connected');

    try {
      const peerConn = await createPeerConnection(peerRole);
      const pendingOffer = ws.current?._pendingOffer;
      if (pendingOffer) {
        await peerConn.setRemoteDescription(new RTCSessionDescription(pendingOffer));
      }

      const answer = await peerConn.createAnswer();
      await peerConn.setLocalDescription(answer);

      sendSignal({ type: 'answer', target: peerRole, sdp: answer });
      startDurationTimer();
    } catch (err) {
      console.error('Accept call failed:', err);
      endCall();
    }
  };

  const rejectCall = () => {
    sendSignal({ type: 'call-rejected', target: peerRole });
    endCall();
  };

  const endCall = () => {
    if (peerRole && ws.current?.readyState === WebSocket.OPEN) {
      sendSignal({ type: 'call-ended', target: peerRole });
    }
    if (pc.current) { pc.current.close(); pc.current = null; }
    if (localStream.current) {
      localStream.current.getTracks().forEach(t => t.stop());
      localStream.current = null;
    }
    if (remoteAudio.current) {
      remoteAudio.current.srcObject = null;
    }
    if (durationTimer.current) clearInterval(durationTimer.current);
    setCallState('idle');
    setPeerRole(null);
    setCallDuration(0);
    setIsMuted(false);
  };

  const toggleMute = () => {
    if (localStream.current) {
      const track = localStream.current.getAudioTracks()[0];
      if (track) {
        track.enabled = !track.enabled;
        setIsMuted(!track.enabled);
      }
    }
  };

  const formatDuration = (secs) => {
    const m = Math.floor(secs / 60).toString().padStart(2, '0');
    const s = (secs % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  return (
    <VoiceCallContext.Provider value={{
      callState, peerRole, onlinePeers, isMuted, callDuration,
      startCall, acceptCall, rejectCall, endCall, toggleMute, formatDuration
    }}>
      {children}
    </VoiceCallContext.Provider>
  );
}
