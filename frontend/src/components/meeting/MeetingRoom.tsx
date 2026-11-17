import { useEffect, useRef, useState } from 'react';
import {
  Mic,
  MicOff,
  Video as VideoIcon,
  VideoOff,
  PhoneOff,
  Copy,
  Check,
  UserCircle2,
  Lock,
  Loader2,
  Wifi,
  Volume2,
  AlertTriangle,
} from 'lucide-react';
import { Button } from '../ui/Button';
import { useMeetingCall, type CallStatus } from '../../lib/useMeetingCall';
import type { Meeting } from '../../mocks/types';

function formatElapsed(seconds: number): string {
  const m = Math.floor(seconds / 60).toString().padStart(2, '0');
  const s = Math.floor(seconds % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

function CopyField({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="space-y-1 min-w-0">
      <span className="font-mono text-[10px] text-granite uppercase block">{label}</span>
      <div className="flex items-center gap-1.5">
        <code className="flex-1 truncate rounded bg-bone px-2 py-1.5 text-xs text-ink border border-granite-soft font-mono">
          {value}
        </code>
        <button
          type="button"
          onClick={() => {
            navigator.clipboard?.writeText(value).catch(() => {});
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
          }}
          title="Copy"
          className="p-1.5 rounded border border-granite-soft text-granite hover:text-clay-deep hover:border-clay transition shrink-0"
        >
          {copied ? <Check className="h-3.5 w-3.5 text-green-600" /> : <Copy className="h-3.5 w-3.5" />}
        </button>
      </div>
    </div>
  );
}

/** A <video> bound to a MediaStream. Remote video plays with sound; reports if the browser blocked autoplay. */
function StreamVideo({
  stream,
  muted,
  mirror,
  className = '',
  onAutoplayBlocked,
}: {
  stream: MediaStream | null;
  muted?: boolean;
  mirror?: boolean;
  className?: string;
  onAutoplayBlocked?: (blocked: boolean) => void;
}) {
  const ref = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.srcObject = stream;
    if (stream) {
      el.play().then(
        () => onAutoplayBlocked?.(false),
        () => onAutoplayBlocked?.(true),
      );
    }
  }, [stream, onAutoplayBlocked]);
  return (
    <video
      ref={ref}
      autoPlay
      playsInline
      muted={muted}
      className={`h-full w-full object-cover ${mirror ? '-scale-x-100' : ''} ${className}`}
    />
  );
}

const STATUS_TEXT: Record<CallStatus, (other: string) => string> = {
  connecting: () => 'Connecting to the meeting…',
  waiting: (o) => `Waiting for ${o} to join…`,
  negotiating: (o) => `Connecting to ${o}…`,
  connected: () => '',
  reconnecting: () => 'Connection lost — reconnecting…',
  ended: () => 'This meeting has ended.',
  error: () => 'Could not join the meeting.',
};

function RoundToggle({
  on,
  onClick,
  disabled,
  onIcon: OnIcon,
  offIcon: OffIcon,
  titleOn,
  titleOff,
}: {
  on: boolean;
  onClick: () => void;
  disabled?: boolean;
  onIcon: typeof Mic;
  offIcon: typeof Mic;
  titleOn: string;
  titleOff: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={disabled ? 'Not available on this device' : on ? titleOn : titleOff}
      className={`p-3 rounded-full border transition disabled:opacity-40 disabled:cursor-not-allowed ${
        on ? 'border-granite bg-white text-ink hover:border-clay' : 'bg-brick text-white border-brick'
      }`}
    >
      {on ? <OnIcon className="h-4 w-4" /> : <OffIcon className="h-4 w-4" />}
    </button>
  );
}

interface MeetingRoomProps {
  meeting: Meeting;
  role: 'host' | 'participant';
  selfName: string;
  otherName: string;
  onLeave: () => void;
  onEndForEveryone?: () => void;
  ending?: boolean;
}

