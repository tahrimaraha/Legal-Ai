import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getMeetingByCode, endMeeting } from '../../lib/api';
import { MeetingRoom } from '../../components/meeting/MeetingRoom';
import { MeetingInvitePanel } from '../../components/meeting/MeetingInvitePanel';
import { Skeleton, ErrorState } from '../../components/ui/EmptyState';
import type { Meeting } from '../../mocks/types';

export default function LawyerMeetingRoomPage() {
  const { code } = useParams<{ code: string }>();
  const navigate = useNavigate();
  const [meeting, setMeeting] = useState<Meeting | null>(null);
  const [loading, setLoading] = useState(true);
  const [ending, setEnding] = useState(false);

  useEffect(() => {
    if (!code) return;
    getMeetingByCode(code).then((data) => {
      setMeeting(data || null);
      setLoading(false);
    });
  }, [code]);

  if (loading) {
    return <div className="space-y-4"><Skeleton className="h-10 w-48" /><Skeleton className="h-96 w-full" /></div>;
  }

  if (!meeting || meeting.status === 'ended') {
    return (
      <ErrorState
        title={meeting ? 'Meeting Has Ended' : 'Meeting Not Found'}
        message={meeting ? 'This meeting was already ended.' : 'No meeting exists with this code.'}
      />
    );
  }

  const handleEnd = async () => {
    setEnding(true);
    try {
      await endMeeting(meeting.id);
      navigate('/lawyer/meeting');
    } finally {
      setEnding(false);
    }
  };

  return (
    <MeetingRoom
      meeting={meeting}
      role="host"
      selfName={meeting.hostLawyerName}
      otherName={meeting.citizenName || 'Waiting for client'}
      onLeave={() => navigate('/lawyer/meeting')}
      onEndForEveryone={handleEnd}
      ending={ending}
      hostPanel={<MeetingInvitePanel meeting={meeting} onInvited={setMeeting} />}
    />
  );
}
