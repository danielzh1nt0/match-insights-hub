import type { ReactNode } from "react";
import { AlertCircle, Check, ChevronDown, X } from "lucide-react";
import { cn } from "@/lib/utils";

type Result = "on" | "off" | "critical";

type Props = {
  icon: ReactNode;
  headline: string;
  result: Result;
  expanded: boolean;
  onToggle: () => void;
};

const RESULT = {
  on: { label: "On track", icon: Check, classes: "bg-cream text-ink" },
  off: {
    label: "Off target",
    icon: AlertCircle,
    classes: "border border-reaction-warn/50 bg-reaction-warn/15 text-reaction-warn",
  },
  // The worst finding on the screen should not be the quietest thing on it.
  critical: {
    label: "Critical",
    icon: X,
    classes: "border border-reaction-bad/50 bg-reaction-bad/15 text-reaction-bad",
  },
} as const;

export function FindingRow({ icon, headline, result, expanded, onToggle }: Props) {
  const { label, icon: ResultIcon, classes } = RESULT[result];

  return (
    <button
      type="button"
      aria-expanded={expanded}
      onClick={onToggle}
      className={cn(
        "grid min-h-[68px] w-full grid-cols-[40px_minmax(0,1fr)_auto_auto] items-center gap-3 px-4 py-3.5 text-left",
        !expanded && "border-b border-wire-2",
      )}
    >
      <span className="grid h-10 w-10 place-items-center rounded-full border-[1.5px] border-wire bg-surface">
        {icon}
      </span>
      <span className="text-[13.5px] font-semibold leading-snug text-text">{headline}</span>
      <span
        className={cn(
          "inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-[5px] text-[11px] font-bold",
          classes,
        )}
      >
        <ResultIcon size={11} strokeWidth={2.4} aria-hidden="true" />
        {label}
      </span>
      <ChevronDown
        size={12}
        aria-hidden="true"
        className={cn(
          "text-text-faint transition-transform duration-200",
          expanded && "rotate-180",
        )}
      />
    </button>
  );
}
