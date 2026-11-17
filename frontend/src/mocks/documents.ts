import type { DraftDocument, DraftTemplate } from './types';

export const mockDraftTemplates: DraftTemplate[] = [
  {
    id: 'tmpl-legal-notice-rent',
    slug: 'legal-notice-rent',
    titleBn: 'বাড়িভাড়া বৃদ্ধি ও বেআইনি উচ্ছেদ প্রতিরোধে লিগ্যাল নোটিশ',
    titleEn: 'Advocate Legal Notice: Unlawful Eviction & Arbitrary Rent Hike',
    categoryBn: 'বাড়িভাড়া ও দেওয়ানি বিরোধ',
    categoryEn: 'Tenancy & Civil Disputes',
    descriptionBn: 'বাড়িওয়ালা কর্তৃক নোটিশ ছাড়া উচ্ছেদ কিংবা অন্যায় ভাড়া বৃদ্ধির চেষ্টার বিরুদ্ধে আনুষ্ঠানিক আইনি নোটিশ।',
    descriptionEn: 'Formal statutory notice warning landlord against arbitrary eviction and breach of tenancy agreement.',
    steps: [
      {
        id: 'sender_info',
        questionBn: 'আপনার (ভাড়াটিয়ার) পূর্ণ নাম ও বর্তমান ঠিকানা লিখুন',
        questionEn: 'Enter your (tenant’s) full name and current residential address',
        hintBn: 'উদাহরণ: তাহরিম আরাহা, ফ্ল্যাট ৪বি, বাড়ি ১২, রোড ৫, ধানমন্ডি, ঢাকা',
        hintEn: 'e.g. Mayesha, Flat 4B, House 12, Road 5, Dhanmondi, Dhaka',
        fieldType: 'text',
        placeholderBn: 'পূর্ণ নাম ও ঠিকানা',
        placeholderEn: 'Full name and address',
      },
      {
        id: 'recipient_info',
        questionBn: 'বাড়িওয়ালার পূর্ণ নাম ও ঠিকানা লিখুন',
        questionEn: 'Enter landlord’s full name and address',
        hintBn: 'যার বরাবর লিগ্যাল নোটিশটি পাঠানো হবে',
        hintEn: 'The property owner or authorized attorney',
        fieldType: 'text',
        placeholderBn: 'বাড়িওয়ালার নাম ও ঠিকানা',
        placeholderEn: 'Landlord’s name and address',
      },
      {
        id: 'tenancy_date',
        questionBn: 'কবে থেকে আপনি এই বাড়িতে ভাড়াটিয়া হিসেবে বসবাস করছেন?',
        questionEn: 'Since which date have you been occupying the premises as a tenant?',
        hintBn: 'চুক্তিপত্রের তারিখ বা বসবাসের শুরুর তারিখ',
        hintEn: 'Start date of tenancy agreement',
        fieldType: 'date',
      },
      {
        id: 'current_rent',
        questionBn: 'বর্তমান মাসিক ভাড়া কত (টাকায়)?',
        questionEn: 'What is the currently agreed monthly rent amount in BDT?',
        hintBn: 'উদাহরণ: ২০,০০০',
        hintEn: 'e.g. 20000',
        fieldType: 'number',
        placeholderBn: 'যেমন: ২০০০০',
        placeholderEn: 'e.g. 20000',
      },
      {
        id: 'dispute_details',
        questionBn: 'বাড়িওয়ালা কীভাবে আইন বা চুক্তি ভঙ্গ করছেন?',
        questionEn: 'Describe the specific violations or illegal eviction threats',
        hintBn: 'যেমন: নোটিশ ছাড়া ৩০% ভাড়া বৃদ্ধি, পানি/বিদ্যুৎ সংযোগ বিচ্ছিন্ন করার হুমকি ইত্যাদি',
        hintEn: 'e.g. 30% sudden rent hike without written notice, threats of disconnecting utilities',
        fieldType: 'textarea',
        placeholderBn: 'ঘটনার সংক্ষিপ্ত বিবরণ...',
        placeholderEn: 'Brief description of what happened...',
      },
      {
        id: 'notice_period_days',
        questionBn: 'বাড়িওয়ালাকে বিরোধ নিষ্পত্তির জন্য কত দিনের সময় দিতে চান?',
        questionEn: 'How many days notice period for compliance?',
        hintBn: 'সাধারণত আইনি নোটিশে ৭, ১৫ বা ৩০ দিন সময় প্রদান করা হয়',
        hintEn: 'Standard statutory period is usually 7 to 15 days',
        fieldType: 'select',
        options: [
          { value: '7', labelBn: '৭ (সাত) দিন', labelEn: '7 Days' },
          { value: '15', labelBn: '১৫ (পনেরো) দিন', labelEn: '15 Days' },
          { value: '30', labelBn: '৩০ (ত্রিশ) দিন', labelEn: '30 Days' },
        ],
      },
    ],
  },
  {
    id: 'tmpl-consumer-complaint',
    slug: 'consumer-complaint',
    titleBn: 'ভোক্তা অধিকার সংরক্ষণ অধিদপ্তরে অভিযোগপত্র',
    titleEn: 'Consumer Rights Protection Directorate Formal Complaint',
    categoryBn: 'ভোক্তা অধিকার ও ক্ষতিপূরণ',
    categoryEn: 'Consumer Rights & Compensation',
    descriptionBn: 'অতিরিক্ত মূল্য আদায়, মেয়াদোত্তীর্ণ বা ভেজাল পণ্য বিক্রির বিরুদ্ধে জাতীয় ভোক্তা অধিকার সংরক্ষণ অধিদপ্তরে অভিযোগ।',
    descriptionEn: 'Whistleblower petition to the DNCRP for overcharging, adulteration, or deceptive commercial practices.',
    steps: [
      {
        id: 'complainant_name',
        questionBn: 'অভিযোগকারী ভোক্তার নাম ও মোবাইল নম্বর',
        questionEn: 'Complainant’s name and contact number',
        hintBn: 'জাতীয় পরিচয়পত্র অনুযায়ী নাম',
        hintEn: 'Full legal name and active phone',
        fieldType: 'text',
        placeholderBn: 'নাম ও ফোন নম্বর',
        placeholderEn: 'Name and phone number',
      },
      {
        id: 'shop_name_location',
        questionBn: 'দোকান/প্রতিষ্ঠানের নাম ও পূর্ণ ঠিকানা',
        questionEn: 'Name of the merchant/establishment and branch address',
        hintBn: 'ক্যাশ মেমো বা রসিদে থাকা সঠিক নাম ও বাজার/এলাকার ঠিকানা',
        hintEn: 'Merchant name and exact store location',
        fieldType: 'text',
        placeholderBn: 'দোকানের নাম ও ঠিকানা',
        placeholderEn: 'Shop name and address',
      },
      {
        id: 'offense_type',
        questionBn: 'আইন লঙ্ঘনের ধরন নির্বাচন করুন',
        questionEn: 'Select nature of statutory offense',
        hintBn: 'ভোক্তা অধিকার আইনের সংশ্লিষ্ট অপরাধ',
        hintEn: 'Ground under Consumer Protection Act 2009',
        fieldType: 'select',
        options: [
          { value: 'mrp_violation', labelBn: 'ধার্যকৃত মূল্যের (MRP) অধিক মূল্যে বিক্রয় (ধারা ৩৭)', labelEn: 'Selling above MRP (Section 37)' },
          { value: 'weight_shortage', labelBn: 'ওজনে বা পরিমাপে কারচুপি (ধারা ৪৬)', labelEn: 'Weight / Measure Shortage (Section 46)' },
          { value: 'expired_goods', labelBn: 'মেয়াদোত্তীর্ণ বা ভেজাল পণ্য বিক্রয় (ধারা ৫১)', labelEn: 'Selling Expired / Adulterated Goods (Section 51)' },
          { value: 'false_ad', labelBn: 'মিথ্যা বিজ্ঞাপন দ্বারা প্রতারণা (ধারা ৪৪)', labelEn: 'False or Misleading Advertisement (Section 44)' },
        ],
      },
      {
        id: 'incident_summary',
        questionBn: 'ঘটনার তারিখ ও পণ্যের বিবরণ',
        questionEn: 'Incident date, product description and purchase amount',
        hintBn: 'রসিদ নম্বর ও অতিরিক্ত কত টাকা রাখা হয়েছে তা স্পষ্ট উল্লেখ করুন',
        hintEn: 'Include invoice number and overcharged amount',
        fieldType: 'textarea',
        placeholderBn: 'যেমন: গত ১০ মে তারিখে ২০০ টাকার পণ্যে ২৩০ টাকা রাখা হয়েছে...',
        placeholderEn: 'e.g. On 10 May I was charged 230 BDT for a product priced at 200 BDT...',
      },
    ],
  },
  {
    id: 'tmpl-general-diary-cyber',
    slug: 'general-diary-cyber',
    titleBn: 'অনলাইন হয়রানি ও হুমকির বিষয়ে সাধারণ ডায়েরি (GD) আবেদন',
    titleEn: 'General Diary (GD) Application for Online Harassment & Threats',
    categoryBn: 'সাইবার ও নিরাপত্তা',
    categoryEn: 'Cyber & Public Safety',
    descriptionBn: 'অনলাইনে হুমকি, ব্ল্যাকমেইল বা ফেক আইডি খুলে অপপ্রচারের বিরুদ্ধে থানায় সাধারণ ডায়েরি (GD) করার খসড়া।',
    descriptionEn: 'Police station GD petition draft recording cyber harassment, online extortion, and social media identity theft.',
    steps: [
      {
        id: 'police_station',
        questionBn: 'সংশ্লিষ্ট থানার নাম ও জেলা',
        questionEn: 'Target Police Station & District',
        hintBn: 'যে থানার আওতাধীন এলাকায় আপনি বসবাস করছেন',
        hintEn: 'Local Thana jurisdiction',
        fieldType: 'text',
        placeholderBn: 'ভারপ্রাপ্ত কর্মকর্তা, ধানমন্ডি থানা, ঢাকা',
        placeholderEn: 'Officer-in-Charge, Dhanmondi Police Station, Dhaka',
      },
      {
        id: 'applicant_details',
        questionBn: 'আবেদনকারীর নাম, পিতার নাম ও জাতীয় পরিচয়পত্র নম্বর',
        questionEn: 'Applicant’s full name, father’s name & NID number',
        hintBn: 'থানার রেকর্ডের জন্য সঠিক তথ্য প্রদান করুন',
        hintEn: 'Exact NID details for police records',
        fieldType: 'text',
        placeholderBn: 'নাম, পিতার নাম ও এনআইডি নম্বর',
        placeholderEn: 'Name, father’s name and NID number',
      },
      {
        id: 'offender_info',
        questionBn: 'বিবাদী বা সন্দেহভাজন ব্যক্তির বিবরণ (জানা থাকলে)',
        questionEn: 'Suspect profile / Facebook ID link / Phone number (if known)',
        hintBn: 'ফেসবুক প্রোফাইল ইউআরএল, ব্যবহৃত ফোন নম্বর বা অজ্ঞাত হিসেবে উল্লেখ',
        hintEn: 'Target URL, profile link or specify unknown',
        fieldType: 'text',
        placeholderBn: 'প্রোফাইল লিঙ্ক বা ফোন নম্বর',
        placeholderEn: 'Profile link or phone number',
      },
      {
        id: 'incident_details',
        questionBn: 'হুমকি বা অপপ্রচারের ঘটনা কীভাবে ঘটেছে?',
        questionEn: 'Detailed account of the cyber incident and threats',
        hintBn: 'তারিখ, সময় ও ডিজিটাল প্ল্যাটফর্মের নাম উল্লেখ করুন',
        hintEn: 'Specific timestamps, messages and platforms',
        fieldType: 'textarea',
        placeholderBn: 'ঘটনার বিবরণ...',
        placeholderEn: 'Description of the incident...',
      },
    ],
  },
];

