import { useEffect, useRef, useState, type ReactNode } from 'react';
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
  Link2,
} from 'lucide-react';
import { Button } from '../ui/Button';
import type { Meeting } from '../../mocks/types';

function formatElapsed(seconds: number): string {
  const m = Math.floor(seconds / 60)
    .toString()
    .padStart(2, '0');
  const s = Math.floor(seconds % 60)
    .toString()
    .padStart(2, '0');
  return `${m}:${s}`;
}

function CopyField({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="space-y-1">
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

interface MeetingRoomProps {
  meeting: Meeting;
  role: 'host' | 'participant';
  selfName: string;
  otherName: string;
  onLeave: () => void;
  onEndForEveryone?: () => void;
  ending?: boolean;
  /** Extra host-only content under the meeting info (e.g. the invite panel). */
  hostPanel?: ReactNode;
}

export function MeetingRoom({ meeting, role, selfName, otherName, onLeave, onEndForEveryone, ending, hostPanel }: MeetingRoomProps) {
  const [joined, setJoined] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [micOn, setMicOn] = useState(true);
  const [camOn, setCamOn] = useState(true);
  const [mediaError, setMediaError] = useState<string | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [showInfo, setShowInfo] = useState(role === 'host');
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    let active = true;
    let localStream: MediaStream | null = null;
    navigator.mediaDevices
      ?.getUserMedia({ video: true, audio: true })
      .then((s) => {
        if (!active) {
          s.getTracks().forEach((t) => t.stop());
          return;
        }
        localStream = s;
        setStream(s);
      })
      .catch((err) => {
        if (active) setMediaError(err?.message || 'Camera/microphone permission was denied.');
      });
    return () => {
      active = false;
      localStream?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  useEffect(() => {
    if (videoRef.current) videoRef.current.srcObject = stream;
  }, [stream, joined, camOn]);

  useEffect(() => {
    stream?.getAudioTracks().forEach((t) => (t.enabled = micOn));
  }, [micOn, stream]);

  useEffect(() => {
    stream?.getVideoTracks().forEach((t) => (t.enabled = camOn));
  }, [camOn, stream]);

  useEffect(() => {
    if (!joined) return;
    const id = setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => clearInterval(id);
  }, [joined]);

  useEffect(() => {
    return () => {
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, [stream]);

  const renderVideoTile = (isSelf: boolean, name: string) => (
    <div className="relative aspect-video rounded-lg bg-ink overflow-hidden border border-granite-soft flex items-center justify-center">
      {isSelf && camOn && stream ? (
        <video ref={videoRef} autoPlay muted playsInline className="w-full h-full object-cover -scale-x-100" />
      ) : (
        <div className="flex flex-col items-center gap-2 text-bone/70">
          <UserCircle2 className="h-16 w-16" />
          <span className="text-xs font-medium">{name}</span>
          {!isSelf && (
            <span className="text-[10px] text-bone/50 max-w-[220px] text-center px-3">
              Live video needs {name}'s own device — this preview only streams your own camera.
            </span>
          )}
        </div>
      )}
      <span className="absolute bottom-2 left-2 text-[11px] font-mono text-bone bg-black/50 px-2 py-0.5 rounded">
        {name} {isSelf && '(you)'}
      </span>
      {isSelf && !micOn && (
        <span className="absolute top-2 right-2 p-1 rounded bg-brick/80">
          <MicOff className="h-3 w-3 text-white" />
        </span>
      )}
    </div>
  );

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
          {camOn && stream ? (
            <video ref={videoRef} autoPlay muted playsInline className="w-full h-full object-cover -scale-x-100" />
          ) : (
            <div className="flex flex-col items-center gap-2 text-bone/70">
              <UserCircle2 className="h-16 w-16" />
              <span className="text-xs">{camOn ? 'Starting camera…' : 'Camera off'}</span>
            </div>
          )}
        </div>

        {mediaError && (
          <p className="text-xs text-brick text-center max-w-md mx-auto">
            {mediaError} You can still join with camera/mic off.
          </p>
        )}

        <div className="flex items-center justify-center gap-3">
          <button
            type="button"
            onClick={() => setMicOn((v) => !v)}
            className={`p-3 rounded-full border transition ${micOn ? 'border-granite text-ink hover:border-clay' : 'bg-brick text-white border-brick'}`}
            title={micOn ? 'Mute mic' : 'Unmute mic'}
          >
            {micOn ? <Mic className="h-4 w-4" /> : <MicOff className="h-4 w-4" />}
          </button>
          <button
            type="button"
            onClick={() => setCamOn((v) => !v)}
            className={`p-3 rounded-full border transition ${camOn ? 'border-granite text-ink hover:border-clay' : 'bg-brick text-white border-brick'}`}
            title={camOn ? 'Turn off camera' : 'Turn on camera'}
          >
            {camOn ? <VideoIcon className="h-4 w-4" /> : <VideoOff className="h-4 w-4" />}
          </button>
        </div>

        <div className="flex items-center justify-center gap-3 pt-2">
          <Button variant="ghost" onClick={onLeave}>
            Cancel
          </Button>
          <Button variant="primary" onClick={() => setJoined(true)}>
            {role === 'host' ? 'Start Meeting' : 'Join Now'}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="font-display text-lg font-bold text-ink">{meeting.title}</h1>
          <p className="text-[11px] font-mono text-granite">
            {formatElapsed(elapsed)} · {role === 'host' ? 'Hosting' : 'Participant'}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowInfo((v) => !v)}
          className="inline-flex items-center gap-1.5 text-[11px] font-mono uppercase text-clay-deep hover:text-ink transition border border-granite-soft rounded px-2.5 py-1.5"
        >
          <Lock className="h-3 w-3" />
          Meeting Info
        </button>
      </div>

      {showInfo && role === 'host' && (
        <div className="space-y-3">
          <div className="rounded border border-granite bg-white p-4 grid grid-cols-1 sm:grid-cols-3 gap-4">
            <CopyField label="Meeting Code" value={meeting.code} />
            <CopyField label="Password" value={meeting.password} />
            <CopyField label="Invite Link (one-click join)" value={meeting.link} />
          </div>
          {hostPanel}
        </div>
      )}
      {showInfo && role !== 'host' && (
        <div className="rounded border border-granite bg-white p-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <CopyField label="Meeting Code" value={meeting.code} />
          <CopyField label="Meeting Link" value={meeting.link} />
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {renderVideoTile(true, selfName)}
        {renderVideoTile(false, otherName)}
      </div>

      <div className="flex items-center justify-center gap-3 pt-2 border-t border-granite-soft pt-4">
        <button
          type="button"
          onClick={() => setMicOn((v) => !v)}
          className={`p-3 rounded-full border transition ${micOn ? 'border-granite text-ink hover:border-clay' : 'bg-brick text-white border-brick'}`}
          title={micOn ? 'Mute mic' : 'Unmute mic'}
        >
          {micOn ? <Mic className="h-4 w-4" /> : <MicOff className="h-4 w-4" />}
        </button>
        <button
          type="button"
          onClick={() => setCamOn((v) => !v)}
          className={`p-3 rounded-full border transition ${camOn ? 'border-granite text-ink hover:border-clay' : 'bg-brick text-white border-brick'}`}
          title={camOn ? 'Turn off camera' : 'Turn on camera'}
        >
          {camOn ? <VideoIcon className="h-4 w-4" /> : <VideoOff className="h-4 w-4" />}
        </button>
        <button
          type="button"
          onClick={onLeave}
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

      <p className="flex items-center justify-center gap-1.5 text-[10px] text-granite pt-1">
        <Link2 className="h-3 w-3" />
        Only your own camera is live in this preview — connecting {otherName}'s real video requires their device on a live signaling backend.
      </p>
    </div>
  );
}
