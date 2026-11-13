/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: 'rgb(var(--c-ink) / <alpha-value>)',
        'ink-soft': 'rgb(var(--c-ink-soft) / <alpha-value>)',
        bone: 'rgb(var(--c-bone) / <alpha-value>)',
        'bone-deep': 'rgb(var(--c-bone-deep) / <alpha-value>)',
        clay: 'rgb(var(--c-clay) / <alpha-value>)',
        'clay-deep': 'rgb(var(--c-clay-deep) / <alpha-value>)',
        'clay-tint': 'rgb(var(--c-clay-tint) / <alpha-value>)',
        granite: 'rgb(var(--c-granite) / <alpha-value>)',
        'granite-soft': 'rgb(var(--c-granite-soft) / <alpha-value>)',
        brick: 'rgb(var(--c-brick) / <alpha-value>)',
        paper: 'rgb(var(--c-white) / <alpha-value>)',
      },
      fontFamily: {
        display: 'var(--font-display)',
        body: 'var(--font-body)',
        mono: 'var(--font-mono)',
      },
      fontSize: {
        display: ['clamp(2.75rem, 1.6rem + 4.6vw, 4.5rem)', { lineHeight: 'var(--lh-display)', letterSpacing: '-0.02em' }],
        h2: ['clamp(2rem, 1.3rem + 2.8vw, 3rem)', { lineHeight: '1.1', letterSpacing: '-0.018em' }],
        h3: ['clamp(1.375rem, 1.15rem + 0.9vw, 1.75rem)', { lineHeight: '1.2', letterSpacing: '-0.012em' }],
        body: ['var(--fs-body)', { lineHeight: 'var(--lh-body)' }],
        caption: ['0.8125rem', { lineHeight: '1.5' }],
        label: ['0.6875rem', { lineHeight: '1.4', letterSpacing: '0.14em' }],
      },
      borderRadius: { none: '0', sm: '2px', DEFAULT: '2px', md: '4px', full: '999px' },
      maxWidth: { content: '1200px', prose: '68ch' },
      spacing: { section: 'var(--section-pad)' },
      boxShadow: { composer: '0 -1px 0 rgb(var(--c-granite-soft)), 0 12px 32px -18px rgb(var(--c-ink) / 0.35)' },
      transitionTimingFunction: { settle: 'cubic-bezier(0.16, 1, 0.3, 1)' },
    },
  },
  plugins: [],
};
