import { Scale } from 'lucide-react';

/** Hairline — scales — hairline, used under auth card headings. */
export function ScalesDivider({ className = '' }: { className?: string }) {
  return (
    <div aria-hidden="true" className={`flex items-center gap-3 text-[#8a5a3c] ${className}`}>
      <span className="h-px flex-1 bg-gradient-to-r from-transparent to-[#cdb39d]" />
      <Scale className="h-5 w-5" strokeWidth={1.5} />
      <span className="h-px flex-1 bg-gradient-to-l from-transparent to-[#cdb39d]" />
    </div>
  );
}
