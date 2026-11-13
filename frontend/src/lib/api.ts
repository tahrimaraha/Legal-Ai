/**
 * The single seam between this frontend and the Python RAG / FastAPI backend.
 * Every function below returns the exact shape specified in Appendix A, fetched
 * from `import.meta.env.VITE_API_URL`.
 */
import type {
  AdminStats,
  AppNotification,
  Citation,
  ConsultationRequest,
  ConsultationSlot,
  Conversation,
  CorpusDocument,
  DraftDocument,
  DraftTemplate,
  FlaggedAnswer,
  GlossaryTerm,
  LawyerProfile,
  LawyerRecommendation,
  LawyerReview,
  Meeting,
  Message,
  MessageReport,
  Statute,
  Thread,
  User,
  VerificationRequest,
  VerificationVerdict,
  VerdictType,
} from '../mocks/types';

// --- BACKEND TRANSPORT ---
// Every function below talks to FastAPI (docs/api-contract.md).

const API_BASE = (import.meta.env.VITE_API_URL as string | undefined) ?? 'http://localhost:8000/api/v1';

/** Thrown by `apiRequest` for any non-2xx response; carries the backend's bilingual error envelope. */
export class ApiError extends Error {
  status: number;
  code: string;
  messageBn: string;
  details: Record<string, unknown>;

  constructor(status: number, code: string, messageEn: string, messageBn: string, details: Record<string, unknown> = {}) {
    super(messageEn);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.messageBn = messageBn;
    this.details = details;
  }
}

/** Fired when the backend rejects the stored token; RoleContext logs out. */
export const UNAUTHORIZED_EVENT = 'legal-ai:unauthorized';

/** Same key RoleContext stores the session token under. */
const TOKEN_KEY = 'legal_ai_token';

function storedToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

async function apiRequest<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = storedToken();
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    },
  });
  const data = await res.json().catch(() => ({}));
  if (res.status === 401 && token) {
    window.dispatchEvent(new Event(UNAUTHORIZED_EVENT));
  }
  if (!res.ok) {
    const err = data?.error ?? {};
    throw new ApiError(
      res.status,
      err.code ?? 'UNKNOWN_ERROR',
      err.message_en ?? 'Something went wrong. Please try again.',
      err.message_bn ?? 'কিছু একটা সমস্যা হয়েছে। আবার চেষ্টা করুন।',
      err.details ?? {},
    );
  }
  return data as T;
}

/** For lookups whose callers treat "not found" as `undefined` rather than an error. */
async function orUndefined<T>(request: Promise<T>): Promise<T | undefined> {
  try {
    return await request;
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) return undefined;
    throw err;
  }
}

const qs = (params: Record<string, string | number | boolean | undefined>) => {
  const entries = Object.entries(params).filter(([, v]) => v !== undefined && v !== '');
  return entries.length ? `?${new URLSearchParams(entries.map(([k, v]) => [k, String(v)]))}` : '';
};

function authHeader(token: string): HeadersInit {
  return { Authorization: `Bearer ${token}` };
}

/** Slim server-side shape returned by /auth/register/lawyer — not the rich directory-listing LawyerProfile. */
export interface LawyerRegistrationProfile {
  userId: string;
  barEnrolmentNo: string;
  enrolmentYear: number | null;
  district: string | null;
  practiceAreas: string[];
  startingFeeBdt: number | null;
  bio: string | null;
  approvalStatus: string;
  yearsOfExperience: number | null;
}

