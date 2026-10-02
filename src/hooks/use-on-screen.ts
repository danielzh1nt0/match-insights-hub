import { useEffect, useRef, useState } from "react";

/**
 * Whether a node has been on screen yet.
 *
 * Used to hold back the work a clip strip does — frame grabs, range requests —
 * until the strip is actually visible. Several findings each carry their own
 * strip and two of them sit inside closed drawers, so without this a single
 * page load would pull frames for a hundred moments nobody has looked at.
 *
 * Latches once seen: scrolling back up should not re-run the work.
 */
export function useOnScreen<T extends HTMLElement>(margin = "200px") {
  const ref = useRef<T | null>(null);
  const [seen, setSeen] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node || seen) return;
    if (typeof IntersectionObserver === "undefined") {
      setSeen(true);
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setSeen(true);
          observer.disconnect();
        }
      },
      { rootMargin: margin },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [seen, margin]);

  return { ref, seen } as const;
}
