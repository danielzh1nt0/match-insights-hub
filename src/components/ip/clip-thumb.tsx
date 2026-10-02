import { Play } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * The frame a clip opens on.
 *
 * A play icon over an empty box is a promise that something is behind it; the
 * frame itself is the evidence. There are two ways to get one and the strip
 * picks whichever the storage bucket allows: a thumbnail read back off a canvas
 * (cheap, cached, one media element for the whole strip), or — where the pixels
 * cannot be read — the browser painting the file at that second for us, which
 * needs no permission but costs an element per tile.
 *
 * Either way the badge sits on top, so a tile reads as something to play rather
 * than as a picture.
 */
export function ClipThumb({
  videoUrl,
  t,
  poster,
  paintFrame = false,
  className,
  badgeSize = 15,
}: {
  videoUrl?: string | undefined;
  /** Seconds from kick-off. */
  t: number;
  /** A thumbnail already read off the video. */
  poster?: string | undefined;
  /** Let the browser paint the frame instead, for buckets that refuse a read. */
  paintFrame?: boolean;
  className?: string;
  badgeSize?: number;
}) {
  const painting = !poster && paintFrame && Boolean(videoUrl);
  const hasFrame = Boolean(poster) || painting;

  return (
    <span
      className={cn(
        "relative grid place-items-center overflow-hidden bg-surface-2 transition-colors",
        className,
      )}
    >
      {poster ? (
        <img src={poster} alt="" className="absolute inset-0 h-full w-full object-cover" />
      ) : (
        painting && (
          <video
            // A media fragment asks the browser to show the file at this
            // second. No pixels are read back, so no CORS header is needed.
            src={`${videoUrl}#t=${t}`}
            preload="metadata"
            muted
            playsInline
            tabIndex={-1}
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 h-full w-full object-cover"
          />
        )
      )}
      <span
        className={cn(
          "relative grid h-7 w-7 place-items-center",
          hasFrame && "bg-black/55 text-white",
        )}
      >
        <Play size={badgeSize} aria-hidden="true" />
      </span>
    </span>
  );
}
