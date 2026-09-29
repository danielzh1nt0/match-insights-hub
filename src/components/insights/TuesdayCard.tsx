import { cn } from "@/lib/utils";

type Props = {
  headline: string;
  target?: string;
  today?: string;
  isPositive?: boolean;
  onAction: () => void;
  actionLabel: string;
};

function Figure({ label, value, tone }: { label: string; value: string; tone?: "bad" }) {
  return (
    <div>
      <span className="mb-0.5 block text-[10px] font-semibold uppercase tracking-[0.06em] text-text-faint">{label}</span>
      <span className={cn("display-i text-[20px]", tone === "bad" ? "text-reaction-bad" : "text-cream")}>{value}</span>
    </div>
  );
}

export function TuesdayCard({ headline, target, today, isPositive, onAction, actionLabel }: Props) {
  return (
    <div className="relative mx-4 mt-3.5 overflow-hidden rounded-[14px] border border-wire bg-surface p-5">
      <span
        className={cn("absolute inset-x-0 top-0 h-[3px]", isPositive ? "bg-reaction-good" : "bg-cream")}
        aria-hidden="true"
      />
      <p className="mb-3.5 text-[10.5px] font-bold uppercase tracking-[0.08em] text-text-faint">The one thing</p>
      <h2 className="display-i mb-3.5 text-[28px] leading-tight text-cream">{headline}</h2>

      {(target || today) && (
        <div className="mb-4 flex gap-4 border-b border-wire-2 pb-4 text-[13px]">
          {target && <Figure label="Target" value={target} />}
          {today && <Figure label="Today" value={today} {...(isPositive ? {} : { tone: "bad" as const })} />}
        </div>
      )}

      <button
        type="button"
        onClick={onAction}
        className="block min-h-11 w-full rounded-[10px] bg-cream p-3.5 text-[13.5px] font-bold text-ink transition-opacity hover:opacity-90"
      >
        {actionLabel}
      </button>
    </div>
  );
}
