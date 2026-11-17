import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertCircle, ArrowRight, BrainCircuit, Database, Gauge, Layers, Loader2, Search, ShieldCheck } from 'lucide-react';
import { useLang } from '../../context/LanguageContext';
import { getModelReport, type ModelReport, type ReportRow } from '../../lib/api';

const pct = (v: unknown, digits = 0) => (typeof v === 'number' ? `${(v * 100).toFixed(digits)}%` : '—');
const num = (v: unknown, digits = 3) => (typeof v === 'number' ? v.toFixed(digits) : '—');

// wide: multi-panel figures that need the full row to stay readable
const FIGURES: { file: string; en: string; bn: string; wide?: boolean }[] = [
  { file: 'model_comparison_macroF1', en: 'Macro-F1 of all 12 classifiers with 95% Act-clustered bootstrap intervals', bn: '১২টি ক্লাসিফায়ারের ম্যাক্রো-F1 (৯৫% আস্থা ব্যবধানসহ)' },
  { file: 'per_class_f1_heatmap', en: 'F1 per legal domain for every model', bn: 'প্রতিটি আইনি ক্ষেত্রে প্রতিটি মডেলের F1' },
  { file: 'confusion_matrices_best', wide: true, en: 'Confusion matrices: best ML, best deep-learning and best ensemble model', bn: 'সেরা ML, ডিপ লার্নিং ও এনসেম্বল মডেলের কনফিউশন ম্যাট্রিক্স' },
  { file: 'ensemble_weights', en: 'Weighted-voting ensemble weights (fit on the validation split)', bn: 'ওয়েটেড ভোটিং এনসেম্বলের ওজন' },
  { file: 'rag_hit5_heatmap', en: 'Hit@5 per retriever and query set (English, Bengali, cross-lingual)', bn: 'প্রতিটি রিট্রিভার ও প্রশ্নসেটে Hit@5' },
  { file: 'llm_zero_shot', wide: true, en: 'Zero-shot LLM (Qwen2.5-1.5B) vs trained models on the same subset', bn: 'জিরো-শট LLM বনাম প্রশিক্ষিত মডেল' },
  { file: 'rag_retrieval_comparison', wide: true, en: 'Four RAG retrievers compared (BM25, E5 dense, hybrid RRF, hybrid + re-rank)', bn: 'চারটি RAG রিট্রিভারের তুলনা' },
  { file: 'rag_out_of_scope_roc', en: 'Detecting questions the corpus does not cover (ROC)', bn: 'ডেটাবেসের বাইরের প্রশ্ন শনাক্তকরণ (ROC)' },
  { file: 'rag_generation_comparison', en: 'Answer generation with and without retrieval (RAG vs no-RAG)', bn: 'রিট্রিভালসহ ও ছাড়া উত্তর তৈরি (RAG বনাম no-RAG)' },
  { file: 'eda_data_overview', wide: true, en: 'Dataset overview: sections per legal domain and language', bn: 'ডেটাসেটের সারসংক্ষেপ' },
  { file: 'eda_crime_statistics', wide: true, en: 'Police-recorded crime statistics, Bangladesh 2010–2018', bn: 'বাংলাদেশের পুলিশ-নথিভুক্ত অপরাধ পরিসংখ্যান ২০১০–২০১৮' },
];

function Section({ icon: Icon, title, children }: { icon: typeof Gauge; title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-4">
      <h2 className="flex items-center gap-2 font-display text-xl font-bold text-ink">
        <Icon className="h-5 w-5 text-clay-deep" aria-hidden="true" />
        {title}
      </h2>
      {children}
    </section>
  );
}

