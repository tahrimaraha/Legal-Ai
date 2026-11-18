/**
 * The single seam between this frontend and the FastAPI backend (`/api/v1`).
 * Every function returns the shapes in `mocks/types.ts`; pages never call `fetch` directly.
 * Static reference content (statutes, glossary, document templates) still ships with the frontend.
 */
import { statutesData } from '../data/statutes';
import { mockDraftTemplates, mockGlossary } from '../mocks';
import type { AdminStats, AppNotification, Citation, ConsultationRequest, ConsultationSlot, Conversation, CorpusDocument, DraftDocument, DraftTemplate, FlaggedAnswer, GlossaryTerm, LawyerProfile, LawyerRecommendation, LawyerReview, Meeting, Message, MessageReport, Statute, Thread, User, VerificationRequest, VerificationVerdict, VerdictType, PaymentAccounts, PaymentMethod } from '../mocks/types';
import { getSessionToken, getSessionUserId, replaceSessionToken } from './session';

const delay = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

// --- HTTP CLIENT & AUTH API ---

const API_BASE = (import.meta.env.VITE_API_URL as string | undefined) ?? '/api/v1'; // relative: Vite proxies /api to the backend in dev, so phones on the LAN work too

/** Thrown by `apiRequest` for any non-2xx response; carries the backend's bilingual error envelope. */
export class ApiError extends Error {
  status: number;
  code: string;
  messageBn: string;
  /** Extra server info, e.g. `retryAfter` (seconds) on 429, `attemptsLeft` on a wrong code. */
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


function storedToken(): string | null {
  return getSessionToken();
}

/** WebSocket URL + auth token for a meeting's live video signalling channel. */
export function meetingSignal(code: string): { url: string; token: string } {
  const base = new URL(API_BASE, window.location.href);
  base.protocol = base.protocol === 'https:' ? 'wss:' : 'ws:';
  return {
    url: `${base.toString().replace(/\/$/, '')}/meetings/${encodeURIComponent(code.trim().toLowerCase())}/ws`,
    token: storedToken() || '',
  };
}

/** Fired when this tab's session can't be renewed; RoleContext signs the tab out. */
export const SESSION_ENDED_EVENT = 'legal-ai:session-ended';

let refreshing: Promise<boolean> | null = null;

/**
 * Renew this tab's access token from its HttpOnly refresh cookie. One renewal at a time per tab;
 * if another tab of the same account rotated the cookie a moment earlier, retry once.
 */
function renewSession(): Promise<boolean> {
  const userId = getSessionUserId();
  if (!userId) return Promise.resolve(false);
  refreshing ??= (async () => {
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const res = await fetch(`${API_BASE}/auth/refresh`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'same-origin',
          body: JSON.stringify({ userId }),
        });
        if (res.ok) {
          const data = (await res.json()) as { token: string; user: User };
          if (data.user?.id !== userId) return false;
          replaceSessionToken(data.token);
          return true;
        }
      } catch {
        /* network blip: retry once */
      }
      await new Promise((r) => setTimeout(r, 400));
    }
    return false;
  })().finally(() => {
    refreshing = null;
  });
  return refreshing;
}

async function toApiError(res: Response): Promise<ApiError> {
  const data = await res.json().catch(() => ({}));
  const err = data?.error ?? {};
  return new ApiError(
    res.status,
    err.code ?? 'UNKNOWN_ERROR',
    err.message_en ?? 'Something went wrong. Please try again.',
    err.message_bn ?? 'কিছু একটা সমস্যা হয়েছে। আবার চেষ্টা করুন।',
    err.details ?? {},
  );
}

