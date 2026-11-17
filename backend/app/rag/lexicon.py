"""Legal topic lexicon: bridges everyday Bengali/English wording to the statutes in the corpus.

Each topic lists trigger words (either language), search expansions (the vocabulary the statutes
themselves use, in both languages), the Acts that govern it (title regexes matched against the corpus),
practice-area hints for the lawyer recommender, an optional crime-statistics category and short practical
next steps. Steps are general procedural guidance written for this project; every statement about what a
*law says* comes from the retrieved dataset text, never from here.
"""
from __future__ import annotations

import re
from dataclasses import dataclass, field

from app.rag.textproc import norm_query


@dataclass
class Topic:
    id: str
    name_en: str
    name_bn: str
    kw: list[str]            # triggers (en words / bn fragments); prefix "!" = strong trigger
    expand: list[str]        # extra search vocabulary
    acts: list[str]          # regexes over "title_en | title_bn"
    areas: list[str]         # lawyer practice-area hints (lower-case substrings)
    crime: str | None = None
    steps_en: list[str] = field(default_factory=list)
    steps_bn: list[str] = field(default_factory=list)
    urgent: bool = False
    _kw: list[tuple[re.Pattern, int]] = field(default_factory=list, repr=False)

    def __post_init__(self) -> None:
        for k in self.kw:
            w = 2 if k.startswith("!") else 1
            k = norm_query(k.lstrip("!"))
            whole = k.endswith("|")  # trailing "|" = whole English word only
            k = k.rstrip("|")
            if re.match(r"^[a-z0-9 ]+$", k):
                pat = re.compile(rf"\b{re.escape(k)}\b" if whole else rf"\b{re.escape(k)}")
            else:
                pat = re.compile(re.escape(k))
            self._kw.append((pat, w))

    def score(self, q: str) -> int:
        return sum(w for p, w in self._kw if p.search(q))


EMERGENCY_EN = "In immediate danger call 999 (national emergency)."
EMERGENCY_BN = "তাৎক্ষণিক বিপদে ৯৯৯ নম্বরে (জাতীয় জরুরি সেবা) কল করুন।"
LEGAL_AID_EN = "Free government legal aid: call 16430 or contact the District Legal Aid Office."
LEGAL_AID_BN = "বিনামূল্যে সরকারি আইনি সহায়তা: ১৬৪৩০ নম্বরে কল করুন বা জেলা লিগ্যাল এইড অফিসে যোগাযোগ করুন।"

