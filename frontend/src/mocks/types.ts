/**
 * TypeScript definitions for the entire AI Legal Assistant for Citizens (আইনি সহায়ক) application.
 * Matches Appendix A API contract and full data layer.
 */

export type UserRole = 'citizen' | 'lawyer' | 'admin' | 'guest';

export interface User {
  id: string;
  email: string;
  name: string;
  nameBn?: string;
  role: UserRole;
  phone?: string;
  district?: string;
  avatarUrl?: string;
  isVerified?: boolean;
  createdAt: string;
  approvalStatus?: string; // For lawyers: 'pending', 'approved', 'rejected'
  suspended?: boolean; // Admin user directory only
}

export type StatuteStatus = 'live' | 'indexing' | 'planned';

export interface StatuteSection {
  id: string;
  sectionNumber: string;
  titleBn: string;
  titleEn: string;
  contentBn: string;
  contentEn: string;
  plainMeaningBn: string;
  plainMeaningEn: string;
}

export interface Statute {
  id: string;
  slug: string;
  titleBn: string;
  titleEn: string;
  year: string;
  descriptionBn: string;
  descriptionEn: string;
  topics: string[];
  topicsBn: string[];
  sectionCount: number;
  status: StatuteStatus;
  lastReviewed: string;
  amendmentNoticeBn?: string;
  amendmentNoticeEn?: string;
  sections?: StatuteSection[];
  chunks?: number;
}

export interface Citation {
  id: string;
  statuteId: string;
  statuteSlug?: string;
  labelBn: string;
  labelEn: string;
  section: string;
  textBn: string;
  textEn: string;
  matchBn: string;
  matchEn: string;
  score: number;
}

export type MessageRole = 'user' | 'assistant';

export interface Message {
  id: string;
  role: MessageRole;
  bodyBn: string;
  bodyEn: string;
  citations: Citation[];
  createdAt: string;
  rating?: 'up' | 'down';
  flagged?: boolean;
  verificationId?: string;
  /** Legal domain predicted by the trained classifier (top 3, with probabilities). */
  domain?: DomainPrediction[] | null;
  /** True when the prediction agrees with a cited Act (or is very confident) — only then is it shown. */
  domainConfirmed?: boolean;
  /** How the sources were found: keyword (BM25) or hybrid (BM25 + E5 dense, rank fusion). */
  retrieval?: 'hybrid' | 'keyword';
}

export interface DomainPrediction {
  labelEn: string;
  labelBn: string;
  confidence: number;
}

export interface Conversation {
  id: string;
  titleBn: string;
  titleEn: string;
  updatedAt: string;
  messages: Message[];
  status?: 'active' | 'archived';
  citedStatuteIds?: string[];
  verificationRequested?: boolean;
}

export type LawyerVerificationStatus = 'verified' | 'pending' | 'rejected';

export interface LawyerFee {
  mode: 'chat' | 'audio' | 'video' | 'in_person';
  feeBdt: number;
  durationMinutes: number;
}

export interface LawyerProfile {
  id: string;
  userId: string;
  fullName: string;
  fullNameBn: string;
  title: string;
  titleBn: string;
  avatarUrl: string;
  district: string;
  districtBn: string;
  barEnrolmentNo: string;
  enrolmentYear: number;
  verificationStatus: LawyerVerificationStatus;
  practiceAreas: string[];
  practiceAreasBn: string[];
  courts: string[];
  courtsBn: string[];
  languages: string[];
  bioBn: string;
  bioEn: string;
  experienceYears: number;
  startingFeeBdt: number;
  fees: LawyerFee[];
  rating: number;
  reviewCount: number;
  responseTimeCommitment: string;
  responseTimeCommitmentBn: string;
  totalVerifications: number;
  totalConsultations: number;
  education: string[];
  educationBn: string[];
  isAvailableToday?: boolean;
  awayNotice?: string;
  licenseDocumentUrl?: string;
  licenseDocumentName?: string;
}

export interface LawyerRecommendation {
  lawyer: LawyerProfile;
  score: number;
  matchedAreas: string[];
  reasonBn: string;
  reasonEn: string;
}

export interface LawyerReview {
  id: string;
  lawyerId: string;
  consultationId: string;
  citizenId: string;
  citizenName: string;
  rating: number;
  text: string;
  createdAt: string;
}

export type VerdictType = 'accurate' | 'incomplete' | 'needs_correction' | 'incorrect';

export interface VerificationVerdict {
  id: string;
  requestId: string;
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
  createdAt: string;
  paymentProcessed?: boolean;
}

export type VerificationRequestStatus = 'pending' | 'claimed' | 'completed' | 'declined';

export interface VerificationRequest {
  id: string;
  citizenId: string;
  citizenName: string;
  conversationId: string;
  messageId: string;
  questionExcerptBn: string;
  questionExcerptEn: string;
  aiAnswerExcerptBn: string;
  aiAnswerExcerptEn: string;
  citations: Citation[];
  status: VerificationRequestStatus;
  urgency: 'normal' | 'urgent';
  feeBdt: number;
  claimedByLawyerId?: string;
  claimedByLawyerName?: string;
  assignedAt?: string;
  declineReason?: string;
  verdict?: VerificationVerdict;
  createdAt: string;
  updatedAt: string;
}

