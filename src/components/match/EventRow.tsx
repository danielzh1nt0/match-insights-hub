import { Check, Play, X } from "lucide-react";
import type { StatIconName } from "./StatIcon";
import { StatIcon } from "./StatIcon";
import { TeamToken, type TeamIdentity } from "@/components/team/TeamToken";
import { cn } from "@/lib/utils";

export function EventRow({ time, icon, iconTint = "default", identity, title, subtitle, state, focused, onPlay, onConfirm, onHide }: {
  time: string;
  icon: StatIconName;
  iconTint?: "default" | "good" | "warn" | "bad";
  team: "A" | "B";
  identity: TeamIdentity;
  title: string;
  subtitle?: string;
  state: "confirmed" | "hidden" | "untouched";
  focused?: boolean;
  onPlay: () => void;
  onConfirm: () => void;
  onHide: () => void;
}) {
  const tint =
    iconTint === "good" ? "var(--reaction-good)"
    : iconTint === "warn" ? "var(--reaction-warn)"
    : iconTint === "bad" ? "var(--reaction-bad)"
    : "var(--cream)";

  return (
    <div
      className={cn(
        "mb-2 grid grid-cols-[44px_32px_minmax(0,1fr)_auto] items-center gap-2.5 border border-wire px-3 py-2.5",
        state === "confirmed" || focused ? "bg-surface-2" : "bg-transparent",
        state === "confirmed" && "border-l-[3px] border-l-reaction-good",
        state === "hidden" && "opacity-40",
      )}
    >
      <button
        type="button"
        onClick={onPlay}
        aria-label={`Play at ${time}`}
        className="display num flex min-h-11 min-w-11 items-center gap-1.5 text-[15px] text-text-dim transition-colors hover:text-cream"
      >
        <Play size={10} className="fill-cream text-cream" aria-hidden="true" />
        {time}
      </button>

      <div className="grid h-7 w-7 place-items-center border border-wire bg-surface">
        <StatIcon name={icon} size={14} color={tint} />
      </div>

      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-[7px] text-[12.5px] font-semibold text-text">
          <TeamToken identity={identity} size="sm" state="compare" />
          {title}
        </div>
        {subtitle && <div className="mt-[3px] truncate text-[11px] text-text-faint">{subtitle}</div>}
      </div>

      <div className="flex gap-1">
        <button
          type="button"
          onClick={onConfirm}
          aria-label="Confirm"
          aria-pressed={state === "confirmed"}
          className={cn(
            "grid h-11 w-11 place-items-center transition-colors",
            state === "confirmed"
              ? "bg-reaction-good text-white"
              : "border border-wire text-text-faint hover:text-cream",
          )}
        >
          <Check size={14} aria-hidden="true" />
        </button>
        <button
          type="button"
          onClick={onHide}
          aria-label="Hide"
          className="grid h-11 w-11 place-items-center border border-wire text-text-faint transition-colors hover:text-cream"
        >
          <X size={14} aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}