export async function loginUser(email: string, password: string): Promise<{ user: User; token: string }> {
  return apiRequest('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
}

export async function registerCitizen(data: {
  name: string;
  email: string;
  phone?: string;
  district?: string;
  password: string;
}): Promise<{ user: User; token: string; devVerificationCode?: string | null }> {
  return apiRequest('/auth/register/citizen', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function registerLawyer(data: {
  fullName: string;
  email: string;
  phone: string;
  district: string;
  password: string;
  barEnrolmentNo: string;
  enrolmentYear: number;
  practiceAreas: string[];
  startingFeeBdt: number;
  bio: string;
  licenseDocumentUrl: string;
  licenseDocumentName: string;
}): Promise<{ user: User; lawyerProfile: LawyerRegistrationProfile; token: string; devVerificationCode?: string | null }> {
  return apiRequest('/auth/register/lawyer', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function getCurrentUser(token: string): Promise<User> {
  return apiRequest('/auth/me', { headers: authHeader(token) });
}

export async function verifyEmailCode(code: string, token: string): Promise<{ ok: boolean }> {
  return apiRequest('/auth/verify-email', {
    method: 'POST',
    headers: authHeader(token),
    body: JSON.stringify({ code }),
  });
}

/** Public: verifies an unverified account by email + code and signs it in. */
export async function confirmEmailVerification(email: string, code: string): Promise<{ user: User; token: string }> {
  return apiRequest('/auth/verify-email/confirm', {
    method: 'POST',
    body: JSON.stringify({ email, code }),
  });
}

/** Public: sends a fresh verification code. `devVerificationCode` is only set in local dev. */
export async function resendVerificationCode(email: string): Promise<{ ok: boolean; devVerificationCode?: string | null }> {
  return apiRequest('/auth/resend-verification', {
    method: 'POST',
    body: JSON.stringify({ email }),
  });
}

/** Emails a 6-digit reset code (always ok, even for unknown emails). `devVerificationCode` is dev-only. */
export async function sendForgotPassword(email: string): Promise<{ ok: boolean; devVerificationCode?: string | null }> {
  return apiRequest('/auth/forgot-password', { method: 'POST', body: JSON.stringify({ email }) });
}

export async function resetPassword(email: string, code: string, newPassword: string): Promise<{ ok: boolean }> {
  return apiRequest('/auth/reset-password', {
    method: 'POST',
    body: JSON.stringify({ email, code, newPassword }),
  });
}

/** Signed-in users only; checks the current password first. */
export async function changePassword(currentPassword: string, newPassword: string): Promise<{ ok: boolean }> {
  return apiRequest('/auth/change-password', {
    method: 'POST',
    body: JSON.stringify({ currentPassword, newPassword }),
  });
}

// --- MANUAL WALLET PAYMENTS ---

export type WalletMethod = 'bkash' | 'nagad' | 'rocket';

/** What the citizen submits after sending money with the wallet's "Send Money". */
export interface ManualPayment {
  method: WalletMethod;
  payerNumber: string;
  trxId: string;
}

export interface PaymentMethodOption {
  id: WalletMethod;
  name: string;
  /** The platform's wallet number to send money to. */
  receiverNumber: string;
}

export interface AdminPayment {
  id: string;
  purpose: 'verification' | 'consultation' | 'document';
  referenceId: string;
  payerId: string;
  payerName: string;
  amountBdt: number;
  method: string;
  payerNumber: string | null;
  trxId: string | null;
  status: 'pending' | 'confirmed' | 'rejected';
  createdAt: string;
}

export async function listPaymentMethods(): Promise<PaymentMethodOption[]> {
  return apiRequest('/payments/methods');
}

// --- STATUTES & GLOSSARY API ---

export async function listStatutes(): Promise<Statute[]> {
  return apiRequest('/statutes');
}

export async function getStatuteBySlug(slug: string): Promise<Statute | undefined> {
  return orUndefined(apiRequest(`/statutes/${encodeURIComponent(slug)}`));
}

export async function searchGlossary(query?: string): Promise<GlossaryTerm[]> {
  return apiRequest(`/glossary${qs({ q: query?.trim() })}`);
}

// --- CONVERSATIONS & CHAT API ---

export async function listConversations(): Promise<Conversation[]> {
  return apiRequest('/conversations');
}

export async function getConversation(id: string): Promise<Conversation | undefined> {
  return orUndefined(apiRequest(`/conversations/${encodeURIComponent(id)}`));
}

export async function deleteConversation(id: string): Promise<{ ok: boolean }> {
  return apiRequest(`/conversations/${encodeURIComponent(id)}`, { method: 'DELETE' });
}

export async function askQuestion(question: string, conversationId?: string): Promise<{ message: Message; conversationId: string }> {
  return apiRequest('/chat', { method: 'POST', body: JSON.stringify({ question, conversationId }) });
}

export async function sendFeedback(
  messageId: string,
  value: 'up' | 'down' | 'flag',
  reason?: string,
): Promise<{ ok: boolean; messageId: string }> {
  return apiRequest(`/messages/${encodeURIComponent(messageId)}/feedback`, {
    method: 'POST',
    body: JSON.stringify({ value, reason }),
  });
}

// --- LAWYER DIRECTORY & PROFILE API ---

export async function listLawyers(filters?: {
  area?: string;
  district?: string;
  verifiedOnly?: boolean;
  maxFee?: number;
}): Promise<LawyerProfile[]> {
  // The public directory only ever lists approved lawyers, so `verifiedOnly` is implicit.
  return apiRequest(`/lawyers${qs({ area: filters?.area, district: filters?.district, maxFee: filters?.maxFee })}`);
}

const RECOMMENDATION_DOMAINS: { keywords: RegExp; areaHints: string[] }[] = [
  { keywords: /\brent\b|\blandlord\b|\btenant\b|\bevict(ion|ed|ing)?\b|বাড়ি ?ভাড়া|বাড়িওয়ালা|উচ্ছেদ/i, areaHints: ['tenancy', 'rent', 'house rent', 'land transfer'] },
  { keywords: /\bcyber\b|\bfacebook\b|\bhack(ed|ing)?\b|\bphoto\b|\bblackmail(ed|ing)?\b|\bonline\b|\bdefam(e|ation)?\b|সাইবার|হ্যাক|ছবি|ব্ল্যাকমেইল/i, areaHints: ['cyber', 'digital', 'defamation', 'media'] },
  { keywords: /\bviolence\b|\babuse[ds]?\b|\bdowry\b|\bwife\b|\bhusband\b|\bcustody\b|\bdivorce\b|নির্যাতন|যৌতুক|পারিবারিক|তালাক|ভরণপোষণ/i, areaHints: ['domestic violence', 'dowry', 'family', 'custody', 'maintenance', 'denmohor'] },
  { keywords: /\bconsumer\b|\bmrp\b|\bovercharg(e|ed|ing)\b|\bprice\b|\breceipt\b|ভোক্তা|দাম|রসিদ/i, areaHints: ['consumer'] },
  { keywords: /\bcriminal\b|\bfraud\b|\bcheat(ed|ing)?\b|\btheft\b|\bassault(ed)?\b|জালিয়াতি|প্রতারণা|চুরি/i, areaHints: ['criminal', 'penal code', 'cheating', 'fraud'] },
  { keywords: /\bland\b|\bproperty\b|\bdeed\b|\bmutation\b|\btitle\b|জমি|সম্পত্তি|দলিল/i, areaHints: ['land', 'property'] },
  { keywords: /\blabou?r\b|\bjob\b|\bsalary\b|\bworkplace\b|\bmaternity\b|শ্রম|চাকরি|বেতন/i, areaHints: ['labour', 'maternity'] },
  { keywords: /\bconstitution(al)?\b|\brights?\b|\bwrit\b|সংবিধান|অধিকার|রিট/i, areaHints: ['constitutional', 'writ', 'fundamental rights'] },
  { keywords: /\binherit(ance)?\b|\bsuccession\b|\bwill\b|উত্তরাধিকার|ওয়ারিশ/i, areaHints: ['succession', 'inheritance'] },
  { keywords: /\bcontract\b|\bagreement\b|\bbusiness\b|চুক্তি|ব্যবসা/i, areaHints: ['contract'] },
];

/** Ranks the live directory client-side; the scoring is presentation, not data. */
export async function getAiLawyerRecommendations(query: string): Promise<LawyerRecommendation[]> {
  const q = query.trim();
  const matchedHints = new Set<string>();
  RECOMMENDATION_DOMAINS.forEach((d) => {
    if (d.keywords.test(q)) d.areaHints.forEach((h) => matchedHints.add(h));
  });

  const lawyers = await listLawyers();
  const scored = lawyers.map((lawyer) => {
    const matchedAreas = lawyer.practiceAreas.filter((area) =>
      Array.from(matchedHints).some((hint) => area.toLowerCase().includes(hint)),
    );
    let score = matchedAreas.length * 12;
    score += lawyer.rating * 3;
    score += Math.min(lawyer.reviewCount / 10, 5);
    if (lawyer.isAvailableToday) score += 4;
    if (lawyer.verificationStatus === 'verified') score += 3;
    return { lawyer, score, matchedAreas };
  });

  const relevant = matchedHints.size > 0 ? scored.filter((s) => s.matchedAreas.length > 0) : scored;
  const ranked = (relevant.length > 0 ? relevant : scored).sort((a, b) => b.score - a.score).slice(0, 4);

  return ranked.map(({ lawyer, score, matchedAreas }) => {
    const areaLabel = matchedAreas[0] || lawyer.practiceAreas[0];
    const availabilityEn = lawyer.isAvailableToday ? ' · Available today' : '';
    const availabilityBn = lawyer.isAvailableToday ? ' · আজ উপলব্ধ' : '';
    const reasonEn = matchedAreas.length > 0
      ? `Specializes in ${areaLabel} · ★ ${lawyer.rating} (${lawyer.reviewCount} reviews)${availabilityEn}`
      : `Top-rated advocate · ★ ${lawyer.rating} (${lawyer.reviewCount} reviews)${availabilityEn}`;
    const reasonBn = matchedAreas.length > 0
      ? `বিশেষজ্ঞ: ${areaLabel} · ★ ${lawyer.rating} (${lawyer.reviewCount}টি পর্যালোচনা)${availabilityBn}`
      : `সর্বোচ্চ রেটেড আইনজীবী · ★ ${lawyer.rating} (${lawyer.reviewCount}টি পর্যালোচনা)${availabilityBn}`;
    return { lawyer, score, matchedAreas, reasonBn, reasonEn };
  });
}

export async function getLawyerById(id: string): Promise<LawyerProfile | undefined> {
  return orUndefined(apiRequest(`/lawyers/${encodeURIComponent(id)}`));
}

/** Updates the signed-in lawyer's own profile. */
export async function updateLawyerProfile(profile: Partial<LawyerProfile>): Promise<LawyerProfile> {
  return apiRequest('/lawyers/me', { method: 'PATCH', body: JSON.stringify(profile) });
}

export interface WeeklyAvailability {
  /** `"<Weekday>-<HH:MM>"`, e.g. `"Sunday-16:00"`. */
  slots: string[];
  vacationMode: boolean;
}

export async function getMyAvailability(): Promise<WeeklyAvailability> {
  return apiRequest('/lawyers/me/availability');
}

export async function saveMyAvailability(data: WeeklyAvailability): Promise<WeeklyAvailability> {
  return apiRequest('/lawyers/me/availability', { method: 'PUT', body: JSON.stringify(data) });
}

// --- VERIFICATIONS API ---

/** The backend scopes the list by the caller's role (own / assigned / all), so the arguments are informational. */
export async function listVerifications(_role?: 'citizen' | 'lawyer' | 'admin', _userId?: string): Promise<VerificationRequest[]> {
  return apiRequest('/verifications');
}

export async function getVerificationById(id: string): Promise<VerificationRequest | undefined> {
  return orUndefined(apiRequest(`/verifications/${encodeURIComponent(id)}`));
}

export async function createVerificationRequest(data: {
  conversationId: string;
  messageId: string;
  questionText: string;
  answerText: string;
  citations: Citation[];
  urgency?: 'normal' | 'urgent';
  payment: ManualPayment;
}): Promise<VerificationRequest> {
  return apiRequest('/verifications', { method: 'POST', body: JSON.stringify(data) });
}

/** Admin: assign a pending request to an approved lawyer. */
export async function assignVerificationRequest(requestId: string, lawyerId: string, _lawyerName: string): Promise<VerificationRequest> {
  return apiRequest(`/verifications/${encodeURIComponent(requestId)}/assign`, {
    method: 'POST',
    body: JSON.stringify({ lawyerId }),
  });
}

export async function declineVerificationRequest(requestId: string, reason: string): Promise<VerificationRequest> {
  return apiRequest(`/verifications/${encodeURIComponent(requestId)}/decline`, {
    method: 'POST',
    body: JSON.stringify({ reason }),
  });
}

/** The verdict is attributed to the signed-in lawyer; the lawyer fields are kept for signature compatibility. */
export async function submitVerificationVerdict(
  requestId: string,
  verdictData: {
    lawyerId: string;
    lawyerName: string;
    lawyerNameBn: string;
    lawyerAvatar: string;
    lawyerEnrolmentNo: string;
    verdict: VerdictType;
    correctedExplanationBn: string;
    correctedExplanationEn: string;
    addedStatuteCitations: string[];
    disputedStatuteCitations: string[];
    noteToCitizenBn: string;
    noteToCitizenEn: string;
    minutesSpent: number;
  },
): Promise<VerificationVerdict> {
  return apiRequest(`/verifications/${encodeURIComponent(requestId)}/verdict`, {
    method: 'POST',
    body: JSON.stringify(verdictData),
  });
}

// --- CONSULTATIONS API ---

/** Scoped by the caller's role: a citizen's own, a lawyer's clients, or all for admins. */
export async function listConsultations(): Promise<ConsultationRequest[]> {
  return apiRequest('/consultations');
}

export async function getConsultationById(id: string): Promise<ConsultationRequest | undefined> {
  return orUndefined(apiRequest(`/consultations/${encodeURIComponent(id)}`));
}

/** The fee charged is the lawyer's published fee for the mode; `feeBdt` is only a fallback. */
export async function createConsultationRequest(data: {
  lawyerId: string;
  topic: string;
  description: string;
  mode: 'chat' | 'audio' | 'video' | 'in_person';
  feeBdt: number;
  slots: ConsultationSlot[];
  attachments?: { name: string; size: string; url: string }[];
  payment: ManualPayment;
}): Promise<ConsultationRequest> {
  return apiRequest('/consultations', { method: 'POST', body: JSON.stringify(data) });
}

export async function acceptConsultation(id: string, slot?: ConsultationSlot): Promise<ConsultationRequest> {
  return apiRequest(`/consultations/${encodeURIComponent(id)}/accept`, { method: 'POST', body: JSON.stringify({ slot }) });
}

export async function declineConsultation(id: string, reason: string): Promise<ConsultationRequest> {
  return apiRequest(`/consultations/${encodeURIComponent(id)}/decline`, { method: 'POST', body: JSON.stringify({ reason }) });
}

export async function completeConsultation(id: string, privateNotes?: string): Promise<ConsultationRequest> {
  return apiRequest(`/consultations/${encodeURIComponent(id)}/complete`, {
    method: 'POST',
    body: JSON.stringify({ privateNotes }),
  });
}

export async function submitConsultationReview(id: string, rating: number, text: string): Promise<{ ok: boolean }> {
  return apiRequest(`/consultations/${encodeURIComponent(id)}/review`, {
    method: 'POST',
    body: JSON.stringify({ rating, text }),
  });
}

export async function listLawyerReviews(lawyerId: string): Promise<LawyerReview[]> {
  return apiRequest(`/lawyers/${encodeURIComponent(lawyerId)}/reviews`);
}

export async function updateConsultationDetails(
  id: string,
  data: { topic: string; description: string },
): Promise<ConsultationRequest> {
  return apiRequest(`/consultations/${encodeURIComponent(id)}`, { method: 'PATCH', body: JSON.stringify(data) });
}

// --- THREADS / MESSAGING API ---

export async function listThreads(): Promise<Thread[]> {
  return apiRequest('/threads');
}

/** Opening a thread also marks the other side's messages as read. */
export async function getThreadById(id: string): Promise<Thread | undefined> {
  return orUndefined(apiRequest(`/threads/${encodeURIComponent(id)}`));
}

/** The sender is the signed-in user; `senderRole` is kept for signature compatibility. */
export async function sendThreadMessage(threadId: string, text: string, _senderRole: 'citizen' | 'lawyer'): Promise<Thread> {
  return apiRequest(`/threads/${encodeURIComponent(threadId)}/messages`, { method: 'POST', body: JSON.stringify({ text }) });
}

// --- VIDEO MEETINGS API ---

/**
 * Lawyers can always start a meeting. With `threadId` the invite (link, code and
 * password) is posted into that client thread; without one it's an open meeting
 * the lawyer can share later with `inviteToMeeting` or by copying the details.
 */
export async function createMeeting(data: {
  hostLawyerId?: string;
  hostLawyerName?: string;
  citizenId?: string;
  citizenName?: string;
  title: string;
  threadId?: string;
}): Promise<Meeting> {
  return apiRequest('/meetings', {
    method: 'POST',
    body: JSON.stringify({ citizenId: data.citizenId, title: data.title, threadId: data.threadId }),
  });
}

/** Posts a live meeting's link, code and password as a message in the client's thread. */
export async function inviteToMeeting(meetingId: string, threadId: string): Promise<Meeting> {
  return apiRequest(`/meetings/${encodeURIComponent(meetingId)}/invite`, {
    method: 'POST',
    body: JSON.stringify({ threadId }),
  });
}

export async function getMeetingByCode(code: string): Promise<Meeting | undefined> {
  return orUndefined(apiRequest(`/meetings/${encodeURIComponent(code.trim().toLowerCase())}`));
}

export async function joinMeetingWithPassword(
  code: string,
  password: string,
): Promise<{ ok: boolean; meeting?: Meeting; error?: string }> {
  const res = await apiRequest<{ ok: boolean; meeting?: Meeting | null; error?: string | null }>('/meetings/join', {
    method: 'POST',
    body: JSON.stringify({ code, password }),
  });
  return { ok: res.ok, meeting: res.meeting ?? undefined, error: res.error ?? undefined };
}

export async function endMeeting(id: string): Promise<Meeting> {
  return apiRequest(`/meetings/${encodeURIComponent(id)}/end`, { method: 'POST' });
}

// --- MESSAGE REPORTS API ---

/** Snapshot and names are taken server-side from the stored message. */
export async function reportThreadMessage(data: {
  threadId: string;
  messageId: string;
  messageSnapshot: string;
  reportedByRole: 'citizen' | 'lawyer';
  reportedByName: string;
  reportedAgainstName: string;
  reasonCategory: string;
  reasonDetails?: string;
}): Promise<MessageReport> {
  return apiRequest('/reports', {
    method: 'POST',
    body: JSON.stringify({
      threadId: data.threadId,
      messageId: data.messageId,
      reasonCategory: data.reasonCategory,
      reasonDetails: data.reasonDetails,
    }),
  });
}

export async function listMessageReports(): Promise<MessageReport[]> {
  return apiRequest('/admin/message-reports');
}

export async function resolveMessageReport(id: string, action: 'dismiss' | 'warn' | 'escalate'): Promise<{ ok: boolean }> {
  return apiRequest(`/admin/message-reports/${encodeURIComponent(id)}/resolve`, {
    method: 'POST',
    body: JSON.stringify({ action }),
  });
}

// --- DOCUMENTS DRAFTING API ---

export async function listDraftTemplates(): Promise<DraftTemplate[]> {
  return apiRequest('/draft/templates');
}

export async function getDraftTemplateBySlug(slug: string): Promise<DraftTemplate | undefined> {
  return orUndefined(apiRequest(`/draft/templates/${encodeURIComponent(slug)}`));
}

export async function listDocuments(): Promise<DraftDocument[]> {
  return apiRequest('/documents');
}

export async function getDocumentById(id: string): Promise<DraftDocument | undefined> {
  return orUndefined(apiRequest(`/documents/${encodeURIComponent(id)}`));
}

export async function createDocumentDraft(templateId: string, title: string, answers: Record<string, string>): Promise<DraftDocument> {
  return apiRequest('/documents', { method: 'POST', body: JSON.stringify({ templateId, title, answers }) });
}

// --- NOTIFICATIONS API ---

/** Always the signed-in user's notifications; `role` is informational. */
export async function listNotifications(_role?: 'citizen' | 'lawyer' | 'admin'): Promise<AppNotification[]> {
  return apiRequest('/notifications');
}

export async function markNotificationsAsRead(): Promise<{ ok: boolean }> {
  return apiRequest('/notifications/read', { method: 'POST' });
}

// --- ADMIN API ---

export async function getAdminStats(): Promise<AdminStats> {
  return apiRequest('/admin/stats');
}

export async function listAdminUsers(): Promise<User[]> {
  return apiRequest('/admin/users');
}

/** Every lawyer regardless of approval status (the public directory shows approved only). */
export async function listAdminLawyers(): Promise<LawyerProfile[]> {
  return apiRequest('/admin/lawyers');
}

/**
 * A lawyer's submitted ID / bar licence. It is served only to admins with the
 * bearer token, so it is fetched as a Blob rather than linked to directly.
 */
export async function fetchLawyerLicenseDocument(lawyerId: string): Promise<Blob> {
  const token = storedToken();
  const res = await fetch(`${API_BASE}/admin/lawyers/${encodeURIComponent(lawyerId)}/license-document`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    const err = data?.error ?? {};
    throw new ApiError(
      res.status,
      err.code ?? 'UNKNOWN_ERROR',
      err.message_en ?? 'Could not load the document.',
      err.message_bn ?? 'ডকুমেন্টটি লোড করা যায়নি।',
    );
  }
  return res.blob();
}

export async function approveLawyer(id: string): Promise<LawyerProfile> {
  return apiRequest(`/admin/lawyers/${encodeURIComponent(id)}/approve`, { method: 'POST' });
}

export async function rejectLawyer(id: string, reason?: string): Promise<LawyerProfile> {
  return apiRequest(`/admin/lawyers/${encodeURIComponent(id)}/reject`, { method: 'POST', body: JSON.stringify({ reason }) });
}

// --- LAWYER EARNINGS & PAYOUTS ---
// Lawyers earn from each verdict they issue and each consultation they complete.
// The admin sends the money by bKash/Nagad/Rocket "Send Money" to the lawyer's
// payout wallet, then records the TrxID as a payout.

export interface PayoutAccount {
  method: WalletMethod | null;
  number: string | null;
}

export interface EarningItem {
  /** Verification: the assignment id. Consultation: the consultation id. */
  id: string;
  type: 'verification' | 'consultation';
  referenceId: string;
  title: string;
  citizenName: string;
  completedAt: string | null;
  feeBdt: number;
  lawyerShareBdt: number;
  citizenPaymentStatus: 'confirmed' | 'pending' | 'rejected' | 'none';
  paid: boolean;
  payoutId: string | null;
}

export interface LawyerPayout {
  id: string;
  lawyerId: string;
  lawyerName: string;
  amountBdt: number;
  method: WalletMethod | null;
  receiverNumber: string | null;
  trxId: string | null;
  itemCount: number;
  paidByName: string | null;
  paidAt: string | null;
  note: string | null;
}

export interface LawyerLedger {
  lawyerId: string;
  lawyerName: string;
  payoutAccount: PayoutAccount;
  owedBdt: number;
  paidBdt: number;
  items: EarningItem[];
}

export interface FinanceOverview {
  summary: {
    citizenConfirmedBdt: number;
    citizenPendingBdt: number;
    citizenPendingCount: number;
    lawyerEarnedBdt: number;
    lawyerOwedBdt: number;
    lawyerPaidBdt: number;
    platformNetBdt: number;
    verificationSharePercent: number;
    consultationSharePercent: number;
  };
  lawyers: LawyerLedger[];
  payouts: LawyerPayout[];
}

export async function getFinanceOverview(): Promise<FinanceOverview> {
  return apiRequest('/admin/finance');
}

/** Records a wallet payout. `itemIds` omitted = settle everything the lawyer is owed. */
export async function payLawyer(data: { lawyerId: string; trxId: string; itemIds?: string[]; note?: string }): Promise<LawyerPayout> {
  return apiRequest('/admin/payouts', { method: 'POST', body: JSON.stringify(data) });
}

export async function getMyPayoutAccount(): Promise<PayoutAccount> {
  return apiRequest('/lawyers/me/payout-account');
}

export async function saveMyPayoutAccount(method: WalletMethod, number: string): Promise<PayoutAccount> {
  return apiRequest('/lawyers/me/payout-account', { method: 'PUT', body: JSON.stringify({ method, number }) });
}

export interface MyEarnings {
  payoutAccount: PayoutAccount;
  owedBdt: number;
  paidBdt: number;
  items: EarningItem[];
  payouts: LawyerPayout[];
}

export async function getMyEarnings(): Promise<MyEarnings> {
  return apiRequest('/lawyers/me/earnings');
}

/** Citizen payments submitted with a wallet TrxID, to be checked against the wallet statement. */
export async function listAdminPayments(): Promise<AdminPayment[]> {
  return apiRequest('/admin/payments');
}

export async function reviewAdminPayment(id: string, action: 'confirm' | 'reject'): Promise<{ ok: boolean }> {
  return apiRequest(`/admin/payments/${encodeURIComponent(id)}/${action}`, { method: 'POST' });
}

export async function listCorpus(): Promise<CorpusDocument[]> {
  return apiRequest('/admin/corpus');
}

/** Uploads a statute PDF; the backend extracts its text into chunks before responding. */
export async function uploadCorpusDocument(file: File, statuteId: string): Promise<CorpusDocument> {
  const form = new FormData();
  form.append('file', file);
  form.append('statuteId', statuteId);
  const token = storedToken();
  const res = await fetch(`${API_BASE}/admin/corpus/upload`, {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: form,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = data?.error ?? {};
    throw new ApiError(res.status, err.code ?? 'UNKNOWN_ERROR', err.message_en ?? 'Upload failed.', err.message_bn ?? 'আপলোড ব্যর্থ হয়েছে।');
  }
  return data as CorpusDocument;
}

export async function rebuildIndex(): Promise<{ ok: boolean; message: string }> {
  return apiRequest('/admin/corpus/reindex', { method: 'POST' });
}

export async function listAdminFlags(): Promise<FlaggedAnswer[]> {
  return apiRequest('/admin/flags');
}

export async function resolveFlag(id: string, action: 'dismiss' | 'escalate' | 'corpus_issue'): Promise<{ ok: boolean }> {
  return apiRequest(`/admin/flags/${encodeURIComponent(id)}/resolve`, { method: 'POST', body: JSON.stringify({ action }) });
}
