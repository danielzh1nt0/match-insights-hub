import { Link } from "@tanstack/react-router";
import type { ComponentType } from "react";
import { CalendarCheck, Goal, MoveRight, Target, Users } from "lucide-react";
import { STORY_CHAPTERS, type ChapterId } from "@/lib/story-chapters";
import { cn } from "@/lib/utils";

export type ChapterCell = {
  /** The bold line: what this chapter says, in a handful of words. */
  title: string;
  /** The grey line under it. One short clause, never a sentence. */
  sub: string;
  /** Set on the chapter that carries the match's main problem. */
  flagged?: boolean;
};

const ICONS: Record<ChapterId, ComponentType<{ size?: number; strokeWidth?: number }>> = {
  score: Goal,
  strength: MoveRight,
  player: Users,
  improve: Target,
  verdict: CalendarCheck,
};

/**
 * The story of the match as five numbered cells across the top of Insights.
 *
 * It is the first thing on the screen because it is the shape of the whole
 * debrief: result, what we did, who did it, what went wrong, what we do about
 * it on Tuesday. One ruled strip rather than five floating cards — the coach
 * reads it as a sequence, and tapping a cell opens that chapter as a story.
 */
export function ChapterRail({
  matchId,
  cells,
}: {
  matchId: string;
  cells: Partial<Record<ChapterId, ChapterCell>>;
}) {
  return (
    <nav
      aria-label="Match story chapters"
      className="rule-x -mx-4 grid grid-flow-col auto-cols-[minmax(230px,1fr)] overflow-x-auto border-y border-wire [scrollbar-width:none] md:mx-0 md:auto-cols-auto md:grid-flow-row md:grid-cols-5 md:border-x [&::-webkit-scrollbar]:hidden"
    >
      {STORY_CHAPTERS.map((chapter, i) => {
        const cell = cells[chapter.id];
        if (!cell) return null;
        const Icon = ICONS[chapter.id];
        return (
          <Link
            key={chapter.id}
            to="/match/$matchId/story"
            params={{ matchId }}
            search={{ chapter: chapter.id }}
            className={cn(
              "group flex min-w-0 flex-col gap-1 border-t-2 p-4 transition-colors",
              cell.flagged
                ? "border-t-reaction-bad bg-surface-2"
                : "border-t-transparent bg-surface hover:bg-surface-2",
            )}
          >
            <span className="flex items-center justify-between gap-2 text-accent-sea">
              <span className="label-xs text-text-faint">
                {String(i + 1).padStart(2, "0")} · {chapter.kind}
              </span>
              {cell.flagged ? (
                <span
                  aria-label="Needs attention"
                  className="h-1.5 w-1.5 shrink-0 rounded-full bg-reaction-bad"
                />
              ) : (
                <Icon size={15} strokeWidth={1.75} aria-hidden="true" />
              )}
            </span>
            <span className="truncate text-[14px] font-semibold text-text-bright">
              {cell.title}
            </span>
            <span className="truncate text-[11.5px] text-text-faint">{cell.sub}</span>
          </Link>
        );
      })}
    </nav>
  );
}
