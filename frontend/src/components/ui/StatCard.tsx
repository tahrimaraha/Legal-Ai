import { LucideIcon } from 'lucide-react';

interface StatCardProps {
  label: string;
  value: string | number;
  sub?: string;
  icon?: LucideIcon;
  trend?: string;
  className?: string;
}

export function StatCard({ label, value, sub, icon: Icon, trend, className = '' }: StatCardProps) {
  return (
    <div className={`rounded border border-granite bg-white p-5 shadow-sm ${className}`}>
      <div className="flex items-center justify-between">
        <span className="font-mono text-label uppercase text-clay-deep">{label}</span>
        {Icon && <Icon className="h-4 w-4 text-granite" />}
      </div>
      <div className="mt-2 flex items-baseline gap-2">
        <span className="font-display text-2xl font-bold text-ink">{value}</span>
        {trend && <span className="font-mono text-xs text-clay-deep font-semibold">{trend}</span>}
      </div>
      {sub && <p className="mt-1 text-caption text-granite">{sub}</p>}
    </div>
  );
}
