import { Link } from "@tanstack/react-router";
import { Play } from "lucide-react";
import { Card, Pill } from "./primitives";
import type { Clip } from "@/lib/match-data";
import { formatClock } from "@/lib/sample-data";

/**
 * The clip reel. Each clip comes from a real moment in the analysis, so the tag
 * matches the finding it belongs to. Without `matchId` the clips are listed
 * without links, which is what a public share page needs.
 */
export function ClipList({ clips, matchId }: { clips: Clip[]; matchId?: string }) {
  if (clips.length === 0) {
    return (
      <Card>
        <p className="text-[13px] text-text-dim">Nothing stood out in this clip yet.</p>
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
              className="tap flex h-16 w-24 shrink-0 items-center justify-center rounded-[10px] bg-surface-2 text-text-faint hover:text-cream"
            >
              <Play size={18} aria-hidden="true" />
            </Link>
          ) : (
            <span className="num flex h-16 w-24 shrink-0 items-center justify-center rounded-[10px] bg-surface-2 text-[20px] text-text-faint">
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
