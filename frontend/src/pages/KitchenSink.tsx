import { StatusBadge, VerifiedBadge } from '../components/ui/StatusBadge';
import { Rating } from '../components/ui/Rating';
import { Timeline } from '../components/ui/Timeline';
import { ProgressRail } from '../components/ui/ProgressRail';
import { StatCard } from '../components/ui/StatCard';
import { EmptyState, ErrorState } from '../components/ui/EmptyState';
import { DocumentPreview } from '../components/ui/DocumentPreview';
import { Input } from '../components/ui/Input';
import { LanguageToggle } from '../components/ui/LanguageToggle';
import { Logo } from '../components/ui/Logo';
import { RoleSwitcher } from '../components/ui/RoleSwitcher';

const tokens = [
  'bg-ink',
  'bg-ink-soft',
  'bg-bone',
  'bg-bone-deep',
  'bg-clay',
  'bg-clay-deep',
  'bg-clay-tint',
  'bg-granite',
  'bg-granite-soft',
  'bg-paper',
  'bg-brick',
];

export default function KitchenSink() {

  return (
    <div className="min-h-[100dvh] bg-bone pb-20 font-body">
      <header className="flex flex-wrap items-center justify-between gap-4 border-b border-granite px-5 py-4 sm:px-8 bg-white">
        <Logo />
        <LanguageToggle />
      </header>

      <main className="shell space-y-16 py-12">
        {/* Colour Tokens */}
        <section className="space-y-4">
          <p className="font-mono text-label uppercase text-clay-deep font-semibold">1. Colour Tokens</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-3">
            {tokens.map((c) => (
              <div key={c} className="rounded border border-granite bg-white p-3 shadow-sm">
                <div className={`h-12 w-full rounded border border-granite-soft ${c}`} />
                <p className="mt-2 font-mono text-[11px] text-ink font-semibold">{c.replace('bg-', '')}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Status Badges */}
        <section className="space-y-4">
          <p className="font-mono text-label uppercase text-clay-deep font-semibold">2. Status Badges & Verified Marks</p>
          <div className="flex flex-wrap items-center gap-3">
            <StatusBadge status="verified" />
            <StatusBadge status="pending" />
            <StatusBadge status="rejected" />
            <StatusBadge status="accurate" />
            <StatusBadge status="needs_correction" />
            <StatusBadge status="incorrect" />
            <StatusBadge status="live" />
            <VerifiedBadge />
          </div>
        </section>

        {/* Rating & Metric Cards */}
        <section className="space-y-4">
          <p className="font-mono text-label uppercase text-clay-deep font-semibold">3. Ratings & Stat Cards</p>
          <div className="flex items-center gap-6">
            <Rating value={4.9} count={48} />
            <Rating value={3.5} count={12} />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
            <StatCard label="Statute Corpus" value="8 Acts" sub="100% Vectorized" />
            <StatCard label="Verified Lawyers" value="48" sub="Bar Council audited" trend="+12%" />
            <StatCard label="Citizen Queries" value="4,820" sub="Zero server errors" />
          </div>
        </section>

        {/* Timeline & Progress Rail */}
        <section className="space-y-4">
          <p className="font-mono text-label uppercase text-clay-deep font-semibold">4. Progress Rail & Status Timeline</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <ProgressRail
              steps={[
                { id: '1', label: 'Identity & Bar Credentials', completed: true },
                { id: '2', label: 'Practice & Hourly Rates', completed: true },
                { id: '3', label: 'Review & Administrative Dispatch', completed: false },
              ]}
              currentStep={2}
            />
            <Timeline
              items={[
                { status: 'requested', timestamp: new Date().toISOString(), note: 'Consultation requested' },
                { status: 'accepted', timestamp: new Date().toISOString(), note: 'Advocate accepted slot' },
                { status: 'scheduled', timestamp: new Date().toISOString(), note: 'Session confirmed' },
              ]}
            />
          </div>
        </section>

        {/* Empty & Error States */}
        <section className="space-y-4">
          <p className="font-mono text-label uppercase text-clay-deep font-semibold">5. Empty & Error States</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <EmptyState
              title="No Pending Verifications"
              description="All submitted AI answers have been reviewed by enrolled advocates."
              actionLabel="Return to Queue"
              onAction={() => {}}
            />
            <ErrorState
              title="Failed to Retrieve Vector Index"
              message="The embedding search cluster timed out. Check network connection."
              onRetry={() => {}}
            />
          </div>
        </section>

        {/* Document Preview */}
        <section className="space-y-4">
          <p className="font-mono text-label uppercase text-clay-deep font-semibold">6. Document Typesetting Engine</p>
          <div className="h-96">
            <DocumentPreview
              title="Advocate Legal Notice"
              body={`আইনজীবী মারফত প্রেরিত লিগ্যাল নোটিশ\nতারিখ: ১৫ মে ২০২৫\n\nপ্রাপক: জনাব করিম চৌধুরী\nপ্রেরক: তাহরিম আরাহা\n\nবিষয়: বাড়ী ভাড়া নিয়ন্ত্রণ আইন ১৯৯১ লঙ্ঘনে উচ্ছেদ নোটিশের জবাব।`}
            />
          </div>
        </section>

        {/* Form Inputs & Textareas */}
        <section className="space-y-4">
          <p className="font-mono text-label uppercase text-clay-deep font-semibold">7. Accessible Forms</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input label="Advocate Full Name" placeholder="e.g. Advocate Shamsul Alam" />
            <Input label="Bar Enrolment No" placeholder="BC/DH/2018/10452" error="Invalid registration format" />
          </div>
        </section>
      </main>

      <RoleSwitcher />
    </div>
  );
}
