import { CheckCircle2, Clock, XCircle } from 'lucide-react';
import type { ConsultationStatus } from '../../mocks/types';

interface TimelineItem {
  status: ConsultationStatus;
  timestamp: string;
  note?: string;
}

export function Timeline({ items }: { items: TimelineItem[] }) {
  return (
    <div className="relative border-l border-granite-soft pl-4 ml-2 space-y-6 font-body">
      {items.map((item, idx) => {
        const isSuccess = item.status === 'completed' || item.status === 'accepted' || item.status === 'scheduled';
        const isDeclined = item.status === 'declined' || item.status === 'cancelled';

        return (
          <div key={idx} className="relative">
            {/* Dot marker */}
            <div
              className={`absolute -left-[21px] top-1 flex h-4 w-4 items-center justify-center rounded-full border bg-white ${
                isSuccess
                  ? 'border-clay text-clay'
                  : isDeclined
                  ? 'border-brick text-brick'
                  : 'border-granite text-granite'
              }`}
            >
              {isSuccess ? (
                <CheckCircle2 className="h-3 w-3" />
              ) : isDeclined ? (
                <XCircle className="h-3 w-3" />
              ) : (
                <Clock className="h-3 w-3" />
              )}
            </div>

            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs uppercase font-semibold text-ink">
                  {item.status}
                </span>
                <span className="font-mono text-[11px] text-granite">
                  {new Date(item.timestamp).toLocaleString()}
                </span>
              </div>
              {item.note && (
                <p className="mt-1 text-sm text-ink-soft bg-bone-deep/50 p-2 rounded border border-granite-soft/60">
                  {item.note}
                </p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function ProgressRail({
  steps,
  currentStep,
  onSelectStep,
}: {
  steps: { id: string; label: string; completed?: boolean }[];
  currentStep: number;
  onSelectStep?: (index: number) => void;
}) {
  return (
    <nav aria-label="Step progress" className="w-full space-y-2 font-body">
      {steps.map((step, idx) => {
        const isActive = idx === currentStep;
        const isCompleted = step.completed || idx < currentStep;

        return (
          <button
            key={step.id}
            type="button"
            disabled={!onSelectStep || idx > currentStep + 1}
            onClick={() => onSelectStep && onSelectStep(idx)}
            className={`flex w-full items-center gap-3 rounded p-2 text-left transition ${
              isActive
                ? 'bg-clay-tint text-clay-deep font-semibold border border-clay/30'
                : isCompleted
                ? 'text-ink-soft hover:bg-bone-deep'
                : 'text-granite opacity-75'
            }`}
          >
            <div
              className={`flex h-6 w-6 shrink-0 items-center justify-center rounded font-mono text-xs font-semibold ${
                isCompleted
                  ? 'bg-clay-deep text-white'
                  : isActive
                  ? 'border border-clay bg-white text-clay-deep'
                  : 'border border-granite bg-bone text-granite'
              }`}
            >
              {isCompleted ? <CheckCircle2 className="h-3.5 w-3.5" /> : idx + 1}
            </div>
            <span className="text-xs truncate">{step.label}</span>
          </button>
        );
      })}
    </nav>
  );
}
