# Master Frontend Prompt — "AI Legal Assistant for Citizens"

> **How to use this file**
> - **Section 0** is a short version — paste it if your tool has a small context window.
> - **Sections 1–12** are the full prompt. Paste all of it for the first build.
> - **Section 13** has follow-up prompts for iterating screen-by-screen (best for vibe coding).
> - Everything is plain Markdown with no tool-specific syntax, so it works in Claude Code, Cursor, Lovable, v0, Bolt, Windsurf, ChatGPT, Gemini, etc.
> - Lines marked **[CONFIRM]** are assumptions I made. Edit them before pasting if they're wrong.

---

## 0. Short version (compact prompt)

```
Build the frontend for "AI Legal Assistant for Citizens" (আইনি সহায়ক) — a bilingual
Bengali/English web app where ordinary Bangladeshi citizens ask everyday legal questions
and get plain-language answers grounded in real statutes, with the Act + Section cited on
every answer. It also drafts basic legal notices and complaints, and has a legal glossary.

Frontend only. Use React + Vite + TypeScript + Tailwind CSS + Framer Motion + React Router.
All data mocked in /src/mocks with typed interfaces, so a Python RAG backend can be wired in
later. No backend code, no API keys.

Palette (use ONLY these + derived tints/shades):
  ink      #000000   text, dark sections, footer
  bone     #F6ECE3   default page background
  clay     #91766E   primary accent — buttons, links, active states
  granite  #B7A7A9   borders, dividers, muted text
  white    #FFFFFF   cards and raised surfaces

Type: high-contrast serif display (Bodoni Moda) + clean sans body (Manrope).
Bengali: Noto Serif Bengali for display, Hind Siliguri for body/UI, line-height 1.75+.

Structure: marketing landing page (hero, trust strip, tabbed tool showcase, why-us cards,
numbered how-it-works, feature grid, testimonials, safety/disclaimer, FAQ, final CTA, footer)
+ 5 app screens (chat with citation chips, document drafting wizard, glossary, chat history,
admin corpus manager).

Signature motion: an animated brass balance-scale in the hero that starts tipped, and settles
level as the page loads; a gavel-strike accent on primary CTA press. Scroll-reveal on sections,
hover micro-interactions on cards. Respect prefers-reduced-motion.

Before writing code, output a 10-line plan: token values, font pairing, section order, and the
one signature element. Then build. Responsive to 360px, visible keyboard focus, semantic HTML.
```

---

## 1. Role and objective

You are the design lead and frontend engineer for this project. You have been hired because the client rejected generic AI-looking template sites. Your job is a **production-quality, visually distinctive frontend** for a bilingual legal-help web app for Bangladesh.

**Deliver the frontend only.** No backend, no database, no LLM calls, no API keys. Every piece of data comes from typed mock files that a Python backend can later replace one-for-one.

**Before you write any code, output a short plan (max 10 lines):** final token values, the font pairing you chose and why, the section order, and the one signature element the page will be remembered for. If any part of your plan is what you would produce for *any* legal website, revise it and say what you changed. Then build.

---

## 2. What the product actually is

**Name:** AI Legal Assistant for Citizens — Bengali: `আইনি সহায়ক`
**One-line job:** Help an ordinary Bangladeshi citizen understand their legal position in their own language, with a real statute cited for every claim.

**The problem it solves (use this for hero and copy, it is real):**
- Bangladesh's judiciary carries a backlog of roughly 3.7–4.4 million cases with about one judge per 90,000 people.
- Statutes are written in dense colonial-era Bengali and English that most citizens cannot read.
- So people rely on unverified Facebook advice, or pay a lawyer they can't afford.

**How it works technically (frontend must express this honestly):** the user's question is matched against a curated corpus of Bangladeshi statutes using multilingual embeddings and vector search; the retrieved sections are passed to an LLM which answers in plain Bengali or English **and cites the Act and Section it used**. This grounding is the product's main trust claim — the UI must make citations visible and prominent, not buried in a footnote.