T = Topic
TOPICS: list[Topic] = [
    T("rent", "Tenancy and house rent", "বাড়িভাড়া ও ভাড়াটিয়ার অধিকার",
      ["!rent", "!landlord", "!tenant", "tenancy", "evict", "lease", "!ভাড়া", "!বাড়িওয়ালা", "!ভাড়াটিয়া", "বাড়ির মালিক", "বাড়ি-মালিক", "উচ্ছেদ", "লিজ"],
      ["rent", "tenant", "landlord", "premises", "controller", "eviction", "receipt", "increase", "standard rent", "excess", "possession", "evicted", "notice", "বৃদ্ধি", "অতিরিক্ত", "ভাড়া", "ভাড়াটিয়া", "বাড়ি-মালিক", "নিয়ন্ত্রক", "উচ্ছেদ", "রসিদ"],
      [r"house rent control", r"rent receipt", r"transfer of property act", r"cantonments rent"],
      ["tenancy", "rent", "house rent", "land transfer", "property"],
      steps_en=["Keep every rent receipt or bank/mobile-banking proof, and ask your landlord for a written receipt.",
                "Do not pay extra or sign anything under pressure; keep all messages and notices in writing.",
                "If the dispute continues, a lawyer can send a legal notice or approach the Rent Controller for you."],
      steps_bn=["প্রতি মাসের ভাড়ার রসিদ বা ব্যাংক/মোবাইল ব্যাংকিং প্রমাণ সংরক্ষণ করুন এবং বাড়িওয়ালার কাছে লিখিত রসিদ চান।",
                "চাপের মুখে বাড়তি টাকা দেবেন না বা কিছুতে সই করবেন না; সব বার্তা ও নোটিশ লিখিত আকারে রাখুন।",
                "বিরোধ চলতে থাকলে আইনজীবীর মাধ্যমে লিগ্যাল নোটিশ পাঠাতে পারেন বা ভাড়া নিয়ন্ত্রকের কাছে যেতে পারেন।"]),
    T("domestic_violence", "Domestic violence", "পারিবারিক সহিংসতা",
      ["!domestic violence", "husband beat", "beaten by husband", "!husband", "!wife", "in-laws", "wife beating", "abuse at home", "battered", "!পারিবারিক সহিংসতা", "স্বামী মার", "স্বামীর নির্যাতন", "!স্বামী", "!স্ত্রী", "শ্বশুর", "শ্বশুরবাড়ি", "স্ত্রীকে মার", "ঘরে নির্যাতন"],
      ["domestic violence", "protection order", "aggrieved", "residence order", "magistrate", "সংক্ষুব্ধ", "সুরক্ষা আদেশ", "পারিবারিক সহিংসতা", "বাসস্থান", "ক্ষতিপূরণ"],
      [r"domestic violence", r"women and child"],
      ["domestic violence", "family", "dowry"], crime="Woman & Child Repression", urgent=True,
      steps_en=[EMERGENCY_EN + " The national helpline 109 supports women and children facing violence.",
                "Keep evidence: medical reports, photos, messages, names of witnesses.",
                "A lawyer or legal aid office can help you apply to the court for a protection order. " + LEGAL_AID_EN],
      steps_bn=[EMERGENCY_BN + " নারী ও শিশু নির্যাতনের শিকারদের জন্য জাতীয় হেল্পলাইন ১০৯।",
                "প্রমাণ সংরক্ষণ করুন: মেডিক্যাল রিপোর্ট, ছবি, বার্তা ও সাক্ষীদের নাম।",
                "সুরক্ষা আদেশের জন্য আদালতে আবেদনে আইনজীবী বা লিগ্যাল এইড অফিস সহায়তা করতে পারে। " + LEGAL_AID_BN]),
    T("dowry", "Dowry", "যৌতুক",
      ["!dowry", "!যৌতুক"], ["dowry", "যৌতুক", "demand", "marriage", "বিবাহ"],
      [r"dowry"], ["dowry", "family", "domestic violence"], crime="Woman & Child Repression", urgent=True,
      steps_en=["Write down every demand with dates and keep messages, call records and witness names.",
                "Report to the nearest police station or call 999 / 109 if you are being harmed.",
                "A lawyer can file a case or complaint; " + LEGAL_AID_EN],
      steps_bn=["প্রতিটি দাবি তারিখসহ লিখে রাখুন এবং বার্তা, কল রেকর্ড ও সাক্ষীদের নাম সংরক্ষণ করুন।",
                "নিকটস্থ থানায় জানান; ক্ষতির আশঙ্কা থাকলে ৯৯৯ / ১০৯ নম্বরে কল করুন।",
                "আইনজীবী মামলা বা অভিযোগ দায়ের করতে পারেন; " + LEGAL_AID_BN]),
    T("cyber", "Online harassment and cyber crime", "অনলাইন হয়রানি ও সাইবার অপরাধ",
      ["!cyber", "!facebook", "blackmail", "hacked", "hack", "fake id", "fake profile", "leak", "morph", "social media", "online", "deepfake", "sextortion", "!সাইবার", "!ফেসবুক", "ব্ল্যাকমেইল", "হ্যাক", "ভুয়া আইডি", "ছবি ছড়ি", "অনলাইন", "মর্ফ", "সামাজিক যোগাযোগ", "ডিজিটাল"],
      ["cyber", "electronic", "digital", "computer", "pornography", "identity", "defamation", "intimidation", "extortion", "threaten", "picture", "video", "harass", "ছবি", "ভিডিও", "হুমকি", "চাঁদা", "হয়রানি", "ভয়ভীতি", "সাইবার", "ডিজিটাল", "ইলেকট্রনিক", "পর্নোগ্রাফি", "মানহানি", "ভয়ভীতি"],
      [r"cyber security", r"information and communication", r"pornography", r"সাইবার সুরক্ষা"],
      ["cyber", "digital", "defamation", "media"], crime="Woman & Child Repression",
      steps_en=["Do not delete anything: take screenshots with dates, copy profile links and keep the chat history.",
                "Report the content on the platform and file a complaint (or a General Diary) at the nearest police station / police cyber unit.",
                "Do not pay or send more pictures to the blackmailer; tell a trusted person and a lawyer."],
      steps_bn=["কিছু মুছবেন না: তারিখসহ স্ক্রিনশট নিন, প্রোফাইল লিঙ্ক কপি করুন এবং চ্যাট ইতিহাস রেখে দিন।",
                "প্ল্যাটফর্মে কনটেন্ট রিপোর্ট করুন এবং নিকটস্থ থানা/পুলিশের সাইবার ইউনিটে অভিযোগ বা সাধারণ ডায়েরি (জিডি) করুন।",
                "ব্ল্যাকমেইলারকে টাকা বা আরও ছবি দেবেন না; বিশ্বস্ত কাউকে ও আইনজীবীকে জানান।"]),
    T("consumer", "Consumer rights", "ভোক্তা অধিকার",
      ["!consumer", "!mrp", "overcharg", "adulterat", "fake product", "expired", "defective", "refund", "warranty", "cash memo", "!ভোক্তা", "!এমআরপি", "দাম বেশি", "বেশি দাম", "ভেজাল", "মেয়াদোত্তীর্ণ", "ক্যাশমেমো", "ত্রুটিপূর্ণ", "ফেরত"],
      ["consumer", "goods", "service", "price", "adulteration", "directorate", "ভোক্তা", "পণ্য", "মূল্য", "ভেজাল", "অধিদপ্তর", "জরিমানা"],
      [r"consumer rights", r"safe food", r"standards and testing"],
      ["consumer"],
      steps_en=["Keep the receipt/cash memo, photos of the product and its label, and the seller's details.",
                "Complain to the Directorate of National Consumer Rights Protection (hotline 16121).",
                "A lawyer can advise on a written complaint or a civil claim for compensation."],
      steps_bn=["রসিদ/ক্যাশমেমো, পণ্য ও লেবেলের ছবি এবং বিক্রেতার তথ্য সংরক্ষণ করুন।",
                "জাতীয় ভোক্তা অধিকার সংরক্ষণ অধিদপ্তরে (হটলাইন ১৬১২১) অভিযোগ করুন।",
                "লিখিত অভিযোগ বা ক্ষতিপূরণের দেওয়ানি দাবির বিষয়ে আইনজীবী পরামর্শ দিতে পারেন।"]),
    T("family", "Marriage, divorce, maintenance and custody", "বিবাহ, তালাক, ভরণপোষণ ও অভিভাবকত্ব",
      ["!divorce", "!talaq", "khula", "!denmohor", "dower", "mehr", "maintenance", "alimony", "custody", "guardian", "second marriage", "polygam", "kazi", "nikah", "marriage registration", "!তালাক", "!বিবাহবিচ্ছেদ", "!দেনমোহর", "ভরণপোষণ", "খোরপোষ", "দ্বিতীয় বিয়ে", "কাজী", "নিকাহ", "বিয়ে নিবন্ধন", "সন্তানের হেফাজত", "অভিভাবক"],
      ["divorce", "talaq", "dower", "maintenance", "marriage", "custody", "guardian", "family court", "registration", "polygamy", "arbitration council", "তালাক", "দেনমোহর", "ভরণপোষণ", "বিবাহ", "অভিভাবক", "পারিবারিক আদালত"],
      [r"muslim family laws", r"family courts? (act|ordinance)|পারিবারিক আদালত", r"dissolution of muslim", r"muslim marriages and divorces", r"guardians and wards", r"parental maintenance", r"hindu marriage registration", r"^the divorce act"],
      ["family", "denmohor", "maintenance", "custody", "family courts"],
      steps_en=["Keep the marriage certificate (nikahnama), dower/maintenance records and proof of any payments.",
                "Family disputes usually go through a Family Court after an attempt at reconciliation or mediation.",
                "A family-law lawyer can draft the application and explain deadlines. " + LEGAL_AID_EN],
      steps_bn=["কাবিননামা/বিবাহ সনদ, দেনমোহর ও ভরণপোষণের কাগজ এবং পরিশোধের প্রমাণ রাখুন।",
                "পারিবারিক বিরোধ সাধারণত মীমাংসা বা মধ্যস্থতার চেষ্টার পর পারিবারিক আদালতে যায়।",
                "পারিবারিক আইনের আইনজীবী আবেদন তৈরি ও সময়সীমা বুঝিয়ে দিতে পারেন। " + LEGAL_AID_BN]),
    T("child_marriage", "Child marriage", "বাল্যবিবাহ",
      ["!child marriage", "underage marriage", "!বাল্যবিবাহ", "বাল্য বিবাহ"], ["child marriage", "age", "বাল্যবিবাহ", "বয়স"],
      [r"child marriage"], ["family", "child"], urgent=True,
      steps_en=["Tell the local government representative, the police or call 999 to stop a planned child marriage.", "Keep proof of age such as a birth certificate."],
      steps_bn=["পরিকল্পিত বাল্যবিবাহ ঠেকাতে স্থানীয় জনপ্রতিনিধি, পুলিশ বা ৯৯৯-এ জানান।", "বয়সের প্রমাণ হিসেবে জন্ম নিবন্ধন সনদ রাখুন।"]),
    T("inheritance", "Inheritance and succession", "উত্তরাধিকার",
      ["!inherit", "!succession", "heir", "will and testament", "partition", "share of property", "!উত্তরাধিকার", "!ওয়ারিশ", "উইল", "মিরাছ", "ফারায়েজ", "!বাবার সম্পত্তি", "!মেয়ের অংশ", "!ছেলের অংশ", "সম্পত্তির ভাগ", "!father's property"],
      ["succession", "heir", "will", "inheritance", "share", "intestate", "muslim", "shariat", "personal law", "daughter", "উত্তরাধিকার", "উইল", "অংশ", "মুসলিম", "কন্যা", "শরীয়ত"],
      [r"shariat", r"succession act", r"hindu women", r"hindu inheritance", r"hindu law of inheritance", r"married women's property"],
      ["succession", "inheritance", "family"],
      steps_en=["Collect the death certificate, list of heirs and records of the property (deeds, khatian).", "Which rules apply depends on the family's religion; a lawyer can confirm the shares and the process."],
      steps_bn=["মৃত্যু সনদ, ওয়ারিশদের তালিকা ও সম্পত্তির কাগজ (দলিল, খতিয়ান) সংগ্রহ করুন।", "কোন বিধান প্রযোজ্য তা পরিবারের ধর্মের উপর নির্ভর করে; আইনজীবী অংশ ও প্রক্রিয়া নিশ্চিত করতে পারেন।"]),
    T("land", "Land and property", "জমি ও সম্পত্তি",
      ["!land|", "!deed|", "mutation", "khatian", "property dispute", "encroach", "grab", "plot|", "sale deed", "possession", "!জমি", "!দলিল", "খতিয়ান", "নামজারি", "মিউটেশন", "দখল", "রেজিস্ট্রি", "ভূমি"],
      ["land", "property", "transfer", "registration", "possession", "deed", "tenancy", "জমি", "সম্পত্তি", "হস্তান্তর", "নিবন্ধন", "দখল", "দলিল"],
      [r"transfer of property", r"registration act", r"state acquisition", r"limitation act", r"non-agricultural tenancy", r"ভূমি অপরাধ", r"ভূমি সংস্কার", r"waqf"],
      ["land", "property", "land transfer", "title"],
      steps_en=["Collect the deed, khatian, mutation record and land-tax receipts before any payment or sale.", "Check the registration and ownership history; a lawyer can verify title and deadlines (limitation) for a claim."],
      steps_bn=["টাকা দেওয়া বা বিক্রির আগে দলিল, খতিয়ান, নামজারি ও ভূমি উন্নয়ন কর রসিদ সংগ্রহ করুন।", "নিবন্ধন ও মালিকানার ইতিহাস যাচাই করুন; আইনজীবী মালিকানা ও দাবির সময়সীমা (তামাদি) দেখে দিতে পারেন।"]),
    T("theft", "Theft, robbery and burglary", "চুরি, ডাকাতি ও ছিনতাই",
      ["!theft", "!stolen", "!robbery", "snatch", "burglary", "dacoity", "mugging", "pickpocket", "!চুরি", "!ডাকাতি", "!ছিনতাই", "চোর"],
      ["theft", "robbery", "dacoity", "burglary", "extortion", "চুরি", "ডাকাতি", "লুট"],
      [r"penal code"], ["criminal", "penal code"], crime="Theft",
      steps_en=["Report it at the nearest police station promptly and ask for a copy of the General Diary or case number.", "List stolen items with descriptions, serial numbers and photos."],
      steps_bn=["দ্রুত নিকটস্থ থানায় জানান এবং জিডি বা মামলার নম্বরের কপি চান।", "চুরি যাওয়া জিনিসের বিবরণ, সিরিয়াল নম্বর ও ছবির তালিকা করুন।"]),
    T("fraud", "Cheating and fraud", "প্রতারণা ও জালিয়াতি",
      ["!cheat", "!fraud", "scam", "forged", "forgery", "fake document", "!প্রতারণা", "!জালিয়াতি", "ঠকাল", "জাল "],
      ["cheating", "fraud", "forgery", "dishonestly", "প্রতারণা", "জালিয়াতি"],
      [r"penal code"], ["cheating", "fraud", "criminal", "penal code"],
      steps_en=["Keep agreements, payment proofs (bank/bKash), messages and the other party's details.", "File a complaint or case through a lawyer or at the police station; do not delay."],
      steps_bn=["চুক্তি, টাকা পাঠানোর প্রমাণ (ব্যাংক/বিকাশ), বার্তা ও অপরপক্ষের তথ্য রাখুন।", "আইনজীবীর মাধ্যমে বা থানায় অভিযোগ/মামলা করুন; দেরি করবেন না।"]),
    T("hurt_threat", "Assault, hurt and threats", "মারধর, আঘাত ও হুমকি",
      ["!assault", "!hurt", "beaten", "attacked", "!threat", "intimidat", "trespass", "!মারধর", "!আঘাত", "!হুমকি", "হামলা", "ভয় দেখ"],
      ["hurt", "voluntarily causing hurt", "assault", "criminal force", "intimidation", "threat", "grievous", "আঘাত", "হুমকি"],
      [r"penal code"], ["criminal", "penal code"],
      steps_en=["Get a medical examination and keep the report; photograph injuries.", "Report at the police station and keep the names of witnesses."],
      steps_bn=["ডাক্তারি পরীক্ষা করান ও রিপোর্ট রাখুন; আঘাতের ছবি তুলুন।", "থানায় জানান এবং সাক্ষীদের নাম রাখুন।"]),
    T("defamation", "Defamation", "মানহানি",
      ["!defamation", "slander", "libel", "!মানহানি"], ["defamation", "reputation", "মানহানি", "সুনাম"],
      [r"penal code", r"cyber security"], ["defamation", "media", "criminal"]),
    T("kidnap", "Kidnapping and abduction", "অপহরণ",
      ["!kidnap", "!abduct", "!অপহরণ"], ["kidnapping", "abduction", "অপহরণ"],
      [r"penal code", r"women and child"], ["criminal"], crime="Kidnapping", urgent=True,
      steps_en=[EMERGENCY_EN, "Give police the person's photo, description and last known location immediately."],
      steps_bn=[EMERGENCY_BN, "পুলিশকে ব্যক্তির ছবি, বর্ণনা ও সর্বশেষ অবস্থান দ্রুত জানান।"]),
    T("murder", "Murder and homicide", "খুন ও হত্যা",
      ["!murder", "!homicide", "killed", "!খুন", "!হত্যা"], ["murder", "culpable homicide", "death", "খুন", "হত্যা"],
      [r"penal code", r"criminal procedure"], ["criminal", "penal code"], crime="Murder", urgent=True),
    T("sexual_violence", "Rape and sexual harassment", "ধর্ষণ ও যৌন হয়রানি",
      ["!rape", "sexual harassment", "eve teas", "molest", "!ধর্ষণ", "যৌন হয়রানি", "উত্ত্যক্ত", "উত্যক্ত"],
      ["rape", "sexual", "modesty", "women and children", "ধর্ষণ", "যৌন", "নারী ও শিশু"],
      [r"women and child", r"নারী ও শিশু", r"penal code"], ["domestic violence", "criminal", "family"],
      crime="Woman & Child Repression", urgent=True,
      steps_en=[EMERGENCY_EN + " Helpline 109 supports women and children.", "Seek medical care promptly and avoid washing or discarding clothing so that evidence is preserved.", LEGAL_AID_EN],
      steps_bn=[EMERGENCY_BN + " নারী ও শিশুদের জন্য হেল্পলাইন ১০৯।", "দ্রুত চিকিৎসা নিন; প্রমাণ রক্ষায় পোশাক ধোয়া বা ফেলে দেওয়া থেকে বিরত থাকুন।", LEGAL_AID_BN]),
    T("acid", "Acid violence", "এসিড সহিংসতা",
      ["!acid", "!এসিড"], ["acid", "এসিড"], [r"acid"], ["criminal", "domestic violence"], urgent=True,
      steps_en=[EMERGENCY_EN, "Rinse with running water immediately and go to a hospital; keep the medical records."],
      steps_bn=[EMERGENCY_BN, "সঙ্গে সঙ্গে প্রবহমান পানিতে ধুয়ে হাসপাতালে যান; চিকিৎসার কাগজ রাখুন।"]),
    T("police_bail", "Police, FIR, arrest and bail", "থানা, এজাহার, গ্রেপ্তার ও জামিন",
      ["!fir|", "general diary", "!gd|", "!arrest", "!bail", "remand", "warrant", "police refuse", "police station", "!জিডি", "!এজাহার", "!গ্রেপ্তার", "!জামিন", "রিমান্ড", "ওয়ারেন্ট", "থানা", "মামলা নিচ্ছে না"],
      ["first information", "arrest", "bail", "remand", "warrant", "magistrate", "complaint", "এজাহার", "গ্রেফতার", "জামিন", "ম্যাজিস্ট্রেট", "অভিযোগ"],
      [r"criminal procedure", r"police act", r"torture and death in custody"], ["criminal", "criminal defense", "writ"],
      steps_en=["You may ask for a copy of any report or case number the police record.", "If someone is arrested, contact a lawyer immediately; " + LEGAL_AID_EN],
      steps_bn=["পুলিশ যা নথিভুক্ত করে তার কপি বা মামলা নম্বর চাইতে পারেন।", "কেউ গ্রেপ্তার হলে অবিলম্বে আইনজীবীর সঙ্গে যোগাযোগ করুন; " + LEGAL_AID_BN]),
    T("cheque", "Cheque dishonour", "চেক ডিজঅনার",
      ["!cheque", "!check bounce", "dishonour", "dishonor", "bounced", "!চেক", "ডিজঅনার"], ["cheque", "dishonour", "bank", "notice", "চেক", "ব্যাংক", "নোটিশ"],
      [r"negotiable instruments"], ["cheating", "contract", "civil", "fraud"],
      steps_en=["Keep the original cheque and the bank's return memo; the law sets strict time limits for notices, so see a lawyer quickly."],
      steps_bn=["মূল চেক ও ব্যাংকের ফেরত স্লিপ রাখুন; নোটিশের কঠোর সময়সীমা আছে, তাই দ্রুত আইনজীবীর পরামর্শ নিন।"]),
    T("loan", "Loans and debt recovery", "ঋণ ও পাওনা আদায়",
      ["!loan", "!debt", "recover money", "owe me", "interest", "!ঋণ", "!পাওনা", "টাকা ফেরত", "সুদ"], ["loan", "debt", "recovery", "court", "ঋণ", "আদায়"],
      [r"finance debt court", r"contract act", r"negotiable"], ["contract", "civil", "cheating"],
      steps_en=["Keep the loan agreement, payment records and any written acknowledgement of the debt.", "A lawyer can send a legal notice before any suit is filed."],
      steps_bn=["ঋণ চুক্তি, পরিশোধের হিসাব ও ঋণ স্বীকারের লিখিত কাগজ রাখুন।", "মামলার আগে আইনজীবী লিগ্যাল নোটিশ পাঠাতে পারেন।"]),
    T("labour", "Employment and labour rights", "চাকরি ও শ্রম অধিকার",
      ["!salary", "!wages", "terminated", "fired", "dismiss", "overtime", "maternity", "factory", "worker", "!বেতন", "!মজুরি", "ছাঁটাই", "চাকরি", "শ্রমিক", "মাতৃত্বকালীন", "কারখানা", "ওভারটাইম", "বোনাস"],
      ["wages", "worker", "employer", "termination", "leave", "maternity", "overtime", "মজুরি", "শ্রমিক", "মালিক", "ছাঁটাই", "ছুটি", "মাতৃত্বকালীন"],
      [r"^bangladesh labou?r act, 2006", r"শ্রম আইন, ২০০৬", r"overseas employment"], ["labour", "maternity"],
      steps_en=["Keep your appointment letter, pay slips, attendance records and any termination notice.", "Raise the issue with your employer in writing; a lawyer or labour office can advise on a complaint."],
      steps_bn=["নিয়োগপত্র, বেতন স্লিপ, হাজিরার রেকর্ড ও ছাঁটাইয়ের নোটিশ রাখুন।", "নিয়োগকর্তাকে লিখিতভাবে জানান; অভিযোগের বিষয়ে আইনজীবী বা শ্রম অফিস পরামর্শ দিতে পারে।"]),
    T("contract", "Contracts and agreements", "চুক্তি",
      ["!contract", "!agreement", "breach", "!চুক্তি", "চুক্তিভঙ্গ"], ["contract", "agreement", "breach", "damages", "চুক্তি", "ক্ষতিপূরণ"],
      [r"contract act", r"specific relief", r"sale of goods", r"partnership act"], ["contract", "civil"]),
    T("court_procedure", "Legal notice and court procedure", "লিগ্যাল নোটিশ ও মামলার পদ্ধতি",
      ["!legal notice", "civil suit", "file a case", "plaint", "court fee", "limitation", "injunction", "decree", "appeal", "!লিগ্যাল নোটিশ", "!আইনি নোটিশ", "দেওয়ানি মামলা", "ডিক্রি", "আপিল", "নিষেধাজ্ঞা", "তামাদি"],
      ["suit", "plaint", "notice", "limitation", "injunction", "decree", "appeal", "দেওয়ানি", "নালিশ", "আপিল"],
      [r"civil procedure", r"limitation act", r"specific relief"], ["civil", "general practice"],
      steps_en=["Write down the facts in date order and gather documents before meeting a lawyer.", "Ask the lawyer about the time limit for your claim; late claims can be barred."],
      steps_bn=["ঘটনা তারিখ অনুযায়ী লিখে রাখুন এবং আইনজীবীর সঙ্গে দেখা করার আগে কাগজপত্র সংগ্রহ করুন।", "দাবির সময়সীমা সম্পর্কে আইনজীবীকে জিজ্ঞেস করুন; দেরি হলে দাবি বাতিল হতে পারে।"]),
    T("evidence", "Evidence", "সাক্ষ্য ও প্রমাণ",
      ["!evidence", "proof", "witness", "admissible", "!সাক্ষ্য", "!প্রমাণ", "সাক্ষী"], ["evidence", "proof", "witness", "document", "electronic", "facts in issue", "relevant", "admissible", "oral", "documentary", "সাক্ষ্য", "প্রমাণ", "সাক্ষী"],
      [r"evidence act", r"evidence \(amendment\)"], ["evidence", "civil", "criminal"]),
    T("constitution", "Constitutional and fundamental rights", "সাংবিধানিক ও মৌলিক অধিকার",
      ["fundamental right", "!constitution", "!writ", "equality", "freedom of speech", "right to life", "discriminat", "মৌলিক অধিকার", "!সংবিধান", "!রিট", "সমতা", "বাক-স্বাধীনতা", "বাকস্বাধীনতা"],
      ["fundamental rights", "equality", "protection of law", "liberty", "arrest", "মৌলিক অধিকার", "আইনের দৃষ্টিতে সমান", "ব্যক্তি-স্বাধীনতা"],
      [r"^constitution", r"গণপ্রজাতন্ত্রী"], ["constitutional", "writ", "fundamental rights"]),
    T("narcotics", "Drugs and narcotics", "মাদক",
      ["!narcotic", "!drug", "yaba", "cannabis", "marijuana", "heroin", "!মাদক", "ইয়াবা", "গাঁজা", "হেরোইন"], ["narcotics", "drug", "possession", "মাদক", "দণ্ড"],
      [r"narcotics control", r"drug control"], ["criminal", "criminal defense"], crime="Narcotics - RC"),
    T("rti", "Right to information", "তথ্য অধিকার",
      ["!right to information", "!rti|", "!তথ্য অধিকার", "তথ্য চাই"], ["information", "authority", "request", "তথ্য", "কর্তৃপক্ষ", "আবেদন"],
      [r"right to information", r"তথ্য অধিকার"], ["constitutional"]),
    T("corruption", "Bribery and corruption", "ঘুষ ও দুর্নীতি",
      ["!bribe", "!corruption", "acc|", "!ঘুষ", "!দুর্নীতি", "দুদক"], ["corruption", "bribe", "commission", "দুর্নীতি", "ঘুষ", "দুদক"],
      [r"anti-corruption", r"money laundering"], ["criminal"],
      steps_en=["Corruption can be reported to the Anti-Corruption Commission (hotline 106); keep proof such as messages and receipts."],
      steps_bn=["দুর্নীতির অভিযোগ দুর্নীতি দমন কমিশনে (হটলাইন ১০৬) জানানো যায়; বার্তা ও রসিদের মতো প্রমাণ রাখুন।"]),
    T("children_disability", "Children and persons with disabilities", "শিশু ও প্রতিবন্ধী ব্যক্তির অধিকার",
      ["!child rights", "juvenile", "child labour", "!disabilit", "!শিশু আইন", "!প্রতিবন্ধী", "কিশোর"], ["child", "disability", "protection", "শিশু", "প্রতিবন্ধী", "সুরক্ষা"],
      [r"children act", r"disabilities", r"প্রতিবন্ধী"], ["family", "child"]),
    T("custodial_torture", "Torture and custodial death", "হেফাজতে নির্যাতন ও মৃত্যু",
      ["custodial", "torture", "hefajat", "হেফাজতে", "!নির্যাতন করেছে পুলিশ"], ["torture", "custody", "নির্যাতন", "হেফাজত"],
      [r"torture and death in custody"], ["criminal", "writ", "fundamental rights"], urgent=True),
]

