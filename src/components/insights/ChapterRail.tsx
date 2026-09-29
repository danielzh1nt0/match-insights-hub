import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { STORY_CHAPTERS } from "@/lib/story-chapters";

/**
 * The chapters of the story, as bubbles across the top of Insights.
 *
 * This is the first thing on the screen because it is the first thing a coach
 * wants: tap a chapter, watch it. Each bubble carries a drawing made from this
 * match, not an icon.
 */
export function ChapterRail({
  matchId,
  figures,
}: {
  matchId: string;
  /** One small drawing per chapter id, in the order the chapters run. */
  figures: Partial<Record<string, ReactNode>>;
}) {
  return (
    <nav
      aria-label="Match story chapters"
      className="-mx-4 flex gap-3 overflow-x-auto px-4 pb-1 [scrollbar-width:none] md:mx-0 md:px-0 [&::-webkit-scrollbar]:hidden"
    >
      {STORY_CHAPTERS.map((chapter) => (
        <Link
          key={chapter.id}
          to="/match/$matchId/story"
          params={{ matchId }}
          search={{ chapter: chapter.id }}
          className="flex w-[78px] shrink-0 flex-col items-center gap-1.5"
        >
          <span className="grid h-[70px] w-[70px] place-items-center rounded-full bg-cream p-[3px]">
            <span
              className="grid h-full w-full place-items-center overflow-hidden rounded-full border-[3px] border-bg"
              style={{
                background: "linear-gradient(180deg, var(--pitch-top), var(--pitch-bottom))",
              }}
            >
              {figures[chapter.id] ?? null}
            </span>
          </span>
          <span className="text-center text-[11px] font-semibold leading-tight text-text-dim">
            {chapter.nav}
          </span>
        </Link>
      ))}
    </nav>
  );
}