**Statute corpus to reference by name in the UI:**
- বাংলাদেশের সংবিধান (Constitution of Bangladesh)
- দণ্ডবিধি ১৮৬০ (Penal Code, 1860)
- মুসলিম পারিবারিক আইন অধ্যাদেশ, ১৯৬১ (Muslim Family Laws Ordinance, 1961)
- পারিবারিক আদালত অধ্যাদেশ, ১৯৮৫ (Family Courts Ordinance, 1985)
- বাড়ী ভাড়া নিয়ন্ত্রণ আইন, ১৯৯১ (House Rent Control Act, 1991)
- সাক্ষ্য আইন, ১৮৭২ (Evidence Act, 1872)
- মামলা দায়ের ও আদালতের কার্যপদ্ধতি (Case filing and court procedure)
- লিগ্যাল নোটিশ গাইড (Legal notice guide)

**Audience:** ordinary citizens — tenants, women facing family-law issues, people who received a legal notice, small shop owners. Not lawyers. **[CONFIRM]** Write all copy for a person with no legal training. Never use a Latin legal term without a plain-language gloss beside it.

**Hard constraint — this is a legal product:** the app gives *information*, never binding advice, and never replaces a licensed lawyer. A disclaimer must be permanently visible in the app shell (not only in the footer), and every AI answer must carry a short, non-intrusive "verify with a lawyer" note. Design the disclaimer as a considered part of the visual system, not an afterthought banner.

---

## 3. Feature set to build UI for

These are real features of the existing system. Build a screen or component for each.

1. **Conversational legal Q&A** — chat, Bengali or English, answers are step-by-step, every answer carries citation chips (Act name + section number) that expand to show the quoted statute text.
2. **AI-assisted document drafting** — guided question-by-question wizard producing a legal notice or a complaint, with live preview and download.
3. **Legal glossary / statute search** — search a term or a section, get a plain-language explanation plus the source.
4. **Chat history** — a list of past conversations, resumable, searchable.
5. **Feedback and flagging** — thumbs up/down and "this looks wrong" on any answer.
6. **Role-based access** — citizen view and admin view.
7. **Admin corpus manager** — list of ingested statute PDFs, upload new ones, rebuild the vector index, per-document status (indexed / processing / failed) and chunk counts.
8. **Language toggle** — Bengali ⇄ English, switching the entire UI, persisted in app state.

---

## 4. Tech stack

Use exactly this unless the environment makes it impossible:

- **React 18 + TypeScript + Vite**
- **Tailwind CSS** with the design tokens defined as CSS custom properties and extended in `tailwind.config`. No hardcoded hex values in components.
- **Framer Motion** for all animation. Fall back to CSS keyframes + IntersectionObserver if unavailable.
- **React Router** for routing.
- **lucide-react** for icons. No emoji as UI icons anywhere.
- Google Fonts via `<link>` in `index.html`.
- No UI kit that imposes its own look (no stock Material, no unstyled-then-default shadcn theme). If you use shadcn/ui primitives, restyle them completely to the tokens below.

**Mock data rule:** every screen reads from `src/mocks/*.ts` with exported TypeScript interfaces (`Message`, `Citation`, `Statute`, `GlossaryTerm`, `DraftTemplate`, `CorpusDocument`, `Conversation`). Simulate latency and a streaming-text effect in the chat so the UI is testable without a backend. Put every future network call behind a single `src/lib/api.ts` module with clearly named stub functions, so swapping in the real endpoints is a one-file change.

---

## 5. Design tokens — non-negotiable

### 5.1 Color

Use **only** these five colors and tints/shades derived from them. Do not introduce a new hue.

| Token | Hex | Role |
|---|---|---|
| `ink` | `#000000` | Primary text, dark sections, footer, chat composer bar |
| `bone` | `#F6ECE3` | Default page background, light section fills |
| `clay` | `#91766E` | **Primary accent** — buttons, links, active tab, focus ring, citation chips |
| `granite` | `#B7A7A9` | Borders, dividers, muted/secondary text, disabled states |
| `white` | `#FFFFFF` | Cards, raised surfaces, input fields |

Derived values you may define (and should, for contrast):
- `ink-soft` — around `#1A1512`, for long-form body text on `bone` (pure black on cream is harsh at small sizes)
- `clay-deep` — around `#6E5750`, for hover/pressed states and text-on-bone links
- `clay-tint` — around `#EFE3DD`, for subtle accent fills, selected rows, chip backgrounds
- `bone-deep` — around `#EDE0D4`, for alternating section bands
- `granite-soft` — around `#D8CFCE`, for hairline borders

