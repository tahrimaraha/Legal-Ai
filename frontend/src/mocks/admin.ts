import { citations } from './citations';
import type { AdminStats, FlaggedAnswer } from './types';

export const mockAdminStats: AdminStats = {
  totalCitizens: 14280,
  totalLawyers: 48,
  pendingLawyers: 6,
  questionsAskedThisWeek: 3412,
  questionsTotal: 48920,
  unansweredVerificationsOver48h: 4,
  corpusHealthPct: 98.4,
  indexedStatutesCount: 8,
  weeklyQuestions: [
    { day: 'Sat', count: 410 },
    { day: 'Sun', count: 520 },
    { day: 'Mon', count: 580 },
    { day: 'Tue', count: 490 },
    { day: 'Wed', count: 510 },
    { day: 'Thu', count: 460 },
    { day: 'Fri', count: 442 },
  ],
  categoryBreakdown: [
    { category: 'Tenancy & Rent', categoryBn: 'বাড়িভাড়া ও উচ্ছেদ', count: 1280 },
    { category: 'Cyber Harassment', categoryBn: 'সাইবার ও অনলাইন নিরাপত্তা', count: 940 },
    { category: 'Domestic Violence', categoryBn: 'পারিবারিক সহিংসতা', count: 720 },
    { category: 'Consumer Rights', categoryBn: 'ভোক্তা অধিকার', count: 640 },
    { category: 'Penal / Criminal', categoryBn: 'দণ্ডবিধি ও প্রতারণা', count: 510 },
    { category: 'Inheritance & Land', categoryBn: 'উত্তরাধিকার ও জমিজমা', count: 320 },
  ],
};

export const mockFlaggedAnswers: FlaggedAnswer[] = [
  {
    id: 'flag-1',
    messageId: 'msg-flag-101',
    questionBn: 'বাড়িওয়ালা কি ভাড়ার চুক্তি শেষ হওয়ার আগে নোটিশ না দিয়েই উচ্ছেদ করতে পারেন?',
    questionEn: 'Can the landlord evict without notice before lease expiration?',
    answerBn: 'বাড়িওয়ালা যেকোনো সময় ১৫ দিনের নোটিশে উচ্ছেদ করতে পারেন।',
    answerEn: 'Landlord can evict at any time with 15 days notice.',
    reason: 'ধারা ১৮ অনুযায়ী নিয়মিত ভাড়া দিলে উচ্ছেদ নিষেধ। উত্তরে এটি ভুলভাবে ব্যাখ্যা করা হয়েছে।',
    status: 'pending',
    reportedAt: '2025-05-14T10:00:00Z',
    citations: [citations['rent-18']],
  },
  {
    id: 'flag-2',
    messageId: 'msg-flag-102',
    questionBn: 'সাইবার নিরাপত্তা আইনে ফেসবুক পোস্টের জন্য কোন ধারায় মামলা হয়?',
    questionEn: 'Which section applies to Facebook defamation under cyber laws?',
    answerBn: 'সাইবার নিরাপত্তা আইন ২০২৩ এর ধারা ২৮ অনুযায়ী...',
    answerEn: 'Under Section 28 of Cyber Security Act 2023...',
    reason: 'আইনটি ২০২৫ সালের অধ্যাদেশ দ্বারা প্রতিস্থাপিত হয়েছে; ধারার রেফারেন্স হালনাগাদ করা প্রয়োজন।',
    status: 'escalated',
    reportedAt: '2025-05-13T14:20:00Z',
    citations: [citations['cyber-24']],
  },
];
