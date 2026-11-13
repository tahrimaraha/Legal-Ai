import { Star } from 'lucide-react';

interface RatingProps {
  value: number;
  count?: number;
  showValue?: boolean;
  size?: 'sm' | 'md';
}

export function Rating({ value, count, showValue = true, size = 'sm' }: RatingProps) {
  const isSm = size === 'sm';
  const starSize = isSm ? 'h-3.5 w-3.5' : 'h-4 w-4';

  return (
    <div className="inline-flex items-center gap-1.5 font-body">
      <div className="flex items-center text-clay-deep" aria-label={`Rating: ${value} out of 5`}>
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`${starSize} ${
              star <= Math.round(value) ? 'fill-clay text-clay' : 'text-granite'
            }`}
          />
        ))}
      </div>
      {showValue && (
        <span className="font-mono text-xs font-semibold text-ink">
          {value.toFixed(1)}
        </span>
      )}
      {count !== undefined && (
        <span className="text-caption text-granite font-mono">({count})</span>
      )}
    </div>
  );
}
