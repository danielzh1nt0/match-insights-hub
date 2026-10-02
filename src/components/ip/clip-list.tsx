import { Link } from "@tanstack/react-router";
import { ClipThumb } from "./clip-thumb";
import { Card, Pill } from "./primitives";
import type { ReelClip } from "@/lib/clips";
import { formatClock } from "@/lib/sample-data";

/**
 * The clip reel. Every clip is a real tracked moment at the timestamp the match
 * file gives it. Without `matchId` the clips are listed without links.
 *
 * A reel is the one screen where the picture matters more than the words, so
 * each row opens on its own frame rather than a play icon on an empty box.
 */
export function ClipList({
  clips,
  matchId,
  videoUrl,
  posters,
  paintFrames = false,
}: {
  clips: ReelClip[];
  matchId?: string;
  /** The signed match video, so each row can show its own frame. */
  videoUrl?: string | undefined;
  /** Thumbnails already read off the video, by timestamp. */
  posters?: Record<number, string> | undefined;
  /** Let the browser paint the frames, for buckets that refuse a pixel read. */
  paintFrames?: boolean;
}) {
  // Painting costs a media element per row, so only the opening stretch of a
  // long reel gets one.
  const PAINT_LIMIT = 24;
  if (clips.length === 0) {
    return (
      <Card>
        <p className="text-[13px] text-text-dim">
          No moments in this match file are worth a clip yet. Confirm some events on the match
          screen and they will appear here.
        </p>
      </Card>
    );
  }

  return (
    <>
      {clips.map((c, i) => (
        <Card key={c.id} className="flex items-center gap-3">
          {matchId ? (
            <Link
              to="/match/$matchId/match"
              params={{ matchId }}
              search={{ t: c.t }}
              aria-label={`Watch ${c.title}`}
              className="tap shrink-0 text-text-faint hover:text-cream"
            >
              <ClipThumb
                videoUrl={videoUrl}
                t={c.t}
                poster={posters?.[c.t]}
                paintFrame={paintFrames && i < PAINT_LIMIT}
                className="h-16 w-24"
                badgeSize={18}
              />
            </Link>
          ) : (
            <span className="num flex h-16 w-24 shrink-0 items-center justify-center bg-surface-2 text-[20px] text-text-faint">
              {i + 1}
            </span>
          )}
          <div className="min-w-0 flex-1">
            <span className="num block text-[12px] text-cream">{formatClock(c.t)}</span>
            <span className="block truncate text-[13.5px] text-text">{c.title}</span>
            <span className="mt-0.5 block truncate text-[11.5px] text-text-faint">{c.reason}</span>
          </div>
          <Pill>{c.tag}</Pill>
        </Card>
      ))}
    </>
  );
}
