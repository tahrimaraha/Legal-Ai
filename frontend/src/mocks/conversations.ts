import { citations } from './citations';
import type { Conversation } from './types';

export const mockConversations: Conversation[] = [
  {
    id: 'conv-rent-1',
    titleBn: 'নোটিশ ছাড়া বাড়িভাড়া বৃদ্ধি ও উচ্ছেদ সংক্রান্ত প্রশ্ন',
    titleEn: 'Arbitrary rent hike and eviction notice without legal ground',
    updatedAt: '2025-05-12T14:32:00Z',
    citedStatuteIds: ['rent-control-1991'],
    messages: [
      {
        id: 'msg-user-1',
        role: 'user',
        bodyBn: 'আমার বাড়িওয়ালা কোনো নোটিশ না দিয়ে হঠাৎ ৩,০০০ টাকা ভাড়া বাড়িয়ে দিয়েছেন এবং চলতি মাসেই বাড়ি ছাড়তে বলছেন। আমি নিয়মিত ভাড়া দিয়ে আসছি। আইন অনুযায়ী আমি কী পদক্ষেপ নিতে পারি?',
        bodyEn: 'My landlord suddenly increased rent by 3,000 BDT without notice and is threatening eviction by the end of this month. I have always paid rent on time. What are my legal rights?',
        citations: [],
        createdAt: '2025-05-12T14:30:00Z',
      },
      {
        id: 'msg-ai-1',
        role: 'assistant',
        bodyBn:
          'বাংলাদেশে বাড়ী ভাড়া সংক্রান্ত বিরোধে **বাড়ী ভাড়া নিয়ন্ত্রণ আইন, ১৯৯১** অনুযায়ী আপনার স্পষ্ট অধিকার রয়েছে।\n\n### ১. নোটিশ ছাড়া উচ্ছেদ বেআইনি\nআইনের **ধারা ১৮** অনুযায়ী, যতক্ষণ আপনি নিয়মিত ও নির্ধারিত হারে ভাড়া পরিশোধ করবেন, ততক্ষণ বাড়িওয়ালা আপনাকে ইচ্ছামতো তাৎক্ষণিক উচ্ছেদ করতে পারবেন না। উচ্ছেদের জন্য বাড়িভাড়া নিয়ন্ত্রকের সম্মতি ও যৌক্তিক লিখিত নোটিশ আবশ্যক।\n\n### ২. অযৌক্তিক ভাড়া বৃদ্ধি নিষিদ্ধ\nআইনের **ধারা ৭** অনুযায়ী, দুই বছরের মধ্যে মানসম্মত ভাড়ার অতিরিক্ত বা একতরফাভাবে ভাড়া বৃদ্ধি আইনত বেআইনি ও অকার্যকর।\n\n### আপনি তাৎক্ষণিকভাবে কী করতে পারেন:\n1. প্রতি মাসের ভাড়ার লিখিত রসিদ (Money Receipt) ও ব্যাংকিং লেনদেনের প্রমাণ যত্নসহকারে সংরক্ষণ করুন।\n2. বাড়িওয়ালা সরাসরি ভাড়া নিতে অস্বীকার করলে, ডাকযোগে মানি অর্ডার করে পাঠাতে পারেন বা আদালতে ভাড়া জমা দেওয়ার ব্যবস্থা নিতে পারেন।\n3. পরিস্থিতি জটিল হলে আইনজীবী কর্তৃক একটি আনুষ্ঠানিক **লিগ্যাল নোটিশ (Legal Notice)** পাঠাতে পারেন।',
        bodyEn:
          'Under Bangladeshi law, your tenancy rights are protected under the **House Rent Control Act, 1991**.\n\n### 1. Summary Eviction is Illegal\nUnder **Section 18**, as long as you pay rent regularly, the landlord cannot arbitrarily evict you without reasonable advance written notice and formal grounds permitted by law.\n\n### 2. Arbitrary Rent Hikes are Unenforceable\nUnder **Section 7**, any sudden, unilateral increase beyond the standard rent is legally invalid.\n\n### Immediate Steps You Can Take:\n1. Preserve all rent receipts, bank deposit slips, or payment records.\n2. If the landlord refuses to accept rent, send it via Postal Money Order or deposit into court.\n3. Send a formal legal notice through an advocate if harassment persists.',
        citations: [citations['rent-18'], citations['rent-7']],
        createdAt: '2025-05-12T14:31:00Z',
        rating: 'up',
        verificationId: 'req-verif-1',
      },
    ],
  },
  {
    id: 'conv-cyber-2',
    titleBn: 'ফেসবুকে অনুমতিহীন ছবি ও অনলাইন ব্ল্যাকমেইল',
    titleEn: 'Unauthorized photo leak and online extortion threats',
    updatedAt: '2025-05-10T10:15:00Z',
    citedStatuteIds: ['cyber-ordinance-2025', 'penal-code-1860'],
    messages: [
      {
        id: 'msg-user-2',
        role: 'user',
        bodyBn: 'এক ব্যক্তি অনলাইনে আমার ব্যক্তিগত ছবি অনুমতি ছাড়া শেয়ার করার হুমকি দিয়ে টাকা দাবি করছে। আমি কীভাবে দ্রুত পুলিশি ও আইনি ব্যবস্থা নিব?',
        bodyEn: 'Someone is threatening to share my private pictures online unless I pay money. How can I take urgent legal and police action?',
        citations: [],
        createdAt: '2025-05-10T10:14:00Z',
      },
      {
        id: 'msg-ai-2',
        role: 'assistant',
        bodyBn:
          'এটি একটি গুরুতর সাইবার অপরাধ। **সাইবার সুরক্ষা অধ্যাদেশ ২০২৫** এবং **দণ্ডবিধি ১৮৬০** অনুযায়ী আপনি সরাসরি আইন প্রয়োগকারী সংস্থার সুরক্ষা পেতে পারেন।\n\n### ১. সম্মতি ছাড়া ব্যক্তিগত ছবি প্রকাশ অপরাধ\nসাইবার আইনের **ধারা ২৪** অনুযায়ী, অনুমতি ব্যতীত কারো ব্যক্তিগত ছবি বা তথ্য অনলাইনে প্রকাশ বা ছড়ানো শাস্তিযোগ্য অপরাধ।\n\n### ২. ব্ল্যাকমেইল ও চাঁদাবাজি\nদণ্ডবিধির **ধারা ৪২০ ও ৫০৬** অনুযায়ী অপরাধমূলক ভীতি প্রদর্শন ও আর্থিক প্রতারণার জন্য ৩ থেকে ৭ বছর পর্যন্ত কারাদণ্ডের বিধান রয়েছে।\n\n### জরুরি করণীয় পদক্ষেপ:\n1. সমস্ত চ্যাট, কল রেকর্ড, প্রোফাইল লিঙ্ক ও স্ক্রিনশট (তারিখ ও সময়সহ) অক্ষত রাখুন — ডিলিট করবেন না।\n2. দ্রুত নিকটস্থ থানায় গিয়ে **সাধারণ ডায়েরি (GD)** অথবা সাইবার সাপোর্ট ফর উইমেন / সিআইডি সাইবার পুলিশ সেন্টারে অভিযোগ দায়ের করুন।\n3. কোনো অবস্থাতেই ব্ল্যাকমেইলারের দাবিতে টাকা পাঠাবেন না।',
        bodyEn:
          'This constitutes a serious criminal act under the **Cyber Security Legal Framework** and the **Penal Code 1860**.\n\n### 1. Non-consensual Image Sharing\nUnder **Section 24**, distributing private photos or identifying information without consent is a strictly punishable offense.\n\n### 2. Extortion & Criminal Intimidation\nUnder **Penal Code Sections 420 & 506**, demanding money through threats carries severe imprisonment.\n\n### Recommended Actions:\n1. Preserve all timestamps, profile URLs, and chat screenshots as digital evidence.\n2. Report immediately to your local police station (GD) or the CID Cyber Police Centre.\n3. Never transfer any demanded ransom.',
        citations: [citations['cyber-24'], citations['penal-420']],
        createdAt: '2025-05-10T10:15:00Z',
      },
    ],
  },
  {
    id: 'conv-dv-3',
    titleBn: 'পারিবারিক নির্যাতন ও আদালতের জরুরি সুরক্ষা আদেশ',
    titleEn: 'Domestic violence protection order and maintenance rights',
    updatedAt: '2025-05-08T18:20:00Z',
    citedStatuteIds: ['domestic-violence-2010', 'dowry-prohibition-2018'],
    messages: [
      {
        id: 'msg-user-3',
        role: 'user',
        bodyBn: 'শ্বশুরবাড়িতে শারীরিক ও মানসিক নির্যাতন করা হচ্ছে এবং যৌতুক দাবি করা হচ্ছে। আমি নিজের ও সন্তানের নিরাপত্তার জন্য আদালতের কী সুরক্ষা পেতে পারি?',
        bodyEn: 'I am facing physical and verbal abuse and continuous dowry demands from in-laws. What legal protection orders can I get for myself and my child?',
        citations: [],
        createdAt: '2025-05-08T18:18:00Z',
      },
      {
        id: 'msg-ai-3',
        role: 'assistant',
        bodyBn:
          'আপনার ও আপনার সন্তানের সুরক্ষার জন্য বাংলাদেশে অত্যন্ত শক্তিশালী আইনি বিধান রয়েছে:\n\n### ১. আদালতের তাৎক্ষণিক সুরক্ষা আদেশ\n**পারিবারিক সহিংসতা (প্রতিরোধ ও সুরক্ষা) আইন, ২০১০** এর **ধারা ৩ ও ১১** অনুযায়ী, প্রথম শ্রেণির জুডিশিয়াল ম্যাজিস্ট্রেট বা মেট্রোপলিটন ম্যাজিস্ট্রেটের কাছে আবেদন করে অবিলম্বে নির্যাতনকারীর বিরুদ্ধে অন্তর্বর্তীকালীন সুরক্ষা আদেশ (Protection Order) পাওয়া যায়।\n\n### ২. যৌতুক দাবি সম্পূর্ণ শাস্তিযোগ্য\n**যৌতুক নিরোধ আইন, ২০১৮** এর **ধারা ৩** অনুযায়ী, বিয়ের পর যেকোনো সময় যৌতুক বা উপঢৌকন দাবি করা ১ থেকে ৫ বছর পর্যন্ত সশ্রম কারাদণ্ডযোগ্য অপরাধ।\n\n### পদক্ষেপসমূহ:\n- সরকারি হেল্পলাইন **১০৯** (নারী ও শিশু নির্যাতন প্রতিরোধ সেল) অথবা **৯৯৯** এ জরুরি কল করুন।\n- জেলা জজ আদালতে অবস্থিত জাতীয় আইনগত সহায়তা প্রদান সংস্থা (Legal Aid Office) থেকে বিনামূল্যে সরকারি আইনজীবী সহায়তা পেতে পারেন।',
        bodyEn:
          'Under Bangladeshi law, multiple remedies exist to guarantee your safety:\n\n### 1. Interim Protection Order\nUnder the **Domestic Violence (Prevention and Protection) Act, 2010**, sections 3 & 11, you can petition a Judicial Magistrate for an immediate protection and residence order.\n\n### 2. Penalties for Dowry Demands\nUnder **Section 3 of the Dowry Prohibition Act, 2018**, demanding money or assets carries up to 5 years imprisonment.\n\n### Steps:\n- Call the national toll-free helpline **109** or **999** for emergency rescue.\n- Seek free government legal aid at the District Legal Aid Office.',
        citations: [citations['dv-3'], citations['dowry-3']],
        createdAt: '2025-05-08T18:20:00Z',
      },
    ],
  },
  {
    id: 'conv-consumer-4',
    titleBn: 'দোকানদার কর্তৃক এমআরপি-র চেয়ে বেশি মূল্য আদায়',
    titleEn: 'Merchant charging above Maximum Retail Price (MRP)',
    updatedAt: '2025-05-01T09:00:00Z',
    citedStatuteIds: ['consumer-rights-2009'],
    messages: [
      {
        id: 'msg-user-4',
        role: 'user',
        bodyBn: 'একটি সুপারশপ পণ্যের প্যাকেটে লেখা দামের চেয়ে ২০ টাকা বেশি নিয়েছে এবং বিলের কপি দিয়েছে। আমি কীভাবে অভিযোগ করব এবং কোনো ক্ষতিপূরণ পাব?',
        bodyEn: 'A superstore charged 20 BDT above the printed MRP and gave me a printed receipt. How do I file a complaint and can I receive compensation?',
        citations: [],
        createdAt: '2025-05-01T08:58:00Z',
      },
      {
        id: 'msg-ai-4',
        role: 'assistant',
        bodyBn:
          '**ভোক্তা-অধিকার সংরক্ষণ আইন, ২০০৯** অনুযায়ী এটি একটি সরাসরি শাস্তিযোগ্য অপরাধ এবং আপনি আর্থিক পুরস্কার লাভের অধিকারী।\n\n### ১. নির্ধারিত মূল্যের বেশি নেওয়া বেআইনি\nআইনের **ধারা ৩৭** অনুযায়ী, মোড়কের গায়ে মুদ্রিত মূল্যের (MRP) অধিক মূল্যে পণ্য বিক্রি করলে ১ বছর পর্যন্ত কারাদণ্ড বা ৫০,০০০ টাকা পর্যন্ত অর্থদণ্ড হতে পারে।\n\n### ২. অভিযোগকারীর ২৫% আর্থিক পুরস্কার\nআইনের **ধারা ৭৬(৪)** অনুযায়ী, জাতীয় ভোক্তা-অধিকার সংরক্ষণ অধিদপ্তর কর্তৃক দোকানদারের নিকট থেকে যে জরিমানা আদায় করা হবে, তার **২৫% সরাসরি অভিযোগকারী নাগরিককে পুরস্কার** হিসেবে প্রদান করা হবে।\n\n### অভিযোগের নিয়ম:\nঘটনার ৩০ দিনের মধ্যে ক্রয়ের রসিদ ও পণ্যের মোড়কের ছবি সহ `dncrp.portal.gov.bd` ওয়েবসাইটে বা হটলাইন ১৬১২১-এ লিখিত অভিযোগ দায়ের করুন।',
        bodyEn:
          'Under the **Consumer Rights Protection Act, 2009**, overcharging is an offense with a direct citizen bounty.\n\n### 1. Prohibition on Overcharging\nUnder **Section 37**, selling above printed MRP carries up to 1 year imprisonment or fines up to 50,000 BDT.\n\n### 2. 25% Whistleblower Reward\nUnder **Section 76(4)**, 25% of any penalty realized from the offending merchant is disbursed directly to you as a reward.\n\n### How to file:\nSubmit your printed bill and photo within 30 days to the Directorate of National Consumer Rights Protection (DNCRP) online or via hotline 16121.',
        citations: [citations['cr-37']],
        createdAt: '2025-05-01T09:00:00Z',
      },
    ],
  },
];