export function MeetingRoom({ meeting, role, selfName, otherName, onLeave, onEndForEveryone, ending }: MeetingRoomProps) {
  const [joined, setJoined] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [mediaReady, setMediaReady] = useState(false);
  const [micOn, setMicOn] = useState(true);
  const [camOn, setCamOn] = useState(true);
  const [mediaError, setMediaError] = useState<string | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [showInfo, setShowInfo] = useState(role === 'host');
  const [audioBlocked, setAudioBlocked] = useState(false);

  const call = useMeetingCall({ code: meeting.code, enabled: joined, localStream: stream, micOn, camOn });
  const peerName = call.peer?.name || otherName;

  // Camera + mic. If the camera is missing or refused, fall back to audio only, then to receive-only.
  useEffect(() => {
    let active = true;
    let local: MediaStream | null = null;
    const take = (s: MediaStream) => {
      if (!active) return s.getTracks().forEach((t) => t.stop());
      local = s;
      setStream(s);
      setMediaReady(true);
    };
    const media = navigator.mediaDevices;
    if (!media?.getUserMedia) {
      setMediaError(
        window.isSecureContext
          ? 'This browser does not support camera access.'
          : 'Camera and microphone need a secure (https) connection.',
      );
      setMediaReady(true);
      return;
    }
    media
      .getUserMedia({ video: { width: { ideal: 1280 }, height: { ideal: 720 } }, audio: { echoCancellation: true, noiseSuppression: true } })
      .then(take)
      .catch(() =>
        media
          .getUserMedia({ audio: true })
          .then((s) => {
            setCamOn(false);
            setMediaError('No camera available — you will join with audio only.');
            take(s);
          })
          .catch((err) => {
            if (!active) return;
            setMicOn(false);
            setCamOn(false);
            setMediaError(
              (err?.name === 'NotAllowedError'
                ? 'Camera and microphone permission was denied.'
                : 'No camera or microphone was found.') + ' You can still join to see and hear the other side.',
            );
            setMediaReady(true);
          }),
      );
    return () => {
      active = false;
      local?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  const hasAudio = !!stream?.getAudioTracks().length;
  const hasVideo = !!stream?.getVideoTracks().length;

  useEffect(() => {
    stream?.getAudioTracks().forEach((t) => (t.enabled = micOn));
  }, [micOn, stream]);
  useEffect(() => {
    stream?.getVideoTracks().forEach((t) => (t.enabled = camOn));
  }, [camOn, stream]);

  useEffect(() => {
    if (call.status !== 'connected') return;
    const id = setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => clearInterval(id);
  }, [call.status]);

  const leave = () => {
    stream?.getTracks().forEach((t) => t.stop());
    onLeave();
  };

  const controls = (
    <>
      <RoundToggle on={micOn} onClick={() => setMicOn((v) => !v)} disabled={!hasAudio} onIcon={Mic} offIcon={MicOff} titleOn="Mute mic" titleOff="Unmute mic" />
      <RoundToggle on={camOn} onClick={() => setCamOn((v) => !v)} disabled={!hasVideo} onIcon={VideoIcon} offIcon={VideoOff} titleOn="Turn off camera" titleOff="Turn on camera" />
    </>
  );

  // ——— Pre-join lobby ———
  if (!joined) {
    return (
      <div className="max-w-3xl mx-auto space-y-6 py-6">
        <div className="text-center space-y-1">
          <h1 className="font-display text-2xl font-bold text-ink">{meeting.title}</h1>
          <p className="text-xs font-mono text-granite">
            {role === 'host' ? 'You are hosting this meeting' : `Joining ${meeting.hostLawyerName}'s meeting`}
          </p>
        </div>

        <div className="rounded-lg bg-ink aspect-video max-w-lg mx-auto overflow-hidden border border-granite-soft flex items-center justify-center relative">
          {camOn && hasVideo ? (
            <StreamVideo stream={stream} muted mirror />
          ) : (
            <div className="flex flex-col items-center gap-2 text-bone/70">
              {mediaReady ? <UserCircle2 className="h-16 w-16" /> : <Loader2 className="h-10 w-10 animate-spin" />}
              <span className="text-xs">{!mediaReady ? 'Starting camera…' : 'Camera off'}</span>
            </div>
          )}
        </div>

        {mediaError && (
          <p className="flex items-start justify-center gap-1.5 text-xs text-brick text-center max-w-md mx-auto">
            <AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
            <span>{mediaError}</span>
          </p>
        )}

        <div className="flex items-center justify-center gap-3">{controls}</div>

        <div className="flex items-center justify-center gap-3 pt-2">
          <Button variant="ghost" onClick={leave}>
            Cancel
          </Button>
          <Button variant="primary" onClick={() => setJoined(true)} disabled={!mediaReady}>
            {role === 'host' ? 'Start Meeting' : 'Join Now'}
          </Button>
        </div>
      </div>
    );
  }

  // ——— Ended / can't join ———
  if (call.status === 'ended' || call.status === 'error') {
    return (
      <div className="max-w-md mx-auto py-16 text-center space-y-4">
        <div className="mx-auto h-14 w-14 rounded-full bg-clay-tint border border-clay flex items-center justify-center">
          {call.status === 'ended' ? <PhoneOff className="h-6 w-6 text-clay-deep" /> : <AlertTriangle className="h-6 w-6 text-brick" />}
        </div>
        <h1 className="font-display text-xl font-bold text-ink">
          {call.status === 'ended' ? 'Meeting ended' : 'Could not join'}
        </h1>
        <p className="text-xs text-granite">
          {call.status === 'ended' ? `${meeting.hostLawyerName} has ended this meeting.` : call.error}
        </p>
        <Button variant="primary" onClick={leave}>
          Back
        </Button>
      </div>
    );
  }

  const live = call.status === 'connected';
  const showRemoteVideo = live && call.remoteCam && !!call.remoteStream?.getVideoTracks().length;
  const statusText = STATUS_TEXT[call.status](peerName);

  // ——— In call ———
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="font-display text-lg font-bold text-ink">{meeting.title}</h1>
          <p className="flex items-center gap-1.5 text-[11px] font-mono text-granite">
            <span className={`inline-block h-2 w-2 rounded-full ${live ? 'bg-green-600' : 'bg-granite animate-pulse'}`} />
            {live ? `Live · ${formatElapsed(elapsed)}` : statusText} · {role === 'host' ? 'Hosting' : 'Participant'}
          </p>
        </div>
        {role === 'host' && (
          <button
            type="button"
            onClick={() => setShowInfo((v) => !v)}
            className="inline-flex items-center gap-1.5 text-[11px] font-mono uppercase text-clay-deep hover:text-ink transition border border-granite-soft rounded px-2.5 py-1.5"
          >
            <Lock className="h-3 w-3" />
            Meeting Info
          </button>
        )}
      </div>

      {role === 'host' && showInfo && (
        <div className="rounded border border-granite bg-white p-4 grid grid-cols-1 sm:grid-cols-3 gap-4">
          <CopyField label="Meeting Code" value={meeting.code} />
          <CopyField label="Password" value={meeting.password} />
          <CopyField label="Shareable Link" value={meeting.link} />
        </div>
      )}

      {/* Remote (large) with self view picture-in-picture */}
      <div className="relative aspect-video max-h-[70vh] w-full rounded-lg bg-ink overflow-hidden border border-granite-soft">
        {/* Keep the remote <video> mounted while connected so audio plays even with their camera off. */}
        {call.remoteStream && (
          <div className={showRemoteVideo ? 'absolute inset-0' : 'absolute h-px w-px opacity-0'}>
            <StreamVideo stream={call.remoteStream} onAutoplayBlocked={setAudioBlocked} className="object-contain" />
          </div>
        )}
        {!showRemoteVideo && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-bone/80 px-4 text-center">
            {live ? <UserCircle2 className="h-20 w-20" /> : <Loader2 className="h-10 w-10 animate-spin" />}
            <span className="text-sm font-medium">{live ? `${peerName} turned off their camera` : statusText}</span>
            {call.status === 'waiting' && role === 'host' && (
              <span className="text-[11px] text-bone/50 max-w-xs">Share the link, or the meeting code and password, with your client.</span>
            )}
          </div>
        )}

        {live && (
          <span className="absolute bottom-3 left-3 flex items-center gap-1.5 text-[11px] font-mono text-bone bg-black/55 px-2 py-0.5 rounded">
            {!call.remoteMic && <MicOff className="h-3 w-3 text-red-300" />}
            {peerName}
          </span>
        )}

        {audioBlocked && live && (
          <button
            type="button"
            onClick={() => {
              document.querySelectorAll('video').forEach((v) => {
                if (!v.muted) v.play().then(() => setAudioBlocked(false)).catch(() => {});
              });
            }}
            className="absolute top-3 left-1/2 -translate-x-1/2 flex items-center gap-1.5 rounded bg-white px-3 py-1.5 text-xs font-semibold text-ink shadow"
          >
            <Volume2 className="h-3.5 w-3.5" /> Tap to turn on sound
          </button>
        )}

        <div className="absolute bottom-3 right-3 w-28 sm:w-44 aspect-video rounded-md overflow-hidden border border-white/30 bg-black shadow-lg">
          {camOn && hasVideo ? (
            <StreamVideo stream={stream} muted mirror />
          ) : (
            <div className="h-full w-full flex items-center justify-center text-bone/70">
              <UserCircle2 className="h-8 w-8" />
            </div>
          )}
          <span className="absolute bottom-1 left-1 flex items-center gap-1 text-[10px] font-mono text-bone bg-black/55 px-1.5 rounded">
            {!micOn && <MicOff className="h-2.5 w-2.5 text-red-300" />}
            {selfName} (you)
          </span>
        </div>
      </div>

      <div className="flex items-center justify-center gap-3 border-t border-granite-soft pt-4 flex-wrap">
        {controls}
        <button
          type="button"
          onClick={leave}
          className="p-3 rounded-full bg-brick text-white hover:bg-brick/90 transition"
          title="Leave meeting"
        >
          <PhoneOff className="h-4 w-4" />
        </button>
        {role === 'host' && onEndForEveryone && (
          <Button variant="danger" size="sm" onClick={onEndForEveryone} loading={ending}>
            End for Everyone
          </Button>
        )}
      </div>

      <p className="flex items-center justify-center gap-1.5 text-[10px] text-granite">
        <Wifi className="h-3 w-3" />
        Video and audio go directly between your devices and are encrypted end to end (WebRTC).
      </p>
    </div>
  );
}
