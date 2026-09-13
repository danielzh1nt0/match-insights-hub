import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Check, RotateCcw, TriangleAlert } from "lucide-react";
import { AppHeader, Screen } from "@/components/ip/chrome";
import { Card, PrimaryButton, SecondaryButton } from "@/components/ip/primitives";
import { PROCESSING_STAGES, formatClock, matchTitle } from "@/lib/sample-data";
import { useApp } from "@/store/app-store";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/processing")({
  validateSearch: (search: Record<string, unknown>) => ({
    id: typeof search.id === "string" ? search.id : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Analysing your match — Ipanema" },
      {
        name: "description",
        content: "Reading the pitch, finding players, following the ball — then writing your findings.",
      },
      { property: "og:title", content: "Analysing your match — Ipanema" },
      { property: "og:description", content: "About 30 minutes for a 45-minute half." },
    ],
  }),
  component: Processing,
});

function Processing() {
  const navigate = useNavigate();
  const { id } = Route.useSearch();
  const matches = useApp((s) => s.matches);
  const setMatchStatus = useApp((s) => s.setMatchStatus);
  const match = matches.find((m) => m.id === id) ?? matches.find((m) => m.status === "processing") ?? matches[0];
  const failed = match?.status === "failed";

  const [stage, setStage] = useState(0);

  useEffect(() => {
    if (failed) return;
    if (stage >= PROCESSING_STAGES.length) {
      if (match) setMatchStatus(match.id, "ready");
      return;
    }
    const t = setTimeout(() => setStage((s) => s + 1), 1400);
    return () => clearTimeout(t);
  }, [stage, failed, match, setMatchStatus]);

  const done = !failed && stage >= PROCESSING_STAGES.length;

  return (
    <div className="min-h-screen bg-bg">
      <AppHeader backTo="/library" />
      <Screen className="pt-5 pb-16">
        <div className="mx-auto max-w-[560px]">
          <h1 className="display text-[26px] text-text">{failed ? "Analysis failed" : "Analysing"}</h1>
          {match && (
            <p className="mt-1 text-[13px] text-text-dim">
              {matchTitle(match)} · <span className="num">{formatClock(match.durationS)}</span> clip
            </p>
          )}

          {failed ? (
            <Card className="mt-5 flex flex-col gap-3">
              <span className="flex items-center gap-2 text-[13.5px] font-semibold text-quality-bad">
                <TriangleAlert size={16} aria-hidden="true" />
                We couldn't follow the ball
              </span>
              <p className="text-[13px] leading-relaxed text-text-dim">
                The camera moved too much in the second half, so we couldn't track players reliably. Upload a
                steadier angle, or retry — sometimes a second pass works.
              </p>
              <div className="flex gap-2">
                <PrimaryButton
                  className="h-12"
                  onClick={() => {
                    if (match) setMatchStatus(match.id, "processing");
                    setStage(0);
                  }}
                >
                  <RotateCcw size={15} aria-hidden="true" /> Retry
                </PrimaryButton>
                <SecondaryButton className="h-12" onClick={() => navigate({ to: "/library" })}>
                  Back to library
                </SecondaryButton>
              </div>
            </Card>
          ) : (
            <>
              <Card className="mt-5 flex flex-col gap-1">
                {PROCESSING_STAGES.map((s, i) => {
                  const complete = i < stage;
                  const active = i === stage;
                  return (
                    <div
                      key={s.label}
                      className="flex items-center gap-3 border-b border-wire-2 py-3 last:border-0"
                    >
                      <span
                        className={cn(
                          "flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-[11px]",
                          complete
                            ? "border-quality-good bg-quality-good/15 text-quality-good"
                            : active
                              ? "border-cream text-cream"
                              : "border-wire text-text-faint",
                        )}
                      >
                        {complete ? <Check size={13} aria-hidden="true" /> : i + 1}
                      </span>
                      <span
                        className={cn(
                          "flex-1 text-[13.5px]",
                          complete ? "text-text" : active ? "text-cream" : "text-text-faint",
                        )}
                      >
                        {s.label}
                      </span>
                      {complete && <span className="num text-[12px] text-text-faint">{s.seconds} s</span>}
                    </div>
                  );
                })}
              </Card>

              <p className="mt-3 text-[11.5px] text-text-faint">
                About 30 minutes for a 45-minute half. You can close this — we'll email you when it's ready.
              </p>

              {done && match && (
                <PrimaryButton
                  block
                  className="mt-4 h-12"
                  onClick={() => navigate({ to: "/match/$matchId/insights", params: { matchId: match.id } })}
                >
                  Open analysis
                </PrimaryButton>
              )}
            </>
          )}
        </div>
      </Screen>
    </div>
  );
}
