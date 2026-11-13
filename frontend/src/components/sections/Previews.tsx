import { ArrowUp, Search } from 'lucide-react';
import { useLang } from '../../context/LanguageContext';
import { citations } from '../../mocks/citations';
import { mockGlossary } from '../../mocks/glossary';
import { mockDraftTemplates } from '../../mocks/documents';

/** A browser chrome that reads as a document window rather than a mac mockup. */
export function Frame({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="overflow-hidden rounded-md border border-granite-soft bg-paper">
      <div className="flex items-center gap-3 border-b border-granite-soft bg-bone px-4 py-2.5">
        <span aria-hidden="true" className="flex gap-1.5">
          <span className="h-2 w-2 rounded-full bg-granite" />
          <span className="h-2 w-2 rounded-full bg-granite-soft" />
          <span className="h-2 w-2 rounded-full bg-granite-soft" />
        </span>
        <span className="font-mono text-[0.625rem] tracking-label text-clay-deep">{label}</span>
      </div>
      {children}
    </div>
  );
}

export function AskPreview() {
  const { lang, t, num } = useLang();
  const cites = [citations['rent-18'], citations['rent-7']];
  const answer =
    lang === 'bn'
      ? 'বাড়িওয়ালা ইচ্ছেমতো ভাড়া বাড়াতে পারেন না। বাড়ী ভাড়া নিয়ন্ত্রণ আইন, ১৯৯১ অনুযায়ী ভাড়া "মানসম্মত ভাড়া"-র বেশি হতে পারে না, এবং সেই হার নির্ধারণ করেন নিয়ন্ত্রক।'
      : 'A landlord cannot raise rent at will. Under the House Rent Control Act, 1991, rent may not exceed the "standard rent", and that figure is fixed by the Controller.';

  return (
    <Frame label="/app/chat">
      <div className="space-y-5 p-5 sm:p-7">
        <div className="flex justify-end">
          <p className="max-w-[85%] rounded-sm bg-clay-tint px-4 py-3 text-caption text-ink">{t.chat.suggestions[0]}</p>
        </div>
        <div className="margin-rule pl-5">
          <p className="text-caption leading-relaxed text-ink-soft">{answer}</p>
          <p className="label mt-5 mb-2">{t.chat.citationsLabel}</p>
          <div className="flex flex-wrap gap-2">
            {cites.map((c, i) => (
              <span
                key={c.id}
                className="inline-flex items-center gap-2 rounded-full border border-granite-soft bg-clay-tint/60 px-3 py-1.5 text-[0.75rem] text-ink-soft"
              >
                <span className="font-mono text-[0.625rem] text-clay-deep">{num(String(i + 1).padStart(2, '0'))}</span>
                {lang === 'bn' ? c.labelBn : c.labelEn}
              </span>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-3 rounded-sm border border-granite-soft px-4 py-3">
          <span className="flex-1 text-caption text-granite">{t.chat.placeholder}</span>
          <span aria-hidden="true" className="flex h-7 w-7 items-center justify-center rounded-sm bg-clay text-bone">
            <ArrowUp className="h-3.5 w-3.5" />
          </span>
        </div>
      </div>
    </Frame>
  );
}

export function DraftPreview() {
  const { lang, num } = useLang();
  const tpl = mockDraftTemplates[0];
  const step = tpl.steps[2];
  return (
    <Frame label="/app/draft">
      <div className="grid gap-px bg-granite-soft sm:grid-cols-2">
        <div className="bg-paper p-5 sm:p-7">
          <p className="label">
            {num('03')} / {num(String(tpl.steps.length))}
          </p>
          <h4 className="mt-4 font-display text-[1.25rem] text-ink">{lang === 'bn' ? step.questionBn : step.questionEn}</h4>
          <p className="mt-2 text-caption text-clay-deep">{lang === 'bn' ? step.hintBn : step.hintEn}</p>
          <div className="mt-5 h-24 rounded-sm border border-granite-soft bg-bone/60" />
          <div className="mt-5 flex gap-1.5">
            {tpl.steps.map((s, i) => (
              <span key={s.id} className={`h-[3px] flex-1 ${i <= 2 ? 'bg-clay' : 'bg-granite-soft'}`} />
            ))}
          </div>
        </div>
        <div className="bg-bone p-5 font-mono text-[0.6875rem] leading-relaxed text-ink-soft sm:p-7">
          <p className="tracking-label text-clay-deep">LEGAL NOTICE</p>
          <p className="mt-3 border-t border-granite-soft pt-3">
            {lang === 'bn' ? 'প্রেরক: ————' : 'FROM: ————'}
            <br />
            {lang === 'bn' ? 'প্রাপক: ————' : 'TO: ————'}
          </p>
          <p className="mt-3">
            {num('1')}. {lang === 'bn' ? 'আমার মক্কেল উক্ত বাড়ির ভাড়াটিয়া…' : 'My client is the tenant of the said premises…'}
          </p>
          <p className="mt-2 text-granite">
            {num('2')}. {lang === 'bn' ? 'ধারা ৯ অনুযায়ী…' : 'Under Section 9…'}
          </p>
        </div>
      </div>
    </Frame>
  );
}

export function LookupPreview() {
  const { lang, t } = useLang();
  return (
    <Frame label="/app/glossary">
      <div className="p-5 sm:p-7">
        <div className="flex items-center gap-3 rounded-sm border border-granite-soft px-4 py-3">
          <Search className="h-4 w-4 text-clay-deep" aria-hidden="true" />
          <span className="text-caption text-ink">{lang === 'bn' ? 'দেনমোহর' : 'dower'}</span>
        </div>
        <ul className="mt-5 divide-y divide-granite-soft border-y border-granite-soft">
          {mockGlossary.slice(0, 3).map((g) => (
            <li key={g.id} className="py-4">
              <p className="font-display text-[1.0625rem] text-ink">{lang === 'bn' ? g.termBn : g.termEn}</p>
              <p className="mt-1.5 text-caption text-ink-soft/80">{lang === 'bn' ? g.plainBn : g.plainEn}</p>
              <p className="label mt-2.5">
                {g.sourceId} · {g.section}
              </p>
            </li>
          ))}
        </ul>
        <p className="mt-4 text-caption text-clay-deep">{t.chat.citationsHint}</p>
      </div>
    </Frame>
  );
}
