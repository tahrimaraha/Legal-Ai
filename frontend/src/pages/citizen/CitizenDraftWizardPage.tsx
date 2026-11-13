import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, ArrowRight, CheckCircle2 } from 'lucide-react';
import { useLang } from '../../context/LanguageContext';
import { listDraftTemplates, createDocumentDraft } from '../../lib/api';
import { DocumentPreview } from '../../components/ui/DocumentPreview';
import { ProgressRail } from '../../components/ui/ProgressRail';
import { Input, Textarea, Select } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { Skeleton } from '../../components/ui/EmptyState';
import type { DraftTemplate } from '../../mocks/types';

export default function CitizenDraftWizardPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { lang, num } = useLang();

  const [templates, setTemplates] = useState<DraftTemplate[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<DraftTemplate | null>(null);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [documentTitle, setDocumentTitle] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [finalized, setFinalized] = useState(false);

  useEffect(() => {
    listDraftTemplates().then((tmpls) => {
      setTemplates(tmpls);
      const targetSlug = searchParams.get('template');
      const found = tmpls.find((t) => t.slug === targetSlug) || tmpls[0];
      setSelectedTemplate(found);
      setDocumentTitle(found.titleBn);
      setLoading(false);
    });
  }, [searchParams]);

  if (loading || !selectedTemplate) {
    return <div className="space-y-6"><Skeleton className="h-10 w-64" /><Skeleton className="h-96 w-full" /></div>;
  }

  const steps = selectedTemplate.steps;
  const currentStep = steps[currentStepIndex];

  const handleAnswerChange = (val: string) => {
    setAnswers((prev) => ({ ...prev, [currentStep.id]: val }));
  };

  const handleNext = () => {
    if (currentStepIndex < steps.length - 1) {
      setCurrentStepIndex((idx) => idx + 1);
    } else {
      setFinalized(true);
    }
  };

  const handleBack = () => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex((idx) => idx - 1);
    }
  };

  // Generate live document text as answers are filled
  const generatedDocumentText = `আইনজীবী মারফত রেজিস্ট্রি ডাকযোগে প্রেরিত লিগ্যাল নোটিশ / আবেদন
তারিখ: ${new Date().toLocaleDateString('bn-BD')}

প্রেরক: ${answers.sender_info || answers.complainant_name || answers.applicant_details || '[আপনার নাম ও পূর্ণ ঠিকানা]'}
প্রাপক: ${answers.recipient_info || answers.shop_name_location || answers.offender_info || answers.police_station || '[বিবাদী বা সংশ্লিষ্ট কর্তৃপক্ষের নাম ও ঠিকানা]'}

বিষয়: ${selectedTemplate.titleBn} প্রসঙ্গে।

জনাব,
আমার উপরোক্ত মোয়াক্কেলের প্রদত্ত নির্দেশনা ও বিবরণ অনুযায়ী আপনাকে জানানো যাইতেছে যে:

১. ঘটনার বিবরণ: ${answers.dispute_details || answers.incident_summary || answers.incident_details || '[আপনার বর্ণিত আইনি বিরোধ বা অভিযোগের বিস্তারিত]'}

২. চুক্তি ও সময়সীমা: ${answers.tenancy_date ? `উক্ত বিরোধ বিগত ${answers.tenancy_date} তারিখের চুক্তি ভঙ্গ করে সংঘটিত হইয়াছে।` : 'ঘটনার সত্যতা প্রমাণের প্রয়োজনীয় রেকর্ডপত্র ও সাক্ষ্য প্রমাণ সংরক্ষিত আছে।'} ${answers.current_rent ? `ধার্যকৃত মাসিক ভাড়ার পরিমাণ ছিল ৳${answers.current_rent} টাকা।` : ''}

৩. আইনের সংশ্লিষ্ট বিধান লঙ্ঘন: সংশ্লিষ্ট আইনের ধারা মোতাবেক এই রূপ অন্যায় ও অবৈধ পদক্ষেপ সম্পূর্ণ বেআইনি ও দণ্ডনীয় দেওয়ানি/ফৌজদারি অপরাধ।

এমতাবস্থায়, এই নোটিশ প্রাপ্তির ${answers.notice_period_days || '১৫'} দিনের মধ্যে উক্ত অন্যায় পদক্ষেপ প্রত্যাহার ও উপযুক্ত প্রতিকার প্রদানের জন্য আপনাকে অনুরোধ জানানো যাইতেছে। অন্যথায় যথাযথ আদালতে আইনানুগ মামলা দায়ের করা হইবে।

স্বাক্ষর:
${answers.sender_info || answers.complainant_name || answers.applicant_details || 'আবেদনকারী / মোয়াক্কেল'}`;

  const handleSaveAndExit = async () => {
    setSaving(true);
    try {
      const doc = await createDocumentDraft(selectedTemplate.id, documentTitle, answers);
      navigate(`/app/documents/${doc.id}`);
    } finally {
      setSaving(false);
    }
  };

  const progressSteps = steps.map((s, i) => ({
    id: s.id,
    label: lang === 'bn' ? s.questionBn : s.questionEn,
    completed: i < currentStepIndex,
  }));

  return (
    <div className="space-y-6 font-body">
      {/* Top Header & Template Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-granite pb-4">
        <div>
          <Link
            to="/app/documents"
            className="inline-flex items-center gap-1 text-xs font-mono uppercase text-clay-deep hover:text-ink mb-1"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>{lang === 'bn' ? 'সকল দলিলে ফিরুন' : 'Back to Documents'}</span>
          </Link>
          <h1 className="font-display text-xl font-bold text-ink">
            {lang === 'bn' ? selectedTemplate.titleBn : selectedTemplate.titleEn}
          </h1>
        </div>

        {/* Template Chooser dropdown */}
        <select
          value={selectedTemplate.slug}
          onChange={(e) => {
            const found = templates.find((t) => t.slug === e.target.value);
            if (found) {
              setSelectedTemplate(found);
              setCurrentStepIndex(0);
              setAnswers({});
              setFinalized(false);
            }
          }}
          className="rounded border border-granite bg-white px-3 py-1.5 text-xs text-ink focus:border-clay focus:outline-none"
        >
          {templates.map((t) => (
            <option key={t.slug} value={t.slug}>
              {lang === 'bn' ? t.titleBn : t.titleEn}
            </option>
          ))}
        </select>
      </div>

      {/* Two Pane Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Form Pane (span-5) */}
        <div className="lg:col-span-5 space-y-6">
          {/* Step Progress Rail */}
          <div className="p-4 rounded border border-granite bg-white shadow-sm space-y-3">
            <span className="font-mono text-[10px] uppercase text-clay-deep font-semibold">
              {lang === 'bn' ? `ধাপ ${num(currentStepIndex + 1)} / ${num(steps.length)}` : `Step ${currentStepIndex + 1} of ${steps.length}`}
            </span>
            <ProgressRail
              steps={progressSteps}
              currentStep={currentStepIndex}
              onSelectStep={(idx) => setCurrentStepIndex(idx)}
            />
          </div>

          {/* Current Step Input Card */}
          <div className="rounded border-2 border-clay bg-white p-6 shadow-sm space-y-4">
            <div>
              <span className="font-mono text-[11px] uppercase text-clay-deep font-semibold">
                Question {currentStepIndex + 1}
              </span>
              <h2 className="font-display text-base font-bold text-ink mt-1">
                {lang === 'bn' ? currentStep.questionBn : currentStep.questionEn}
              </h2>
              <p className="text-xs text-granite mt-1">
                {lang === 'bn' ? currentStep.hintBn : currentStep.hintEn}
              </p>
            </div>

            {/* Field Rendering */}
            <div className="pt-2">
              {currentStep.fieldType === 'text' && (
                <Input
                  type="text"
                  placeholder={currentStep.placeholderBn}
                  value={answers[currentStep.id] || ''}
                  onChange={(e) => handleAnswerChange(e.target.value)}
                  autoFocus
                />
              )}

              {currentStep.fieldType === 'number' && (
                <Input
                  type="number"
                  placeholder={currentStep.placeholderBn}
                  value={answers[currentStep.id] || ''}
                  onChange={(e) => handleAnswerChange(e.target.value)}
                  autoFocus
                />
              )}

              {currentStep.fieldType === 'date' && (
                <Input
                  type="date"
                  value={answers[currentStep.id] || ''}
                  onChange={(e) => handleAnswerChange(e.target.value)}
                  autoFocus
                />
              )}

              {currentStep.fieldType === 'textarea' && (
                <Textarea
                  placeholder={currentStep.placeholderBn}
                  value={answers[currentStep.id] || ''}
                  onChange={(e) => handleAnswerChange(e.target.value)}
                  rows={4}
                  autoFocus
                />
              )}

              {currentStep.fieldType === 'select' && currentStep.options && (
                <Select
                  options={currentStep.options.map((o) => ({
                    value: o.value,
                    label: lang === 'bn' ? o.labelBn : o.labelEn,
                  }))}
                  value={answers[currentStep.id] || currentStep.options[0].value}
                  onChange={(e) => handleAnswerChange(e.target.value)}
                />
              )}
            </div>

            {/* Step Navigation Controls */}
            <div className="flex items-center justify-between pt-4 border-t border-granite-soft">
              <Button size="sm" variant="ghost" onClick={handleBack} disabled={currentStepIndex === 0}>
                <ArrowLeft className="mr-1 h-3.5 w-3.5" />
                <span>{lang === 'bn' ? 'পূর্ববর্তী' : 'Back'}</span>
              </Button>

              {currentStepIndex < steps.length - 1 ? (
                <Button size="sm" variant="primary" onClick={handleNext}>
                  <span>{lang === 'bn' ? 'পরবর্তী প্রশ্ন' : 'Next Question'}</span>
                  <ArrowRight className="ml-1 h-3.5 w-3.5" />
                </Button>
              ) : (
                <Button size="sm" variant="primary" onClick={handleSaveAndExit} loading={saving}>
                  <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" />
                  <span>{lang === 'bn' ? 'খসড়া চূড়ান্ত ও সংরক্ষণ' : 'Finalize & Save'}</span>
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Right Live Document Typesetting Pane (span-7) */}
        <div className="lg:col-span-7 h-[680px] sticky top-20">
          <DocumentPreview
            title={documentTitle}
            body={generatedDocumentText}
            status={finalized ? 'Final Draft' : 'Live Editing'}
            onDownload={() => {
              const element = document.createElement('a');
              const file = new Blob([generatedDocumentText], { type: 'text/plain;charset=utf-8' });
              element.href = URL.createObjectURL(file);
              element.download = `${selectedTemplate.slug}-draft.txt`;
              document.body.appendChild(element);
              element.click();
            }}
            onShare={() => navigate('/app/lawyers')}
          />
        </div>
      </div>
    </div>
  );
}