export type ConsultationStatus = 'requested' | 'accepted' | 'scheduled' | 'completed' | 'declined' | 'cancelled';

export interface ConsultationSlot {
  date: string;
  time: string;
}

export interface ConsultationRequest {
  id: string;
  citizenId: string;
  citizenName: string;
  citizenPhone?: string;
  lawyerId: string;
  lawyerName: string;
  lawyerNameBn: string;
  lawyerAvatar: string;
  topicBn: string;
  topicEn: string;
  description: string;
  mode: 'chat' | 'audio' | 'video' | 'in_person';
  feeBdt: number;
  status: ConsultationStatus;
  preferredSlots: ConsultationSlot[];
  scheduledSlot?: ConsultationSlot;
  attachments?: { name: string; size: string; url: string }[];
  timeline: { status: ConsultationStatus; timestamp: string; note?: string }[];
  declineReason?: string;
  referralLawyerId?: string;
  lawyerPrivateNotes?: string;
  review?: { rating: number; text: string; createdAt: string };
  paymentProcessed?: boolean;
  createdAt: string;
}

export interface ThreadMessage {
  id: string;
  senderId: string;
  senderRole: 'citizen' | 'lawyer';
  text: string;
  createdAt: string;
  attachments?: { name: string; size: string }[];
  isRead: boolean;
}

export interface Thread {
  id: string;
  citizenId: string;
  citizenName: string;
  lawyerId: string;
  lawyerName: string;
  lawyerNameBn: string;
  lawyerAvatar: string;
  consultationId?: string;
  verificationId?: string;
  contextTitleBn: string;
  contextTitleEn: string;
  isLocked: boolean;
  unreadCount: number;
  lastMessage: string;
  lastMessageAt: string;
  messages: ThreadMessage[];
  mode?: 'chat' | 'audio' | 'video' | 'in_person';
  meetingLink?: string;
  activeMeetingCode?: string;
}

export type MeetingStatus = 'live' | 'ended';

export interface Meeting {
  id: string;
  code: string;
  password: string;
  link: string;
  title: string;
  hostLawyerId: string;
  hostLawyerName: string;
  citizenId: string;
  citizenName: string;
  threadId?: string;
  status: MeetingStatus;
  createdAt: string;
  endedAt?: string;
}

export type MessageReportStatus = 'pending' | 'reviewed' | 'dismissed';

export interface MessageReport {
  id: string;
  threadId: string;
  messageId: string;
  messageSnapshot: string;
  reportedByRole: 'citizen' | 'lawyer';
  reportedByName: string;
  reportedAgainstName: string;
  reasonCategory: string;
  reasonDetails?: string;
  status: MessageReportStatus;
  createdAt: string;
}

export interface GlossaryTerm {
  id: string;
  termBn: string;
  termEn: string;
  plainBn: string;
  plainEn: string;
  sourceId: string;
  sourceTitleBn: string;
  sourceTitleEn: string;
  section: string;
  exampleBn?: string;
  exampleEn?: string;
}

export interface DraftStep {
  id: string;
  questionBn: string;
  questionEn: string;
  hintBn: string;
  hintEn: string;
  fieldType: 'text' | 'textarea' | 'date' | 'select' | 'number';
  options?: { value: string; labelBn: string; labelEn: string }[];
  placeholderBn?: string;
  placeholderEn?: string;
}

export interface DraftTemplate {
  id: string;
  slug: string;
  titleBn: string;
  titleEn: string;
  categoryBn: string;
  categoryEn: string;
  descriptionBn: string;
  descriptionEn: string;
  steps: DraftStep[];
}

export interface DraftDocument {
  id: string;
  userId: string;
  templateId: string;
  templateTitleBn: string;
  templateTitleEn: string;
  title: string;
  status: 'draft' | 'final' | 'shared';
  answers: Record<string, string>;
  generatedTextBn: string;
  generatedTextEn: string;
  createdAt: string;
  updatedAt: string;
}

export type CorpusStatus = 'indexed' | 'processing' | 'failed';

export interface CorpusDocument {
  id: string;
  fileName: string;
  statuteId: string;
  statuteTitleBn: string;
  statuteTitleEn: string;
  chunks: number;
  status: CorpusStatus;
  fileSizeMb: number;
  lastIndexed: string;
  error?: string;
}

export interface AppNotification {
  id: string;
  userId: string;
  type: 'verification_completed' | 'consultation_accepted' | 'consultation_scheduled' | 'new_message' | 'statute_updated' | 'system';
  titleBn: string;
  titleEn: string;
  bodyBn: string;
  bodyEn: string;
  link: string;
  isRead: boolean;
  createdAt: string;
}

export interface FlaggedAnswer {
  id: string;
  messageId: string;
  questionBn: string;
  questionEn: string;
  answerBn: string;
  answerEn: string;
  reason: string;
  status: 'pending' | 'resolved' | 'escalated';
  reportedAt: string;
  citations: Citation[];
}

export interface AdminStats {
  totalCitizens: number;
  totalLawyers: number;
  pendingLawyers: number;
  questionsAskedThisWeek: number;
  questionsTotal: number;
  unansweredVerificationsOver48h: number;
  corpusHealthPct: number;
  indexedStatutesCount: number;
  weeklyQuestions: { day: string; count: number }[];
  categoryBreakdown: { category: string; categoryBn: string; count: number }[];
}
