import {
  forwardRef,
  useState,
  type InputHTMLAttributes,
  type TextareaHTMLAttributes,
  type SelectHTMLAttributes,
} from 'react';
import { Eye, EyeOff, type LucideIcon } from 'lucide-react';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
  /** Optional leading icon inside the field. */
  icon?: LucideIcon;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, hint, className = '', id, icon: Icon, type, ...props }, ref) => {
    const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);
    const isPassword = type === 'password';
    const [reveal, setReveal] = useState(false);
    return (
      <div className="w-full space-y-1 font-body">
        {label && (
          <label htmlFor={inputId} className="block text-xs font-semibold uppercase text-ink-soft">
            {label}
          </label>
        )}
        <div className="relative">
          {Icon && (
            <Icon
              aria-hidden="true"
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-granite"
              strokeWidth={1.75}
            />
          )}
          <input
            ref={ref}
            id={inputId}
            type={isPassword && reveal ? 'text' : type}
            className={`w-full rounded-sm border bg-white px-3 py-2 text-sm text-ink transition placeholder:text-granite focus:border-clay focus:outline-none focus:ring-1 focus:ring-clay disabled:bg-bone disabled:opacity-60 ${
              error ? 'border-brick ring-1 ring-brick' : 'border-granite hover:border-clay-deep'
            } ${Icon ? 'pl-10' : ''} ${isPassword ? 'pr-10' : ''} ${className}`}
            {...props}
          />
          {isPassword && (
            <button
              type="button"
              onClick={() => setReveal((v) => !v)}
              aria-label={reveal ? 'Hide password' : 'Show password'}
              aria-pressed={reveal}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-granite transition hover:text-ink-soft"
            >
              {reveal ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          )}
        </div>
        {hint && !error && <p className="text-[11px] text-granite">{hint}</p>}
        {error && <p className="text-[11px] font-medium text-brick">{error}</p>}
      </div>
    );
  },
);

Input.displayName = 'Input';

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  hint?: string;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ label, error, hint, className = '', id, rows = 4, ...props }, ref) => {
    const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);
    return (
      <div className="w-full space-y-1 font-body">
        {label && (
          <label htmlFor={inputId} className="block text-xs font-semibold uppercase text-ink-soft">
            {label}
          </label>
        )}
        <textarea
          ref={ref}
          id={inputId}
          rows={rows}
          className={`w-full rounded-sm border bg-white px-3 py-2 text-sm text-ink transition placeholder:text-granite focus:border-clay focus:outline-none focus:ring-1 focus:ring-clay disabled:bg-bone disabled:opacity-60 ${
            error ? 'border-brick ring-1 ring-brick' : 'border-granite hover:border-clay-deep'
          } ${className}`}
          {...props}
        />
        {hint && !error && <p className="text-[11px] text-granite">{hint}</p>}
        {error && <p className="text-[11px] font-medium text-brick">{error}</p>}
      </div>
    );
  },
);

Textarea.displayName = 'Textarea';

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  hint?: string;
  options: { value: string; label: string }[];
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, error, hint, options, className = '', id, ...props }, ref) => {
    const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);
    return (
      <div className="w-full space-y-1 font-body">
        {label && (
          <label htmlFor={inputId} className="block text-xs font-semibold uppercase text-ink-soft">
            {label}
          </label>
        )}
        <select
          ref={ref}
          id={inputId}
          className={`w-full rounded-sm border bg-white px-3 py-2 text-sm text-ink transition focus:border-clay focus:outline-none focus:ring-1 focus:ring-clay disabled:bg-bone disabled:opacity-60 ${
            error ? 'border-brick ring-1 ring-brick' : 'border-granite hover:border-clay-deep'
          } ${className}`}
          {...props}
        >
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        {hint && !error && <p className="text-[11px] text-granite">{hint}</p>}
        {error && <p className="text-[11px] font-medium text-brick">{error}</p>}
      </div>
    );
  },
);

Select.displayName = 'Select';
