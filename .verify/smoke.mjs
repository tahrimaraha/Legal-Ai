import { JSDOM } from 'jsdom';
import { readFileSync } from 'fs';

const errors = [];
const dom = new JSDOM('<!doctype html><html lang="bn"><body><div id="root"></div></body></html>', {
  url: 'https://localhost/',
  pretendToBeVisual: true,
  runScripts: 'outside-only',
});
const { window } = dom;
window.matchMedia = (q) => ({ matches: false, media: q, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {}, onchange: null, dispatchEvent: () => false });
window.scrollTo = () => {};
window.Element.prototype.scrollIntoView = function () {};
window.IntersectionObserver = class { constructor(cb){ this.cb = cb; } observe(el){ this.cb([{ isIntersecting: true, intersectionRatio: 1, target: el }], this); } unobserve(){} disconnect(){} takeRecords(){ return []; } };
window.ResizeObserver = class { observe(){} unobserve(){} disconnect(){} };
window.crypto = window.crypto || {}; window.crypto.randomUUID = () => 'id-' + Math.random().toString(16).slice(2);
window.console.error = (...a) => errors.push(a.join(' '));
window.console.warn = (...a) => errors.push(a.join(' '));

const code = readFileSync('.verify_tmp/out/app.js', 'utf8');
window.eval(code);

await new Promise((r) => setTimeout(r, 900));
const doc = window.document;
const text = doc.body.textContent || '';

const checks = [
  ['renders hero headline (bn)', text.includes('আপনার অধিকার জানুন')],
  ['renders statute index', text.includes('দণ্ডবিধি') && text.includes('১৮৬০')],
  ['renders safety section', text.includes('যা করে না')],
  ['renders FAQ', text.includes('এটি কি আইনি পরামর্শ?')],
  ['renders footer disclaimer both languages', text.includes('আইনি পরামর্শ নয়') && text.includes('not legal advice')],
  ['exactly one h1', doc.querySelectorAll('h1').length === 1],
  ['gavel image has alt text', (doc.querySelector('img[src="/gavel.png"]')?.getAttribute('alt') || '').length > 20],
  ['balance scale has aria-label', !!doc.querySelector('svg[role="img"][aria-label]')],
  ['tabs have correct aria', doc.querySelectorAll('[role="tab"]').length === 3 && !!doc.querySelector('[role="tabpanel"]')],
  ['accordion triggers wired', doc.querySelectorAll('button[aria-expanded][aria-controls]').length >= 6],
  ['skip link present', text.includes('মূল অংশে যান')],
  ['no "#" dead links', [...doc.querySelectorAll('a')].every((a) => a.getAttribute('href') !== '#')],
  ['html lang attribute set', doc.documentElement.lang === 'bn'],
];

let failed = 0;
for (const [name, ok] of checks) { if (!ok) failed++; console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}`); }

// Language toggle: click EN and re-check
const enBtn = [...doc.querySelectorAll('button')].find((b) => b.textContent.trim() === 'EN');
enBtn?.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
await new Promise((r) => setTimeout(r, 400));
const after = doc.body.textContent || '';
const langOk = after.includes('Know your rights') && doc.documentElement.lang === 'en';
if (!langOk) failed++;
console.log(`${langOk ? 'PASS' : 'FAIL'}  language toggle switches whole UI + lang attribute`);

const real = errors.filter((e) => !/not wrapped in act|useLayoutEffect does nothing on the server/i.test(e));
console.log(real.length ? `\nCONSOLE OUTPUT:\n${real.slice(0, 10).join('\n')}` : '\nNo console errors or warnings.');
console.log(failed || real.length ? `\n${failed} check(s) failed.` : '\nAll checks passed.');
