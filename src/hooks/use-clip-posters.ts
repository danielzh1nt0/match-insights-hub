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
 * Grabbed frames are kept for the session under the video's path rather than
 * its signed URL, so they survive the signature being renewed.
 */
const cache = new Map<string, string>();

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
  const wanted = timestamps.join(",");

  useEffect(() => {
    if (!enabled || !videoUrl) return;
    const times = wanted ? wanted.split(",").map(Number) : [];
    if (times.length === 0) return;

    const base = pathKey(videoUrl);
    const seeded: Record<number, string> = {};
    for (const t of times) {
      const hit = cache.get(`${base}|${t}`);
      if (hit) seeded[t] = hit;
    }
    if (Object.keys(seeded).length > 0) setPosters((prev) => ({ ...prev, ...seeded }));

    const missing = times.filter((t) => !cache.has(`${base}|${t}`));
    if (missing.length === 0) return;

    let cancelled = false;
    // Once a grab fails there is no point asking for the rest: either the
    // bucket sends no CORS header, or the file will not decode here.
    let failed = false;

    const video = document.createElement("video");
    video.crossOrigin = "anonymous";
    video.preload = "metadata";
    video.muted = true;
    video.playsInline = true;
    const canvas = document.createElement("canvas");

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
      if (video.readyState < 1 && !(await once("loadedmetadata"))) return;

      for (const t of missing) {
        if (cancelled || failed) break;
        video.currentTime = t;
        if (!(await once("seeked"))) {
          failed = true;
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
          const frame = canvas.toDataURL("image/jpeg", 0.62);
          cache.set(`${base}|${t}`, frame);
          if (!cancelled) setPosters((prev) => ({ ...prev, [t]: frame }));
        } catch {
          // A tainted canvas means the bucket answered without a CORS header.
          // The tiles keep their clock faces; nothing else is affected.
          failed = true;
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

  return posters;
}
