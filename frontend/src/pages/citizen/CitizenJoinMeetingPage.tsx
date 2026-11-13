import { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Video, Link2, KeyRound, AlertCircle } from 'lucide-react';
import { joinMeetingWithPassword } from '../../lib/api';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';

/** Accepts an invite link (`/app/meeting/join?code=…&pwd=…`), a plain meeting link, or a bare code. */
function parseMeetingLink(value: string): { code: string; password: string } {
  const trimmed = value.trim();
  try {
    const url = new URL(trimmed);
    const code = url.searchParams.get('code');
    if (code) return { code, password: url.searchParams.get('pwd') ?? '' };
  } catch {
    /* not a full URL */
  }
  const match = trimmed.match(/\/app\/meeting\/([a-z0-9-]+)/i);
  return { code: match && match[1] !== 'join' ? match[1] : trimmed, password: '' };
}

export default function CitizenJoinMeetingPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const linkCode = searchParams.get('code') ?? '';
  const linkPassword = searchParams.get('pwd') ?? '';
  const [tab, setTab] = useState<'link' | 'code'>(linkCode ? 'code' : 'link');
  const [linkInput, setLinkInput] = useState('');
  const [codeInput, setCodeInput] = useState(linkCode);
  const [passwordInput, setPasswordInput] = useState(linkPassword);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const autoJoined = useRef(false);

  const join = async (code: string, password: string) => {
    setError('');
    setLoading(true);
    try {
      const res = await joinMeetingWithPassword(code, password);
      if (!res.ok) {
        setError(res.error || 'Could not join this meeting.');
        return;
      }
      navigate(`/app/meeting/${res.meeting!.code}`, { replace: true });
    } catch {
      setError('Could not join this meeting. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Invite links carry the code and password: join in one click.
  useEffect(() => {
    if (autoJoined.current || !linkCode || !linkPassword) return;
    autoJoined.current = true;
    void join(linkCode, linkPassword);
  }, [linkCode, linkPassword]);

  const handleJoinByLink = () => {
    const { code, password } = parseMeetingLink(linkInput);
    if (!code) {
      setError('Please paste a valid meeting link.');
      return;
    }
    if (password) {
      void join(code, password);
      return;
    }
    // A link without a password: ask for it on the code tab.
    setCodeInput(code);
    setTab('code');
    setError('This link has no password — enter the password your advocate sent you.');
  };

  const handleJoinByCode = async () => {
    if (!codeInput.trim() || !passwordInput.trim()) {
      setError('Enter both the meeting code and password.');
      return;
    }
    await join(codeInput, passwordInput);
  };

  return (
    <div className="max-w-md mx-auto space-y-6 font-body">
      <div className="text-center">
        <div className="h-14 w-14 rounded bg-clay-tint border border-clay flex items-center justify-center mx-auto mb-3">
          <Video className="h-7 w-7 text-clay-deep" />
        </div>
        <h1 className="font-display text-2xl font-bold text-ink">Join Video Meeting</h1>
        <p className="mt-1 text-xs text-granite">Only your advocate can start a meeting — join with their link, or the code and password they shared.</p>
      </div>

      <div className="rounded border border-granite bg-white p-6 shadow-sm space-y-4">
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => { setTab('link'); setError(''); }}
            className={`p-2 rounded border text-center transition text-xs font-semibold uppercase ${tab === 'link' ? 'border-clay bg-clay-tint text-clay-deep' : 'border-granite bg-white text-ink-soft'}`}
          >
            <Link2 className="h-3.5 w-3.5 inline mr-1.5" />
            Via Link
          </button>
          <button
            type="button"
            onClick={() => { setTab('code'); setError(''); }}
            className={`p-2 rounded border text-center transition text-xs font-semibold uppercase ${tab === 'code' ? 'border-clay bg-clay-tint text-clay-deep' : 'border-granite bg-white text-ink-soft'}`}
          >
            <KeyRound className="h-3.5 w-3.5 inline mr-1.5" />
            Code & Password
          </button>
        </div>

        {tab === 'link' ? (
          <div className="space-y-3">
            <Input
              label="Meeting Link"
              placeholder="Paste the meeting link your advocate shared"
              value={linkInput}
              onChange={(e) => setLinkInput(e.target.value)}
            />
            <Button variant="primary" className="w-full justify-center" onClick={handleJoinByLink} loading={loading}>
              Join with Link
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            <Input
              label="Meeting Code"
              placeholder="e.g. abc-defg-hij"
              value={codeInput}
              onChange={(e) => setCodeInput(e.target.value)}
            />
            <Input
              label="Password"
              placeholder="6-digit password"
              value={passwordInput}
              onChange={(e) => setPasswordInput(e.target.value)}
            />
            <Button variant="primary" className="w-full justify-center" onClick={handleJoinByCode} loading={loading}>
              Join Meeting
            </Button>
          </div>
        )}

        {error && (
          <p className="flex items-center gap-1.5 text-xs text-brick">
            <AlertCircle className="h-3.5 w-3.5 shrink-0" />
            {error}
          </p>
        )}
      </div>
    </div>
  );
}
