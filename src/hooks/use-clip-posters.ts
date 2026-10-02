import { useEffect, useState } from "react";

/**
 * A real frame from each clip.
 *
 * A tile showing a play icon is a promise that something is behind it; a tile
 * showing the actual frame is the evidence itself. The match video is one file
 * with byte ranges, so a frame costs a seek and a range request rather than a
 * second copy of the video — we pull one per visible tile, in order, and draw
 * it to a canvas.
 *
 * Drawing a frame means reading the pixels back, and a browser only allows that
 * when the file arrived with a CORS header. Storage buckets often do not send
 * one, so this reports `blocked` when the read is refused and the strip falls
 * back to letting the browser paint the frame itself, which needs no such
 * permission. One cheap element and a cached thumbnail where it is allowed, a
 * heavier but universal path where it is not.
 *
 * Grabbed frames are kept for the session under the video's path rather than
 * its signed URL, so they survive the signature being renewed.
 */
const cache = new Map<string, string>();

/** Paths whose bucket refused a pixel read — never worth a second attempt. */
const blockedPaths = new Set<string>();

/** The signature rotates hourly; the path does not. */
function pathKey(url: string) {
  try {
    const parsed = new URL(url);
    return parsed.origin + parsed.pathname;
  } catch {
    return url;
  }
}

const POSTER_WIDTH = 240;
const SEEK_TIMEOUT_MS = 6000;

export function useClipPosters(
  videoUrl: string | undefined,
  timestamps: number[],
  /** Off until the strip is on screen — a closed drawer should cost nothing. */
  enabled: boolean,
) {
  const [posters, setPosters] = useState<Record<number, string>>({});
  const [blocked, setBlocked] = useState(false);
  const wanted = timestamps.join(",");

  useEffect(() => {
    if (!enabled || !videoUrl) return;
    const times = wanted ? wanted.split(",").map(Number) : [];
    if (times.length === 0) return;

    const base = pathKey(videoUrl);
    if (blockedPaths.has(base)) {
      setBlocked(true);
      return;
    }

    const seeded: Record<number, string> = {};
    for (const t of times) {
      const hit = cache.get(`${base}|${t}`);
      if (hit) seeded[t] = hit;
    }
    if (Object.keys(seeded).length > 0) setPosters((prev) => ({ ...prev, ...seeded }));

    const missing = times.filter((t) => !cache.has(`${base}|${t}`));
    if (missing.length === 0) return;

    let cancelled = false;

    const video = document.createElement("video");
    video.crossOrigin = "anonymous";
    video.preload = "metadata";
    video.muted = true;
    video.playsInline = true;
    const canvas = document.createElement("canvas");

    /** Give up on this bucket for the rest of the session. */
    const giveUp = () => {
      blockedPaths.add(base);
      if (!cancelled) setBlocked(true);
    };

    const once = (event: string) =>
      new Promise<boolean>((resolve) => {
        const ok = () => {
          cleanup();
          resolve(true);
        };
        const bad = () => {
          cleanup();
          resolve(false);
        };
        const timer = window.setTimeout(bad, SEEK_TIMEOUT_MS);
        function cleanup() {
          window.clearTimeout(timer);
          video.removeEventListener(event, ok);
          video.removeEventListener("error", bad);
        }
        video.addEventListener(event, ok, { once: true });
        video.addEventListener("error", bad, { once: true });
      });

    const run = async () => {
      video.src = videoUrl;

      // Asking for the file with CORS is itself the test: without the header
      // the load fails outright and nothing below is reachable.
      if (video.readyState < 1 && !(await once("loadedmetadata"))) {
        giveUp();
        return;
      }

      for (const t of missing) {
        if (cancelled) break;
        video.currentTime = t;
        if (!(await once("seeked"))) {
          giveUp();
          break;
        }
        if (cancelled) break;
        try {
          const ratio =
            video.videoWidth > 0 && video.videoHeight > 0
              ? video.videoHeight / video.videoWidth
              : 9 / 16;
          canvas.width = POSTER_WIDTH;
          canvas.height = Math.round(POSTER_WIDTH * ratio);
          const ctx = canvas.getContext("2d");
          if (!ctx) break;
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          // Throws when the canvas is tainted, which is the bucket answering
          // without a CORS header on a request the browser still allowed.
          const frame = canvas.toDataURL("image/jpeg", 0.62);
          cache.set(`${base}|${t}`, frame);
          if (!cancelled) setPosters((prev) => ({ ...prev, [t]: frame }));
        } catch {
          giveUp();
          break;
        }
      }
    };

    void run();

    return () => {
      cancelled = true;
      video.removeAttribute("src");
      try {
        video.load();
      } catch {
        /* teardown only */
      }
    };
  }, [videoUrl, wanted, enabled]);

  return { posters, blocked };
}
