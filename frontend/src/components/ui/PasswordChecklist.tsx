import { Check, Circle } from 'lucide-react';
import { passwordRules } from '../../lib/password';

/** Live checklist of the password rules (the server enforces the same ones). */
export function PasswordChecklist({ password, email = '', lang }: { password: string; email?: string; lang: 'en' | 'bn' }) {
  if (!password) return null;
  return (
    <ul className="grid grid-cols-1 gap-x-4 gap-y-1 pt-1 text-xs sm:grid-cols-2" aria-live="polite">
      {passwordRules(password, email).map((r) => (
        <li key={r.id} className={`flex items-center gap-1.5 ${r.ok ? 'text-[#4f7a3a]' : 'text-granite'}`}>
          {r.ok ? <Check className="h-3.5 w-3.5 shrink-0" strokeWidth={2.5} /> : <Circle className="h-3 w-3 shrink-0" />}
          <span>{lang === 'bn' ? r.bn : r.en}</span>
        </li>
      ))}
    </ul>
  );
}
