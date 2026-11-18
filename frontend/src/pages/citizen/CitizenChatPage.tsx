import { useCallback, useEffect, useRef, useState } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { AssistantMessage } from '../../components/chat/AssistantMessage';
import { CitationDrawer } from '../../components/chat/CitationDrawer';
import { Composer } from '../../components/chat/Composer';
import { BalanceScale } from '../../components/ui/BalanceScale';
import { Modal } from '../../components/ui/Modal';
import { Button } from '../../components/ui/Button';
import { PaymentProcess } from '../../components/ui/PaymentProcess';
import { useLang } from '../../context/LanguageContext';
import { useChat } from '../../lib/useChat';
import { getConversation, createVerificationRequest, getPlatformPaymentAccounts, type PayeeAccounts, type PaymentSubmission } from '../../lib/api';
import type { Citation, Conversation, Message } from '../../mocks/types';
import { ShieldCheck, CheckCircle2, AlertCircle, ArrowRight, AlertTriangle, RotateCcw } from 'lucide-react';

export default function CitizenChatPage() {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { lang, t } = useLang();
  const chat = useChat();

  const [drawer, setDrawer] = useState<Citation | null>(null);
  const [verificationModalOpen, setVerificationModalOpen] = useState(false);
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [selectedMessageForVerif, setSelectedMessageForVerif] = useState<Message | null>(null);
  const [verifUrgency, setVerifUrgency] = useState<'normal' | 'urgent'>('normal');
  const [verifSuccess, setVerifSuccess] = useState(false);
  const [payee, setPayee] = useState<PayeeAccounts | null>(null);

  const endRef = useRef<HTMLDivElement>(null);
  const initialSentRef = useRef(false);

  // Load conversation if id provided
  useEffect(() => {
    if (id) {
      getConversation(id).then((conv) => {
        if (conv) {
          chat.reset(conv.messages, conv.id);
        }
      });
    } else if (chat.conversationId) {
      // Navigated from an open chat to a new one: start fresh.
      chat.reset([]);
    }
  }, [id]);

  // Handle URL prefilled query (e.g. from dashboard or glossary)
  useEffect(() => {
    const q = searchParams.get('q');
    if (q && !initialSentRef.current && chat.messages.length === 0) {
      initialSentRef.current = true;
      void chat.send(q);
    }
  }, [searchParams, chat.messages.length]);

  useEffect(() => {
    endRef.current?.scrollIntoView?.({ block: 'end', behavior: 'smooth' });
  }, [chat.messages.length, chat.pending]);

  const handleOpenVerification = (msg: Message) => {
    setSelectedMessageForVerif(msg);
    setVerifSuccess(false);
    setVerificationModalOpen(true);
  };

  const handleProceedToPayment = () => {
    setVerificationModalOpen(false);
    setPayee(null);
    setPaymentModalOpen(true);
    // Verification fees are paid to the platform's (admin) bKash / Nagad / Rocket / bank account.
    getPlatformPaymentAccounts()
      .then(setPayee)
      .catch(() => setPayee({ payeeName: 'LEGAL AI', accounts: {}, methods: [] }));
  };

  const handleCancelPayment = () => {
    setPaymentModalOpen(false);
    setVerificationModalOpen(true);
  };

  /** Creates the verification request together with the payment (throws so the payment form shows errors). */
  const handlePaymentSubmit = async (payment: PaymentSubmission | null) => {
    if (!selectedMessageForVerif) return;
    // The question is the user message just before the answer being verified.
    const answerIndex = chat.messages.findIndex((m) => m.id === selectedMessageForVerif.id);
    const question = chat.messages.slice(0, Math.max(answerIndex, 0)).reverse().find((m) => m.role === 'user');
    await createVerificationRequest({
      conversationId: chat.conversationId || id || '',
      messageId: selectedMessageForVerif.id,
      questionText: question?.bodyBn || question?.bodyEn || 'নাগরিকের আইনি প্রশ্ন',
      answerText: selectedMessageForVerif.bodyBn,
      citations: selectedMessageForVerif.citations,
      urgency: verifUrgency,
      payment: payment ?? undefined,
    });
    setPaymentModalOpen(false);
    setVerifSuccess(true);
    setVerificationModalOpen(true);
  };

  const askAboutSection = (c: Citation) => {
    setDrawer(null);
    void chat.send(
      lang === 'bn'
        ? `${c.labelBn} — এই ধারাটি সহজ ভাষায় ব্যাখ্যা করুন।`
        : `${c.labelEn} — explain this section in plain language.`,
    );
  };

  const empty = chat.messages.length === 0 && !chat.pending;

  return (
    <div className="flex flex-col h-[calc(100dvh-8.5rem)] font-body">
      {/* Scrollable Chat Area */}
      <div className="flex-1 overflow-y-auto px-2 py-4">
        <div className="mx-auto max-w-prose space-y-6">
          {empty ? (
            <div className="pt-8 text-center">
              <div className="mx-auto mb-6 w-28 opacity-75 text-clay-deep">
                <BalanceScale className="h-auto w-full" weight={1.6} />
              </div>
              <h1 className="font-display text-2xl font-bold text-ink">
                {lang === 'bn' ? 'কীভাবে আপনাকে সহায়তা করতে পারি?' : 'How Can We Assist You Legally?'}
              </h1>
              <p className="mt-2 text-xs text-ink-soft max-w-md mx-auto leading-relaxed">
                {lang === 'bn'
                  ? 'আপনার দৈনন্দিন আইনি সমস্যাটি লিখুন। প্রতিটি উত্তরের সাথে বাংলাদেশের নির্দিষ্ট আইন ও ধারা উদ্ধৃত করা হবে।'
                  : 'Ask any question regarding tenancy, domestic protection, dowry, consumer rights, or cyber laws.'}
              </p>

              {/* Starter Suggestions */}
              <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-3 text-left">
                {t.chat.suggestions.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => void chat.send(s)}
                    className="p-4 rounded border border-granite bg-white text-xs text-ink-soft hover:border-clay hover:bg-clay-tint/40 transition shadow-sm"
                  >
                    "{s}"
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {chat.messages.map((m) =>
                m.role === 'user' ? (
                  <div key={m.id} className="flex justify-end">
                    <div className="max-w-[85%] rounded bg-clay-tint px-4 py-3 text-sm text-ink border border-clay/30">
                      {lang === 'bn' ? m.bodyBn : m.bodyEn}
                    </div>
                  </div>
                ) : (
                  <AssistantMessage
                    key={m.id}
                    message={m}
                    streaming={chat.streamingId === m.id}
                    progress={chat.streamingId === m.id ? chat.progress : 1}
                    activeCitation={drawer?.id ?? null}
                    onOpenCitation={setDrawer}
                    onRate={chat.rate}
                    onFlag={chat.flag}
                    onRequestVerification={handleOpenVerification}
                  />
                ),
              )}

              {chat.pending && (
                <div className="margin-rule flex items-center gap-3 py-4 pl-6 text-xs text-clay-deep bg-white border border-granite-soft rounded">
                  <span className="h-2 w-2 animate-pulse rounded-full bg-clay" />
                  <span>
                    {lang === 'bn'
                      ? 'আইন সংকলন অনুসন্ধান ও ধারা বিশ্লেষণ চলছে...'
                      : 'Retrieving codified statutes & generating cited answer...'}
                  </span>
                </div>
              )}
              {chat.error && !chat.pending && (
                <div
                  role="alert"
                  className="flex flex-wrap items-center gap-3 rounded border border-brick/30 bg-brick/5 py-3 pl-4 pr-3 text-xs text-brick"
                >
                  <AlertTriangle className="h-4 w-4 shrink-0" />
                  <span className="flex-1 font-medium">{lang === 'bn' ? chat.error.bn : chat.error.en}</span>
                  <Button size="sm" variant="secondary" onClick={chat.retry}>
                    <RotateCcw className="mr-1 h-3.5 w-3.5" />
                    {lang === 'bn' ? 'আবার চেষ্টা করুন' : 'Try again'}
                  </Button>
                </div>
              )}
              <div ref={endRef} />
            </div>
          )}
        </div>
      </div>

      {/* Floating Composer */}
      <div className="pt-2">
        <Composer
          onSend={(text) => void chat.send(text)}
          onStop={chat.stop}
          busy={chat.pending || chat.streamingId !== null}
        />
      </div>

      {/* Citation Right Drawer */}
      <CitationDrawer citation={drawer} onClose={() => setDrawer(null)} onAsk={askAboutSection} />

      {/* Lawyer Verification Modal */}
      <Modal
        open={verificationModalOpen}
        onClose={() => setVerificationModalOpen(false)}
        title={lang === 'bn' ? 'আইনজীবীর যাচাই অনুরোধ' : 'Request Advocate Verification'}
      >
        <div className="space-y-4 text-xs font-body">
          {verifSuccess ? (
            <div className="p-4 rounded bg-clay-tint border border-clay text-center space-y-2 text-clay-deep">
              <CheckCircle2 className="h-8 w-8 mx-auto text-clay-deep" />
              <h4 className="font-display text-sm font-bold text-ink">
                {lang === 'bn' ? 'যাচাই অনুরোধ সফলভাবে প্রেরিত হয়েছে!' : 'Verification Request Submitted!'}
              </h4>
              <p className="text-xs text-ink-soft">
                {lang === 'bn'
                  ? 'আমাদের অ্যাডমিন টিম প্রথমে অনুরোধটি পর্যালোচনা করে একজন সনদপ্রাপ্ত আইনজীবী নির্ধারণ করবে, যিনি ২৪ ঘণ্টার মধ্যে রায় ও পরামর্শ প্রদান করবেন।'
                  : 'Our admin team will first review your request and assign a certified advocate, who will issue an official verdict within 24 hours.'}
              </p>
              <div className="pt-2">
                <Button size="sm" variant="secondary" onClick={() => navigate('/app/verifications')}>
                  <span>{lang === 'bn' ? 'যাচাই তালিকায় দেখুন' : 'Go to Verifications'}</span>
                  <ArrowRight className="ml-1 h-3 w-3" />
                </Button>
              </div>
            </div>
          ) : (
            <>
              <p className="text-ink-soft leading-relaxed">
                {lang === 'bn'
                  ? 'এই এআই উত্তরের নির্ভুলতা ও সংশ্লিষ্ট আইনের ধারা একজন সনদপ্রাপ্ত আইনজীবীর মাধ্যমে যাচাই করাতে নিচের তথ্য নিশ্চিত করুন।'
                  : 'Submit this AI generated legal answer to the advocate verification queue for professional audit.'}
              </p>

              {/* Answer Snippet Preview */}
              <div className="p-3 bg-bone rounded border border-granite-soft text-xs text-ink-soft max-h-32 overflow-y-auto">
                <span className="font-mono text-[10px] uppercase text-clay-deep font-semibold block mb-1">
                  {lang === 'bn' ? 'পর্যালোচনাযোগ্য উত্তর' : 'Answer to be audited'}
                </span>
                <p className="line-clamp-3">
                  {selectedMessageForVerif ? selectedMessageForVerif.bodyBn : ''}
                </p>
              </div>

              {/* Urgency select */}
              <div className="space-y-1">
                <label className="block font-semibold uppercase text-ink-soft">
                  {lang === 'bn' ? 'জরুরি মাত্রা' : 'Urgency Level'}
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setVerifUrgency('normal')}
                    className={`p-2.5 rounded border text-left transition ${
                      verifUrgency === 'normal'
                        ? 'border-clay bg-clay-tint text-clay-deep font-semibold'
                        : 'border-granite bg-white text-ink-soft'
                    }`}
                  >
                    <span className="block font-bold">{lang === 'bn' ? 'সাধারণ (Normal)' : 'Standard'}</span>
                    <span className="text-[10px] text-granite">~24 hours · BDT 200</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setVerifUrgency('urgent')}
                    className={`p-2.5 rounded border text-left transition ${
                      verifUrgency === 'urgent'
                        ? 'border-clay bg-clay-tint text-clay-deep font-semibold'
                        : 'border-granite bg-white text-ink-soft'
                    }`}
                  >
                    <span className="block font-bold">{lang === 'bn' ? 'জরুরি (Urgent)' : 'Priority'}</span>
                    <span className="text-[10px] text-granite">~6 hours · BDT 300</span>
                  </button>
                </div>
              </div>

              {/* Payment Information */}
              <div className="p-3 bg-bone rounded border border-clay/20 space-y-2">
                <div className="flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 text-clay-deep mt-0.5 flex-shrink-0" />
                  <div className="space-y-1 text-[11px] text-ink-soft">
                    <p className="font-semibold text-ink">
                      {lang === 'bn' ? 'পেমেন্ট প্রয়োজন' : 'Payment Required'}
                    </p>
                    <p>
                      {lang === 'bn'
                        ? `যাচাইয়ের ফি: ৳${verifUrgency === 'normal' ? '২০০' : '৩০০'}। একজন সনদপ্রাপ্ত আইনজীবী আপনার উত্তরটি পর্যালোচনা করে বিশদ রায় প্রদান করবেন।`
                        : `Verification fee: BDT ${verifUrgency === 'normal' ? '200' : '300'}. A Bar Council certified advocate will review the AI answer and provide a detailed verdict.`}
                    </p>
                    <p className="text-clay-deep font-medium">
                      {lang === 'bn'
                        ? 'পেমেন্ট অনুরোধ নিশ্চিতকরণে আপনার bKash অ্যাপে পাঠানো হবে।'
                        : 'Payment request will be sent to your bKash app upon confirmation.'}
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-granite-soft">
                <Button size="sm" variant="ghost" onClick={() => setVerificationModalOpen(false)}>
                  {lang === 'bn' ? 'বাতিল' : 'Cancel'}
                </Button>
                <Button
                  size="sm"
                  variant="primary"
                  onClick={handleProceedToPayment}
                >
                  <ShieldCheck className="mr-1.5 h-3.5 w-3.5" />
                  <span>{lang === 'bn' ? 'পেমেন্ট করুন' : 'Proceed to Payment'}</span>
                </Button>
              </div>
            </>
          )}
        </div>
      </Modal>

      {/* Payment Process Modal */}
      <Modal
        open={paymentModalOpen}
        onClose={() => setPaymentModalOpen(false)}
        title={lang === 'bn' ? 'যাচাই ফি পেমেন্ট' : 'Verification Payment'}
      >
        <PaymentProcess
          amount={verifUrgency === 'urgent' ? 300 : 200}
          purpose="verification"
          urgency={verifUrgency}
          payee={payee}
          onSubmit={handlePaymentSubmit}
          onCancel={handleCancelPayment}
        />
      </Modal>
    </div>
  );
}
