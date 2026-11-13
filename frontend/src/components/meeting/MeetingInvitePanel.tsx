import { useEffect, useMemo, useState } from 'react';
import { Check, Copy, Send } from 'lucide-react';
import { ApiError, inviteToMeeting, listThreads } from '../../lib/api';
import { Button } from '../ui/Button';
import { Select } from '../ui/Input';
import type { Meeting, Thread } from '../../mocks/types';

/** Ready-to-paste invite for sharing outside the app (SMS, WhatsApp, email…). */
export function inviteText(meeting: Meeting): string {
  return [
    `Video meeting invitation — ${meeting.title}`,
    `Join link: ${meeting.link}`,
    `Meeting code: ${meeting.code}`,
    `Password: ${meeting.password}`,
  ].join('\n');
}

/**
 * Host-only: send this meeting's invite (link, code and password) to a client as a
 * message in their thread, or copy it to share any other way.
 */
export function MeetingInvitePanel({ meeting, onInvited }: { meeting: Meeting; onInvited?: (m: Meeting) => void }) {
  const [threads, setThreads] = useState<Thread[] | null>(null);
  const [threadId, setThreadId] = useState('');
  const [sending, setSending] = useState(false);
  const [sentTo, setSentTo] = useState('');
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  // A meeting is one-to-one: once it has a client, only that client's threads apply.
  const eligible = useMemo(
    () => (threads ?? []).filter((t) => !t.isLocked && (!meeting.citizenId || t.citizenId === meeting.citizenId)),
    [threads, meeting.citizenId],
  );

  useEffect(() => {
    listThreads()
      .then(setThreads)
      .catch(() => setThreads([]));
  }, []);

  useEffect(() => {
    if (!eligible.some((t) => t.id === threadId)) setThreadId(eligible[0]?.id ?? '');
  }, [eligible, threadId]);

  const send = async () => {
    if (!threadId) return;
    setSending(true);
    setError('');
    try {
      const updated = await inviteToMeeting(meeting.id, threadId);
      setSentTo(eligible.find((t) => t.id === threadId)?.citizenName ?? updated.citizenName);
      onInvited?.(updated);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not send the invite.');
    } finally {
      setSending(false);
    }
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(inviteText(meeting));
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard unavailable — the fields above can still be copied one by one */
    }
  };

  return (
    <div className="rounded border border-granite-soft bg-bone p-4 space-y-3">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <span className="font-mono text-[10px] uppercase text-clay-deep font-semibold">Invite a Client</span>
        <button
          type="button"
          onClick={copy}
          className="inline-flex items-center gap-1 text-[11px] font-semibold text-clay-deep hover:underline"
        >
          {copied ? <Check className="h-3.5 w-3.5 text-green-600" /> : <Copy className="h-3.5 w-3.5" />}
          {copied ? 'Copied' : 'Copy invite (link + code + password)'}
        </button>
      </div>

      {threads === null ? (
        <p className="text-xs text-granite">Loading your client conversations…</p>
      ) : eligible.length === 0 ? (
        <p className="text-xs text-granite">
          {meeting.citizenId
            ? `No open conversation with ${meeting.citizenName || 'this client'} — copy the invite and share it directly.`
            : 'No open client conversations yet — copy the invite and share it with your client directly.'}
        </p>
      ) : (
        <div className="flex flex-col sm:flex-row gap-2 sm:items-end">
          <div className="flex-1 min-w-0">
            <Select
              label="Send invite as a message to"
              value={threadId}
              onChange={(e) => {
                setThreadId(e.target.value);
                setSentTo('');
              }}
              options={eligible.map((t) => ({ value: t.id, label: `${t.citizenName} — ${t.contextTitleEn}` }))}
            />
          </div>
          <Button variant="primary" size="sm" onClick={send} loading={sending} disabled={!threadId}>
            <Send className="mr-1.5 h-3.5 w-3.5" />
            Send Invite
          </Button>
        </div>
      )}

      {sentTo && !error && (
        <p className="flex items-center gap-1.5 text-xs text-green-700">
          <Check className="h-3.5 w-3.5" />
          Invite sent to {sentTo} — they'll find the link, code and password in their messages.
        </p>
      )}
      {error && <p className="text-xs text-brick">{error}</p>}
    </div>
  );
}
