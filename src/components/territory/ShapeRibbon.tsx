import React from "react";

type Point = {
  t: number; // seconds from kick-off
  length: number; // block length metres
  width: number; // block width metres
};

type Props = {
  teamColour: string;
  timeline: Point[];
  durationSeconds: number;
  currentTime: number;
  onSeek: (t: number) => void;
  medianLength: number;
};

export function ShapeRibbon({ teamColour, timeline, durationSeconds, currentTime, onSeek, medianLength }: Props) {
  const trackRef = React.useRef<HTMLDivElement>(null);
  const maxLength = Math.max(...timeline.map((p) => p.length), 60);

  const toPath = (key: "length" | "width") => {
    const points = timeline.map((p) => {
      const x = (p.t / durationSeconds) * 340;
      return { x, yTop: 60 - (p[key] / maxLength) * 30, yBot: 60 + (p[key] / maxLength) * 30 };
    });
    const top = points.map((p) => `${p.x},${p.yTop}`).join(" L");
    const bot = points.slice().reverse().map((p) => `${p.x},${p.yBot}`).join(" L");
    return `M${top} L${bot} Z`;
  };

  const innerLine = timeline
    .map((p, i) => `${i === 0 ? "M" : "L"}${(p.t / durationSeconds) * 340},${60 - (p.width / maxLength) * 20}`)
    .join(" ");

  return (
    <div className="mx-4 mt-3.5 overflow-hidden rounded-[14px] border border-wire bg-surface">
      <div className="px-4 pb-1.5 pt-3.5">
        <h2 className="display text-[17px] uppercase text-cream">How compact were we?</h2>
      </div>
      <p className="px-4 pb-3 text-[11.5px] text-text-faint">
        Thicker ribbon = we were stretched further front-to-back. The thin inner line is width.
      </p>

      <div
        ref={trackRef}
        role="button"
        tabIndex={0}
        aria-label="Seek using compactness timeline"
        onClick={(event) => {
          const rect = trackRef.current?.getBoundingClientRect();
          if (rect) onSeek(((event.clientX - rect.left) / rect.width) * durationSeconds);
        }}
        onKeyDown={(event) => {
          if (event.key === "ArrowLeft") onSeek(Math.max(0, currentTime - 15));
          if (event.key === "ArrowRight") onSeek(Math.min(durationSeconds, currentTime + 15));
        }}
        className="relative cursor-pointer px-4 pb-3"
      >
        <svg viewBox="0 0 340 120" preserveAspectRatio="none" className="h-[60px] w-full" aria-hidden="true">
          <line x1="0" y1="60" x2="340" y2="60" stroke="var(--wire)" strokeWidth="1" />
          <path d={toPath("length")} fill={teamColour} fillOpacity="0.4" />
          <path d={innerLine} fill="none" stroke="var(--cream)" strokeOpacity="0.7" strokeWidth="1.5" />
        </svg>
        <span
          className="pointer-events-none absolute bottom-3 top-0 w-0.5 bg-cream"
          style={{ left: `calc(16px + ${(currentTime / durationSeconds) * 100}% * (100% - 32px) / 100%)` }}
          aria-hidden="true"
        />
      </div>

      <div className="flex justify-between px-4 text-[10px] font-semibold text-text-faint">
        {["0", "15", "30", "45", "60", "75", "90"].map((m) => (
          <span key={m}>{m}&apos;</span>
        ))}
      </div>

      <div className="mt-3 flex items-center justify-between border-t border-wire-2 px-4 py-3 text-[10.5px] text-text-faint">
        <span>Whole match</span>
        <span>Median {medianLength} m long</span>
      </div>
    </div>
  );
}
