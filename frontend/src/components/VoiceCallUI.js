import { useVoiceCall } from '@/context/VoiceCallContext';
import { Phone, PhoneOff, PhoneIncoming, Mic, MicOff } from 'lucide-react';
import { Button } from '@/components/ui/button';

const ROLE_LABELS = {
  admin: 'Admin',
  kitchen: 'Mətbəx',
  waiter: 'Ofisiant',
  owner: 'Sahib'
};

export function VoiceCallButton({ targetRole }) {
  const { callState, onlinePeers, startCall } = useVoiceCall();
  const isOnline = onlinePeers.includes(targetRole);
  const isBusy = callState !== 'idle';

  return (
    <Button
      variant="outline"
      size="sm"
      disabled={!isOnline || isBusy}
      onClick={() => startCall(targetRole)}
      className={`h-8 text-xs rounded-xl gap-1.5 ${
        isOnline
          ? 'border-[#4F9D69] text-[#4F9D69] hover:bg-[#4F9D69]/10'
          : 'border-[#E6E5DF] text-[#8A948D] cursor-not-allowed'
      }`}
      data-testid={`call-${targetRole}-btn`}
    >
      <Phone className="w-3.5 h-3.5" />
      {ROLE_LABELS[targetRole] || targetRole}
      <span className={`w-1.5 h-1.5 rounded-full ${isOnline ? 'bg-green-500' : 'bg-gray-300'}`} />
    </Button>
  );
}

export function VoiceCallOverlay() {
  const { callState, peerRole, isMuted, callDuration, acceptCall, rejectCall, endCall, toggleMute, formatDuration } = useVoiceCall();

  if (callState === 'idle') return null;

  const peerLabel = ROLE_LABELS[peerRole] || peerRole;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm" data-testid="voice-call-overlay">
      <div className="bg-[#1A251E] rounded-3xl p-8 w-80 text-center shadow-2xl animate-in fade-in zoom-in-95 duration-300">
        {/* Caller Avatar */}
        <div className={`w-20 h-20 mx-auto rounded-full flex items-center justify-center text-2xl font-bold text-white mb-4 ${
          callState === 'ringing' ? 'bg-[#D48B30] animate-pulse' : callState === 'connected' ? 'bg-[#4F9D69]' : 'bg-[#C05C3D]'
        }`}>
          {peerLabel?.charAt(0)?.toUpperCase()}
        </div>

        {/* Status */}
        <h2 className="text-white text-lg font-medium mb-1">{peerLabel}</h2>
        <p className="text-white/60 text-sm mb-6">
          {callState === 'calling' && 'Zəng edilir...'}
          {callState === 'ringing' && 'Gələn zəng...'}
          {callState === 'connected' && formatDuration(callDuration)}
        </p>

        {/* Controls */}
        <div className="flex items-center justify-center gap-4">
          {callState === 'ringing' ? (
            <>
              <Button
                onClick={rejectCall}
                className="w-14 h-14 rounded-full bg-red-600 hover:bg-red-700 p-0"
                data-testid="reject-call-btn"
              >
                <PhoneOff className="w-6 h-6 text-white" />
              </Button>
              <Button
                onClick={acceptCall}
                className="w-14 h-14 rounded-full bg-green-600 hover:bg-green-700 p-0 animate-pulse"
                data-testid="accept-call-btn"
              >
                <PhoneIncoming className="w-6 h-6 text-white" />
              </Button>
            </>
          ) : (
            <>
              <Button
                onClick={toggleMute}
                className={`w-12 h-12 rounded-full p-0 ${isMuted ? 'bg-red-500/20 text-red-400' : 'bg-white/10 text-white'}`}
                variant="ghost"
                data-testid="mute-toggle-btn"
              >
                {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
              </Button>
              <Button
                onClick={endCall}
                className="w-14 h-14 rounded-full bg-red-600 hover:bg-red-700 p-0"
                data-testid="end-call-btn"
              >
                <PhoneOff className="w-6 h-6 text-white" />
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