function Table({ head, rows, highlight }: { head: string[]; rows: (string | number)[][]; highlight?: (r: number) => boolean }) {
  return (
    <div className="overflow-x-auto rounded border border-granite-soft bg-white">
      <table className="w-full min-w-[520px] text-left text-xs">
        <thead className="bg-bone-deep text-[11px] uppercase tracking-wide text-granite">
          <tr>{head.map((h) => <th key={h} className="px-3 py-2 font-semibold">{h}</th>)}</tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} className={`border-t border-granite-soft ${highlight?.(i) ? 'bg-clay-tint/60 font-semibold text-ink' : 'text-ink-soft'}`}>
              {r.map((c, j) => <td key={j} className={`px-3 py-2 ${j === 0 ? '' : 'tabular-nums'}`}>{c}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div className="rounded border border-granite-soft bg-white p-4">
      <p className="font-display text-2xl font-bold text-ink">{value}</p>
      <p className="mt-1 text-xs text-granite">{label}</p>
    </div>
  );
}

/** "How our AI works": the deployed pipeline, its measured accuracy, and the notebook's model benchmark. */
export default function AiModelPage() {
  const { lang } = useLang();
  const bn = lang === 'bn';
  const [report, setReport] = useState<ModelReport | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    getModelReport().then(setReport).catch(() => setError(true));
  }, []);

  const nb = report?.notebook;
  const app = report?.app;
  const cls = nb?.classification ?? [];
  const deployed = 'Logistic Regression';

  return (
    <div className="py-12 sm:py-16">
      <div className="shell max-w-4xl space-y-12">
        <div>
          <span className="font-mono text-label uppercase tracking-wider text-clay-deep">
            {bn ? 'মডেল, ডেটাসেট ও নির্ভুলতা' : 'Models, datasets & accuracy'}
          </span>
          <h1 className="mt-2 font-display text-display font-bold text-ink">{bn ? 'আমাদের এআই কীভাবে কাজ করে' : 'How our AI works'}</h1>
          <p className="mt-3 max-w-prose text-body text-ink-soft">
            {bn
              ? 'প্রতিটি উত্তর বাংলাদেশের প্রকৃত আইনের ধারা থেকে নেওয়া হয়। নিচে আমাদের প্রশিক্ষিত মডেল, রিট্রিভাল পদ্ধতি এবং পরিমাপ করা নির্ভুলতা দেখানো হলো — সাফল্যের সাথে সীমাবদ্ধতাও।'
              : 'Every answer is built from real sections of Bangladeshi law. Below are the trained models, the retrieval method, and the accuracy we measured — including where the system is still weak.'}
          </p>
        </div>

        {/* Pipeline */}
        <Section icon={Layers} title={bn ? 'একটি প্রশ্নের যাত্রা' : 'What happens to your question'}>
          <ol className="grid gap-3 sm:grid-cols-2">
            {[
              [bn ? '১. প্রি-প্রসেসিং' : '1. Pre-processing', bn ? 'ইউনিকোড ও বাংলা বানান একীকরণ, স্টপ-ওয়ার্ড বাদ, স্টেমিং (ইংরেজি Porter, বাংলা সাফিক্স স্ট্রিপার)।' : 'Unicode and Bengali spelling normalisation, stop-word removal, stemming (Porter for English, a suffix stripper for Bengali).'],
              [bn ? '২. আইনের ক্ষেত্র শনাক্ত' : '2. Legal-area classifier', bn ? 'TF-IDF (শব্দ + অক্ষর n-gram) এর ওপর প্রশিক্ষিত লজিস্টিক রিগ্রেশন ১১টি আইনি ক্ষেত্রের একটি অনুমান করে।' : 'A Logistic Regression trained on word + character TF-IDF predicts one of 11 legal domains.'],
              [bn ? '৩. হাইব্রিড সার্চ' : '3. Hybrid retrieval', bn ? 'BM25 কিওয়ার্ড সার্চ ও multilingual-E5 ভেক্টর সার্চের ফলাফল রেসিপ্রোকাল র‍্যাংক ফিউশনে মেলানো হয়।' : 'BM25 keyword search (SQLite FTS5) and multilingual-E5 vector search over 34,952 sections, merged by reciprocal-rank fusion.'],
              [bn ? '৪. উদ্ধৃতিসহ উত্তর' : '4. Cited answer', bn ? 'বিষয়ভিত্তিক রি-র‍্যাংকিংয়ের পর সেরা ধারাগুলো উদ্ধৃতিসহ দেখানো হয়; প্রাসঙ্গিক হলে অপরাধ পরিসংখ্যান যুক্ত হয়।' : 'Topic-aware re-ranking picks the best sections; the answer quotes them with citations and adds crime statistics when relevant.'],
            ].map(([t, d]) => (
              <li key={t} className="rounded border border-granite-soft bg-white p-4">
                <p className="font-display text-sm font-bold text-ink">{t}</p>
                <p className="mt-1 text-xs leading-relaxed text-ink-soft">{d}</p>
              </li>
            ))}
          </ol>
          {report && (
            <p className="text-xs text-granite">
              {bn ? 'এই মুহূর্তে চালু: ' : 'Running now: '}
              <strong className="text-ink">{report.runtime.retrieval === 'hybrid' ? (bn ? 'হাইব্রিড সার্চ' : 'hybrid search') : bn ? 'কিওয়ার্ড সার্চ' : 'keyword search'}</strong>
              {report.runtime.classifier ? ` · ${report.runtime.classifier}` : ''}
              {report.runtime.dense ? ` · ${report.runtime.dense}` : ''}
            </p>
          )}
        </Section>

        {!report && !error && (
          <div className="flex items-center gap-2 text-sm text-granite"><Loader2 className="h-4 w-4 animate-spin" />{bn ? 'ফলাফল লোড হচ্ছে…' : 'Loading results…'}</div>
        )}
        {error && (
          <div role="alert" className="flex items-center gap-2 rounded border border-brick/30 bg-brick/10 p-3 text-sm text-brick">
            <AlertCircle className="h-4 w-4" />{bn ? 'ফলাফল লোড করা যায়নি।' : 'Could not load the model results.'}
          </div>
        )}

        {/* Deployed assistant accuracy */}
        {app && (
          <Section icon={Gauge} title={bn ? 'এই ওয়েবসাইটের সহায়কের নির্ভুলতা' : "Accuracy of this website's assistant"}>
            <p className="max-w-prose text-sm text-ink-soft">
              {bn
                ? `নোটবুকের ${app.questions}টি কিউরেটেড প্রশ্নে (১৫টি বিষয় × ইংরেজি ও বাংলা) পরিমাপ। সঠিক ধারা প্রথম কয়েকটি ফলাফলের মধ্যে এসেছে কি না তা দেখা হয়েছে।`
                : `Measured on the notebook's ${app.questions} curated questions (15 topics × English and Bengali), each with known correct sections. Hit@k = the correct section is among the top k results.`}
            </p>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <Stat value={pct(app.retrieval.hybrid?.all['Hit@5'])} label={bn ? 'সঠিক ধারা সেরা ৫-এ (Hit@5)' : 'Correct section in top 5 (Hit@5)'} />
              <Stat value={pct(app.retrieval.hybrid?.all['Hit@1'])} label={bn ? 'সঠিক ধারা প্রথমেই (Hit@1)' : 'Correct section ranked first'} />
              <Stat value={`${app.outOfScope.rejected}/${app.outOfScope.questions}`} label={bn ? 'অপ্রাসঙ্গিক প্রশ্ন সঠিকভাবে প্রত্যাখ্যাত' : 'Off-topic questions correctly refused'} />
              <Stat
                value={app.domainOnQuestions ? `${app.domainOnQuestions.shownCorrect}/${app.domainOnQuestions.shown}` : '—'}
                label={bn ? 'দেখানো "আইনের ক্ষেত্র" লেবেল সঠিক' : 'Shown "legal area" labels correct'}
              />
            </div>
            <Table
              head={[bn ? 'পদ্ধতি' : 'Retrieval', bn ? 'ভাষা' : 'Language', 'Hit@1', 'Hit@3', 'Hit@5', 'MRR@10']}
              rows={(['keyword', 'hybrid'] as const).flatMap((m) =>
                app.retrieval[m]
                  ? (['all', 'en', 'bn'] as const).map((l) => [
                      m === 'hybrid' ? (bn ? 'হাইব্রিড (BM25 + E5)' : 'Hybrid (BM25 + E5)') : bn ? 'শুধু কিওয়ার্ড (BM25)' : 'Keyword only (BM25)',
                      l === 'all' ? (bn ? 'সব' : 'All') : l === 'en' ? 'English' : 'বাংলা',
                      pct(app.retrieval[m][l]['Hit@1']),
                      pct(app.retrieval[m][l]['Hit@3']),
                      pct(app.retrieval[m][l]['Hit@5']),
                      num(app.retrieval[m][l]['MRR@10']),
                    ])
                  : [],
              )}
              highlight={(i) => i === 3}
            />
            {app.domainOnQuestions && (
              <p className="text-xs text-granite">
                {bn
                  ? `আইনের ক্ষেত্র: ক্লাসিফায়ার প্রশ্নে সরাসরি ${pct(app.domainOnQuestions.top1)} সঠিক (আইনের পাঠে প্রশিক্ষিত, প্রশ্নে নয়)। তাই লেবেলটি শুধু তখনই দেখানো হয় যখন এটি উদ্ধৃত আইনের সাথে মেলে বা খুব আত্মবিশ্বাসী — ${app.domainOnQuestions.questions}টির মধ্যে ${app.domainOnQuestions.shown}টি উত্তরে দেখানো হয়েছে।`
                  : `Legal area: on raw questions the classifier is right ${pct(app.domainOnQuestions.top1)} of the time (it was trained on statute text, not questions), so the label is shown only when it agrees with a cited Act or is very confident — it appeared on ${app.domainOnQuestions.shown} of ${app.domainOnQuestions.questions} answers.`}
              </p>
            )}
            <p className="text-xs text-granite">
              {bn
                ? 'তুলনা: নোটবুকের সেরা সাধারণ রিট্রিভার (শুধু E5) একই প্রশ্নে Hit@5 = ৪০%। বিষয়ভিত্তিক রাউটিং ও রি-র‍্যাংকিং যোগ করায় সাইটের সহায়ক উল্লেখযোগ্যভাবে ভালো। বাংলা প্রশ্নে E5-এর ওজন অর্ধেক রাখা হয়েছে, কারণ নোটবুকে বাংলায় এটি BM25-এর চেয়ে দুর্বল ছিল।'
                : 'For comparison, the best plain retriever in the notebook (E5 dense) reached Hit@5 = 40% on these questions; the site adds topic routing and re-ranking on top. E5 gets half weight for Bengali questions because the notebook found it weaker than BM25 for Bengali.'}
            </p>
          </Section>
        )}

        {/* Notebook: classification */}
        {cls.length > 0 && (
          <Section icon={BrainCircuit} title={bn ? 'আইনি ক্ষেত্র শ্রেণিবিন্যাস — ১২টি মডেল' : 'Legal-domain classification — 12 models'}>
            <p className="max-w-prose text-sm text-ink-soft">
              {bn
                ? 'প্রতিটি ধারার পাঠ থেকে ১১টি আইনি ক্ষেত্রের একটি অনুমান। আইন অনুযায়ী ভাগ করা টেস্ট সেটে পরীক্ষা (একই আইন ট্রেনিং ও টেস্টে নেই)। হাইলাইট করা মডেলটি এই সাইটে চলছে।'
                : 'Predicting one of 11 legal domains from a section’s text. Tested on Acts never seen in training (split by Act). The highlighted model runs on this site: XLM-RoBERTa and the ensembles score higher but need a GPU-sized 278M-parameter model, so the site uses the fast, CPU-friendly Logistic Regression.'}
            </p>
            <Table
              head={['Model', bn ? 'ধরন' : 'Family', 'Accuracy', 'Macro-F1', '95% CI', 'MCC', 'Top-2']}
              rows={cls.map((r: ReportRow) => [
                String(r.model), String(r.family), pct(r.accuracy, 1), num(r.macro_F1), `${num(r.F1_CI_low, 2)}–${num(r.F1_CI_high, 2)}`, num(r.MCC), pct(r.top2, 1),
              ])}
              highlight={(i) => String(cls[i].model) === deployed}
            />
            {(nb?.zeroShot.length ?? 0) > 0 && (
              <Table
                head={[bn ? 'জিরো-শট তুলনা' : 'Zero-shot comparison (same subset)', 'n', 'Accuracy', 'Macro-F1']}
                rows={nb!.zeroShot.map((r) => [String(r.model), String(r.n), pct(r.accuracy, 1), num(r.macro_F1)])}
              />
            )}
          </Section>
        )}

        {/* Notebook: retrieval & generation */}
        {(nb?.retrieval.length ?? 0) > 0 && (
          <Section icon={Search} title={bn ? 'RAG বেঞ্চমার্ক — ৪টি আর্কিটেকচার' : 'RAG benchmark — 4 architectures'}>
            <Table
              head={[bn ? 'প্রশ্নসেট' : 'Query set', 'Retriever', 'n', 'Hit@1', 'Hit@5', 'Hit@10', 'MRR@10', 'ms/query']}
              rows={nb!.retrieval.map((r) => [
                String(r.query_set), String(r.rag).replace(/^[①②③④]\s*/, ''), String(r.n), pct(r['Hit@1']), pct(r['Hit@5']), pct(r['Hit@10']), num(r['MRR@10']), num(r['ms/query'], 0),
              ])}
            />
            {(nb?.generation.length ?? 0) > 0 && (
              <Table
                head={['LLM', 'Mode', bn ? 'প্রশ্ন' : 'Questions', 'Citation precision', 'Groundedness', 'Section-number accuracy']}
                rows={nb!.generation.map((r) => [String(r.llm), String(r.mode), String(r.questions), pct(r.citation_precision), pct(r.groundedness), pct(r.section_number_accuracy)])}
              />
            )}
            <p className="text-xs text-granite">
              {bn
                ? 'ছোট LLM (Qwen2.5-1.5B) রিট্রিভাল ছাড়া কোনো ধারা নম্বর সঠিকভাবে বলতে পারেনি (০%) — তাই এই সাইট উত্তর সবসময় খুঁজে পাওয়া ধারা থেকে তৈরি করে।'
                : 'Without retrieval the small LLM (Qwen2.5-1.5B) named no correct section numbers (0%), which is why this site always builds answers from retrieved sections instead of from a model’s memory.'}
            </p>
          </Section>
        )}

        {/* Figures */}
        {nb && (
          <Section icon={Gauge} title={bn ? 'নোটবুকের চিত্র' : 'Figures from the training notebook'}>
            <div className="grid gap-5 sm:grid-cols-2">
              {FIGURES.map((f) => (
                <figure key={f.file} className={`overflow-hidden rounded border border-granite-soft bg-white ${f.wide ? 'sm:col-span-2' : ''}`}>
                  <a href={`/ai-model/${f.file}.png`} target="_blank" rel="noreferrer">
                    <img src={`/ai-model/${f.file}.png`} alt={bn ? f.bn : f.en} loading="lazy" className="w-full bg-white object-contain" />
                  </a>
                  <figcaption className="border-t border-granite-soft px-3 py-2 text-xs text-ink-soft">{bn ? f.bn : f.en}</figcaption>
                </figure>
              ))}
            </div>
          </Section>
        )}

        {/* Datasets */}
        <Section icon={Database} title={bn ? 'ডেটাসেট' : 'Datasets'}>
          <ul className="space-y-2 text-sm text-ink-soft">
            <li>
              • <strong className="text-ink">{bn ? 'বাংলাদেশের আইন' : 'Bangladesh law corpus'}</strong>
              {report ? ` — ${report.corpus.acts.toLocaleString()} ${bn ? 'আইন' : 'Acts'}, ${report.corpus.sections.toLocaleString()} ${bn ? 'ধারা' : 'sections'}` : ''}
              {bn ? ' (বাংলা ও ইংরেজি অফিসিয়াল পাঠ; কিছু ইংরেজি মেশিন অনুবাদ)।' : ' (official Bengali and English texts; some English is machine-translated).'}
            </li>
            <li>• <strong className="text-ink">BD_Crime_Statistics_2010-2019</strong> {bn ? '— ইউনিট ও অপরাধের ধরন অনুযায়ী পুলিশ-নথিভুক্ত মামলা (২০১৯ আংশিক, তাই বাদ)।' : '— police-recorded cases by unit and category (2019 is a partial year and is excluded).'}</li>
            <li>• <strong className="text-ink">bangladesh-crime-rate-statistics</strong> {bn ? '— প্রতি লাখে অপরাধের হার, ২০০০–২০১৯।' : '— rate per 100,000 population, 2000–2019.'}</li>
          </ul>
        </Section>

        {/* Limits */}
        <Section icon={ShieldCheck} title={bn ? 'সীমাবদ্ধতা' : 'Known limitations'}>
          <ul className="space-y-2 text-sm text-ink-soft">
            <li>• {bn ? 'আইনি ক্ষেত্রের লেবেল আইনের শিরোনাম থেকে নিয়মভিত্তিকভাবে তৈরি (দুর্বল লেবেল), তাই কিছু ভুল লেবেল থাকতে পারে।' : 'Domain labels come from keyword rules on Act titles (weak labels), so some training labels are imperfect.'}</li>
            <li>• {bn ? 'বাংলা প্রশ্নে রিট্রিভাল ইংরেজির চেয়ে দুর্বল।' : 'Retrieval is weaker for Bengali questions than for English ones.'}</li>
            <li>• {bn ? 'মূল্যায়নের প্রশ্নসংখ্যা কম (৩০টি), তাই সংখ্যাগুলো আনুমানিক।' : 'The curated evaluation set is small (30 questions), so these numbers are indicative.'}</li>
            <li>• {bn ? 'এআই আইনি তথ্য দেয়, আইনি পরামর্শ নয় — গুরুত্বপূর্ণ বিষয়ে আইনজীবীর সাথে যাচাই করুন।' : 'The AI gives legal information, not legal advice — verify important matters with a lawyer.'}</li>
          </ul>
          <Link to="/signin?redirect=%2Fapp%2Fchat" className="inline-flex items-center gap-1.5 text-sm font-semibold text-clay-deep hover:underline">
            {bn ? 'একটি প্রশ্ন করে দেখুন' : 'Try asking a question'} <ArrowRight className="h-4 w-4" />
          </Link>
        </Section>
      </div>
    </div>
  );
}
