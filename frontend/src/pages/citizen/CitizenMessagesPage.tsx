import { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Send, Lock, Paperclip, AlertCircle, UserCheck, Video, Flag, ArrowLeft } from 'lucide-react';
import { useLang } from '../../context/LanguageContext';
import { listThreads, sendThreadMessage, reportThreadMessage } from '../../lib/api';
import { useThreadSync } from '../../lib/useThreadSync';
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

export default function CitizenMessagesPage() {
  const { id } = useParams<{ id: string }>();
  const { lang } = useLang();

  const [threads, setThreads] = useState<Thread[]>([]);
  const [activeThread, setActiveThread] = useState<Thread | null>(null);
  // Phones show one panel at a time: the thread list, or the open chat (with a back button)
  const [mobileChat, setMobileChat] = useState(!!id);
  const [loading, setLoading] = useState(true);
  const [messageInput, setMessageInput] = useState('');
  const [sending, setSending] = useState(false);

  // Report Message Modal State
  const [reportTarget, setReportTarget] = useState<ThreadMessage | null>(null);
  const [reportReason, setReportReason] = useState(REPORT_REASONS[0].value);
  const [reportDetails, setReportDetails] = useState('');
  const [reportSubmitting, setReportSubmitting] = useState(false);
  const [reportedIds, setReportedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    listThreads().then((data) => {
      setThreads(data);
      if (id) {
        const found = data.find((t) => t.id === id);
        if (found) setActiveThread(found);
      } else if (data.length > 0) {
        setActiveThread(data[0]);
      }
      setLoading(false);
    });
  }, [id]);

  useThreadSync(activeThread?.id, setActiveThread, setThreads);

  // Keep the newest message in view (on open, after sending, and when new messages arrive)
  const feedRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = feedRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [activeThread?.id, activeThread?.messages.length, mobileChat]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageInput.trim() || !activeThread) return;
    setSending(true);
    try {
      const updated = await sendThreadMessage(activeThread.id, messageInput.trim(), 'citizen');
      setActiveThread({ ...updated });
      setMessageInput('');
    } finally {
      setSending(false);
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
        reportedByRole: 'citizen',
        reportedByName: activeThread.citizenName,
        reportedAgainstName: activeThread.lawyerName,
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

  if (loading) {
    return <div className="space-y-4"><Skeleton className="h-10 w-48" /><Skeleton className="h-96 w-full" /></div>;
  }

  if (threads.length === 0) {
    return (
      <EmptyState
        title={lang === 'bn' ? 'কোনো সক্রিয় বার্তা থ্রেড নেই' : 'No Active Messaging Threads'}
        description={
          lang === 'bn'
            ? 'স্প্যাম রোধে আইনজীবী আপনার পরামর্শ অনুরোধ গ্রহণ করলেই কেবল বার্তা আদানপ্রদান চালু হয়।'
            : 'Confidential client messaging unlocks once an advocate accepts your consultation request.'
        }
        actionLabel={lang === 'bn' ? 'আইনজীবী খুঁজুন' : 'Find Lawyers'}
        onAction={() => window.location.assign('/app/lawyers')}
      />
    );
  }

  return (
    <div className="space-y-6 font-body">
      <div>
        <h1 className="font-display text-2xl font-bold text-ink">
          {lang === 'bn' ? 'আইনজীবীর সাথে বার্তা বিনিময়' : 'Confidential Advocate Messages'}
        </h1>
        <p className="mt-1 text-xs text-granite">
          {lang === 'bn'
            ? 'দায়িত্বপ্রাপ্ত আইনজীবীর সাথে সুরক্ষিত ও গোপনীয় তথ্যাদি আদানপ্রদান'
            : 'Gated end-to-end communication channels for active consultations'}
        </p>
      </div>

      <div className="flex flex-col lg:grid lg:grid-cols-12 lg:gap-6 h-[calc(100dvh-16.5rem)] min-h-[380px] lg:h-[600px] rounded border border-granite bg-white overflow-hidden shadow-sm">
        {/* Left Thread List (span-4) */}
        <div className={`${mobileChat && activeThread ? 'hidden lg:flex' : 'flex'} min-h-0 flex-1 lg:flex-none lg:col-span-4 border-r border-granite-soft flex-col bg-bone/30`}>
          <div className="p-3 border-b border-granite-soft bg-bone">
            <span className="font-mono text-label uppercase text-clay-deep font-semibold">
              {lang === 'bn' ? 'কথোপকথন তালিকা' : 'Active Threads'}
            </span>
          </div>

          <div className="flex-1 overflow-y-auto divide-y divide-granite-soft">
            {threads.map((t) => {
              const isSelected = activeThread?.id === t.id;
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => { setMobileChat(true); setActiveThread(t); }}
                  className={`w-full p-3.5 text-left transition flex items-start gap-3 ${
                    isSelected ? 'bg-clay-tint/70 border-l-4 border-clay-deep' : 'hover:bg-bone'
                  }`}
                >
                  <div className="h-10 w-10 rounded bg-clay-tint border border-clay flex items-center justify-center shrink-0">
                    <UserCheck className="h-5 w-5 text-clay-deep" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between">
                      <h3 className="font-display text-xs font-bold text-ink truncate">{t.lawyerNameBn}</h3>
                      <span className="font-mono text-[9px] text-granite">
                        {new Date(t.lastMessageAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <p className="text-[11px] text-clay-deep font-medium truncate">{t.contextTitleBn}</p>
                    <p className="text-[11px] text-ink-soft truncate mt-0.5">{t.lastMessage}</p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Right Active Conversation Area (span-8) */}
        <div className={`${mobileChat && activeThread ? 'flex' : 'hidden lg:flex'} min-h-0 flex-1 lg:col-span-8 flex-col justify-between lg:h-full bg-white`}>
          {activeThread && (
            <button type="button" onClick={() => setMobileChat(false)}
              className="lg:hidden flex items-center gap-1.5 border-b border-granite-soft bg-white px-3 py-2 text-xs font-semibold text-clay-deep">
              <ArrowLeft className="h-4 w-4" />
              {lang === 'bn' ? 'সব কথোপকথন' : 'All chats'}
            </button>
          )}
          {activeThread ? (
            <>
              {/* Thread Header */}
              <div className="p-3.5 border-b border-granite-soft bg-bone flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded bg-clay-tint border border-clay flex items-center justify-center">
                    <UserCheck className="h-5 w-5 text-clay-deep" />
                  </div>
                  <div>
                    <h3 className="font-display text-sm font-bold text-ink">{activeThread.lawyerNameBn}</h3>
                    <p className="font-mono text-[10px] text-clay-deep">{activeThread.contextTitleBn}</p>
                  </div>
                </div>

                <div className="flex items-center gap-1 text-[11px] text-granite font-mono bg-white px-2 py-1 rounded border border-granite-soft">
                  <UserCheck className="h-3.5 w-3.5 text-clay-deep" />
                  <span>Verified Channel</span>
                </div>
              </div>

              {/* Video Consultation Panel */}
              {activeThread.mode === 'video' && (
                <div className="p-3 border-b border-granite-soft bg-clay-tint/40 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2 min-w-0">
                    <Video className="h-4 w-4 text-clay-deep shrink-0" />
                    <p className="text-[11px] text-ink-soft truncate">
                      {activeThread.activeMeetingCode
                        ? (lang === 'bn' ? 'আইনজীবী ভিডিও মিটিং শুরু করেছেন।' : 'Your advocate has started the video meeting.')
                        : (lang === 'bn'
                          ? 'আইনজীবী শীঘ্রই একটি ভিডিও মিটিং শুরু করবেন।'
                          : 'Your advocate will start a video meeting here before the session.')}
                    </p>
                  </div>
                  {activeThread.activeMeetingCode ? (
                    <Link to={`/app/meeting/${activeThread.activeMeetingCode}`} className="shrink-0">
                      <Button size="sm" variant="primary">
                        <Video className="mr-1.5 h-3.5 w-3.5" />
                        <span>{lang === 'bn' ? 'যোগ দিন' : 'Join Call'}</span>
                      </Button>
                    </Link>
                  ) : (
                    <Link to="/app/meeting/join" className="shrink-0">
                      <Button size="sm" variant="secondary">
                        <span>{lang === 'bn' ? 'কোড দিয়ে যোগ দিন' : 'Join via Code'}</span>
                      </Button>
                    </Link>
                  )}
                </div>
              )}

              {/* Message Feed */}
              <div ref={feedRef} className="min-h-0 flex-1 overflow-y-auto p-4 space-y-3 bg-[#FAF8F5]">
                {activeThread.messages.map((m) => {
                  const isCitizen = m.senderRole === 'citizen';
                  const isReported = reportedIds.has(m.id);
                  return (
                    <div key={m.id} className={`flex ${isCitizen ? 'justify-end' : 'justify-start'}`}>
                      <div className="group relative max-w-[75%]">
                        <div
                          className={`rounded p-3 text-xs leading-relaxed ${
                            isCitizen
                              ? 'bg-clay-tint text-ink border border-clay/30'
                              : 'bg-white text-ink-soft border border-granite-soft shadow-sm'
                          }`}
                        >
                          <p>{m.text}</p>
                          <span className="block font-mono text-[9px] text-granite text-right mt-1">
                            {new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        {!isCitizen && (
                          isReported ? (
                            <span className="mt-1 inline-flex items-center gap-1 text-[9px] font-mono text-granite">
                              <Flag className="h-2.5 w-2.5" />
                              {lang === 'bn' ? 'রিপোর্ট করা হয়েছে' : 'Reported'}
                            </span>
                          ) : (
                            <button
                              type="button"
                              onClick={() => setReportTarget(m)}
                              title={lang === 'bn' ? 'বার্তাটি রিপোর্ট করুন' : 'Report this message'}
                              className="mt-1 inline-flex items-center gap-1 text-[9px] font-mono text-granite opacity-0 group-hover:opacity-100 hover:text-brick transition"
                            >
                              <Flag className="h-2.5 w-2.5" />
                              {lang === 'bn' ? 'রিপোর্ট' : 'Report'}
                            </button>
                          )
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Sensitive file reminder & Input Box */}
              <div className="border-t border-granite-soft p-3 bg-white space-y-2">
                <div className="flex items-center gap-1 text-[10px] text-granite">
                  <AlertCircle className="h-3 w-3 text-clay-deep" />
                  <span>Redact sensitive NID/banking data before sending attachments.</span>
                </div>

                <form onSubmit={handleSendMessage} className="flex items-center gap-2">
                  <button
                    type="button"
                    title="Attach case file"
                    className="p-2 rounded text-granite hover:bg-bone hover:text-ink transition border border-granite-soft"
                  >
                    <Paperclip className="h-4 w-4" />
                  </button>

                  <input
                    type="text"
                    value={messageInput}
                    onChange={(e) => setMessageInput(e.target.value)}
                    placeholder={lang === 'bn' ? 'বার্তা লিখুন...' : 'Type confidential message...'}
                    className="flex-1 rounded border border-granite bg-bone/30 px-3 py-2 text-xs text-ink focus:border-clay focus:bg-white focus:outline-none"
                  />

                  <Button size="sm" variant="primary" type="submit" loading={sending}>
                    <Send className="h-3.5 w-3.5" />
                  </Button>
                </form>
              </div>
            </>
          ) : (
            <div className="flex items-center justify-center h-full text-xs text-granite">
              Select a conversation to start messaging.
            </div>
          )}
        </div>
      </div>

      {/* Report Message Modal */}
      <Modal
        open={!!reportTarget}
        onClose={() => setReportTarget(null)}
        title={lang === 'bn' ? 'বার্তাটি রিপোর্ট করুন' : 'Report Message'}
      >
        <div className="space-y-4 text-xs font-body">
          {reportTarget && (
            <p className="text-xs text-ink-soft bg-bone p-2.5 rounded border border-granite-soft italic">
              "{reportTarget.text}"
            </p>
          )}

          <Select
            label={lang === 'bn' ? 'রিপোর্টের কারণ' : 'Reason for Report'}
            options={REPORT_REASONS}
            value={reportReason}
            onChange={(e) => setReportReason(e.target.value)}
          />

          <Textarea
            label={lang === 'bn' ? 'অতিরিক্ত বিবরণ (ঐচ্ছিক)' : 'Additional Details (optional)'}
            placeholder="Describe what happened..."
            value={reportDetails}
            onChange={(e) => setReportDetails(e.target.value)}
            rows={3}
          />

          <div className="flex justify-end gap-2 pt-2">
            <Button size="sm" variant="ghost" onClick={() => setReportTarget(null)}>
              {lang === 'bn' ? 'বাতিল' : 'Cancel'}
            </Button>
            <Button size="sm" variant="danger" onClick={handleSubmitReport} loading={reportSubmitting}>
              <Flag className="mr-1.5 h-3.5 w-3.5" />
              <span>{lang === 'bn' ? 'অ্যাডমিনের কাছে রিপোর্ট করুন' : 'Report to Admin'}</span>
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
