import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useThreadSync } from '../../lib/useThreadSync';
import { Send, UserCheck, Paperclip, AlertCircle, Video, ArrowRight, Flag } from 'lucide-react';
import { useLang } from '../../context/LanguageContext';
import { useRole } from '../../context/RoleContext';
import { listThreads, sendThreadMessage, createMeeting, reportThreadMessage } from '../../lib/api';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { Select, Textarea } from '../../components/ui/Input';
import { Skeleton, EmptyState } from '../../components/ui/EmptyState';
import type { Thread, ThreadMessage } from '../../mocks/types';

const REPORT_REASONS = [
  { value: 'harassment', label: 'Harassment or abusive language' },
  { value: 'inappropriate', label: 'Inappropriate content' },
  { value: 'spam', label: 'Spam or scam' },
  { value: 'threats', label: 'Threats or intimidation' },
  { value: 'other', label: 'Other' },
];

export default function LawyerMessagesPage() {
  const { lang } = useLang();
  const { user } = useRole();
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [threads, setThreads] = useState<Thread[]>([]);
  const [activeThread, setActiveThread] = useState<Thread | null>(null);
  const [loading, setLoading] = useState(true);
  const [messageInput, setMessageInput] = useState('');
  const [sending, setSending] = useState(false);

  // Meeting State
  const [startingMeeting, setStartingMeeting] = useState(false);

  // Report Message Modal State
  const [reportTarget, setReportTarget] = useState<ThreadMessage | null>(null);
  const [reportReason, setReportReason] = useState(REPORT_REASONS[0].value);
  const [reportDetails, setReportDetails] = useState('');
  const [reportSubmitting, setReportSubmitting] = useState(false);
  const [reportedIds, setReportedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    listThreads().then((data) => {
      setThreads(data);
      const wanted = id ? data.find((t) => t.id === id) : undefined;
      if (wanted || data.length > 0) setActiveThread(wanted || data[0]);
      setLoading(false);
    });
  }, [id]);

  useThreadSync(activeThread?.id, setActiveThread, setThreads);

  const handleSelectThread = (t: Thread) => {
    setActiveThread(t);
  };

  const handleStartMeeting = async () => {
    if (!activeThread || !user) return;
    setStartingMeeting(true);
    try {
      const meeting = await createMeeting({
        hostLawyerId: user.id,
        hostLawyerName: user.name,
        citizenId: activeThread.citizenId,
        citizenName: activeThread.citizenName,
        title: activeThread.contextTitleEn,
        threadId: activeThread.id,
      });
      setActiveThread({ ...activeThread, meetingLink: meeting.link, activeMeetingCode: meeting.code });
      navigate(`/lawyer/meeting/${meeting.code}`);
    } finally {
      setStartingMeeting(false);
    }
  };

  const handleSubmitReport = async () => {
    if (!reportTarget || !activeThread) return;
    setReportSubmitting(true);
    try {
      await reportThreadMessage({
        threadId: activeThread.id,
        messageId: reportTarget.id,
        messageSnapshot: reportTarget.text,
        reportedByRole: 'lawyer',
        reportedByName: activeThread.lawyerName,
        reportedAgainstName: activeThread.citizenName,
        reasonCategory: reportReason,
        reasonDetails: reportDetails.trim() || undefined,
      });
      setReportedIds((prev) => new Set(prev).add(reportTarget.id));
      setReportTarget(null);
      setReportReason(REPORT_REASONS[0].value);
      setReportDetails('');
    } finally {
      setReportSubmitting(false);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageInput.trim() || !activeThread) return;
    setSending(true);
    try {
      const updated = await sendThreadMessage(activeThread.id, messageInput.trim(), 'lawyer');
      setActiveThread({ ...updated });
      setMessageInput('');
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return <div className="space-y-4"><Skeleton className="h-10 w-48" /><Skeleton className="h-96 w-full" /></div>;
  }

  if (threads.length === 0) {
    return <EmptyState title="No Client Messages" description="When you accept consultation requests, client channels will appear here." />;
  }

  return (
    <div className="space-y-6 font-body">
      <div>
        <h1 className="font-display text-2xl font-bold text-ink">
          {lang === 'bn' ? 'ক্লায়েন্ট মেসেজিং' : 'Client Communication'}
        </h1>
        <p className="mt-1 text-xs text-granite">
          {lang === 'bn' ? 'পরামর্শরত ক্লায়েন্টদের সাথে সরাসরি বার্তা বিনিময়' : 'Direct encrypted communication with active clients'}
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-[600px] rounded border border-granite bg-white overflow-hidden shadow-sm">
        {/* Left client thread list (span-4) */}
        <div className="lg:col-span-4 border-r border-granite-soft flex flex-col bg-bone/30">
          <div className="p-3 border-b border-granite-soft bg-bone">
            <span className="font-mono text-label uppercase text-clay-deep font-semibold">
              Active Client Threads
            </span>
          </div>

          <div className="flex-1 overflow-y-auto divide-y divide-granite-soft">
            {threads.map((t) => {
              const isSelected = activeThread?.id === t.id;
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => handleSelectThread(t)}
                  className={`w-full p-3.5 text-left transition flex items-start gap-3 ${
                    isSelected ? 'bg-clay-tint/70 border-l-4 border-clay-deep' : 'hover:bg-bone'
                  }`}
                >
                  <div className="h-9 w-9 rounded-full bg-clay text-white flex items-center justify-center font-bold text-xs shrink-0">
                    {t.citizenName.charAt(0)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between">
                      <h3 className="font-display text-xs font-bold text-ink truncate">{t.citizenName}</h3>
                      <span className="font-mono text-[9px] text-granite">
                        {new Date(t.lastMessageAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <p className="text-[11px] text-clay-deep truncate font-mono">{t.contextTitleBn}</p>
                    <p className="text-[11px] text-ink-soft truncate mt-0.5">{t.lastMessage}</p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Right chat screen (span-8) */}
        <div className="lg:col-span-8 flex flex-col justify-between h-full bg-white">
          {activeThread ? (
            <>
              <div className="p-3.5 border-b border-granite-soft bg-bone flex items-center justify-between">
                <div>
                  <h3 className="font-display text-sm font-bold text-ink">{activeThread.citizenName}</h3>
                  <p className="font-mono text-[10px] text-clay-deep">{activeThread.contextTitleBn}</p>
                </div>
                <span className="font-mono text-[10px] bg-clay-tint text-clay-deep px-2 py-0.5 rounded uppercase font-bold">
                  Client Thread
                </span>
              </div>

              {/* Video Consultation Panel */}
              {activeThread.mode === 'video' && (
                <div className="p-3 border-b border-granite-soft bg-clay-tint/40 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2 min-w-0">
                    <Video className="h-4 w-4 text-clay-deep shrink-0" />
                    <p className="text-[11px] text-ink-soft truncate">
                      {activeThread.activeMeetingCode
                        ? `Meeting in progress — code ${activeThread.activeMeetingCode}`
                        : 'Start a secure video meeting for this consultation.'}
                    </p>
                  </div>
                  {activeThread.activeMeetingCode ? (
                    <Button size="sm" variant="primary" onClick={() => navigate(`/lawyer/meeting/${activeThread.activeMeetingCode}`)}>
                      <span>Enter Room</span>
                      <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
                    </Button>
                  ) : (
                    <Button size="sm" variant="secondary" onClick={handleStartMeeting} loading={startingMeeting}>
                      <Video className="mr-1.5 h-3.5 w-3.5" />
                      <span>Start Meeting</span>
                    </Button>
                  )}
                </div>
              )}

              <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-[#FAF8F5]">
                {activeThread.messages.map((m) => {
                  const isLawyer = m.senderRole === 'lawyer';
                  const isReported = reportedIds.has(m.id);
                  return (
                    <div key={m.id} className={`flex ${isLawyer ? 'justify-end' : 'justify-start'}`}>
                      <div className="group relative max-w-[75%]">
                        <div
                          className={`rounded p-3 text-xs leading-relaxed ${
                            isLawyer
                              ? 'bg-clay-deep text-white shadow-sm'
                              : 'bg-white text-ink-soft border border-granite-soft shadow-sm'
                          }`}
                        >
                          <p>{m.text}</p>
                          <span className={`block font-mono text-[9px] text-right mt-1 ${isLawyer ? 'text-clay-tint' : 'text-granite'}`}>
                            {new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        {!isLawyer && (
                          isReported ? (
                            <span className="mt-1 inline-flex items-center gap-1 text-[9px] font-mono text-granite">
                              <Flag className="h-2.5 w-2.5" />
                              Reported
                            </span>
                          ) : (
                            <button
                              type="button"
                              onClick={() => setReportTarget(m)}
                              title="Report this message"
                              className="mt-1 inline-flex items-center gap-1 text-[9px] font-mono text-granite opacity-0 group-hover:opacity-100 hover:text-brick transition"
                            >
                              <Flag className="h-2.5 w-2.5" />
                              Report
                            </button>
                          )
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="border-t border-granite-soft p-3 bg-white space-y-2">
                <form onSubmit={handleSendMessage} className="flex items-center gap-2">
                  <input
                    type="text"
                    value={messageInput}
                    onChange={(e) => setMessageInput(e.target.value)}
                    placeholder="Type advice or response to client..."
                    className="flex-1 rounded border border-granite bg-bone/30 px-3 py-2 text-xs text-ink focus:border-clay focus:bg-white focus:outline-none"
                  />
                  <Button size="sm" variant="primary" type="submit" loading={sending}>
                    <Send className="h-3.5 w-3.5" />
                  </Button>
                </form>
              </div>
            </>
          ) : null}
        </div>
      </div>

      {/* Report Message Modal */}
      <Modal open={!!reportTarget} onClose={() => setReportTarget(null)} title="Report Message">
        <div className="space-y-4 text-xs font-body">
          {reportTarget && (
            <p className="text-xs text-ink-soft bg-bone p-2.5 rounded border border-granite-soft italic">
              "{reportTarget.text}"
            </p>
          )}

          <Select
            label="Reason for Report"
            options={REPORT_REASONS}
            value={reportReason}
            onChange={(e) => setReportReason(e.target.value)}
          />

          <Textarea
            label="Additional Details (optional)"
            placeholder="Describe what happened..."
            value={reportDetails}
            onChange={(e) => setReportDetails(e.target.value)}
            rows={3}
          />

          <div className="flex justify-end gap-2 pt-2">
            <Button size="sm" variant="ghost" onClick={() => setReportTarget(null)}>
              Cancel
            </Button>
            <Button size="sm" variant="danger" onClick={handleSubmitReport} loading={reportSubmitting}>
              <Flag className="mr-1.5 h-3.5 w-3.5" />
              <span>Report to Admin</span>
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
