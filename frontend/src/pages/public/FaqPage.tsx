import { Accordion } from '../../components/ui/Accordion';
import { useLang } from '../../context/LanguageContext';

export default function FaqPage() {
  const { lang } = useLang();

  const faqItemsBn = [
    {
      q: 'আইনি সহায়ক কি আদালতের উকিলের বিকল্প?',
      a: 'না। এটি সাধারণ নাগরিকদের আইনি অধিকার ও আইনের ধারা সম্পর্কে সচেতন করার একটি তথ্যগত প্ল্যাটফর্ম। কোনো আইনি মোকদ্দমা পরিচালনা, ওকালতনামা সম্পাদন বা আইনি মতামত গ্রহণের জন্য সর্বদা বার কাউন্সিল সনদপ্রাপ্ত আইনজীবীর সহায়তা গ্রহণ করতে হবে।',
    },
    {
      q: 'এআই উত্তরের নির্ভুলতা কীভাবে নিশ্চিত করা হয়?',
      a: 'আমাদের সিস্টেম শুধুমাত্র বাংলাদেশের অনুমোদিত আইন ও সংকলিত ধারাসমূহের ভেক্টর ডেটাবেস থেকে তথ্য সংগ্রহ করে। প্রতিটি উত্তরের সাথে সংশ্লিষ্ট আইনের নাম ও ধারা উল্লেখ থাকে। অধিকতর নিশ্চিতের জন্য আপনি এক ক্লিকে আইনজীবীর দ্বারা উত্তরটি যাচাই করাতে পারেন।',
    },
    {
      q: 'আইনজীবীর যাচাই (Verification) সেবা কীভাবে কাজ করে?',
      a: 'আপনি এআই উত্তরটি যাচাইয়ের অনুরোধ পাঠালে তালিকাভুক্ত একজন আইনজীবী মূল প্রশ্ন ও এআই উত্তরটি পর্যালোচনা করেন এবং উত্তরটি নির্ভুল (Accurate), অসম্পূর্ণ (Incomplete) বা সংশোধনযোগ্য (Needs Correction) কি না তা জানিয়ে ব্যক্তিগত পরামর্শ নোট প্রদান করেন।',
    },
    {
      q: 'আমার গোপনীয় তথ্য কি সুরক্ষিত থাকবে?',
      a: 'আমরা আপনার ব্যক্তিগত পরিচয় ও প্রশ্নের গোপনীয়তা বজায় রাখি। আইনজীবীর সাথে আলোচনার সময় ব্যক্তিগত এনআইডি বা অতি সংবেদনশীল তথ্য গোপন রেখে প্রাসঙ্গিক বিবরণ শেয়ার করার জন্য আমরা পরামর্শ দিয়ে থাকি।',
    },
    {
      q: 'কোন কোন আইনের ওপর সেবাটি চালু আছে?',
      a: 'প্রথম সংস্করণে গণপ্রজাতন্ত্রী বাংলাদেশের সংবিধান, সাইবার সুরক্ষা অধ্যাদেশ ২০২৫, পারিবারিক সহিংসতা আইন ২০১০, যৌতুক নিরোধ আইন ২০১৮ এবং ভোক্তা-অধিকার সংরক্ষণ আইন ২০০৯ সম্পূর্ণ সক্রিয় রয়েছে।',
    },
    {
      q: 'খসড়া লিগ্যাল নোটিশ কি সরাসরি ব্যবহার করা যাবে?',
      a: 'আমাদের ড্রাফটিং উইজার্ড একটি প্রাথমিক মানসম্মত খসড়া তৈরি করে দেয়। নোটিশটি রেজিস্ট্রি ডাকযোগে পাঠানোর পূর্বে একজন তালিকাভুক্ত আইনজীবীকে দেখিয়ে চূড়ান্ত করা সর্বোত্তম।',
    },
  ];

  const faqItemsEn = [
    {
      q: 'Does this platform replace a licensed lawyer?',
      a: 'No. This is a legal information platform designed to help citizens understand their legal rights and the applicable statutes in plain language. It does not provide binding legal counsel or court representation.',
    },
    {
      q: 'How is the accuracy of AI answers grounded?',
      a: 'The assistant retrieves sections directly from an indexed vector database of codified Bangladeshi statutes before generating an answer. Every assertion carries an explicit Act and Section citation.',
    },
    {
      q: 'How does Lawyer Verification work?',
      a: 'You can submit any AI answer to an enrolled advocate on our platform. The lawyer checks the citation grounding, issues an official verdict, notes any corrections, and adds statutory context.',
    },
    {
      q: 'Is my personal information and question data safe?',
      a: 'We respect citizen privacy. We strongly advise redacting sensitive NID or bank account information before attaching documents into consultation threads.',
    },
    {
      q: 'Which Bangladeshi statutes are currently live?',
      a: 'Version 1 covers the Constitution of Bangladesh, Cyber Security Legal Framework, Domestic Violence Act 2010, Dowry Prohibition Act 2018, and Consumer Rights Protection Act 2009.',
    },
    {
      q: 'Can I send the drafted legal notice directly?',
      a: 'The wizard creates a structured statutory notice draft. We recommend having an enrolled advocate review and sign formal legal notices before dispatch via Registered Post.',
    },
  ];

  const items = lang === 'bn' ? faqItemsBn : faqItemsEn;

  return (
    <div className="py-12 sm:py-16">
      <div className="shell max-w-3xl">
        <div className="mb-10">
          <span className="font-mono text-label uppercase tracking-wider text-clay-deep">
            {lang === 'bn' ? 'সাধারণ জিজ্ঞাসা' : 'Frequently Asked Questions'}
          </span>
          <h1 className="font-display text-display font-bold text-ink mt-2">
            {lang === 'bn' ? 'সচরাচর জিজ্ঞাসিত প্রশ্ন ও উত্তর' : 'Common Questions & Answers'}
          </h1>
          <p className="mt-3 text-body text-ink-soft">
            {lang === 'bn'
              ? 'আইনি সহায়কের কার্যক্রম, এআই সীমাবদ্ধতা, আইনজীবী যাচাই ও গোপনীয়তা সংক্রান্ত বিস্তারিত।'
              : 'Everything you need to know about our legal assistant, escalation ladder, and safety safeguards.'}
          </p>
        </div>

        <div className="rounded border border-granite bg-white p-6 sm:p-8 shadow-sm">
          <Accordion items={items} />
        </div>
      </div>
    </div>
  );
}
