import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Video, ArrowRight } from 'lucide-react';
import { listThreads, createMeeting } from '../../lib/api';
import { useRole } from '../../context/RoleContext';
import { Button } from '../../components/ui/Button';
import { Select } from '../../components/ui/Input';
import { Skeleton } from '../../components/ui/EmptyState';
import type { Thread } from '../../mocks/types';

export default function LawyerMeetingPage() {
  const { user } = useRole();
  const navigate = useNavigate();
  const [threads, setThreads] = useState<Thread[]>([]);
  const [selectedThreadId, setSelectedThreadId] = useState('');
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);

  useEffect(() => {
    listThreads().then((data) => {
      setThreads(data);
      if (data.length > 0) setSelectedThreadId(data[0].id);
      setLoading(false);
    });
  }, []);

  const selectedThread = threads.find((t) => t.id === selectedThreadId);

  const handleStart = async () => {
    // With a client thread the client is notified; otherwise it's an instant meeting the lawyer
    // shares by link / code + password.
    if (!user) return;
    setStarting(true);
    try {
      const meeting = await createMeeting({
        title: selectedThread?.contextTitleEn || 'Instant meeting',
        threadId: selectedThread?.id,
      });
      navigate(`/lawyer/meeting/${meeting.code}`);
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
          Start a secure video consultation. Only you can start a meeting — clients join with the link, or the meeting code and password.
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
            label="Meeting For"
            value={selectedThreadId}
            onChange={(e) => setSelectedThreadId(e.target.value)}
            options={[
              ...threads.map((t) => ({ value: t.id, label: `${t.citizenName} — ${t.contextTitleEn}` })),
              { value: '', label: 'Instant meeting (no client thread)' },
            ]}
          />
        ) : (
          <p className="text-xs text-granite">No active client threads yet — you can still start an instant meeting.</p>
        )}

        <Button variant="primary" className="w-full justify-center" onClick={handleStart} loading={starting}>
          <Video className="mr-1.5 h-4 w-4" />
          <span>Start Meeting</span>
          <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}
