import { useEffect, useMemo, useRef, useState } from "react";
import { fetchFrameChunk, type Frame, type MatchDataFile, type MatchFiles } from "@/lib/match-source";

/**
 * Full matches keep their frames in 5-minute files. This loads the file the video is in plus the next one, and lets go of
 * files you've moved away from, so a 100-minute match plays on a phone. Clips with frames inline are returned unchanged.
 */
export function useFrameChunks(files: MatchFiles | undefined, file: MatchDataFile | undefined, clock: number): MatchDataFile | undefined {
  const chunks = file?.frame_chunks;
  const [loaded, setLoaded] = useState<Record<string, Frame[]>>({});
  const inflight = useRef(new Set<string>());
  const neededRef = useRef<string[]>([]);
  const loadedKeys = useRef(new Set<string>());

  const index = useMemo(() => {
    if (!chunks?.length) return -1;
    const hit = chunks.findIndex((c) => clock >= c.t_start - 0.5 && clock <= c.t_end + 0.5);
    if (hit >= 0) return hit;
    return clock < (chunks[0]?.t_start ?? 0) ? 0 : chunks.length - 1;
  }, [chunks, clock]);

  const neededKey = useMemo(() => {
    if (!chunks?.length || index < 0) return "";
    return [index, index + 1].filter((i) => i < chunks.length).map((i) => chunks[i]!.key).join(",");
  }, [chunks, index]);

  useEffect(() => {
    if (!files || !neededKey) return;
    const needed = neededKey.split(",");
    neededRef.current = needed;
    setLoaded((prev) => {
      const kept: Record<string, Frame[]> = {};
      for (const key of needed) if (prev[key]) kept[key] = prev[key];
      loadedKeys.current = new Set(Object.keys(kept));
      return Object.keys(kept).length === Object.keys(prev).length ? prev : kept;
    });
    for (const key of needed) {
      if (inflight.current.has(key) || loadedKeys.current.has(key)) continue;
      inflight.current.add(key);
      fetchFrameChunk(files, key)
        .then((frames) => {
          setLoaded((prev) => {
            if (!neededRef.current.includes(key)) return prev;
            loadedKeys.current.add(key);
            return { ...prev, [key]: frames };
          });
        })
        .catch(() => undefined)
        .finally(() => inflight.current.delete(key));
    }
  }, [files, neededKey]);

  return useMemo(() => {
    if (!file || !chunks?.length) return file;
    const order = new Map(chunks.map((c, i) => [c.key, i]));
    const frames = Object.keys(loaded)
      .sort((a, b) => (order.get(a) ?? 0) - (order.get(b) ?? 0))
      .flatMap((key) => loaded[key] ?? []);
    return { ...file, frames };
  }, [file, chunks, loaded]);
}
