# LEGAL AI — আইনি সহায়ক

Frontend for a bilingual (Bangla / English) legal-information assistant for Bangladeshi
citizens. Every answer is grounded in a curated statute corpus and cites the Act and Section
it came from.

Built to the spec in `SPEC.md`. All data comes from the FastAPI backend in `../backend`.

## Run it

```bash
# backend first (Postgres, Redis, API on :8000), then seed demo accounts and content
cd ../backend && docker compose up -d
docker compose exec api sh -c "python -m scripts.seed_demo_users && python -m scripts.seed_content"

cd ../frontend
npm install
npm run dev      # http://localhost:5173 — demo logins use password demo-password-123
npm run build    # type-check + production build
npm run smoke    # headless render + interaction checks (jsdom)
```

## What is built

| Route | State |
|---|---|
| `/` | Complete landing page — nav, hero, trust strip, tabbed showcase, why-us, how-it-works, feature grid, statute index, the case-backlog figures, testimonials, safety and limits, FAQ, final CTA, footer |
| `/app/chat` | Complete — sidebar history, streaming answers, citation chips, statute drawer, feedback, composer |
| `/kitchen-sink` | Every token, type size and primitive in both languages |
| `/app/draft`, `/app/glossary`, `/app/history`, `/admin`, `/login` | Real "coming soon" screens — next in the build order, no dead links anywhere |

## Design system

Five colours only, plus derived tints, defined once as CSS custom properties in
`src/index.css` and exposed through `tailwind.config.js`. No hex codes appear in any
component.

| Token | Hex | Role |
|---|---|---|
| `ink` | `#000000` | Text, dark bands, footer |
| `bone` | `#F6ECE3` | Page background |
| `clay` | `#91766E` | Primary accent, focus ring, citation chips |
| `granite` | `#B7A7A9` | Borders, muted labels — never body text |
| `paper` | `#FFFFFF` | Cards and raised surfaces |

Derived: `ink-soft`, `clay-deep`, `clay-tint`, `bone-deep`, `granite-soft`, and a single
desaturated `brick` for warnings.

Type: **Bodoni Moda** / **Noto Serif Bengali** for display, **Manrope** / **Hind Siliguri**
for body, **JetBrains Mono** for section numerals and structural labels. The whole stack
switches off the `<html lang>` attribute, including Bengali's larger line-height (1.78) and
smaller body size. Bengali is never letter-spaced or uppercased — that is enforced in CSS,
not left to discipline.

Shape: 2px on inputs and chips, 4px on cards, full round only on the language pill and
citation chips. Depth comes from 1px hairlines and whitespace; the only shadow in the
system is on the chat composer.

## Motion

- **The settling balance** (`src/components/ui/BalanceScale.tsx`) — drawn from SVG
  primitives, enters tipped 12°, oscillates and settles level in about 1.6s with spring
  damping. The pans hang on their own softer spring so they lag the beam. Hover dips one
  pan; pressing a primary CTA nudges it via a window event.
- **The gavel strike** — primary buttons scale to 0.97 for 120ms with a 2px rule snapping in
  beneath the label.
- **Your gavel photograph** sits in the hero as a duotoned plate that parallaxes and tilts
  under the pointer, with the balance scale floating in front of it on a second, deeper
  parallax layer.
- Scroll reveals (16px up, 500ms, once at 20% visibility), a self-drawing hairline through
  the how-it-works sequence, a shared-layout tab underline, word-by-word answer streaming,
  and a 240ms citation drawer.
- Everything above is disabled or shortened under `prefers-reduced-motion: reduce`; the
  scale renders level.

## The backend seam

`src/lib/api.ts` is the only file that talks to the backend (`VITE_API_URL`, default
`http://localhost:8000/api/v1`). Every function returns the shape in `src/mocks/types.ts` and
attaches the session token from `localStorage`; a 401 logs the user out. The endpoint list is in
`docs/api-contract.md`. `src/mocks/` now only supplies types and the static landing-page content.

Only `sendForgotPassword` is still a stub — there is no password-reset endpoint yet.

## Structure

```
src/
  components/ui/        Button, BalanceScale, Logo, CitationChip, Accordion, CountUp, …
  components/sections/  One file per landing section
  components/chat/      Sidebar, AssistantMessage, CitationDrawer, Composer
  pages/                Landing, Chat, KitchenSink, ComingSoon
  i18n/                 bn.ts and en.ts, keyed identically
  mocks/                Typed fixtures — statutes, citations, conversations, glossary
  lib/                  api.ts (the backend seam), useChat.ts, motion.ts
```

## Verification

`npm run smoke` mounts the app in jsdom and asserts: both languages render, the toggle
switches the whole UI and the `lang` attribute, there is exactly one `h1`, the gavel image
carries alt text, the balance scale has a text alternative, tabs and accordions expose
correct ARIA, no link points at `#`, and — on the chat screen — an answer streams in,
citation chips appear, the drawer opens with the matched passage highlighted, and Escape
closes it. It also fails on any React console warning.

## Not done yet

The drafting wizard, glossary, history and admin screens are scaffolded as real screens but
not built out. Stages 5 and 6 of `SPEC.md` §12.

---

A CUET CSE-356 software engineering project. This tool gives legal information, not legal
advice, and does not replace a licensed lawyer.