/** Calls the backend with the signed-in user's token; renews an expired session once and retries. */
async function apiRequest<T>(path: string, options: RequestInit = {}, retried = false): Promise<T> {
  const token = storedToken();
  let res: Response;
  try {
    res = await fetch(`${API_BASE}${path}`, {
      credentials: 'same-origin',
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(options.headers || {}),
      },
    });
  } catch {
    throw new ApiError(
      0,
      'NETWORK_ERROR',
      'Could not reach the server. Check your connection and try again.',
      'সার্ভারে সংযোগ করা যায়নি। সংযোগ দেখে আবার চেষ্টা করুন।',
    );
  }
  if (res.ok) return (await res.json().catch(() => ({}))) as T;
  const error = await toApiError(res);
  // Sign-in / recovery endpoints don't use the session, so a 401 there is a real answer.
  const sessionless = /^\/auth\/(login|register|refresh|logout|password|verify-email)/.test(path);
  if (res.status === 401 && token && !retried && !sessionless) {
    if (await renewSession()) return apiRequest<T>(path, options, true);
    window.dispatchEvent(new Event(SESSION_ENDED_EVENT));
  }
  throw error;
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
}): Promise<{ status: 'verification_required'; email: string }> {
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
}): Promise<{ status: 'verification_required'; email: string }> {
  return apiRequest('/auth/register/lawyer', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function getCurrentUser(): Promise<User> {
  return apiRequest('/auth/me');
}

/** End this tab's session on the server (revokes its refresh cookie). Never throws. */
export async function logoutSession(userId: string | null): Promise<void> {
  if (!userId) return;
  await fetch(`${API_BASE}/auth/logout`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'same-origin',
    body: JSON.stringify({ userId }),
  }).catch(() => undefined);
}

// --- EMAIL VERIFICATION & PASSWORD RESET ---

/** Open-the-link step: confirms the email for the account in the link. */
export async function confirmEmailVerification(
  userId: string,
  token: string,
): Promise<{ status: 'verified' | 'already_verified'; email: string | null }> {
  return apiRequest('/auth/verify-email/confirm', { method: 'POST', body: JSON.stringify({ userId, token }) });
}

/** Email a new verification link (same answer whether or not the address is registered). */
export async function resendVerificationEmail(email: string): Promise<{ ok: boolean }> {
  return apiRequest('/auth/verify-email/resend', { method: 'POST', body: JSON.stringify({ email }) });
}

/** Email a 6-digit password reset code (same answer whether or not the address is registered). */
export async function requestPasswordReset(email: string): Promise<{ ok: boolean }> {
  return apiRequest('/auth/password/forgot', { method: 'POST', body: JSON.stringify({ email }) });
}

/** Check the emailed code; returns a short-lived, single-use pass for setting the new password. */
export async function verifyPasswordResetCode(
  email: string,
  code: string,
): Promise<{ resetToken: string; expiresInMinutes: number }> {
  return apiRequest('/auth/password/verify-code', { method: 'POST', body: JSON.stringify({ email, code }) });
}

export async function resetPassword(resetToken: string, newPassword: string): Promise<{ ok: boolean }> {
  return apiRequest('/auth/password/reset', { method: 'POST', body: JSON.stringify({ resetToken, newPassword }) });
}

// --- STATUTES & GLOSSARY API ---

export async function listStatutes(): Promise<Statute[]> {
  await delay(150);
  return statutesData;
}

export async function getStatuteBySlug(slug: string): Promise<Statute | undefined> {
  await delay(120);
  return statutesData.find((s) => s.slug === slug || s.id === slug);
}

export async function searchGlossary(query?: string): Promise<GlossaryTerm[]> {
  await delay(180);
  const q = (query || '').trim().toLowerCase();
  if (!q) return mockGlossary;
  return mockGlossary.filter(
    (g) =>
      g.termBn.toLowerCase().includes(q) ||
      g.termEn.toLowerCase().includes(q) ||
      g.plainBn.toLowerCase().includes(q) ||
      g.plainEn.toLowerCase().includes(q) ||
      g.section.toLowerCase().includes(q),
  );
}

const post = <T>(path: string, body?: unknown) =>
  apiRequest<T>(path, { method: 'POST', body: body === undefined ? undefined : JSON.stringify(body) });

/** `undefined` instead of an error when the item does not exist (or is not visible to this user). */
async function orUndefined<T>(request: Promise<T>): Promise<T | undefined> {
  try {
    return await request;
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) return undefined;
    throw err;
  }
}



// --- CONVERSATIONS & CHAT API ---
// Chats are saved per account on the backend; signed-out visitors can still ask, but nothing is saved.

export async function listConversations(): Promise<Conversation[]> {
  if (!storedToken()) return [];
  return apiRequest('/conversations');
}

export async function getConversation(id: string): Promise<Conversation | undefined> {
  if (!storedToken()) return undefined;
  return orUndefined(apiRequest<Conversation>(`/conversations/${encodeURIComponent(id)}`));
}

export async function deleteConversation(id: string): Promise<{ ok: boolean }> {
  return apiRequest(`/conversations/${encodeURIComponent(id)}`, { method: 'DELETE' });
}

