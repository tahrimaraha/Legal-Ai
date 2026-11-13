export const en = {
  meta: { dir: 'ltr', name: 'English', short: 'EN' },
  brand: { name: 'LEGAL AI', sub: 'Legal assistant', tagline: 'Legal information for citizens' },

  nav: {
    how: 'How it works',
    features: 'Features',
    statutes: 'Statutes',
    faq: 'FAQ',
    signIn: 'Sign in',
    getStarted: 'Get started',
    openMenu: 'Open menu',
    closeMenu: 'Close menu',
    skip: 'Skip to main content',
  },

  hero: {
    eyebrow: 'Grounded in Bangladeshi law',
    headline: 'Know your rights, in your own words.',
    sub: 'Ask an everyday legal question in Bangla or English. Get a clear answer grounded in the actual law — with the Act and Section it came from.',
    ctaPrimary: 'Ask a question',
    ctaSecondary: 'See how it works',
    credibility: ['8 statutes in the corpus', 'Section cited on every answer', 'Free to use'],
    scaleAlt: 'An illustration of a balance scale settling level, the mark of LEGAL AI.',
    gavelAlt: 'A judge’s gavel resting on its block beside a set of brass scales and law books.',
  },

  trust: {
    title: 'What you can do here',
    items: [
      { label: 'Ask a question', note: 'Plain language, either language' },
      { label: 'Draft a notice', note: 'Guided, question by question' },
      { label: 'Look up a section', note: 'Statute text, in context' },
      { label: 'Understand the terms', note: 'A glossary without jargon' },
    ],
  },

  showcase: {
    eyebrow: 'The product',
    title: 'One assistant. Three tools.',
    sub: 'Each screen below is the real interface, not a mockup of one.',
    tabs: [
      { id: 'ask', label: 'Ask', title: 'Answers that show their source', body: 'Every paragraph the assistant writes is traceable to a section of a real Act. The citation chips under an answer open the statute text itself.' },
      { id: 'draft', label: 'Draft', title: 'A legal notice, one question at a time', body: 'Answer plain questions on the left; watch the document typeset itself on the right. Download when it reads right.' },
      { id: 'lookup', label: 'Look up', title: 'A glossary that speaks human', body: 'Search a term or a section number and get the plain-language meaning first, the statutory wording second.' },
    ],
  },

  why: {
    title: 'Why this, and not a search engine',
    cards: [
      { n: '01', title: 'Grounded in real statutes', body: 'Answers are retrieved from a curated corpus of Bangladeshi law before they are written. Nothing is recalled from memory.' },
      { n: '02', title: 'Written in your language', body: 'Bangla and English are equal here. The whole interface, not only the answer, changes with the toggle.' },
      { n: '03', title: 'Free, and honest about its limits', body: 'It tells you what it does not know, and when a matter needs a lawyer rather than a chat window.' },
    ],
  },

  how: {
    eyebrow: 'End to end',
    title: 'From your question to a cited answer',
    steps: [
      { n: '01', title: 'Write your question', body: 'In Bangla or English, the way you would say it to a person.' },
      { n: '02', title: 'The relevant law is retrieved', body: 'Multilingual embeddings match your question against the statute corpus and pull the sections that apply.' },
      { n: '03', title: 'A plain-language answer, with sections cited', body: 'Step by step, with the Act and Section it came from attached to each claim.' },
      { n: '04', title: 'Draft a notice, if you need one', body: 'Carry the same facts into a guided draft of a legal notice or complaint.' },
    ],
  },

  features: {
    eyebrow: 'Features',
    title: 'Built around one promise: show the source',
    items: [
      { title: 'Conversational Q&A', bullets: ['Bangla or English', 'Step-by-step answers', 'Citation chip on every claim'] },
      { title: 'Document drafting', bullets: ['Guided question flow', 'Live typeset preview', 'Download or copy'] },
      { title: 'Glossary and statute search', bullets: ['Search a term or a section', 'Plain meaning first', 'Jump straight into chat'] },
      { title: 'Chat history', bullets: ['Grouped by date', 'Searchable', 'Resume any conversation'] },
      { title: 'Feedback and flagging', bullets: ['Rate any answer', 'Flag what looks wrong', 'Corrections reach the corpus'] },
      { title: 'Admin corpus manager', bullets: ['Upload statute PDFs', 'Per-document index status', 'Rebuild the vector index'] },
    ],
  },

  corpus: {
    eyebrow: 'The corpus',
    title: 'Eight bodies of law, read closely',
    sub: 'Answers may only cite what is in this list. When your question falls outside it, the assistant says so.',
    items: [
      { bn: 'বাংলাদেশের সংবিধান', en: 'Constitution of Bangladesh', year: '1972' },
      { bn: 'দণ্ডবিধি', en: 'Penal Code', year: '1860' },
      { bn: 'মুসলিম পারিবারিক আইন অধ্যাদেশ', en: 'Muslim Family Laws Ordinance', year: '1961' },
      { bn: 'পারিবারিক আদালত অধ্যাদেশ', en: 'Family Courts Ordinance', year: '1985' },
      { bn: 'বাড়ী ভাড়া নিয়ন্ত্রণ আইন', en: 'House Rent Control Act', year: '1991' },
      { bn: 'সাক্ষ্য আইন', en: 'Evidence Act', year: '1872' },
      { bn: 'মামলা দায়ের ও আদালতের কার্যপদ্ধতি', en: 'Case filing and court procedure', year: '—' },
      { bn: 'লিগ্যাল নোটিশ গাইড', en: 'Legal notice guide', year: '—' },
    ],
  },

  problem: {
    eyebrow: 'Why it matters',
    title: 'The queue is long. The language is old.',
    stats: [
      { value: 4.4, suffix: 'M', label: 'cases pending before the courts', note: 'Estimates range from 3.7 to 4.4 million.' },
      { value: 90000, suffix: '', label: 'people per judge', note: 'Roughly one judge for every 90,000 citizens.' },
      { value: 8, suffix: '', label: 'statutes in the corpus today', note: 'Every answer cites from within this set.' },
    ],
    body: 'Statutes are written in dense colonial-era Bangla and English that most citizens cannot read. So people rely on unverified advice online, or pay for a lawyer they cannot afford. This tool sits in that gap — it is not a replacement for either.',
  },

  testimonials: {
    title: 'From people who used it',
    items: [
      { quote: 'My landlord raised the rent twice in one year with no notice. I learned which Act covers that, and what the notice period actually is, before I argued with anyone.', role: 'Tenant, Chattogram' },
      { quote: 'I had a legal notice in my hand and no idea what the sections meant. It explained each one in Bangla and told me plainly that I still needed a lawyer for the reply.', role: 'Shop owner, Rajshahi' },
      { quote: 'It did not tell me what to do. It told me what the law says and where to read it. That was what I needed at midnight.', role: 'Student, Dhaka' },
    ],
  },

  safety: {
    eyebrow: 'Safety and limits',
    title: 'What this tool does, and what it does not',
    does: {
      title: 'It does',
      items: ['Explain what a law says in plain language', 'Show the Act and Section behind each answer', 'Help you draft a first version of a notice', 'Tell you when your question falls outside its corpus'],
    },
    doesNot: {
      title: 'It does not',
      items: ['Give legal advice or an opinion on your case', 'Represent you or file anything for you', 'Guarantee that its answer is complete or current', 'Replace a licensed lawyer'],
    },
    lawyer: {
      title: 'See a lawyer when',
      items: ['A deadline is running or a court date is set', 'Money, property or custody is genuinely at stake', 'You have been served with a notice or a case', 'Anything you sign would bind you'],
    },
  },

  faq: {
    eyebrow: 'Questions',
    title: 'Before you start',
    items: [
      { q: 'Is this legal advice?', a: 'No. It is legal information. It explains what statutes say and shows you where to read them. An answer here is a starting point for a conversation with a lawyer, not a substitute for one.' },
      { q: 'Where do the answers come from?', a: 'Your question is matched against a curated corpus of Bangladeshi statutes using multilingual embeddings. The matched sections are passed to a language model, which writes the answer and cites the Act and Section it used. If nothing relevant is retrieved, it says so rather than guessing.' },
      { q: 'Can it be wrong?', a: 'Yes. Retrieval can miss a section, and a model can misread one. That is why every answer carries its citations openly — so you can check the source yourself — and why there is a flag button on every answer.' },
      { q: 'Does it work in Bangla?', a: 'Bangla is a first-class language here. You can ask in Bangla and get an answer in Bangla, and the entire interface switches with the toggle, including fonts and line spacing.' },
      { q: 'What does it cost?', a: 'Nothing. It is a university software engineering project, not a commercial service, and there is no paid tier.' },
      { q: 'What happens to my questions?', a: 'Your conversations are stored so you can return to them, and you can delete any conversation. Do not paste national ID numbers, full addresses or other identifying details you would not want stored.' },
    ],
  },

  finalCta: {
    title: 'Your question is a reasonable one. Ask it.',
    sub: 'No account needed to read an answer.',
    cta: 'Ask a question',
  },

  footer: {
    blurb: 'A bilingual legal-information assistant for Bangladeshi citizens, grounded in a curated statute corpus.',
    cols: [
      { title: 'Product', links: [{ label: 'Ask a question', to: '/app/chat' }, { label: 'Draft a notice', to: '/app/draft' }, { label: 'Glossary', to: '/app/glossary' }, { label: 'History', to: '/app/history' }] },
      { title: 'Learn', links: [{ label: 'How it works', to: '/#how' }, { label: 'Features', to: '/#features' }, { label: 'Statutes', to: '/#statutes' }, { label: 'FAQ', to: '/#faq' }] },
      { title: 'Project', links: [{ label: 'Safety and limits', to: '/#safety' }, { label: 'Admin', to: '/admin' }, { label: 'Sign in', to: '/login' }, { label: 'Kitchen sink', to: '/kitchen-sink' }] },
    ],
    disclaimerTitle: 'Disclaimer',
    project: 'A CUET CSE-356 software engineering project. Not affiliated with any court, ministry or bar council of Bangladesh.',
    rights: 'No rights reserved over the statutes themselves — they are public law.',
  },

  disclaimer: {
    short: 'Legal information, not legal advice.',
    full: 'This is legal information, not legal advice. For anything important, consult a qualified lawyer.',
    answerNote: 'Verify with a lawyer before acting on this.',
  },

  chat: {
    newChat: 'New conversation',
    history: 'Conversations',
    searchHistory: 'Search conversations',
    placeholder: 'Ask your question in Bangla or English…',
    send: 'Send',
    attach: 'Attach a document',
    emptyTitle: 'What would you like to understand?',
    emptySub: 'Ask in whichever language is easier. Every answer will show the sections it came from.',
    suggestions: [
      'My landlord raised the rent without notice — what can I do?',
      'I received a legal notice. What should I do first?',
      'How is a family court case filed, and what does it cost?',
      'What counts as evidence in a criminal case?',
    ],
    citationsLabel: 'Sources',
    citationsHint: 'Open a chip to read the section itself',
    copy: 'Copy answer',
    copied: 'Copied',
    helpful: 'Helpful',
    notHelpful: 'Not helpful',
    flag: 'This looks wrong',
    flagged: 'Flagged for review',
    thinking: 'Reading the statutes…',
    drawerTitle: 'Statute text',
    drawerClose: 'Close statute panel',
    matched: 'Matched passage',
    askAbout: 'Ask about this section',
    stop: 'Stop',
    charCount: 'characters',
    today: 'Today',
    earlier: 'Earlier',
  },

  common: {
    langToggle: 'Switch to Bangla',
    backHome: 'Back to home',
    comingSoon: 'Coming soon',
    comingSoonBody: 'This screen is not built yet. It is next in the build order.',
    close: 'Close',
    loading: 'Loading',
  },
};

export type Strings = typeof en;
