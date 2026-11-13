import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  ArrowLeft,
  Mail,
  FileText,
  Star,
  UserCheck,
  Pencil,
} from 'lucide-react';
import { useLang } from '../../context/LanguageContext';
import { getConsultationById, submitConsultationReview, updateConsultationDetails } from '../../lib/api';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { Timeline } from '../../components/ui/Timeline';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { Input, Textarea } from '../../components/ui/Input';
import { Skeleton, ErrorState } from '../../components/ui/EmptyState';
import type { ConsultationRequest } from '../../mocks/types';

export default function CitizenConsultationDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { lang, num } = useLang();

  const [consultation, setConsultation] = useState<ConsultationRequest | null>(null);
  const [loading, setLoading] = useState(true);

  // Review Modal State
  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewText, setReviewText] = useState('');
  const [reviewLoading, setReviewLoading] = useState(false);

  // Edit Subject/Summary Modal State
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editTopic, setEditTopic] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editLoading, setEditLoading] = useState(false);

  useEffect(() => {
    if (id) {
      getConsultationById(id).then((data) => {
        setConsultation(data || null);
        setLoading(false);
      });
    }
  }, [id]);

  if (loading) {
    return <div className="space-y-6"><Skeleton className="h-8 w-48" /><Skeleton className="h-96 w-full" /></div>;
  }

  if (!consultation) {
    return (
      <div className="py-8">
        <ErrorState title="Consultation Not Found" message="The requested consultation record was not located." />
        <Link to="/app/consultations" className="inline-flex items-center gap-1.5 text-xs text-clay-deep mt-4">
          <ArrowLeft className="h-4 w-4" />
          <span>Back to consultations</span>
        </Link>
      </div>
    );
  }

  const canEditDetails = !['completed', 'cancelled', 'declined'].includes(consultation.status);

  const handleOpenEdit = () => {
    setEditTopic(lang === 'bn' ? consultation.topicBn : consultation.topicEn);
    setEditDescription(consultation.description);
    setEditModalOpen(true);
  };

  const handleEditSubmit = async () => {
    setEditLoading(true);
    try {
      const updated = await updateConsultationDetails(consultation.id, {
        topic: editTopic,
        description: editDescription,
      });
      setConsultation(updated);
      setEditModalOpen(false);
    } finally {
      setEditLoading(false);
    }
  };

  const handleReviewSubmit = async () => {
    setReviewLoading(true);
    try {
      await submitConsultationReview(consultation.id, reviewRating, reviewText);
      setConsultation({
        ...consultation,
        review: { rating: reviewRating, text: reviewText, createdAt: new Date().toISOString() },
      });
      setReviewModalOpen(false);
    } finally {
      setReviewLoading(false);
    }
  };

  return (
    <div className="space-y-6 font-body">
      {/* Top breadcrumb & badge */}
      <div className="flex items-center justify-between">
        <Link
          to="/app/consultations"
          className="inline-flex items-center gap-1.5 text-xs font-mono uppercase text-clay-deep hover:text-ink transition"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>{lang === 'bn' ? 'সকল পরামর্শে ফিরুন' : 'Back to Consultations'}</span>
        </Link>
        <StatusBadge status={consultation.status} size="md" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Details, Shared Docs, Review (span-7) */}
        <div className="lg:col-span-7 space-y-6">
          {/* Main Info Card */}
          <div className="rounded border border-granite bg-white p-6 shadow-sm space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <span className="font-mono text-[10px] text-granite uppercase block">
                  {lang === 'bn' ? 'পরামর্শের বিষয়' : 'Consultation Topic'}
                </span>
                <h1 className="font-display text-xl font-bold text-ink mt-0.5">
                  {lang === 'bn' ? consultation.topicBn : consultation.topicEn}
                </h1>
              </div>
              {canEditDetails && (
                <Button size="sm" variant="ghost" onClick={handleOpenEdit} className="shrink-0">
                  <Pencil className="mr-1.5 h-3.5 w-3.5" />
                  <span>{lang === 'bn' ? 'সম্পাদনা' : 'Edit'}</span>
                </Button>
              )}
            </div>

            <p className="text-xs text-ink-soft leading-relaxed whitespace-pre-line bg-bone p-3.5 rounded border border-granite-soft">
              {consultation.description}
            </p>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs pt-2">
              <div>
                <span className="font-mono text-[10px] text-granite uppercase block">Mode</span>
                <span className="font-bold text-ink uppercase">{consultation.mode}</span>
              </div>
              <div>
                <span className="font-mono text-[10px] text-granite uppercase block">Fee</span>
                <span className="font-bold text-ink font-mono">৳{num(consultation.feeBdt)} BDT</span>
              </div>
              <div>
                <span className="font-mono text-[10px] text-granite uppercase block">Confirmed Slot</span>
                <span className="font-bold text-clay-deep font-mono">
                  {consultation.scheduledSlot
                    ? `${consultation.scheduledSlot.date} @ ${consultation.scheduledSlot.time}`
                    : 'Pending'}
                </span>
              </div>
            </div>
          </div>

          {/* Shared Documents */}
          <div className="rounded border border-granite bg-white p-6 shadow-sm space-y-3">
            <h2 className="font-mono text-label uppercase text-clay-deep font-semibold">
              {lang === 'bn' ? 'সংযুক্ত নথিপত্র (Shared Documents)' : 'Shared Case Files'}
            </h2>
            {consultation.attachments && consultation.attachments.length > 0 ? (
              <div className="space-y-2">
                {consultation.attachments.map((file, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between p-3 rounded border border-granite-soft bg-bone text-xs"
                  >
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-clay-deep" />
                      <span className="font-medium text-ink truncate">{file.name}</span>
                    </div>
                    <span className="font-mono text-[10px] text-granite">{file.size}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-granite py-2">
                {lang === 'bn' ? 'কোনো ফাইল সংযুক্ত করা হয়নি।' : 'No case documents attached.'}
              </p>
            )}
          </div>

          {/* Client Review Section */}
          {consultation.status === 'completed' && (
            <div className="rounded border border-granite bg-white p-6 shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="font-mono text-label uppercase text-clay-deep font-semibold">
                  {lang === 'bn' ? 'আপনার প্রতিক্রিয়া ও রেটিং' : 'Your Review & Rating'}
                </h2>
                {!consultation.review && (
                  <Button size="sm" variant="secondary" onClick={() => setReviewModalOpen(true)}>
                    <Star className="mr-1 h-3.5 w-3.5" />
                    <span>{lang === 'bn' ? 'মতামত দিন' : 'Leave Review'}</span>
                  </Button>
                )}
              </div>

              {consultation.review ? (
                <div className="p-4 rounded bg-bone border border-granite-soft space-y-2 text-xs">
                  <div className="flex items-center gap-1 text-clay">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <Star
                        key={s}
                        className={`h-4 w-4 ${s <= consultation.review!.rating ? 'fill-clay text-clay' : 'text-granite'}`}
                      />
                    ))}
                  </div>
                  <p className="text-ink-soft italic">"{consultation.review.text}"</p>
                </div>
              ) : (
                <p className="text-xs text-granite">
                  {lang === 'bn'
                    ? 'পরামর্শ সম্পন্ন হয়েছে। আপনার অভিজ্ঞতা শেয়ার করতে রেটিং দিন।'
                    : 'The consultation has concluded. Share feedback to help other citizens.'}
                </p>
              )}
            </div>
          )}
        </div>

        {/* Right Column: Advocate Card & Status Timeline (span-5) */}
        <div className="lg:col-span-5 space-y-6">
          {/* Advocate Card */}
          <div className="rounded border border-granite bg-white p-5 shadow-sm space-y-4">
            <span className="font-mono text-[10px] text-granite uppercase block">
              {lang === 'bn' ? 'দায়িত্বপ্রাপ্ত আইনজীবী' : 'Assigned Advocate'}
            </span>
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded bg-clay-tint border border-clay flex items-center justify-center">
                <UserCheck className="h-6 w-6 text-clay-deep" />
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="font-display text-sm font-bold text-ink truncate">
                  {lang === 'bn' ? consultation.lawyerNameBn : consultation.lawyerName}
                </h3>
                <Link to={`/app/lawyers/${consultation.lawyerId}`} className="text-xs text-clay-deep hover:underline">
                  {lang === 'bn' ? 'প্রোফাইল দেখুন →' : 'View Profile →'}
                </Link>
              </div>
            </div>

            <Link to="/app/messages" className="block pt-2 border-t border-granite-soft">
              <Button size="sm" variant="secondary" className="w-full justify-center">
                <Mail className="mr-1.5 h-3.5 w-3.5" />
                <span>{lang === 'bn' ? 'বার্তা পাঠান' : 'Direct Message'}</span>
              </Button>
            </Link>
          </div>

          {/* Status Timeline */}
          <div className="rounded border border-granite bg-white p-5 shadow-sm space-y-4">
            <h3 className="font-mono text-label uppercase text-clay-deep font-semibold">
              {lang === 'bn' ? 'অগ্রগতি টাইমলাইন' : 'Progress Timeline'}
            </h3>
            <Timeline items={consultation.timeline} />
          </div>
        </div>
      </div>

      {/* Review Modal */}
      <Modal
        open={reviewModalOpen}
        onClose={() => setReviewModalOpen(false)}
        title={lang === 'bn' ? 'পরামর্শের মূল্যায়ন' : 'Rate Your Consultation'}
      >
        <div className="space-y-4 text-xs font-body">
          <div className="space-y-1">
            <label className="block font-semibold uppercase text-ink-soft">
              {lang === 'bn' ? 'রেটিং দিন' : 'Rating (1 to 5 Stars)'}
            </label>
            <div className="flex items-center gap-2 py-1">
              {[1, 2, 3, 4, 5].map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setReviewRating(s)}
                  className="p-1 text-clay"
                >
                  <Star className={`h-6 w-6 ${s <= reviewRating ? 'fill-clay text-clay' : 'text-granite'}`} />
                </button>
              ))}
            </div>
          </div>

          <Textarea
            label={lang === 'bn' ? 'আপনার মন্তব্য' : 'Review Comments'}
            placeholder="Share your experience regarding legal clarity, timeliness, and professionalism..."
            value={reviewText}
            onChange={(e) => setReviewText(e.target.value)}
            rows={3}
            required
          />

          <div className="flex justify-end gap-2 pt-2">
            <Button size="sm" variant="ghost" onClick={() => setReviewModalOpen(false)}>
              Cancel
            </Button>
            <Button size="sm" variant="primary" onClick={handleReviewSubmit} loading={reviewLoading}>
              Submit Review
            </Button>
          </div>
        </div>
      </Modal>

      {/* Edit Subject/Summary Modal */}
      <Modal
        open={editModalOpen}
        onClose={() => setEditModalOpen(false)}
        title={lang === 'bn' ? 'বিষয় ও বিবরণ সম্পাদনা' : 'Edit Subject & Summary'}
      >
        <div className="space-y-4 text-xs font-body">
          <p className="text-[11px] text-granite">
            {lang === 'bn'
              ? 'শুধুমাত্র পরামর্শের বিষয় ও বিবরণ সম্পাদনাযোগ্য। মাধ্যম, ফি ও সময়সূচি পরিবর্তন করতে আইনজীবীর সাথে যোগাযোগ করুন।'
              : 'Only the consultation subject and summary can be edited. To change mode, fee, or scheduling, contact your advocate directly.'}
          </p>

          <Input
            type="text"
            label={lang === 'bn' ? 'পরামর্শের বিষয়' : 'Consultation Subject'}
            value={editTopic}
            onChange={(e) => setEditTopic(e.target.value)}
            required
          />

          <Textarea
            label={lang === 'bn' ? 'ঘটনার বিবরণ ও সংক্ষিপ্ত প্রশ্ন' : 'Summary of Dispute & Key Facts'}
            value={editDescription}
            onChange={(e) => setEditDescription(e.target.value)}
            rows={4}
            required
          />

          <div className="flex justify-end gap-2 pt-2">
            <Button size="sm" variant="ghost" onClick={() => setEditModalOpen(false)}>
              {lang === 'bn' ? 'বাতিল' : 'Cancel'}
            </Button>
            <Button size="sm" variant="primary" onClick={handleEditSubmit} loading={editLoading}>
              {lang === 'bn' ? 'সংরক্ষণ করুন' : 'Save Changes'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
