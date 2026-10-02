import type { Phase, PhaseKey } from "@/lib/phases";
import { cn } from "@/lib/utils";

/**
 * The four moments of the game as a row of picker buttons.
 *
 * Each carries its own headline number and a dot for whether the team is
 * inside its target. A phase the match file cannot measure shows no number
 * and a grey dot, rather than a figure nothing stands behind.
 */
export function PhasePicker({
  phases,
  active,
  onPick,
}: {
  phases: Phase[];
  active: PhaseKey;
  onPick: (key: PhaseKey) => void;
}) {
  return (
    <div
      className="grid gap-2 sm:grid-cols-2 min-[1100px]:grid-cols-4"
      role="tablist"
      aria-label="Phases"
    >
      {phases.map((phase) => (
        <button
          key={phase.key}
          type="button"
          role="tab"
          aria-selected={active === phase.key}
          onClick={() => onPick(phase.key)}
          className={cn(
            "flex items-center gap-3 border px-4 py-3 text-left transition-colors",
            active === phase.key
              ? "border-cream bg-surface-2"
              : "border-wire bg-surface hover:border-cream/40",
          )}
        >
          <span className="min-w-0 flex-1">
            <span className="block text-[12.5px] font-bold text-text">{phase.name}</span>
            <span className="mt-0.5 flex items-baseline gap-1.5">
              <span className="display-i text-[22px] leading-none text-cream">
                {phase.headline.value ?? "—"}
              </span>
              <span className="truncate text-[11px] text-text-faint">{phase.headline.label}</span>
            </span>
          </span>
          <span
            aria-hidden="true"
            className={cn(
              "h-2.5 w-2.5 shrink-0 rounded-full",
              phase.status === "on"
                ? "bg-reaction-good"
                : phase.status === "off"
                  ? "bg-reaction-warn"
                  : "bg-text-faint",
            )}
          />
        </button>
      ))}
    </div>
  );
}