/** Saves one question + answer to the user's conversation (creating it on the first question). */
async function recordExchange(
  question: string,
  assistantMessage: Message,
  conversationId?: string,
): Promise<{ message: Message; conversationId: string }> {
  const fallbackId = conversationId || `local-${Date.now()}`;
  if (!storedToken()) return { message: assistantMessage, conversationId: fallbackId };
  const userMessage: Message = {
    id: `q-${assistantMessage.id}`,
    role: 'user',
    bodyBn: question,
    bodyEn: question,
    citations: [],
    createdAt: new Date().toISOString(),
  };
  try {
    const conv = await post<Conversation>('/conversations/exchange', { conversationId, userMessage, assistantMessage });
    return { message: assistantMessage, conversationId: conv.id };
  } catch {
    // Saving failed (e.g. backend briefly down): still show the answer.
    return { message: assistantMessage, conversationId: fallbackId };
  }
}

/**
 * AI answer: retrieval over the Bangladesh-law corpus (FastAPI `POST /chat`, see backend/app/rag).
 * Never substitutes a pre-written answer: if the AI can't answer, the caller gets an error to show.
 */
export async function askQuestion(
  question: string,
  conversationId?: string,
  history: Pick<Message, 'role' | 'bodyEn' | 'bodyBn'>[] = [],
): Promise<{ message: Message; conversationId: string }> {
  let answer: Message;
  try {
    const res = await post<{ message: Message; domain?: Message['domain']; domainConfirmed?: boolean; retrieval?: Message['retrieval'] }>('/chat', {
      question,
      history: history.slice(-6).map((m) => ({ role: m.role, text: (m.bodyEn || m.bodyBn).slice(0, 1500) })),
    });
    answer = { ...res.message, domain: res.domain ?? null, domainConfirmed: !!res.domainConfirmed, retrieval: res.retrieval };
  } catch (err) {
    if (err instanceof ApiError && err.status >= 400 && err.status < 500 && err.status !== 404) throw err;
    throw new ApiError(
      503,
      'AI_UNAVAILABLE',
      'The AI assistant is not available right now. Please try again in a moment.',
      'এআই সহায়ক এই মুহূর্তে উপলব্ধ নয়। একটু পরে আবার চেষ্টা করুন।',
    );
  }
  return recordExchange(question, answer, conversationId);
}

export async function sendFeedback(
  messageId: string,
  value: 'up' | 'down' | 'flag',
  reason?: string,
): Promise<{ ok: boolean; messageId: string }> {
  if (!storedToken()) return { ok: false, messageId };
  try {
    return await post('/conversations/feedback', { messageId, value, reason });
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) return { ok: false, messageId }; // answer was never saved
    throw err;
  }
}

// --- LAWYER DIRECTORY & PROFILE API ---

