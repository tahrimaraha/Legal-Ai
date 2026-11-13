import { JSDOM } from 'jsdom';
import { readFileSync } from 'fs';

const errors = [];
const dom = new JSDOM('<!doctype html><html lang="bn"><body><div id="root"></div></body></html>', {
  url: 'https://localhost/app/chat',
  pretendToBeVisual: true,
  runScripts: 'outside-only',
});
const { window } = dom;
window.matchMedia = (q) => ({ matches: false, media: q, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {}, onchange: null, dispatchEvent: () => false });
window.scrollTo = () => {}; window.HTMLElement.prototype.scrollIntoView = function () {};
window.Element.prototype.scrollIntoView = function () {};
window.IntersectionObserver = class { constructor(cb){ this.cb = cb; } observe(el){ this.cb([{ isIntersecting: true, intersectionRatio: 1, target: el }], this); } unobserve(){} disconnect(){} takeRecords(){ return []; } };
window.ResizeObserver = class { observe(){} unobserve(){} disconnect(){} };
window.crypto = window.crypto || {}; window.crypto.randomUUID = () => 'id-' + Math.random().toString(16).slice(2);
window.console.error = (...a) => errors.push(a.join(' '));
window.console.warn = (...a) => errors.push(a.join(' '));

const code = readFileSync('.verify/out/app.js', 'utf8');
window.eval(code);

await new Promise((r) => setTimeout(r, 900));
const doc = window.document;
const text = doc.body.textContent || '';

const doc2 = window.document;
const errs = [];
const t0 = doc2.body.textContent || '';
if (!t0.includes('কী বুঝতে চান?')) errs.push('empty state missing');
if (!doc2.querySelector('#composer')) errs.push('composer missing');
if (!t0.includes('আইনি পরামর্শ নয়')) errs.push('persistent disclaimer missing in app shell');

const suggestion = [...doc2.querySelectorAll('button')].find((b) => b.textContent.includes('ভাড়া বাড়িয়েছেন'));
if (!suggestion) errs.push('suggestion chips missing');
suggestion?.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
await new Promise((r) => setTimeout(r, 1400));
let t1 = doc2.body.textContent || '';
if (!t1.includes('মানসম্মত ভাড়া')) errs.push('assistant answer did not stream in');
await new Promise((r) => setTimeout(r, 4000));
t1 = doc2.body.textContent || '';
if (!t1.includes('ধারা ৯')) errs.push('citation chips did not appear after stream');

const chip = [...doc2.querySelectorAll('button')].find((b) => b.textContent.includes('ধারা ৯'));
chip?.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
await new Promise((r) => setTimeout(r, 500));
const drawer = doc2.querySelector('[role="dialog"]');
if (!drawer) errs.push('citation drawer did not open');
if (drawer && !drawer.querySelector('mark')) errs.push('matched passage is not highlighted');
if (drawer && !drawer.textContent.includes('ধারা ৯। ভাড়া বৃদ্ধি')) errs.push('statute text missing from drawer');

window.document.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
window.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'Escape' }));
await new Promise((r) => setTimeout(r, 500));
if (doc2.querySelector('[role="dialog"]')) errs.push('Escape did not close the drawer');

const real = errors.filter((e) => !/not wrapped in act|useLayoutEffect/i.test(e));
for (const e of errs) console.log('FAIL  ' + e);
console.log(real.length ? 'CONSOLE:\n' + real.slice(0, 8).join('\n') : 'No console errors or warnings.');
console.log(errs.length === 0 && real.length === 0 ? 'All chat checks passed.' : errs.length + ' chat check(s) failed.');
