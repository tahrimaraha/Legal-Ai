import { Suspense, lazy } from 'react';
import { Route, Routes, Navigate } from 'react-router-dom';
import { useLang } from './context/LanguageContext';
import { ProtectedRoute } from './components/ProtectedRoute';

// Layouts
import { PublicLayout } from './layouts/PublicLayout';
import { AppLayout } from './layouts/AppLayout';
import { LawyerLayout } from './layouts/LawyerLayout';
import { AdminLayout } from './layouts/AdminLayout';
import { AuthLayout } from './layouts/AuthLayout';

// Public Pages
const Landing = lazy(() => import('./pages/Landing'));
const HowItWorksPage = lazy(() => import('./pages/public/HowItWorksPage'));
const StatutesPage = lazy(() => import('./pages/public/StatutesPage'));
const StatuteDetailPage = lazy(() => import('./pages/public/StatuteDetailPage'));
const GlossaryPage = lazy(() => import('./pages/public/GlossaryPage'));
const LawyersPage = lazy(() => import('./pages/public/LawyersPage'));
const LawyerProfilePage = lazy(() => import('./pages/public/LawyerProfilePage'));
const FaqPage = lazy(() => import('./pages/public/FaqPage'));
const AboutPage = lazy(() => import('./pages/public/AboutPage'));
const TermsPage = lazy(() => import('./pages/public/TermsPage'));
const PrivacyPage = lazy(() => import('./pages/public/PrivacyPage'));
const DisclaimerPage = lazy(() => import('./pages/public/DisclaimerPage'));
const NotFound = lazy(() => import('./pages/NotFound'));

// Auth Pages
const SignInPage = lazy(() => import('./pages/auth/SignInPage'));
const SignUpChooserPage = lazy(() => import('./pages/auth/SignUpChooserPage'));
const CitizenSignUpPage = lazy(() => import('./pages/auth/CitizenSignUpPage'));
const LawyerSignUpPage = lazy(() => import('./pages/auth/LawyerSignUpPage'));
const LawyerPendingPage = lazy(() => import('./pages/auth/LawyerPendingPage'));
const VerifyEmailPage = lazy(() => import('./pages/auth/VerifyEmailPage'));
const ForgotPasswordPage = lazy(() => import('./pages/auth/ForgotPasswordPage'));
const ResetPasswordPage = lazy(() => import('./pages/auth/ResetPasswordPage'));

// Citizen Pages
const CitizenDashboard = lazy(() => import('./pages/citizen/CitizenDashboard'));
const CitizenChatPage = lazy(() => import('./pages/citizen/CitizenChatPage'));
const CitizenHistoryPage = lazy(() => import('./pages/citizen/CitizenHistoryPage'));
const CitizenVerificationsPage = lazy(() => import('./pages/citizen/CitizenVerificationsPage'));
const CitizenVerificationDetailPage = lazy(() => import('./pages/citizen/CitizenVerificationDetailPage'));
const CitizenLawyersPage = lazy(() => import('./pages/citizen/CitizenLawyersPage'));
const CitizenLawyerProfilePage = lazy(() => import('./pages/citizen/CitizenLawyerProfilePage'));
const CitizenConsultationsPage = lazy(() => import('./pages/citizen/CitizenConsultationsPage'));
const CitizenConsultationDetailPage = lazy(() => import('./pages/citizen/CitizenConsultationDetailPage'));
const CitizenMessagesPage = lazy(() => import('./pages/citizen/CitizenMessagesPage'));
const CitizenJoinMeetingPage = lazy(() => import('./pages/citizen/CitizenJoinMeetingPage'));
const CitizenMeetingRoomPage = lazy(() => import('./pages/citizen/CitizenMeetingRoomPage'));
const CitizenDocumentsPage = lazy(() => import('./pages/citizen/CitizenDocumentsPage'));
const CitizenDraftWizardPage = lazy(() => import('./pages/citizen/CitizenDraftWizardPage'));
const CitizenDocumentDetailPage = lazy(() => import('./pages/citizen/CitizenDocumentDetailPage'));
const CitizenNotificationsPage = lazy(() => import('./pages/citizen/CitizenNotificationsPage'));
const CitizenSettingsPage = lazy(() => import('./pages/citizen/CitizenSettingsPage'));

