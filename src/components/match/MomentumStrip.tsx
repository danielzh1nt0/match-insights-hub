import React from "react";

type Window = {
  t: number; // seconds from kick-off
  tiltA: number; // 0–1, share of possession in A's attacking half
};

type Props = {
  windows: Window[]; // one per 15-second window
  events: { t: number; type: "goal" | "turnover"; team: "A" | "B" }[];
  durationSeconds: number;
  currentTime: number;
  onSeek: (t: number) => void;
};

export function MomentumStrip({ windows, events, durationSeconds, currentTime, onSeek }: Props) {
  const trackRef = React.useRef<HTMLDivElement>(null);
  const at = (t: number) => (durationSeconds > 0 ? (t / durationSeconds) * 100 : 0);

  const handleTap = (e: React.MouseEvent) => {
    if (!trackRef.current) return;
    const rect = trackRef.current.getBoundingClientRect();
    const ratio = (e.clientX - rect.left) / rect.width;
    onSeek(Math.max(0, Math.min(durationSeconds, ratio * durationSeconds)));
  };

  return (
    <div className="mx-4 mt-3 rounded-[14px] border border-wire bg-surface p-3">
      <h2 className="display mb-2 text-[11px] uppercase tracking-[0.08em] text-text-dim">Field tilt over time</h2>

      <div
        ref={trackRef}
        onClick={handleTap}
        className="relative flex h-8 cursor-pointer overflow-hidden rounded-[6px] bg-wire"
      >
        {windows.map((w, i) => {
          const nextT = windows[i + 1]?.t ?? durationSeconds;
          return (
            <div key={`${w.t}-${i}`} className="relative h-full" style={{ width: `${at(nextT - w.t)}%` }}>
              <div className="absolute inset-x-0 top-0 bg-team-a" style={{ height: `${w.tiltA * 50}%` }} />
              <div className="absolute inset-x-0 bottom-0 bg-team-b" style={{ height: `${(1 - w.tiltA) * 50}%` }} />
            </div>
          );
        })}

        {events.map((event, i) =>
          event.type === "goal" ? (
            <span
              key={`${event.t}-${i}`}
              className="absolute top-1/2 h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rotate-45 border-[1.5px] border-ink bg-cream"
              style={{ left: `${at(event.t)}%` }}
              aria-hidden="true"
            />
          ) : (
            <span
              key={`${event.t}-${i}`}
              className="absolute inset-y-1 w-0.5 bg-[rgba(8,9,11,0.5)]"
              style={{ left: `${at(event.t)}%` }}
              aria-hidden="true"
            />
          ),
        )}

        <span
          className="pointer-events-none absolute inset-y-0 w-0.5 bg-cream"
          style={{ left: `${at(currentTime)}%` }}
          aria-hidden="true"
        />
      </div>
    </div>
  );
}