Rules:
- Every text/background pair must clear **WCAG AA (4.5:1)** for body text and 3:1 for large text. `granite` on `bone` fails for body text — use it for borders and large muted labels only, never for paragraphs.
- Semantic states derive from the palette, they don't import green/red: success = `clay-deep` with a check, warning/flag = `ink` on `clay-tint`, error = a desaturated deep brick derived from `clay` (around `#7A3B33`) used sparingly.
- Dark sections use `ink` background with `bone` text and `clay` accents. Use at most two dark sections so they land as punctuation, not as the default.

**Note on the palette's risk:** cream + brown + serif is close to a very common AI-generated look. The palette is fixed by the client, so keep it exactly. Earn the distinctiveness through **typography, layout rhythm, and the motion signature** instead — see 5.2 and 7.

### 5.2 Typography

Two scripts, four roles. Bengali is a first-class language here, not an afterthought.

| Role | Latin | Bengali |
|---|---|---|
| Display / headings | **Bodoni Moda** (high-contrast, engraved, feels like a printed statute title page) | **Noto Serif Bengali** |
| Body / UI | **Manrope** | **Hind Siliguri** |
| Data / captions / section numbers | **JetBrains Mono** or **IBM Plex Mono**, uppercase, wide letter-spacing | same mono for numerals |

If you prefer a different pairing, you may substitute — but keep the *logic*: one high-contrast serif used with restraint for display, one neutral humanist sans for body, one mono for structural labels and legal reference numbers. Do **not** use Playfair Display, Poppins, or Montserrat.

