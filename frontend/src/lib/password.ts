/** Password rules — the same ones the server enforces (backend/app/core/security.py). */
export interface PasswordRule {
  id: 'length' | 'letter' | 'number' | 'notEmail';
  en: string;
  bn: string;
  ok: boolean;
}

export function passwordRules(password: string, email = ''): PasswordRule[] {
  return [
    { id: 'length', en: 'At least 8 characters', bn: 'কমপক্ষে ৮ অক্ষর', ok: password.length >= 8 && password.length <= 128 },
    { id: 'letter', en: 'Contains a letter', bn: 'অন্তত একটি অক্ষর', ok: /\p{L}/u.test(password) },
    { id: 'number', en: 'Contains a number', bn: 'অন্তত একটি সংখ্যা', ok: /\d/.test(password) },
    {
      id: 'notEmail',
      en: 'Different from your email',
      bn: 'ইমেইল থেকে আলাদা',
      ok: !email || password.trim().toLowerCase() !== email.trim().toLowerCase(),
    },
  ];
}

export function passwordIsValid(password: string, email = ''): boolean {
  return passwordRules(password, email).every((r) => r.ok);
}