// Lawyer Pages
const LawyerDashboard = lazy(() => import('./pages/lawyer/LawyerDashboard'));
const LawyerVerificationQueue = lazy(() => import('./pages/lawyer/LawyerVerificationQueue'));
const LawyerReviewWorkspace = lazy(() => import('./pages/lawyer/LawyerReviewWorkspace'));
const LawyerConsultationsPage = lazy(() => import('./pages/lawyer/LawyerConsultationsPage'));
const LawyerConsultationDetailPage = lazy(() => import('./pages/lawyer/LawyerConsultationDetailPage'));
const LawyerMessagesPage = lazy(() => import('./pages/lawyer/LawyerMessagesPage'));
const LawyerMeetingPage = lazy(() => import('./pages/lawyer/LawyerMeetingPage'));
const LawyerMeetingRoomPage = lazy(() => import('./pages/lawyer/LawyerMeetingRoomPage'));
const LawyerProfileEditor = lazy(() => import('./pages/lawyer/LawyerProfileEditor'));
const LawyerAvailabilityPage = lazy(() => import('./pages/lawyer/LawyerAvailabilityPage'));
const LawyerNotificationsPage = lazy(() => import('./pages/lawyer/LawyerNotificationsPage'));
const LawyerSettingsPage = lazy(() => import('./pages/lawyer/LawyerSettingsPage'));

// Admin Pages
const AdminOverview = lazy(() => import('./pages/admin/AdminOverview'));
const AdminLawyerApprovals = lazy(() => import('./pages/admin/AdminLawyerApprovals'));
const AdminVerificationQueue = lazy(() => import('./pages/admin/AdminVerificationQueue'));
const AdminPaymentsDashboard = lazy(() => import('./pages/admin/AdminPaymentsDashboard'));
const AdminSettingsPage = lazy(() => import('./pages/admin/AdminSettingsPage'));
const AdminCorpusManager = lazy(() => import('./pages/admin/AdminCorpusManager'));
const AdminUsersPage = lazy(() => import('./pages/admin/AdminUsersPage'));
const AdminFlagsPage = lazy(() => import('./pages/admin/AdminFlagsPage'));
const AdminMessageReportsPage = lazy(() => import('./pages/admin/AdminMessageReportsPage'));

// Dev
const KitchenSink = lazy(() => import('./pages/KitchenSink'));