Bengali typography rules (get these right, most sites don't):
- Bengali line-height minimum **1.75** for body, 1.35 for display — the matra and descenders need the room.
- Bengali runs visually larger than Latin at the same px. Size Bengali body about 1 rem where Latin is 1.0625 rem, and test the toggle at both.
- Never letter-space Bengali text. Never uppercase-transform it.
- Set `lang="bn"` / `lang="en"` on the html element and switch the font stack from that attribute, so the whole tree follows the toggle.

Type scale (fluid, `clamp()`): display 2.75–4.5rem, h2 2–3rem, h3 1.375–1.75rem, body 1–1.0625rem, caption 0.8125rem. Set the display face tight (`-0.02em` tracking, `1.05` leading) and the mono labels wide (`0.14em`).

### 5.3 Layout, spacing, shape

- 8px spacing scale. Section vertical rhythm: `96px` mobile → `160px` desktop. Define it once as a `.section-pad` utility so section paddings can't fight each other.
- Max content width `1200px`, prose width `68ch`.
- **Border radius: 2px on inputs and chips, 4px on cards, 999px only on the language pill and citation chips.** No large rounded corners — this product should feel like a document, not a consumer app.
- Depth comes from **1px `granite-soft` hairlines and generous whitespace**, not shadows. Allow at most one soft shadow, on the floating chat composer.
- Use a visible 1px vertical rule to separate the statute-citation column from the answer text on desktop — a document-margin motif carried through the whole app.

---

## 6. Page and screen structure

### 6.1 Landing page (`/`)

The information architecture of the reference site (talkingtree.app) is the model to follow — **structurally**, not visually. Its section order is: sticky nav with grouped dropdowns → image-backed hero with headline, subhead, dual CTA and a credibility line → trust strip with capability links → tabbed product showcase with screenshots → three "why us" cards → numbered end-to-end workflow → six-card feature grid → testimonials → pricing → enterprise/custom section → final CTA → newsletter → multi-column footer.

Adapt that skeleton to this product:

1. **Sticky nav** — wordmark left; links: কীভাবে কাজ করে / How it works, সুবিধা / Features, আইন সংগ্রহ / Statutes, প্রশ্নোত্তর / FAQ; language pill; ghost "সাইন ইন / Sign in"; solid clay "শুরু করুন / Get started". Background transparent over hero, then solid `bone` with a hairline bottom border after 80px scroll.
2. **Hero** — the thesis of the page. Left: eyebrow (mono, wide-tracked) + display headline + one-paragraph subhead + two CTAs + a single-line credibility strip ("৮টি আইন সংগ্রহে · প্রতিটি উত্তরে ধারা উল্লেখ · সম্পূর্ণ বিনামূল্যে"). Right: the **animated balance scale** (section 7). No stock hero photo of a courtroom.
3. **Trust strip** — a hairline-bordered row of four capability chips that anchor-link down: প্রশ্ন করুন · খসড়া তৈরি · ধারা দেখুন · সহজ ভাষায়.
4. **Tabbed tool showcase** — "একটি সহায়ক, তিনটি কাজ / One assistant. Three tools." Tabs: Ask, Draft, Look up. Each tab swaps a large in-browser mockup of the real app screen (build these as actual styled components, not image placeholders) with a crossfade + 8px slide. This is the section that proves the product works.
5. **Why us** — three cards, no icons, just a mono numeral, a display sub-head, and two lines: *Grounded in real statutes* / *Written in your language* / *Free, and honest about its limits*.
6. **How it works** — a numbered sequence, 4 steps. Numbering is justified here because it *is* a sequence: 01 আপনার প্রশ্ন লিখুন → 02 সংশ্লিষ্ট আইন খুঁজে আনা হয় → 03 সহজ ভাষায় উত্তর, ধারা উল্লেখসহ → 04 প্রয়োজনে নোটিশের খসড়া। Connect the steps with a hairline that draws itself on scroll.
7. **Feature grid** — six cards mapping to section 3's features. Each: lucide icon in `clay`, title, three tight bullets.
8. **Statute corpus section** — dark `ink` band. List the eight statutes from section 2 as a typeset index with mono year numerals, like the contents page of a legal code. This is a strong differentiator; make it beautiful.
9. **Testimonials** — three short quotes with role-only attribution (e.g. "ভাড়াটিয়া, চট্টগ্রাম"). Write plausible, specific quotes; no logos.
10. **Safety and limits** — instead of the reference site's pricing section, put an honest section: what this tool does, what it does not do, when to see a lawyer. Give it real design weight. **[CONFIRM — the app is free, so there is no pricing section. Tell me if you want one.]**
11. **FAQ** — accordion, 6 questions.
12. **Final CTA** — dark band, display headline, one button.
13. **Footer** — four columns + the full legal disclaimer in Bengali and English + a note that it's a CUET CSE-356 software engineering project.

### 6.2 App screens

- `/app/chat` — **the most important screen.** Persistent left sidebar (conversation history, new chat, language toggle, disclaimer footer). Center: message thread. User messages are `clay-tint` blocks aligned right; assistant answers are full-width prose on `white` with a left `granite-soft` rule. Under each answer: a **citations row** of pill chips like `দণ্ডবিধি ১৮৬০ · ধারা ৪২০` — clicking one opens a right-hand drawer showing the retrieved statute text with the matched passage highlighted in `clay-tint`. Plus copy, thumbs up/down, and flag actions. Composer pinned at the bottom with an attach-document button, language indicator and a character-count hairline. Empty state: four suggested real questions ("আমার বাড়ির মালিক নোটিশ ছাড়াই ভাড়া বাড়িয়েছে, আমি কী করতে পারি?").
- `/app/draft` — two-pane wizard. Left: one question at a time with a progress rail. Right: live document preview that fills in as the user answers, typeset like a real legal notice (mono header block, numbered paragraphs). Footer: Download .docx / Copy / Start over.
- `/app/glossary` — search field, alphabet/Bengali-varnamala filter rail, definition cards showing term, plain-language meaning, statutory source, and "ask about this" link into chat.
- `/app/history` — grouped by date, searchable, each row shows the first question, the statutes cited, and a timestamp.
- `/admin` — corpus table (document, statute, chunks, status, last indexed), drag-and-drop PDF upload, and a "Rebuild index" action with a progress state. Role-gated behind a mock auth context.
- `/login` — split screen, form left, the balance-scale motif right. Mock auth only; any credentials succeed and set a role in context.

---

## 7. Motion and animation

**[CONFIRM — this is my reading of the two reference images you supplied: a gavel resting on its block, and the scales-of-justice statue with a bookshelf behind. They read as *subject motifs* rather than a specific animation, so I've specified motion built from those two objects. Correct this section if you had something else in mind.]**

**The signature element — the settling balance.** In the hero, render a brass balance scale as **inline SVG** (drawn from primitives — beam, fulcrum, two pans on chains — not an imported image, so it can be animated and themed to the palette). On page load it enters tipped ~12° to one side, oscillates with decreasing amplitude, and settles perfectly level over about 1.6s with a spring easing. On hover, one pan dips 3° and returns. Optionally, when the hero CTA is pressed, the beam gives one small nudge. This single orchestrated moment is what the page is remembered by — spend your boldness here and keep everything else quiet.

**The gavel accent.** Use it as a *pressed* interaction, not decoration: on primary-button press, a 120ms scale-down to 0.97 with a brief 2px `ink` underline snapping in beneath the label — a struck-block feeling. Also use a single gavel-strike beat as the transition into the confirm state of the drafting wizard's final step.

Everything else, in order of priority:
- **Scroll reveals:** sections fade in with a 16px upward translate, 500ms, `cubic-bezier(0.16,1,0.3,1)`, staggered 60ms across children. Trigger once, at 20% visibility. Never animate on scroll-up.
- **The how-it-works hairline** draws itself left-to-right / top-to-bottom as it enters view (SVG `stroke-dashoffset`).
- **Tabbed showcase:** crossfade + 8px slide, 280ms, and an underline that slides between tab labels using a shared layout animation.
- **Chat:** assistant answers stream in word-by-word; citation chips pop in with a 40ms stagger after the answer finishes; the citation drawer slides from the right in 240ms.
- **Nav:** background and border fade in on scroll past 80px.
- **Hover:** cards lift by translating 2px and darkening their border to `clay`; no scale, no glow.
- **Counters:** if you show the 4.4M case-backlog figure, count it up once on entry.

**Restraint and accessibility:**
- No parallax on text. No auto-playing carousels. No background video. No blur-heavy glassmorphism.
- Everything above must be wrapped so that `@media (prefers-reduced-motion: reduce)` disables transforms and oscillation, keeps opacity fades under 200ms, and renders the balance scale in its final level position.
- Total hero animation budget: under 2s to fully settled. Nothing blocks reading.

---

## 8. Copy to use (do not write lorem, and do not write generic AI copy)

Ship real bilingual strings in `src/i18n/{bn,en}.ts`, keyed identically.

Voice: calm, plain, respectful, never salesy and never alarming. Short sentences. Active voice. Bengali should read like a careful, kind person explaining — not like a machine translation of English marketing copy. Buttons name the action that happens ("খসড়া তৈরি করুন" / "Create draft"), and the same word is used through the whole flow.

Starting points you can refine:
- Hero headline (EN): *Know your rights, in your own words.* — (BN): *আপনার অধিকার জানুন, আপনার ভাষায়।*
- Hero subhead (EN): *Ask an everyday legal question in Bangla or English. Get a clear answer grounded in the actual law — with the Act and Section it came from.*
- Credibility line: *৮টি আইন সংগ্রহে · প্রতিটি উত্তরে ধারা উল্লেখ · বিনামূল্যে*
- Primary CTA: *প্রশ্ন করুন / Ask a question*. Secondary: *কীভাবে কাজ করে / See how it works*.
- Disclaimer (must appear verbatim-equivalent in both languages): *এটি তথ্যগত সহায়তা, আইনি পরামর্শ নয়। গুরুত্বপূর্ণ বিষয়ে যোগ্য আইনজীবীর পরামর্শ নিন।* / *This is legal information, not legal advice. For anything important, consult a qualified lawyer.*
- Empty and error states carry direction, not apology: an empty history screen says *আপনার প্রশ্নগুলো এখানে জমা থাকবে। শুরু করুন →*; a failed index rebuild says what failed and what to do next.

---

## 9. Quality floor

- Responsive from **360px** to 1920px. Test the Bengali toggle at 360px — Bengali strings run longer and will break naive layouts.
- Semantic HTML: one `h1`, real `nav`/`main`/`section`/`footer`, `button` for actions and `a` for navigation.
- Visible keyboard focus everywhere: 2px `clay` outline with 2px offset. Full tab order through nav, tabs, accordion, chat and wizard. Accordion and tabs need correct ARIA. Escape closes the citation drawer and returns focus.
- `alt` text on every image; `aria-hidden` on decorative SVG; the balance scale gets a text alternative.
- No layout shift: reserve space for fonts (`font-display: swap` plus size-adjust) and for streamed chat content.
- Lighthouse: aim ≥95 accessibility, ≥90 performance.
- Clean structure: `src/components/ui`, `src/components/sections`, `src/pages`, `src/mocks`, `src/i18n`, `src/lib`. No file over ~250 lines. No dead code, no commented-out blocks, no `TODO` left behind.

---

## 10. Explicit do-nots

- No purple/blue/indigo gradients, no glow, no mesh blobs, no dark-mode-by-default.
- No emoji in the UI (the existing README uses them; the product must not).
- No stock photos of gavels, courtrooms, or handshakes. Build the imagery as SVG from the palette.
- No hex codes in component files — tokens only.
- No fake trust signals: no invented client logos, no fabricated statistics, no "trusted by 14,000 businesses". Only the real, sourced figures in section 2.
- No claim anywhere that the app gives legal advice, guarantees accuracy, or replaces a lawyer.
- Don't leave placeholder text, `#` links, or non-functional buttons. If a button has no destination yet, it opens a small "coming soon" state.

---

## 11. Definition of done

`npm install && npm run dev` runs with zero console errors. The landing page and all six app screens are complete and navigable. The language toggle switches the entire UI including fonts and line-heights. The hero balance animation plays once and settles. Citation chips open the drawer with statute text. The drafting wizard completes end-to-end against mock data and previews a document. Reduced-motion and keyboard-only paths both work. Every color traces to a token.

---

## 12. Build order

Do it in this order and pause after each stage so I can review before you continue:

1. Tokens, Tailwind config, fonts, `i18n` scaffold, language context, and a `/kitchen-sink` route showing every button, input, chip, card and type size in both languages.
2. Landing page above the fold: nav + hero + the balance-scale animation.
3. Rest of the landing page, section by section.
4. Chat screen including the citation drawer and streaming mock.
5. Drafting wizard, glossary, history.
6. Admin, login, then a full accessibility and responsive pass.

---

## 13. Follow-up prompts for iterating

Paste these one at a time after the first build.

- **Refine the hero:** "The hero is the thesis of this page. Give me three alternative hero compositions using the same tokens — one type-led with the scale small and in the margin, one where the scale is large and the type wraps around it, one where the scale is a full-bleed background line drawing at 8% opacity. Describe each in two lines, then implement the one you'd defend."
- **Harden the motion:** "Audit every animation on the page. Remove any that doesn't serve comprehension. Then make the hero balance animation feel physical — real spring damping, the pans and chains lagging slightly behind the beam."
- **Bengali pass:** "Switch to Bengali and screenshot every breakpoint. Fix every place the longer Bengali strings break the layout, and every place the line-height is too tight for the matra."
- **Citation trust pass:** "The citations are the product's entire trust claim. Redesign the citation chip and drawer so a non-lawyer immediately understands *this answer came from this exact section of this exact law*."
- **Backend wiring (later):** "Replace the stubs in `src/lib/api.ts` with `fetch` calls to a FastAPI backend at `VITE_API_URL`, keeping every existing TypeScript interface unchanged. Add loading, empty and error states for each call. Don't change any component's props."
- **Kill the template feel:** "Look at this page and name the five things about it that would appear on any AI-generated legal website. Replace each with a choice specific to Bangladeshi statutes, Bengali typography, or the document-margin motif."

---

## Appendix — if you must stay in Streamlit

The existing repository is a Streamlit app (`app.py`, `rag_system.py`, `gemini_client.py`, `vector_database.py`, `pdf_processor.py`). Streamlit cannot produce the layout, routing, or motion described above. Two honest options:

**A. Recommended — split the stack.** Wrap the existing Python modules in a thin FastAPI layer (`/chat`, `/draft`, `/search`, `/admin/corpus`) and build this React frontend against it. The Python RAG logic is untouched; only `app.py` is replaced. This is the only way to get the reference site's feel.

**B. Stay in Streamlit.** You keep the fast path to a working demo and lose most of the design. Then the prompt changes to: "Restyle this Streamlit app using `st.markdown` with `unsafe_allow_html=True` and a single injected CSS block. Apply these tokens, hide the Streamlit chrome (`#MainMenu`, `footer`, header), use `st.tabs` for Ask/Draft/Look up, `st.chat_message` for the thread, and render citations as custom HTML chips. Accept that routing, scroll animation, and the hero balance animation are not achievable — use one CSS-only settling animation on a static SVG header instead."