TOPIC_BY_ID = {t.id: t for t in TOPICS}

# crime-stat category -> (English label, Bengali label)
CRIME_LABELS = {
    "Theft": ("theft", "চুরি"), "Robbery": ("robbery", "ছিনতাই/দস্যুতা"), "Dacoity": ("dacoity", "ডাকাতি"),
    "Murder": ("murder", "খুন"), "Woman & Child Repression": ("women and child repression", "নারী ও শিশু নির্যাতন"),
    "Kidnapping": ("kidnapping", "অপহরণ"), "Narcotics - RC": ("narcotics", "মাদক"), "Burglary": ("burglary", "সিঁধেল চুরি"),
}

DISTRICT_UNITS = {  # district name (lower) -> crime-stat unit
    "dhaka": "DMP", "chattogram": "CMP", "chittagong": "CMP", "khulna": "KMP", "rajshahi": "RMP",
    "barishal": "BMP", "barisal": "BMP", "sylhet": "SMP", "rangpur": "RPMP", "gazipur": "GMP", "mymensingh": "Mymensingh Range",
}


# Penal-type topics get a small boost for sections that state punishments.
PENAL_TOPICS = {"cyber", "theft", "fraud", "hurt_threat", "dowry", "kidnap", "murder", "sexual_violence", "acid",
                "narcotics", "corruption", "defamation", "custodial_torture"}