export async function listLawyers(filters?: {
  area?: string;
  district?: string;
  verifiedOnly?: boolean;
  maxFee?: number;
}): Promise<LawyerProfile[]> {
  // The directory only ever contains verified lawyers, so `verifiedOnly` needs no server filter.
  const params = new URLSearchParams();
  if (filters?.area && filters.area !== 'all') params.set('area', filters.area);
  if (filters?.district && filters.district !== 'all') params.set('district', filters.district);
  if (filters?.maxFee) params.set('maxFee', String(filters.maxFee));
  const qs = params.toString();
  return apiRequest(`/lawyers${qs ? `?${qs}` : ''}`);
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

interface AiAnalysis {
  topics: { id: string; nameEn: string; nameBn: string }[];
  areaHints: string[];
  urgent: boolean;
  statutes: { labelEn: string; labelBn: string; score: number }[];
  crimeCategory: string | null;
  national: { category: string; lastYear: number; last: number; firstYear: number; first: number; pctChange: number } | null;
  districts: Record<string, { unit: string; year: number; cases: number }>;
}

const toBnDigits = (n: number | string) => String(n).replace(/\d/g, (d) => '০১২৩৪৫৬৭৮৯'[Number(d)]);

export async function getAiLawyerRecommendations(query: string): Promise<LawyerRecommendation[]> {
  const q = query.trim();
  const matchedHints = new Set<string>();
  RECOMMENDATION_DOMAINS.forEach((d) => {
    if (d.keywords.test(q)) d.areaHints.forEach((h) => matchedHints.add(h));
  });

  // Dataset-driven analysis from the backend (topics -> practice areas, governing statutes, crime statistics).
  let analysis: AiAnalysis | null = null;
  try {
    analysis = await apiRequest<AiAnalysis>('/recommend/analyze', { method: 'POST', body: JSON.stringify({ query: q }) });
    analysis.areaHints.forEach((h) => matchedHints.add(h));
  } catch {
    await delay(700); // backend offline: keep the original keyword-only behaviour
  }

  const lawyers = await listLawyers();
  const scored = lawyers.map((lawyer) => {
    const matchedAreas = lawyer.practiceAreas.filter((area) =>
      Array.from(matchedHints).some((hint) => area.toLowerCase().includes(hint)),
    );
    let score = matchedAreas.length * 12;
    if (analysis) {
      const first = Array.from(matchedHints).findIndex((h) => matchedAreas.some((a) => a.toLowerCase().includes(h)));
      if (first >= 0 && first < (analysis.areaHints.length || 0)) score += Math.max(0, 6 - first); // earlier = closer to the main legal topic
    }
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
    // Dataset context: governing statute + police-recorded cases in the lawyer's district (crime statistics file).
    let extraEn = '';
    let extraBn = '';
    if (analysis && matchedAreas.length > 0) {
      const top = analysis.statutes[0];
      if (top) {
        extraEn += ` · Relevant law: ${top.labelEn.split(' · ')[0]}`;
        extraBn += ` · প্রাসঙ্গিক আইন: ${top.labelBn.split(' · ')[0]}`;
      }
      const d = analysis.districts[lawyer.district.toLowerCase().replace('chittagong', 'chattogram')];
      if (d && analysis.crimeCategory) {
        extraEn += ` · ${d.cases.toLocaleString('en-US')} such cases recorded in ${lawyer.district} (${d.year})`;
        extraBn += ` · ${lawyer.district}-এ ${toBnDigits(d.year)} সালে ${toBnDigits(d.cases)}টি এ ধরনের মামলা নথিভুক্ত`;
      }
    }
    return { lawyer, score, matchedAreas, reasonBn: reasonBn + extraBn, reasonEn: reasonEn + extraEn };
  });
}

export async function getLawyerById(id: string): Promise<LawyerProfile | undefined> {
  return orUndefined(apiRequest<LawyerProfile>(`/lawyers/${encodeURIComponent(id)}`));
}

/** Saves the signed-in lawyer's own profile. */
export async function updateLawyerProfile(profile: Partial<LawyerProfile>): Promise<LawyerProfile> {
  const { fullName, fullNameBn, title, titleBn, district, bioEn, bioBn, startingFeeBdt, responseTimeCommitment,
    responseTimeCommitmentBn, education } = profile;
  return apiRequest('/lawyers/me', {
    method: 'PUT',
    body: JSON.stringify({ fullName, fullNameBn, title, titleBn, district, bioEn, bioBn, startingFeeBdt,
      responseTimeCommitment, responseTimeCommitmentBn, education }),
  });
}

// --- VERIFICATIONS API ---
// The backend decides what each role sees: citizens their own requests, lawyers those assigned to them,
// admins everything. The arguments are kept for call-site compatibility.

export async function listVerifications(_role?: 'citizen' | 'lawyer' | 'admin', _userId?: string): Promise<VerificationRequest[]> {
  return apiRequest('/verifications');
}

export async function getVerificationById(id: string): Promise<VerificationRequest | undefined> {
  return orUndefined(apiRequest<VerificationRequest>(`/verifications/${encodeURIComponent(id)}`));
}

export interface PaymentSubmission {
  method: PaymentMethod;
  senderAccount: string;
  trxId: string;
}

export async function createVerificationRequest(data: {
  conversationId: string;
  messageId: string;
  questionText: string;
  answerText: string;
  citations: Citation[];
  urgency?: 'normal' | 'urgent';
  payment?: PaymentSubmission;
}): Promise<VerificationRequest> {
  return post('/verifications', { ...data, urgency: data.urgency || 'normal' });
}

export async function assignVerificationRequest(requestId: string, lawyerId: string, _lawyerName?: string): Promise<VerificationRequest> {
  return post(`/verifications/${encodeURIComponent(requestId)}/assign`, { lawyerId });
}

export async function declineVerificationRequest(requestId: string, reason: string): Promise<VerificationRequest> {
  return post(`/verifications/${encodeURIComponent(requestId)}/decline`, { reason });
}

/** The lawyer's identity on the verdict is taken from their session, not from these fields. */
export async function submitVerificationVerdict(
  requestId: string,
  verdictData: {
    lawyerId?: string;
    lawyerName?: string;
    lawyerNameBn?: string;
    lawyerAvatar?: string;
    lawyerEnrolmentNo?: string;
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
  const { verdict, correctedExplanationBn, correctedExplanationEn, addedStatuteCitations, disputedStatuteCitations,
    noteToCitizenBn, noteToCitizenEn, minutesSpent } = verdictData;
  return post(`/verifications/${encodeURIComponent(requestId)}/verdict`, {
    verdict, correctedExplanationBn, correctedExplanationEn, addedStatuteCitations, disputedStatuteCitations,
    noteToCitizenBn, noteToCitizenEn, minutesSpent,
  });
}

// --- CONSULTATIONS API ---

export async function listConsultations(): Promise<ConsultationRequest[]> {
  return apiRequest('/consultations');
}

export async function getConsultationById(id: string): Promise<ConsultationRequest | undefined> {
  return orUndefined(apiRequest<ConsultationRequest>(`/consultations/${encodeURIComponent(id)}`));
}

/** The fee is set by the backend from the lawyer's fee table; `feeBdt` is only a display hint. */
/** A lawyer's bookable times (Bangladesh time). `hasSchedule` false = no weekly hours published. */
export async function getLawyerOpenSlots(
  lawyerId: string,
  days = 14,
): Promise<{ hasSchedule: boolean; slots: ConsultationSlot[] }> {
  return apiRequest(`/lawyers/${encodeURIComponent(lawyerId)}/open-slots?days=${days}`);
}

export async function createConsultationRequest(data: {
  lawyerId: string;
  topic: string;
  description: string;
  mode: 'chat' | 'audio' | 'video' | 'in_person';
  feeBdt: number;
  slots: ConsultationSlot[];
  attachments?: { name: string; size: string; url: string }[];
  payment?: PaymentSubmission;
}): Promise<ConsultationRequest> {
  return post('/consultations', { ...data, attachments: data.attachments ?? [] });
}

export async function acceptConsultation(id: string, slot?: ConsultationSlot): Promise<ConsultationRequest> {
  return post(`/consultations/${encodeURIComponent(id)}/accept`, { slot: slot ?? null });
}

export async function declineConsultation(id: string, reason: string): Promise<ConsultationRequest> {
  return post(`/consultations/${encodeURIComponent(id)}/decline`, { reason });
}

export async function completeConsultation(id: string, privateNotes?: string): Promise<ConsultationRequest> {
  return post(`/consultations/${encodeURIComponent(id)}/complete`, { privateNotes: privateNotes || null });
}

export async function submitConsultationReview(id: string, rating: number, text: string): Promise<{ ok: boolean }> {
  return post(`/consultations/${encodeURIComponent(id)}/review`, { rating, text });
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
// A thread opens when a lawyer accepts a consultation; only its two participants can read it.

/** Meeting links come back as app paths; make them shareable full URLs. */
const absoluteLink = (link?: string) => (link && link.startsWith('/') ? `${window.location.origin}${link}` : link);
const withThreadLink = (t: Thread): Thread => ({ ...t, meetingLink: absoluteLink(t.meetingLink) });
const withMeetingLink = (m: Meeting): Meeting => ({ ...m, link: absoluteLink(m.link) ?? m.link });

export async function listThreads(): Promise<Thread[]> {
  return (await apiRequest<Thread[]>('/threads')).map(withThreadLink);
}

export async function getThreadById(id: string): Promise<Thread | undefined> {
  const thread = await orUndefined(apiRequest<Thread>(`/threads/${encodeURIComponent(id)}`));
  // Opening a thread marks it read on the server: let the top-bar badges update right away.
  if (thread) window.dispatchEvent(new Event('inbox:refresh'));
  return thread && withThreadLink(thread);
}

export async function sendThreadMessage(threadId: string, text: string, _senderRole?: 'citizen' | 'lawyer'): Promise<Thread> {
  return withThreadLink(await post<Thread>(`/threads/${encodeURIComponent(threadId)}/messages`, { text }));
}

// --- VIDEO MEETINGS API ---

/** Started by the signed-in lawyer; the host and citizen come from the session and the thread. */
export async function createMeeting(data: {
  hostLawyerId?: string;
  hostLawyerName?: string;
  citizenId?: string;
  citizenName?: string;
  title: string;
  threadId?: string;
}): Promise<Meeting> {
  return withMeetingLink(await post<Meeting>('/meetings', { title: data.title, threadId: data.threadId, citizenId: data.citizenId }));
}

export async function getMeetingByCode(code: string): Promise<Meeting | undefined> {
  const meeting = await orUndefined(apiRequest<Meeting>(`/meetings/by-code/${encodeURIComponent(code.trim().toLowerCase())}`));
  return meeting && withMeetingLink(meeting);
}

export async function joinMeetingWithPassword(
  code: string,
  password: string,
): Promise<{ ok: boolean; meeting?: Meeting; error?: string }> {
  const res = await post<{ ok: boolean; meeting?: Meeting; error?: string }>('/meetings/join', { code, password });
  return res.meeting ? { ...res, meeting: withMeetingLink(res.meeting) } : res;
}

export async function endMeeting(id: string): Promise<Meeting> {
  return withMeetingLink(await post<Meeting>(`/meetings/${encodeURIComponent(id)}/end`));
}

// --- MESSAGE REPORTS API ---

/** The reporter, the reported party and the message text are filled in by the backend. */
export async function reportThreadMessage(data: {
  threadId: string;
  messageId: string;
  messageSnapshot?: string;
  reportedByRole?: 'citizen' | 'lawyer';
  reportedByName?: string;
  reportedAgainstName?: string;
  reasonCategory: string;
  reasonDetails?: string;
}): Promise<MessageReport> {
  return post(`/threads/${encodeURIComponent(data.threadId)}/reports`, {
    messageId: data.messageId,
    reasonCategory: data.reasonCategory,
    reasonDetails: data.reasonDetails,
  });
}

export async function listMessageReports(): Promise<MessageReport[]> {
  return apiRequest('/admin/message-reports');
}

export async function resolveMessageReport(id: string, action: 'dismiss' | 'warn' | 'escalate'): Promise<{ ok: boolean }> {
  return post(`/admin/message-reports/${encodeURIComponent(id)}/resolve`, { action });
}

// --- DOCUMENTS DRAFTING API ---

export async function listDraftTemplates(): Promise<DraftTemplate[]> {
  return mockDraftTemplates;
}

export async function getDraftTemplateBySlug(slug: string): Promise<DraftTemplate | undefined> {
  return mockDraftTemplates.find((t) => t.slug === slug || t.id === slug);
}

export async function listDocuments(): Promise<DraftDocument[]> {
  return apiRequest('/documents');
}

export async function getDocumentById(id: string): Promise<DraftDocument | undefined> {
  return orUndefined(apiRequest<DraftDocument>(`/documents/${encodeURIComponent(id)}`));
}

export async function createDocumentDraft(templateId: string, title: string, answers: Record<string, string>): Promise<DraftDocument> {
  const tmpl = mockDraftTemplates.find((t) => t.id === templateId || t.slug === templateId) || mockDraftTemplates[0];
  const sender = answers.sender_info || answers.complainant_name;
  const recipient = answers.recipient_info || answers.shop_name_location;
  const details = answers.dispute_details || answers.incident_summary;
  return post('/documents', {
    templateId: tmpl.id,
    templateTitleBn: tmpl.titleBn,
    templateTitleEn: tmpl.titleEn,
    title: title || tmpl.titleBn,
    answers,
    generatedTextBn: `আইনি নোটিশ / আবেদনপত্র খসড়া\nতারিখ: ${new Date().toLocaleDateString('bn-BD')}\n\nপ্রেরক: ${sender || '[প্রেরকের নাম ও ঠিকানা]'}\nপ্রাপক: ${recipient || 'বিবাদী'}\n\nবিষয়: আইন লঙ্ঘনের প্রতিকার চেয়ে আইনি নোটিশ।\n\nবিবরণ: ${details || 'বিস্তারিত বিবরণ...'}`,
    generatedTextEn: `LEGAL NOTICE / APPLICATION DRAFT\nDate: ${new Date().toLocaleDateString('en-GB')}\n\nFrom: ${sender || '[Sender name and address]'}\nTo: ${recipient || 'Respondent'}\n\nSubject: Formal statutory legal demand.\n\nParticulars: ${details || 'Details of dispute...'}`,
  });
}

// --- NOTIFICATIONS API ---

export async function listNotifications(_role?: 'citizen' | 'lawyer' | 'admin'): Promise<AppNotification[]> {
  if (!storedToken()) return [];
  return apiRequest('/notifications');
}

export async function markNotificationRead(id: string): Promise<{ ok: boolean }> {
  return post(`/notifications/${encodeURIComponent(id)}/read`);
}

export async function markNotificationsAsRead(): Promise<{ ok: boolean }> {
  return post('/notifications/read-all');
}

// --- ADMIN API ---

export async function getAdminStats(): Promise<AdminStats> {
  return apiRequest('/admin/stats');
}

export async function listAdminLawyers(): Promise<LawyerProfile[]> {
  return apiRequest('/admin/lawyers');
}

export async function approveLawyer(id: string): Promise<LawyerProfile> {
  return post(`/admin/lawyers/${encodeURIComponent(id)}/approve`);
}

export async function rejectLawyer(id: string, reason?: string): Promise<LawyerProfile> {
  return post(`/admin/lawyers/${encodeURIComponent(id)}/reject`, { reason: reason || '' });
}

export async function listAdminUsers(): Promise<User[]> {
  return apiRequest('/admin/users');
}

export async function setUserSuspended(id: string, suspended: boolean): Promise<User> {
  return post(`/admin/users/${encodeURIComponent(id)}/suspend`, { suspended });
}

export async function listCorpus(): Promise<CorpusDocument[]> {
  return apiRequest('/admin/corpus');
}

/** Not supported from the browser yet — the backend answers with instructions for the offline build. */
export async function uploadCorpusDocument(_file: { name: string; statuteId: string; sizeMb: number }): Promise<CorpusDocument> {
  return post('/admin/corpus/upload');
}

export async function listAdminFlags(): Promise<FlaggedAnswer[]> {
  return apiRequest('/admin/flags');
}

export async function resolveFlag(id: string, action: 'dismiss' | 'escalate' | 'corpus_issue'): Promise<{ ok: boolean }> {
  return post(`/admin/flags/${encodeURIComponent(id)}/resolve`, { action });
}

// --- ACCOUNT SELF-SERVICE ---

export async function updateMyAccount(data: { name?: string; phone?: string; district?: string }): Promise<User> {
  return apiRequest('/auth/me', { method: 'PUT', body: JSON.stringify(data) });
}

export async function changePassword(currentPassword: string, newPassword: string): Promise<{ ok: boolean }> {
  return post('/auth/change-password', { currentPassword, newPassword });
}

/** Everything stored about the signed-in user, as a JSON document. */
export async function exportMyData(): Promise<unknown> {
  return apiRequest('/auth/me/export');
}

/** Permanently deletes the signed-in citizen's account and data. */
export async function deleteMyAccount(): Promise<{ ok: boolean }> {
  return apiRequest('/auth/me', { method: 'DELETE' });
}

// --- LAWYER AVAILABILITY ---

export interface LawyerAvailability {
  vacationMode: boolean;
  maxActiveConsultations: number;
  /** Weekly slots such as "Sunday-16:00". */
  slots: string[];
}

export async function getMyAvailability(): Promise<LawyerAvailability> {
  return apiRequest('/lawyers/me/availability');
}

export async function saveMyAvailability(data: LawyerAvailability): Promise<LawyerAvailability> {
  return apiRequest('/lawyers/me/availability', { method: 'PUT', body: JSON.stringify(data) });
}

// --- LAWYER DIARY / DAY PLANNER ---

export type DiaryKind = 'court' | 'client_meeting' | 'task' | 'personal' | 'other';

export interface DiaryEntryInput {
  date: string; // YYYY-MM-DD (Bangladesh)
  start: string; // HH:MM
  end: string; // HH:MM
  title: string;
  kind: DiaryKind;
  location?: string;
  notes?: string;
  /** Busy time: clients can't book a consultation that overlaps it. */
  blocksBooking: boolean;
  done: boolean;
}

export interface DiaryEntry extends DiaryEntryInput {
  id: string;
}

export interface DiarySession {
  id: string;
  citizenName: string;
  topic: string;
  mode: string;
  status: string;
  date: string;
  time: string;
}

export interface DiaryData {
  entries: DiaryEntry[];
  consultations: DiarySession[];
  hours: { weekday: string; start: string; end: string }[];
  vacationMode: boolean;
}

export interface DiarySaveResult {
  entry: DiaryEntry;
  /** Booked consultations that fall inside a busy entry. */
  conflicts: { id: string; time: string; citizenName: string }[];
}

export async function getMyDiary(start: string, days = 7): Promise<DiaryData> {
  return apiRequest(`/lawyers/me/diary?start=${encodeURIComponent(start)}&days=${days}`);
}

export async function createDiaryEntry(entry: DiaryEntryInput): Promise<DiarySaveResult> {
  return apiRequest('/lawyers/me/diary', { method: 'POST', body: JSON.stringify(entry) });
}

export async function updateDiaryEntry(id: string, entry: DiaryEntryInput): Promise<DiarySaveResult> {
  return apiRequest(`/lawyers/me/diary/${encodeURIComponent(id)}`, { method: 'PUT', body: JSON.stringify(entry) });
}

export async function deleteDiaryEntry(id: string): Promise<void> {
  await apiRequest(`/lawyers/me/diary/${encodeURIComponent(id)}`, { method: 'DELETE' });
}

/** Admin: record that the lawyer was paid for a completed verification or consultation. */
export interface PayoutDetails {
  method: PaymentMethod;
  payTo: string;
  trxId: string;
  note?: string;
}

export async function recordLawyerPayout(kind: 'verification' | 'consultation', id: string, payout?: PayoutDetails): Promise<{ ok: boolean }> {
  await post(`/admin/payouts/${kind}/${encodeURIComponent(id)}`, payout ?? {});
  return { ok: true };
}

/** Admin: notify the lawyer to add where they want to be paid. */
export async function remindLawyerPaymentDetails(kind: 'verification' | 'consultation', id: string): Promise<void> {
  await post(`/admin/payouts/${kind}/${encodeURIComponent(id)}/remind`, {});
}

// ——— AI model report (notebook benchmark + evaluation of the deployed assistant) ———
export type ReportRow = Record<string, string | number | null>;
export interface RetrievalMetrics {
  n: number;
  'Hit@1': number;
  'Hit@3': number;
  'Hit@5': number;
  'Hit@10': number;
  'MRR@10': number;
}
export interface ModelReport {
  notebook: { classification: ReportRow[]; zeroShot: ReportRow[]; retrieval: ReportRow[]; generation: ReportRow[]; classes: string[] } | null;
  app: {
    generatedAt: string;
    questions: number;
    retrieval: Record<'keyword' | 'hybrid', { all: RetrievalMetrics; en: RetrievalMetrics; bn: RetrievalMetrics; msPerQuery: number }>;
    outOfScope: { questions: number; rejected: number; rate: number };
    domainOnQuestions?: { questions: number; top1: number; top3: number; shown: number; shownCorrect: number };
  } | null;
  runtime: { loaded: boolean; classifier?: string | null; dense?: string | null; retrieval: 'hybrid' | 'keyword' };
  corpus: { acts: number; sections: number; crimeYears: number[] };
}

export async function getModelReport(): Promise<ModelReport> {
  return apiRequest<ModelReport>('/ai/model-report');
}

// ——— Manual payments (bKash / Nagad / Rocket / bank) ———
// Consultation fees go to the lawyer's accounts; verification fees go to the platform (admin) accounts.
export interface PayeeAccounts {
  payeeName: string;
  accounts: PaymentAccounts;
  methods: PaymentMethod[];
}

export async function getLawyerPaymentAccounts(lawyerId: string): Promise<PayeeAccounts> {
  return apiRequest(`/payments/lawyers/${encodeURIComponent(lawyerId)}/accounts`);
}

export async function getPlatformPaymentAccounts(): Promise<PayeeAccounts> {
  return apiRequest('/payments/platform-accounts');
}

export async function getMyPaymentAccounts(): Promise<PaymentAccounts> {
  return apiRequest('/payments/my-accounts');
}

export async function saveMyPaymentAccounts(accounts: PaymentAccounts): Promise<PaymentAccounts> {
  return apiRequest('/payments/my-accounts', { method: 'PUT', body: JSON.stringify(accounts) });
}

export async function savePlatformPaymentAccounts(accounts: PaymentAccounts): Promise<PaymentAccounts> {
  return apiRequest('/admin/payment-accounts', { method: 'PUT', body: JSON.stringify(accounts) });
}

export async function submitPayment(kind: 'consultation' | 'verification', id: string, payment: PaymentSubmission) {
  const base = kind === 'consultation' ? '/consultations' : '/verifications';
  return post<ConsultationRequest & VerificationRequest>(`${base}/${encodeURIComponent(id)}/payment`, payment);
}

export async function reviewPayment(kind: 'consultation' | 'verification', id: string, action: 'confirm' | 'reject', note = '') {
  const base = kind === 'consultation' ? '/consultations' : '/verifications';
  return post<ConsultationRequest & VerificationRequest>(`${base}/${encodeURIComponent(id)}/payment/review`, { action, note });
}
