import { CheckCircle2, Clock, AlertTriangle, XCircle, UserCheck } from 'lucide-react';
import { useLang } from '../../context/LanguageContext';
import type { LawyerVerificationStatus, VerdictType, ConsultationStatus, VerificationRequestStatus, StatuteStatus } from '../../mocks/types';

export type BadgeType =
  | LawyerVerificationStatus
  | VerdictType
  | ConsultationStatus
  | VerificationRequestStatus
  | StatuteStatus;

interface StatusBadgeProps {
  status: BadgeType;
  className?: string;
  size?: 'sm' | 'md';
}

export function StatusBadge({ status, className = '', size = 'sm' }: StatusBadgeProps) {
  const { lang } = useLang();

  const config: Record<
    string,
    { labelBn: string; labelEn: string; icon: typeof CheckCircle2; bg: string; text: string; border: string }
  > = {
    verified: {
      labelBn: 'যাচাইকৃত আইনজীবী',
      labelEn: 'Verified Advocate',
      icon: CheckCircle2,
      bg: 'bg-clay-tint',
      text: 'text-clay-deep',
      border: 'border-clay/40',
    },
    pending: {
      labelBn: 'যাচাই প্রক্রিয়াধীন',
      labelEn: 'Verification Pending',
      icon: Clock,
      bg: 'bg-bone-deep',
      text: 'text-ink-soft',
      border: 'border-granite',
    },
    claimed: {
      labelBn: 'আইনজীবী নির্ধারিত হয়েছে',
      labelEn: 'Assigned to Lawyer',
      icon: UserCheck,
      bg: 'bg-clay-tint',
      text: 'text-clay-deep',
      border: 'border-clay/40',
    },
    rejected: {
      labelBn: 'সনদপত্র বাতিল',
      labelEn: 'Credentials Rejected',
      icon: XCircle,
      bg: 'bg-brick/10',
      text: 'text-brick',
      border: 'border-brick/30',
    },
    accurate: {
      labelBn: 'নির্ভুল উত্তর',
      labelEn: 'Accurate Answer',
      icon: CheckCircle2,
      bg: 'bg-clay-tint',
      text: 'text-clay-deep',
      border: 'border-clay/40',
    },
    incomplete: {
      labelBn: 'সঠিক তবে অসম্পূর্ণ',
      labelEn: 'Accurate but Incomplete',
      icon: AlertTriangle,
      bg: 'bg-bone-deep',
      text: 'text-ink-soft',
      border: 'border-granite',
    },
    needs_correction: {
      labelBn: 'সংশোধন আবশ্যক',
      labelEn: 'Needs Correction',
      icon: AlertTriangle,
      bg: 'bg-bone-deep',
      text: 'text-ink',
      border: 'border-granite',
    },
    incorrect: {
      labelBn: 'ভুল ব্যাখ্যা',
      labelEn: 'Incorrect / Disputed',
      icon: XCircle,
      bg: 'bg-brick/10',
      text: 'text-brick',
      border: 'border-brick/30',
    },
    requested: {
      labelBn: 'অনুরোধ পাঠানো হয়েছে',
      labelEn: 'Requested',
      icon: Clock,
      bg: 'bg-bone-deep',
      text: 'text-ink-soft',
      border: 'border-granite',
    },
    accepted: {
      labelBn: 'আইনজীবী কর্তৃক গৃহীত',
      labelEn: 'Accepted',
      icon: CheckCircle2,
      bg: 'bg-clay-tint',
      text: 'text-clay-deep',
      border: 'border-clay/40',
    },
    scheduled: {
      labelBn: 'সময় নির্ধারিত',
      labelEn: 'Scheduled',
      icon: Clock,
      bg: 'bg-clay-tint',
      text: 'text-clay-deep',
      border: 'border-clay/40',
    },
    completed: {
      labelBn: 'সম্পন্ন',
      labelEn: 'Completed',
      icon: CheckCircle2,
      bg: 'bg-clay-tint',
      text: 'text-clay-deep',
      border: 'border-clay/40',
    },
    declined: {
      labelBn: 'বাতিলকৃত',
      labelEn: 'Declined',
      icon: XCircle,
      bg: 'bg-brick/10',
      text: 'text-brick',
      border: 'border-brick/30',
    },
    cancelled: {
      labelBn: 'বাতিল',
      labelEn: 'Cancelled',
      icon: XCircle,
      bg: 'bg-brick/10',
      text: 'text-brick',
      border: 'border-brick/30',
    },
    live: {
      labelBn: 'সক্রিয় (Live)',
      labelEn: 'Live in Corpus',
      icon: CheckCircle2,
      bg: 'bg-clay-tint',
      text: 'text-clay-deep',
      border: 'border-clay/40',
    },
    indexing: {
      labelBn: 'ইনডেক্সিং চলছে',
      labelEn: 'Indexing',
      icon: Clock,
      bg: 'bg-bone-deep',
      text: 'text-ink-soft',
      border: 'border-granite',
    },
    planned: {
      labelBn: 'পরিকল্পিত',
      labelEn: 'Planned',
      icon: Clock,
      bg: 'bg-bone',
      text: 'text-granite',
      border: 'border-granite-soft',
    },
  };

  const item = config[status] || {
    labelBn: status,
    labelEn: status,
    icon: Clock,
    bg: 'bg-bone-deep',
    text: 'text-ink-soft',
    border: 'border-granite',
  };

  const Icon = item.icon;
  const isSm = size === 'sm';

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded border font-mono font-medium uppercase tracking-wider ${
        item.bg
      } ${item.text} ${item.border} ${isSm ? 'px-2 py-0.5 text-[0.6875rem]' : 'px-2.5 py-1 text-xs'} ${className}`}
    >
      <Icon className={isSm ? 'h-3 w-3 shrink-0' : 'h-3.5 w-3.5 shrink-0'} />
      <span>{lang === 'bn' ? item.labelBn : item.labelEn}</span>
    </span>
  );
}

export function VerifiedBadge({ className = '' }: { className?: string }) {
  const { lang } = useLang();
  return (
    <span
      title={lang === 'bn' ? 'বাংলাদেশ বার কাউন্সিল সনদ যাচাইকৃত' : 'Bangladesh Bar Council Enrollment Verified'}
      className={`inline-flex items-center gap-1 rounded bg-clay-tint px-1.5 py-0.5 text-[0.6875rem] font-medium text-clay-deep border border-clay/30 ${className}`}
    >
      <CheckCircle2 className="h-3 w-3 text-clay-deep" />
      <span className="font-mono uppercase">{lang === 'bn' ? 'যাচাইকৃত' : 'Verified'}</span>
    </span>
  );
}
