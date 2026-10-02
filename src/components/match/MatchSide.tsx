import { useMemo, type ReactNode } from "react";
import { cn } from "@/lib/utils";

export type SideTab = "feed" | "clips";

/**
 * The column beside the video, in the prototype's shape.
 *
 * Two tabs, both built from the match file: the feed of every moment as it
 * happens, and the clips the pipeline found worth showing. It sticks beside
 * the player on a desktop and drops under the controls on a phone.
 */
export function MatchSide({
  tab,
  onTab,
  clipCount,
  children,
}: {
  tab: SideTab;
  onTab: (tab: SideTab) => void;
  clipCount: number;
  children: ReactNode;
}) {
  const tabs = useMemo(
    () => [
      { key: "feed" as const, label: "Feed" },
      { key: "clips" as const, label: clipCount > 0 ? `Clips · ${clipCount}` : "Clips" },
    ],
    [clipCount],
  );

  return (
    <aside className="flex min-h-0 flex-col min-[1060px]:sticky min-[1060px]:top-4 min-[1060px]:max-h-[calc(100vh-6rem)]">
      <div
        className="flex shrink-0 gap-[2px] border border-wire bg-surface p-[3px]"
        role="tablist"
        aria-label="Match panel"
      >
        {tabs.map((t) => (
          <button
            key={t.key}
            type="button"
            role="tab"
            aria-selected={tab === t.key}
            onClick={() => onTab(t.key)}
            className={cn(
              "min-h-10 flex-1 text-[12px] font-bold uppercase tracking-[0.04em] transition-colors",
              tab === t.key ? "bg-surface-3 text-text" : "text-text-faint hover:text-text",
            )}
          >
            {t.label}
          </button>
        ))}
      </div>
      <div className="mt-2.5 min-h-0 flex-1 overflow-y-auto pr-0.5">{children}</div>
    </aside>
  );
}

/** The sticky "1st half · 14" band that breaks the feed into halves. */
export function FeedHeading({ label, trailing }: { label: string; trailing?: ReactNode }) {
  return (
    <div className="sticky top-0 z-[2] flex items-center justify-between bg-bg px-0.5 py-2 text-[11px] font-bold uppercase tracking-[0.08em] text-text-faint">
      <span>{label}</span>
      {trailing !== undefined && <span>{trailing}</span>}
    </div>
  );
}