export const mockDraftDocuments: DraftDocument[] = [
  {
    id: 'doc-1',
    userId: 'user-citizen-1',
    templateId: 'tmpl-legal-notice-rent',
    templateTitleBn: 'বাড়িভাড়া বৃদ্ধি ও বেআইনি উচ্ছেদ প্রতিরোধে লিগ্যাল নোটিশ',
    templateTitleEn: 'Advocate Legal Notice: Unlawful Eviction & Arbitrary Rent Hike',
    title: 'লিগ্যাল নোটিশ — বাড়িওয়ালা জনাব করিম চৌধুরী বরাবর',
    status: 'draft',
    answers: {
      sender_info: 'তাহরিম আরাহা, ফ্ল্যাট ৪বি, বাড়ি ১২, রোড ৫, ধানমন্ডি, ঢাকা',
      recipient_info: 'জনাব করিম চৌধুরী, বাড়ি ১২, রোড ৫, ধানমন্ডি, ঢাকা',
      tenancy_date: '2023-01-01',
      current_rent: '22000',
      dispute_details: 'কোনো যৌক্তিক কারণ বা পূর্ব নোটিশ ছাড়া হঠাৎ ৫,০০০ টাকা অতিরিক্ত ভাড়া দাবি এবং চলতি মাসের মধ্যে ফ্ল্যাট ছেড়ে দেওয়ার হুমকি।',
      notice_period_days: '15',
    },
    generatedTextBn: `আইনজীবী মারফত রেজিস্ট্রি ডাকযোগে প্রেরিত লিগ্যাল নোটিশ
তারিখ: ১৫ মে ২০২৫

প্রাপক:
জনাব করিম চৌধুরী
বাড়ি ১২, রোড ৫, ধানমন্ডি, ঢাকা

প্রেরক (আমার মোয়াক্কেল):
তাহরিম আরাহা
ফ্ল্যাট ৪বি, বাড়ি ১২, রোড ৫, ধানমন্ডি, ঢাকা

বিষয়: বাড়ী ভাড়া নিয়ন্ত্রণ আইন, ১৯৯১ এর ধারা ৭ ও ১৮ লঙ্ঘনে অন্যায় ভাড়া বৃদ্ধি ও নোটিশবিহীন উচ্ছেদের হুমকির বিরুদ্ধে আইনি নোটিশ।

জনাব,
আমার উপরোক্ত মোয়াক্কেলের প্রদত্ত নির্দেশনা ও নির্দেশে আপনাকে জানানো যাইতেছে যে:

১. আমার মোয়াক্কেল বিগত ০১ জানুয়ারি ২০২৩ তারিখ হইতে আপনার মালিকানাধীন উপরোক্ত ফ্ল্যাটে মাসিক ২২,০০০/- (বাইশ হাজার) টাকা নির্ধারিত ভাড়ায় নিয়মিত ভাড়াটিয়া হিসেবে বসবাস করিয়া আসিতেছেন এবং প্রতি মাসের ভাড়া যথারীতি পরিশোধ করিয়া রসিদ গ্রহণ করিয়াছেন।

২. সম্প্রতি আপনি কোনরূপ আইনানুগ নোটিশ বা যৌক্তিক কারণ ব্যতিরেকে হঠাৎ অতিরিক্ত ৫,০০০/- টাকা ভাড়া বৃদ্ধির অন্যায় দাবি উত্থাপন করিয়াছেন এবং উক্ত বর্ধিত ভাড়া প্রদানে অপারগতা প্রকাশ করায় চলতি মাসের মধ্যেই বলপূর্বক উচ্ছেদের হুমকি প্রদান করিয়াছেন।

৩. বাড়ী ভাড়া নিয়ন্ত্রণ আইন, ১৯৯১ এর ধারা ৭ অনুযায়ী মানসম্মত ভাড়ার অতিরিক্ত ভাড়া দাবি বা বলপূর্বক বৃদ্ধি সম্পূর্ণ বেআইনি ও বাতিলযোগ্য। একই আইনের ধারা ১৮ অনুযায়ী, নিয়মিত ভাড়া পরিশোধরত অবস্থায় বাড়িভাড়া নিয়ন্ত্রকের পূর্বানুমোদন ও আইনি প্রক্রিয়া ব্যতীত ভাড়াটিয়াকে উচ্ছেদ করা দণ্ডনীয় দেওয়ানি লঙ্ঘন।

এমতাবস্থায়, এই নোটিশ প্রাপ্তির ১৫ (পনেরো) দিনের মধ্যে অন্যায় ভাড়া বৃদ্ধির দাবি প্রত্যাহারপূর্বক আমার মোয়াক্কেলকে শান্তিপূর্ণভাবে বসবাস করিতে দেওয়ার জন্য আপনাকে অনুরোধ করা যাইতেছে। অন্যথায় আমার মোয়াক্কেল আপনার বিরুদ্ধে যথাযথ আদালতে মামলা দায়ের করিতে বাধ্য হইবেন।

অ্যাডভোকেট শামসুল আলম চৌধুরী
বাংলাদেশ সুপ্রিম কোর্ট`,
    generatedTextEn: `LEGAL NOTICE VIA REGISTERED POST
Date: 15 May 2025

To:
Karim Chowdhury
House 12, Road 5, Dhanmondi, Dhaka

From (Under instructions of my Client):
Mayesha
Flat 4B, House 12, Road 5, Dhanmondi, Dhaka

Subject: Statutory Legal Notice against arbitrary rent hike and illegal eviction threats in violation of Sections 7 & 18 of the House Rent Control Act, 1991.

Sir,
Under explicit instructions from my client, you are hereby notified as follows:

1. My client has been occupying the premises at Flat 4B since 01 January 2023 at an agreed monthly rent of BDT 22,000/- and has performed all tenancy obligations punctually.

2. You have recently made arbitrary demands for an unlawful rent increase of BDT 5,000/- and threatened summary eviction without statutory notice.

3. Under Section 7 of the House Rent Control Act 1991, arbitrary rent increases are illegal. Under Section 18, peaceful tenants cannot be evicted without statutory grounds sanctioned by the Rent Controller.

You are hereby requested to cease all harassment and withdraw illegal demands within 15 days of this notice, failing which legal proceedings will be instituted against you at your risk and cost.

Advocate Shamsul Alam Chowdhury
Supreme Court of Bangladesh`,
    createdAt: '2025-05-14T16:00:00Z',
    updatedAt: '2025-05-14T16:25:00Z',
  },
];
