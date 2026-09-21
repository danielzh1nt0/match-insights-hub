import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Check, TriangleAlert } from "lucide-react";
import { AppHeader, Screen } from "@/components/ip/chrome";
import { Card, PrimaryButton, SecondaryButton } from "@/components/ip/primitives";
import { matchesDb } from "@/integrations/matches/client";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/processing")({
  validateSearch: (search: Record<string, unknown>): { id?: string } =>
    typeof search["id"] === "string" ? { id: search["id"] } : {},
  head: () => ({
    meta: [
      { title: "Analysing your match — Ipanema" },
      {
        name: "description",
        content: "Reading the pitch, finding players, following the ball — then writing your findings.",
      },
      { property: "og:title", content: "Analysing your match — Ipanema" },
      { property: "og:description", content: "About 30 minutes for a 45-minute half." },
       { property: "og:type", content: "website" },
       { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Processing,
});

function Processing() {
  const navigate = useNavigate();
  const { id } = Route.useSearch();
  const [row, setRow] = useState<{ status: string; duration_s: number | null } | null>(null);
  const [names, setNames] = useState<{ a: string; b: string } | null>(null);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    if (!id) return;
    let alive = true;
    const poll = async () => {
      const [{ data: m }, { data: l }] = await Promise.all([
        matchesDb.from("matches").select("id,status,duration_s").eq("id", id).maybeSingle(),
        matchesDb.from("match_labels").select("name_a,name_b").eq("match_id", id).maybeSingle(),
      ]);
      if (!alive) return;
      setChecked(true);
      if (m) setRow({ status: String((m as { status: string }).status), duration_s: (m as { duration_s: number | null }).duration_s });
      if (l) setNames({ a: String((l as { name_a: string | null }).name_a ?? "Your team"), b: String((l as { name_b: string | null }).name_b ?? "Opponent") });
    };
    void poll();
    const timer = setInterval(poll, 15_000);
    return () => {
      alive = false;
      clearInterval(timer);
    };
  }, [id]);

  const status = row?.status ?? (checked ? "missing" : "loading");
  const ready = status === "ready";
  const failed = status === "failed";
  const minutes = row?.duration_s ? Math.round(row.duration_s / 60) : null;
  const steps = [
    { label: "Video uploaded", done: status !== "loading" && status !== "missing" },
    { label: "Pitch set up for this ground", done: ready, note: "Once per ground. The first match at a new ground can take a few hours." },
    { label: "Players, ball and events analysed", done: ready },
    { label: "Findings written", done: ready },
  ];
  const active = steps.findIndex((x) => !x.done);

  return (
    <div className="min-h-screen bg-bg">
      <AppHeader backTo="/library" />
      <Screen className="tactical-grid min-h-[calc(100vh-64px)] pt-7 pb-16">
        <div className="mx-auto max-w-[560px]">
          <p className="section-kicker">Analysis pipeline</p>
          <h1 className="display mt-2 text-[30px] uppercase text-text">{failed ? "Analysis failed" : ready ? "Ready" : "Analysing"}</h1>
          {names && (
            <p className="mt-1 text-[13px] text-text-dim">
              {names.a} – {names.b}
              {minutes ? <> · <span className="num">{minutes} min</span> of video</> : null}
            </p>
          )}

          {status === "missing" ? (
            <Card className="mt-5 flex flex-col gap-3">
              <p className="text-[13px] text-text-dim">We can't find this upload. It may still be finishing — check the library in a minute.</p>
              <SecondaryButton className="h-12" onClick={() => navigate({ to: "/library" })}>Back to library</SecondaryButton>
            </Card>
          ) : failed ? (
            <Card className="mt-5 flex flex-col gap-3">
              <span className="flex items-center gap-2 text-[13.5px] font-semibold text-quality-bad">
                <TriangleAlert size={16} aria-hidden="true" />
                We couldn't analyse this match
              </span>
              <p className="text-[13px] leading-relaxed text-text-dim">The video is safely stored. We'll look at what went wrong and run it again.</p>
              <SecondaryButton className="h-12" onClick={() => navigate({ to: "/library" })}>Back to library</SecondaryButton>
            </Card>
          ) : (
            <>
              <Card className="mt-5 flex flex-col gap-1">
                {steps.map((s, i) => {
                  const isActive = i === active;
                  return (
                    <div key={s.label} className="flex items-start gap-3 border-b border-wire-2 py-3 last:border-0">
                      <span
                        className={cn(
                          "mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-[11px]",
                          s.done ? "border-quality-good bg-quality-good/15 text-quality-good" : isActive ? "border-cream text-cream" : "border-wire text-text-faint",
                        )}
                      >
                        {s.done ? <Check size={13} aria-hidden="true" /> : i + 1}
                      </span>
                      <span className="flex-1">
                        <span className={cn("block text-[13.5px]", s.done ? "text-text" : isActive ? "text-cream" : "text-text-faint")}>{s.label}</span>
                        {isActive && s.note && <span className="mt-0.5 block text-[11.5px] text-text-faint">{s.note}</span>}
                      </span>
                    </div>
                  );
                })}
              </Card>
              <p className="mt-3 text-[11.5px] text-text-faint">You can close this page. The match appears in your library and opens as soon as it's ready.</p>
              {ready && id && (
                <PrimaryButton block className="mt-4 h-12" onClick={() => navigate({ to: "/match/$matchId/insights", params: { matchId: id } })}>
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