# everyday wording -> the vocabulary statutes use (added to the search expansion)
SYNONYMS = {
    "raised": "increase", "raise": "increase", "hike": "increase", "hiked": "increase", "higher": "increase",
    "throw out": "evict", "thrown out": "evict", "kicked out": "evict", "forcibly": "evict", "vacate": "evict",
    "beat": "hurt", "beating": "hurt", "slap": "hurt", "hit": "hurt", "threatening": "threat", "blackmailing": "extortion",
    "বাড়িয়েছে": "বৃদ্ধি", "বাড়াতে": "বৃদ্ধি", "বাড়ানো": "বৃদ্ধি", "বাড়িয়ে": "বৃদ্ধি", "বের করে": "উচ্ছেদ", "বের করে দিতে": "উচ্ছেদ",
    "মারধর": "আঘাত", "মেরেছে": "আঘাত", "ছবি ছড়িয়ে": "ছবি প্রকাশ",
}

# Heading patterns (matched against each section's heading) that mark the most on-point provisions per topic.
HEADS = {
    "rent": r"restrictions on rent increase|eviction will not|standard rent|extra rent|payment of rent receipt|notice to landlord|ভাড়া বৃদ্ধি|উচ্ছেদ",
    "domestic_violence": r"^domestic violence$|protection order|residence order|compensation order|application to the court|পারিবারিক সহিংসতা",
    "dowry": r"penalty for claiming dowry|giving or receiving dowry|dowry agreement|যৌতুক",
    "cyber": r"identity|defamation|extortion|harass|pornograph|হয়রানি|মানহানি|অপরাধ ও দণ্ড",
    "consumer": r"price higher|adulterated|price list|false advertisement|compensation|complaint|ভোক্তা",
    "theft": r"^theft$|punishment for theft|theft in dwelling|^robbery|^extortion|punishment for robbery|dacoity",
    "fraud": r"^cheating|punishment for cheating|forgery|^fraud",
    "hurt_threat": r"^voluntarily causing hurt|punishment for voluntarily causing hurt|^criminal intimidation|punishment for criminal intimidation|assault",
    "murder": r"^murder|punishment for murder",
    "police_bail": r"first information|when police may arrest|arrest how made|taken before magistrate|bail|detained more than|cognizable",
    "cheque": r"dishonour|cheque",
    "labour": r"terminat|wage|maternity|retrench|dismiss|leave",
    "evidence": r"interpretation|facts in issue|oral evidence|documentary|electronic|proof of",
    "family": r"talaq|dower|maintenance|polygamy|dissolution|registration of marriage|divorce|custody|guardian",
    "inheritance": r"succession|share|intestate|inherit",
    "land": r"transfer|registration|possession|mutation|title",
    "constitution": r"equality|protection of law|fundamental|life and personal liberty|safeguards as to arrest|freedom of",
}
