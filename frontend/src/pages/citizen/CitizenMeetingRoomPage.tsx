import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getMeetingByCode } from '../../lib/api';
import { useRole } from '../../context/RoleContext';
import { MeetingRoom } from '../../components/meeting/MeetingRoom';
import { Skeleton, ErrorState } from '../../components/ui/EmptyState';
import type { Meeting } from '../../mocks/types';

export default function CitizenMeetingRoomPage() {
  const { code } = useParams<{ code: string }>();
  const { user } = useRole();
  const navigate = useNavigate();
  const [meeting, setMeeting] = useState<Meeting | null>(null);
  const [loading, setLoading] = useState(true);

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
        message={meeting ? 'Your advocate has ended this meeting.' : 'No meeting exists with this code. Check the link or code and try again.'}
      />
    );
  }

  return (
    <MeetingRoom
      meeting={meeting}
      role="participant"
      selfName={user?.name || meeting.citizenName}
      otherName={meeting.hostLawyerName}
      onLeave={() => navigate('/app/messages')}
    />
  );
}
