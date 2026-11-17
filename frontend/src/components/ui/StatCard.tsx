import { Link } from 'react-router-dom';
import { ArrowRight, type LucideIcon } from 'lucide-react';

interface StatCardProps {
  label: string;
  value: string | number;
  sub?: string;
  icon?: LucideIcon;
  trend?: string;
  className?: string;
  /** When set, the whole card links to this route. */
  to?: string;
}

export function StatCard({ label, value, sub, icon: Icon, trend, className = '', to }: StatCardProps) {
  const body = (
    <>
      <div className="flex items-center justify-between">
        <span className="font-mono text-label uppercase text-clay-deep">{label}</span>
        {Icon && <Icon className="h-4 w-4 text-granite" />}
      </div>
      <div className="mt-2 flex items-baseline gap-2">
        <span className="font-display text-2xl font-bold text-ink">{value}</span>
        {trend && <span className="font-mono text-xs text-clay-deep font-semibold">{trend}</span>}
      </div>
      {sub && (
        <p className="mt-1 flex items-center gap-1 text-caption text-granite">
          <span>{sub}</span>
          {to && <ArrowRight className="h-3 w-3 shrink-0 transition-transform group-hover:translate-x-0.5" />}
        </p>
      )}
    </>
  );

  const base = `rounded border border-granite bg-white p-5 shadow-sm ${className}`;
  if (!to) return <div className={base}>{body}</div>;
  return (
    <Link
      to={to}
      className={`group block ${base} transition hover:border-clay hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-clay`}
    >
      {body}
    </Link>
  );
}
