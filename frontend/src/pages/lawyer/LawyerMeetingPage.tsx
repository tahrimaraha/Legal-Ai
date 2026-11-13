import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Video, ArrowRight } from 'lucide-react';
import { listThreads, createMeeting, ApiError } from '../../lib/api';
import { Button } from '../../components/ui/Button';
import { Select } from '../../components/ui/Input';
import { Skeleton } from '../../components/ui/EmptyState';
import type { Thread } from '../../mocks/types';

export default function LawyerMeetingPage() {
  const navigate = useNavigate();
  const [threads, setThreads] = useState<Thread[]>([]);
  // '' = instant meeting; invite a client from inside the meeting whenever you like.
  const [selectedThreadId, setSelectedThreadId] = useState('');
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    listThreads()
      .then((data) => setThreads(data.filter((t) => !t.isLocked)))
      .catch(() => setThreads([]))
      .finally(() => setLoading(false));
  }, []);

  const selectedThread = threads.find((t) => t.id === selectedThreadId);

  const handleStart = async () => {
    setStarting(true);
    setError('');
    try {
      const meeting = await createMeeting({
        title: selectedThread ? selectedThread.contextTitleEn : 'Instant Legal Consultation',
        threadId: selectedThread?.id,
      });
      navigate(`/lawyer/meeting/${meeting.code}`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not start the meeting. Please try again.');
    } finally {
      setStarting(false);
    }
  };

  if (loading) {
    return <div className="space-y-4"><Skeleton className="h-10 w-48" /><Skeleton className="h-64 w-full" /></div>;
  }

  return (
    <div className="space-y-6 font-body max-w-2xl">
      <div>
        <h1 className="font-display text-2xl font-bold text-ink">Video Meetings</h1>
        <p className="mt-1 text-xs text-granite">
          Start a secure video consultation any time. Invite your client by sending the invite to their messages, or
          share the link — or the meeting code and password — directly.
        </p>
      </div>

      <div className="rounded border border-granite bg-white p-6 shadow-sm space-y-5">
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded bg-clay-tint border border-clay flex items-center justify-center shrink-0">
            <Video className="h-6 w-6 text-clay-deep" />
          </div>
          <div>
            <h2 className="font-display text-base font-bold text-ink">Start a New Meeting</h2>
            <p className="text-xs text-granite">A unique code, password, and link are generated instantly.</p>
          </div>
        </div>

        {threads.length > 0 ? (
          <Select
            label="Invite a client now (optional)"
            value={selectedThreadId}
            onChange={(e) => setSelectedThreadId(e.target.value)}
            options={[
              { value: '', label: "Don't invite yet — start an instant meeting" },
              ...threads.map((t) => ({ value: t.id, label: `${t.citizenName} — ${t.contextTitleEn}` })),
            ]}
          />
        ) : (
          <p className="text-xs text-granite">
            No open client conversations yet. Start an instant meeting and share the link, or the code and password,
            with your client.
          </p>
        )}

        {selectedThread && (
          <p className="text-[11px] text-ink-soft">
            The link, meeting code and password will be sent to {selectedThread.citizenName} as a message.
          </p>
        )}

        {error && <p className="text-xs text-brick">{error}</p>}

        <Button variant="primary" className="w-full justify-center" onClick={handleStart} loading={starting}>
          <Video className="mr-1.5 h-4 w-4" />
          <span>{selectedThread ? 'Start Meeting & Send Invite' : 'Start Meeting'}</span>
          <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}