function Fallback() {
  const { t } = useLang();
  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-bone font-body">
      <div className="flex items-center gap-3">
        <span className="h-2.5 w-2.5 rounded-full bg-clay animate-pulse" />
        <p className="font-mono text-label uppercase text-clay-deep">{t.common.loading}…</p>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <Suspense fallback={<Fallback />}>
      <Routes>
        {/* PUBLIC SITE */}
        <Route element={<PublicLayout />}>
          <Route path="/" element={<Landing />} />
          <Route path="/how-it-works" element={<HowItWorksPage />} />
          <Route path="/statutes" element={<StatutesPage />} />
          <Route path="/statutes/:slug" element={<StatuteDetailPage />} />
          <Route path="/glossary" element={<GlossaryPage />} />
          <Route path="/lawyers" element={<LawyersPage />} />
          <Route path="/lawyers/:id" element={<LawyerProfilePage />} />
          <Route path="/faq" element={<FaqPage />} />
          <Route path="/about" element={<AboutPage />} />
          <Route path="/terms" element={<TermsPage />} />
          <Route path="/privacy" element={<PrivacyPage />} />
          <Route path="/disclaimer" element={<DisclaimerPage />} />
          <Route path="*" element={<NotFound />} />
        </Route>

        {/* AUTH */}
        <Route element={<AuthLayout />}>
          <Route path="/signin" element={<SignInPage />} />
          <Route path="/signup" element={<SignUpChooserPage />} />
          <Route path="/signup/citizen" element={<CitizenSignUpPage />} />
          <Route path="/signup/lawyer" element={<LawyerSignUpPage />} />
          <Route path="/signup/lawyer/pending" element={<LawyerPendingPage />} />
          <Route path="/verify-email" element={<VerifyEmailPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />
          <Route path="/login" element={<Navigate to="/signin" replace />} />
        </Route>

        {/* CITIZEN APP */}
        <Route path="/app" element={<ProtectedRoute allowedRoles={['citizen']}><AppLayout /></ProtectedRoute>}>
          <Route index element={<CitizenDashboard />} />
          <Route path="chat" element={<CitizenChatPage />} />
          <Route path="chat/:id" element={<CitizenChatPage />} />
          <Route path="history" element={<CitizenHistoryPage />} />
          <Route path="verifications" element={<CitizenVerificationsPage />} />
          <Route path="verifications/:id" element={<CitizenVerificationDetailPage />} />
          <Route path="lawyers" element={<CitizenLawyersPage />} />
          <Route path="lawyers/:id" element={<CitizenLawyerProfilePage />} />
          <Route path="consultations" element={<CitizenConsultationsPage />} />
          <Route path="consultations/:id" element={<CitizenConsultationDetailPage />} />
          <Route path="messages" element={<CitizenMessagesPage />} />
          <Route path="messages/:id" element={<CitizenMessagesPage />} />
          <Route path="meeting/join" element={<CitizenJoinMeetingPage />} />
          <Route path="meeting/:code" element={<CitizenMeetingRoomPage />} />
          <Route path="documents" element={<CitizenDocumentsPage />} />
          <Route path="documents/new" element={<CitizenDraftWizardPage />} />
          <Route path="documents/:id" element={<CitizenDocumentDetailPage />} />
          <Route path="notifications" element={<CitizenNotificationsPage />} />
          <Route path="settings" element={<CitizenSettingsPage />} />
          {/* Legacy route redirects */}
          <Route path="draft" element={<Navigate to="/app/documents/new" replace />} />
          <Route path="glossary" element={<Navigate to="/glossary" replace />} />
        </Route>

        {/* LAWYER PORTAL */}
        <Route path="/lawyer" element={<ProtectedRoute allowedRoles={['lawyer']}><LawyerLayout /></ProtectedRoute>}>
          <Route index element={<LawyerDashboard />} />
          <Route path="verifications" element={<LawyerVerificationQueue />} />
          <Route path="verifications/:id" element={<LawyerReviewWorkspace />} />
          <Route path="consultations" element={<LawyerConsultationsPage />} />
          <Route path="consultations/:id" element={<LawyerConsultationDetailPage />} />
          <Route path="messages" element={<LawyerMessagesPage />} />
          <Route path="messages/:id" element={<LawyerMessagesPage />} />
          <Route path="meeting" element={<LawyerMeetingPage />} />
          <Route path="meeting/:code" element={<LawyerMeetingRoomPage />} />
          <Route path="profile" element={<LawyerProfileEditor />} />
          <Route path="availability" element={<LawyerAvailabilityPage />} />
          <Route path="notifications" element={<LawyerNotificationsPage />} />
          <Route path="settings" element={<LawyerSettingsPage />} />
        </Route>

        {/* ADMIN CONSOLE */}
        <Route path="/admin" element={<ProtectedRoute allowedRoles={['admin']}><AdminLayout /></ProtectedRoute>}>
          <Route index element={<AdminOverview />} />
          <Route path="lawyers" element={<AdminLawyerApprovals />} />
          <Route path="verifications" element={<AdminVerificationQueue />} />
          <Route path="payments" element={<AdminPaymentsDashboard />} />
          <Route path="corpus" element={<AdminCorpusManager />} />
          <Route path="users" element={<AdminUsersPage />} />
          <Route path="flags" element={<AdminFlagsPage />} />
          <Route path="message-reports" element={<AdminMessageReportsPage />} />
          <Route path="settings" element={<AdminSettingsPage />} />
        </Route>

        {/* DEV / SHOWROOM */}
        <Route path="/kitchen-sink" element={<KitchenSink />} />
      </Routes>
    </Suspense>
  );
}
