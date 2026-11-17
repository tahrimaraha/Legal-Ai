import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  MapPin,
  Award,
  Calendar,
  Clock,
  ShieldCheck,
  Building,
  GraduationCap,
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  FileText,
  UserCheck,
  Star,
  MessageSquareText,
} from 'lucide-react';
import { useLang } from '../../context/LanguageContext';
import { getLawyerById, createConsultationRequest, listLawyerReviews, getLawyerOpenSlots, ApiError } from '../../lib/api';
import { OpenSlotPicker, DateTimeFields } from '../../components/ui/SlotPicker';
import { bdDate, slotProblem, formatSlot } from '../../lib/slots';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { Rating } from '../../components/ui/Rating';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { PaymentProcess } from '../../components/ui/PaymentProcess';
import { Input, Textarea } from '../../components/ui/Input';
import { Skeleton, ErrorState, EmptyState } from '../../components/ui/EmptyState';
import type { ConsultationSlot, LawyerProfile, LawyerReview } from '../../mocks/types';

export default function CitizenLawyerProfilePage() {
  const { id } = useParams<{ id: string }>();
  const { lang, num } = useLang();
  const navigate = useNavigate();

  const [lawyer, setLawyer] = useState<LawyerProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [reviews, setReviews] = useState<LawyerReview[]>([]);
  const [reviewsLoading, setReviewsLoading] = useState(true);

  // Booking Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [bookingStep, setBookingStep] = useState(0);
  const [topic, setTopic] = useState('');
  const [description, setDescription] = useState('');
  const [mode, setMode] = useState<'chat' | 'video' | 'in_person'>('video');
  // Lawyer's real open times; when they haven't published weekly hours the client proposes a time.
  const [slotInfo, setSlotInfo] = useState<{ hasSchedule: boolean; slots: ConsultationSlot[] } | null>(null);
  const [pickedSlot, setPickedSlot] = useState<ConsultationSlot | null>(null);
  const [customSlot, setCustomSlot] = useState<ConsultationSlot>({ date: bdDate(1), time: '10:00' });
  const [bookingError, setBookingError] = useState<string | null>(null);
  const [bookingLoading, setBookingLoading] = useState(false);
  const [bookingSuccess, setBookingSuccess] = useState(false);

  useEffect(() => {
    if (id) {
      getLawyerById(id).then((data) => {
        setLawyer(data || null);
        setLoading(false);
        if (data) {
          listLawyerReviews(data.id).then((r) => {
            setReviews(r);
            setReviewsLoading(false);
          });
        }
      });
    }
  }, [id]);

  useEffect(() => {
    if (!modalOpen || !lawyer) return;
    setBookingError(null);
    getLawyerOpenSlots(lawyer.id)
      .then((info) => {
        setSlotInfo(info);
        setPickedSlot((cur) => (cur && info.slots.some((x) => x.date === cur.date && x.time === cur.time) ? cur : info.slots[0] || null));
      })
      .catch(() => setSlotInfo({ hasSchedule: false, slots: [] }));
  }, [modalOpen, lawyer]);

  if (loading) {
    return <div className="space-y-6"><Skeleton className="h-40 w-full" /><Skeleton className="h-64 w-full" /></div>;
  }

  if (!lawyer) {
    return (
      <div className="py-8">
        <ErrorState title="Lawyer Not Found" message="The requested advocate could not be found." />
        <Link to="/app/lawyers" className="inline-flex items-center gap-1.5 text-xs text-clay-deep mt-4">
          <ArrowLeft className="h-4 w-4" />
          <span>Back to lawyers</span>
        </Link>
      </div>
    );
  }

  const selectedFee = lawyer.fees.find((f) => f.mode === mode)?.feeBdt || lawyer.startingFeeBdt;


  const chosenSlot: ConsultationSlot | null = slotInfo?.hasSchedule ? pickedSlot : customSlot;

  const handleProceedToPayment = () => {
    const problem = chosenSlot ? slotProblem(chosenSlot) : { en: 'Choose a time slot.', bn: 'একটি সময় নির্বাচন করুন।' };
    if (problem) {
      setBookingError(lang === 'bn' ? problem.bn : problem.en);
      return;
    }
    setBookingError(null);
    setModalOpen(false);
    setPaymentModalOpen(true);
  };

  const handlePaymentComplete = () => {
    setPaymentModalOpen(false);
    handleSubmitBooking();
  };

  const handleCancelPayment = () => {
    setPaymentModalOpen(false);
    setModalOpen(true);
  };

  const handleSubmitBooking = async () => {
    setBookingLoading(true);
    try {
      await createConsultationRequest({
        lawyerId: lawyer.id,
        topic: topic || 'পারিবারিক ও আইনি পরামর্শ',
        description,
        mode,
        feeBdt: selectedFee,
        slots: chosenSlot ? [chosenSlot] : [],
      });
      setBookingSuccess(true);
    } catch (err) {
      // e.g. the slot was taken meanwhile: reopen the form with the reason.
      setBookingError(err instanceof ApiError ? (lang === 'bn' ? err.messageBn : err.message) : String(err));
      setModalOpen(true);
    } finally {
      setBookingLoading(false);
    }
  };

  return (
    <div className="space-y-6 font-body">
      <Link
        to="/app/lawyers"
        className="inline-flex items-center gap-1.5 text-xs font-mono uppercase text-clay-deep hover:text-ink transition"
      >
        <ArrowLeft className="h-4 w-4" />
        <span>{lang === 'bn' ? 'সকল আইনজীবীতে ফিরুন' : 'Back to Directory'}</span>
      </Link>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Main profile */}
        <div className="lg:col-span-8 space-y-6">
          {/* Header Card */}
          <div className="rounded border border-granite bg-white p-6 shadow-sm">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5">
              <div className="h-20 w-20 rounded bg-clay-tint border-2 border-clay flex items-center justify-center shrink-0">
                <UserCheck className="h-10 w-10 text-clay-deep" />
              </div>
              <div className="space-y-1">
                <StatusBadge status={lawyer.verificationStatus} />
                <h1 className="font-display text-xl font-bold text-ink mt-1">
                  {lang === 'bn' ? lawyer.fullNameBn : lawyer.fullName}
                </h1>
                <p className="text-xs text-granite font-medium">
                  {lang === 'bn' ? lawyer.titleBn : lawyer.title}
                </p>
                <div className="flex items-center gap-4 text-xs text-ink-soft pt-1">
                  <span className="flex items-center gap-1">
                    <MapPin className="h-3 w-3 text-clay-deep" />
                    {lawyer.district}
                  </span>
                  <span className="font-mono">Enrolment: {lawyer.barEnrolmentNo}</span>
                  {lawyer.rating > 0 && <Rating value={lawyer.rating} count={lawyer.reviewCount} />}
                </div>
                {lawyer.isAvailableToday ? (
                  <span className="inline-flex items-center gap-1 text-[11px] font-mono text-green-700 mt-1">
                    <span className="h-1.5 w-1.5 rounded-full bg-green-600" />
                    {lang === 'bn' ? 'আজ উপলব্ধ' : 'Available Today'}
                  </span>
                ) : lawyer.awayNotice ? (
                  <span className="inline-flex items-center gap-1 text-[11px] font-mono text-brick mt-1">
                    <AlertCircle className="h-3 w-3" />
                    {lawyer.awayNotice}
                  </span>
                ) : null}
              </div>
            </div>

            {/* Track record stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5 pt-5 border-t border-granite-soft">
              <div>
                <span className="flex items-center gap-1 font-mono text-[10px] text-granite uppercase">
                  <Award className="h-3 w-3 text-clay-deep" />
                  {lang === 'bn' ? 'অভিজ্ঞতা' : 'Experience'}
                </span>
                <p className="text-sm font-bold text-ink mt-0.5">
                  {num(lawyer.experienceYears)} {lang === 'bn' ? 'বছর' : 'years'}
                </p>
              </div>
              <div>
                <span className="flex items-center gap-1 font-mono text-[10px] text-granite uppercase">
                  <Calendar className="h-3 w-3 text-clay-deep" />
                  {lang === 'bn' ? 'পরামর্শ সম্পন্ন' : 'Consultations'}
                </span>
                <p className="text-sm font-bold text-ink mt-0.5">{num(lawyer.totalConsultations)}</p>
              </div>
              <div>
                <span className="flex items-center gap-1 font-mono text-[10px] text-granite uppercase">
                  <ShieldCheck className="h-3 w-3 text-clay-deep" />
                  {lang === 'bn' ? 'উত্তর যাচাই' : 'AI Verifications'}
                </span>
                <p className="text-sm font-bold text-ink mt-0.5">{num(lawyer.totalVerifications)}</p>
              </div>
              <div>
                <span className="flex items-center gap-1 font-mono text-[10px] text-granite uppercase">
                  <Clock className="h-3 w-3 text-clay-deep" />
                  {lang === 'bn' ? 'সাড়া প্রদানের সময়' : 'Response Time'}
                </span>
                <p className="text-sm font-bold text-ink mt-0.5">
                  {lang === 'bn' ? lawyer.responseTimeCommitmentBn : lawyer.responseTimeCommitment}
                </p>
              </div>
            </div>
          </div>

          {/* Bio & Details */}
          <div className="rounded border border-granite bg-white p-6 shadow-sm space-y-3">
            <h2 className="font-mono text-label uppercase text-clay-deep font-semibold">
              {lang === 'bn' ? 'আইনজীবীর পরিচিতি' : 'Professional Summary'}
            </h2>
            <p className="text-sm text-ink-soft leading-relaxed">
              {lang === 'bn' ? lawyer.bioBn : lawyer.bioEn}
            </p>
          </div>

          {/* Practice areas */}
          <div className="rounded border border-granite bg-white p-6 shadow-sm space-y-3">
            <h2 className="font-mono text-label uppercase text-clay-deep font-semibold">
              {lang === 'bn' ? 'বিশেষায়িত ক্ষেত্র' : 'Practice Areas'}
            </h2>
            <div className="flex flex-wrap gap-1.5">
              {(lang === 'bn' ? lawyer.practiceAreasBn : lawyer.practiceAreas).map((a, i) => (
                <span key={i} className="rounded bg-bone-deep px-2.5 py-1 text-xs font-mono text-ink-soft border border-granite-soft">
                  {a}
                </span>
              ))}
            </div>
          </div>

          {/* Courts */}
          <div className="rounded border border-granite bg-white p-6 shadow-sm space-y-3">
            <h2 className="font-mono text-label uppercase text-clay-deep font-semibold flex items-center gap-1.5">
              <Building className="h-3.5 w-3.5" />
              {lang === 'bn' ? 'অনুশীলনরত আদালতসমূহ' : 'Courts of Practice'}
            </h2>
            <ul className="space-y-1.5">
              {(lang === 'bn' ? lawyer.courtsBn : lawyer.courts).map((c, i) => (
                <li key={i} className="text-sm text-ink-soft flex items-start gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-clay mt-1.5 shrink-0" />
                  {c}
                </li>
              ))}
            </ul>
          </div>

          {/* Education & Languages */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div className="rounded border border-granite bg-white p-6 shadow-sm space-y-3">
              <h2 className="font-mono text-label uppercase text-clay-deep font-semibold flex items-center gap-1.5">
                <GraduationCap className="h-3.5 w-3.5" />
                {lang === 'bn' ? 'শিক্ষাগত যোগ্যতা' : 'Education'}
              </h2>
              <ul className="space-y-1.5">
                {(lang === 'bn' ? lawyer.educationBn : lawyer.education).map((e, i) => (
                  <li key={i} className="text-sm text-ink-soft flex items-start gap-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-clay mt-1.5 shrink-0" />
                    {e}
                  </li>
                ))}
              </ul>
            </div>

            <div className="rounded border border-granite bg-white p-6 shadow-sm space-y-3">
              <h2 className="font-mono text-label uppercase text-clay-deep font-semibold flex items-center gap-1.5">
                <FileText className="h-3.5 w-3.5" />
                {lang === 'bn' ? 'ভাষা' : 'Languages Spoken'}
              </h2>
              <div className="flex flex-wrap gap-1.5">
                {lawyer.languages.map((l, i) => (
                  <span key={i} className="rounded bg-bone-deep px-2.5 py-1 text-xs font-mono text-ink-soft border border-granite-soft">
                    {l}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Client Reviews */}
          <div className="rounded border border-granite bg-white p-6 shadow-sm space-y-4">
            <h2 className="font-mono text-label uppercase text-clay-deep font-semibold flex items-center gap-1.5">
              <MessageSquareText className="h-3.5 w-3.5" />
              {lang === 'bn' ? 'ক্লায়েন্ট পর্যালোচনা' : 'Client Reviews'}
              {lawyer.reviewCount > 0 && <span className="text-granite normal-case">({num(lawyer.reviewCount)})</span>}
            </h2>

            {reviewsLoading ? (
              <Skeleton className="h-20 w-full" />
            ) : reviews.length === 0 ? (
              <EmptyState
                title={lang === 'bn' ? 'এখনো কোনো পর্যালোচনা নেই' : 'No Reviews Yet'}
                description={
                  lang === 'bn'
                    ? 'পরামর্শ সম্পন্নকারী প্রথম ক্লায়েন্ট হয়ে মতামত দিন।'
                    : 'Be the first client to leave feedback after a completed consultation.'
                }
              />
            ) : (
              <div className="space-y-3">
                {reviews.map((r) => (
                  <div key={r.id} className="p-4 rounded bg-bone border border-granite-soft space-y-1.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1">
                        {[1, 2, 3, 4, 5].map((s) => (
                          <Star key={s} className={`h-3.5 w-3.5 ${s <= r.rating ? 'fill-clay text-clay' : 'text-granite'}`} />
                        ))}
                      </div>
                      <span className="font-mono text-[10px] text-granite">
                        {new Date(r.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                    <p className="text-xs font-semibold text-ink">{r.citizenName}</p>
                    <p className="text-xs text-ink-soft leading-relaxed">{r.text}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Action Box */}
        <div className="lg:col-span-4 sticky top-20">
          <div className="rounded border border-granite bg-white p-6 shadow-composer space-y-5">
            <div>
              <span className="font-mono text-[10px] text-granite uppercase block">
                {lang === 'bn' ? 'পরামর্শ ফি' : 'Starting Consultation Fee'}
              </span>
              <p className="font-display text-2xl font-bold text-ink mt-0.5">
                ৳{num(lawyer.startingFeeBdt)} <span className="text-xs font-mono font-normal text-granite">BDT</span>
              </p>
            </div>

            <div className="space-y-2 text-xs">
              <span className="font-mono text-[11px] uppercase text-clay-deep font-semibold block">
                {lang === 'bn' ? 'পদ্ধতি ও সময়' : 'Available Consultation Modes'}
              </span>
              {lawyer.fees
                .filter((f) => f.mode !== 'audio')
                .map((f) => (
                  <div key={f.mode} className="flex justify-between border-b border-granite-soft pb-1.5 text-[11px]">
                    <span className="uppercase text-ink-soft">{f.mode} ({f.durationMinutes}m)</span>
                    <span className="font-bold text-ink">৳{num(f.feeBdt)}</span>
                  </div>
                ))}
            </div>

            <Button
              size="lg"
              variant="primary"
              onClick={() => {
                setBookingStep(0);
                setBookingSuccess(false);
                setModalOpen(true);
              }}
              className="w-full justify-center"
            >
              <Calendar className="mr-1.5 h-4 w-4" />
              <span>{lang === 'bn' ? 'পরামর্শের অনুরোধ পাঠান' : 'Book Consultation'}</span>
            </Button>
          </div>
        </div>
      </div>

      {/* Consultation Booking Modal */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={lang === 'bn' ? 'আইনজীবী পরামর্শের অনুরোধ' : 'Request Consultation Appointment'}
      >
        <div className="space-y-4 font-body text-xs">
          {bookingSuccess ? (
            <div className="p-4 rounded bg-clay-tint border border-clay text-center space-y-2 text-clay-deep">
              <CheckCircle2 className="h-8 w-8 mx-auto text-clay-deep" />
              <h4 className="font-display text-base font-bold text-ink">
                {lang === 'bn' ? 'পরামর্শের অনুরোধ সফলভাবে জমা হয়েছে!' : 'Consultation Request Submitted!'}
              </h4>
              <p className="text-xs text-ink-soft">
                {lang === 'bn'
                  ? `${lawyer.fullName} আপনার অনুরোধ ও সময়সূচি নিশ্চিত করবেন। আপনি নোটিফিকেশনে আপডেট পাবেন।`
                  : `${lawyer.fullName} will review your requested slot. You will receive a notification upon acceptance.`}
              </p>
              <div className="pt-2">
                <Button size="sm" variant="secondary" onClick={() => navigate('/app/consultations')}>
                  <span>{lang === 'bn' ? 'আমার পরামর্শসমূহ দেখুন' : 'Go to Consultations'}</span>
                </Button>
              </div>
            </div>
          ) : (
            <>
              {/* Sensitive info reminder */}
              <div className="rounded bg-bone-deep p-3 text-[11px] text-ink-soft border border-granite-soft flex items-start gap-2">
                <AlertCircle className="h-4 w-4 text-clay-deep shrink-0 mt-0.5" />
                <p>
                  {lang === 'bn'
                    ? 'সতর্কতা: দলিল বা তথ্য আপলোড করার পূর্বে সংবেদনশীল ব্যক্তিগত নম্বর (NID, ব্যাংক হিসাব) মুছে নিন।'
                    : 'Important: Redact sensitive personal identity numbers or banking details before sharing files.'}
                </p>
              </div>

              <Input
                type="text"
                label={lang === 'bn' ? 'পরামর্শের বিষয়' : 'Consultation Subject'}
                placeholder="e.g. Unlawful tenancy eviction notice"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                required
              />

              <Textarea
                label={lang === 'bn' ? 'ঘটনার বিবরণ ও সংক্ষিপ্ত প্রশ্ন' : 'Summary of Dispute & Key Facts'}
                placeholder="Describe what happened, dates, and what specific remedy you seek..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                required
              />

              {/* Mode Selector */}
              <div>
                <label className="block text-xs font-semibold uppercase text-ink-soft mb-1.5">
                  {lang === 'bn' ? 'পরামর্শের মাধ্যম' : 'Consultation Mode'}
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(['chat', 'video', 'in_person'] as const).map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setMode(m)}
                      className={`p-2 rounded border text-center transition uppercase font-mono text-[11px] ${
                        mode === m
                          ? 'border-clay bg-clay-tint text-clay-deep font-bold'
                          : 'border-granite bg-white text-ink-soft'
                      }`}
                    >
                      {m}
                    </button>
                  ))}
                </div>
              </div>

              {/* Date & Time Slot */}
              {slotInfo === null ? (
                <Skeleton className="h-24 w-full" />
              ) : slotInfo.hasSchedule ? (
                <OpenSlotPicker slots={slotInfo.slots} value={pickedSlot} onChange={setPickedSlot} lang={lang} />
              ) : (
                <div className="space-y-1.5">
                  <DateTimeFields value={customSlot} onChange={setCustomSlot} lang={lang} />
                  <p className="text-[11px] text-granite">
                    {lang === 'bn'
                      ? 'এই আইনজীবী নির্দিষ্ট সময়সূচি দেননি — আপনার পছন্দের সময় প্রস্তাব করুন, তিনি নিশ্চিত করবেন।'
                      : "This lawyer hasn't published set hours — propose a time and they will confirm it."}
                  </p>
                </div>
              )}
              {chosenSlot && !slotProblem(chosenSlot) && (
                <p className="text-xs text-ink-soft">
                  {lang === 'bn' ? 'নির্বাচিত সময়: ' : 'Selected: '}
                  <span className="font-semibold">{formatSlot(chosenSlot, lang)}</span>
                </p>
              )}
              {bookingError && <p className="text-xs font-medium text-brick">{bookingError}</p>}

              {/* Fee acknowledgement */}
              <div className="p-3 bg-bone rounded border border-granite-soft flex items-center justify-between text-xs">
                <span className="font-semibold text-ink-soft uppercase">
                  {lang === 'bn' ? 'ধার্যকৃত ফি:' : 'Total Session Fee:'}
                </span>
                <span className="font-mono font-bold text-ink">৳{num(selectedFee)} BDT</span>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-granite-soft">
                <Button size="sm" variant="ghost" onClick={() => setModalOpen(false)}>
                  {lang === 'bn' ? 'বাতিল' : 'Cancel'}
                </Button>
                <Button
                  size="sm"
                  variant="primary"
                  onClick={handleProceedToPayment}
                >
                  <Calendar className="mr-1.5 h-3.5 w-3.5" />
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
        title={lang === 'bn' ? 'পরামর্শ ফি পেমেন্ট' : 'Consultation Payment'}
      >
        <PaymentProcess
          amount={selectedFee}
          urgency="normal"
          onPaymentComplete={handlePaymentComplete}
          onCancel={handleCancelPayment}
        />
      </Modal>
    </div>
  );
}
