import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Check, Hourglass, Target, TriangleAlert } from "lucide-react";
import { AppHeader, Screen } from "@/components/ip/chrome";
import { PrimaryButton, SecondaryButton } from "@/components/ip/primitives";
import { Crest, Eyebrow } from "@/components/ip/touchline";
import { MatchBuild } from "@/components/registration/processing-visuals";
import { shortTeamCode } from "@/components/team/TeamToken";
import { crestForTeam } from "@/lib/team-crests";
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
        content:
          "Reading the pitch, finding players, following the ball — then writing your findings.",
      },
      { property: "og:title", content: "Analysing your match — Ipanema" },
      { property: "og:description", content: "About 30 minutes for a 45-minute half." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Processing,
});

/**
 * The pipeline, in the coach's language.
 *
 * Each step says what it produces, not what it runs. The backend reports a
 * single status rather than per-step telemetry, so a step is marked done only
 * when the whole analysis is done — the screen never claims to know more about
 * its own progress than it does.
 */
const STEPS = [
  {
    name: "Finding the players",
    detail: "Every body on the pitch, locked to a position on the grass.",
  },
  {
    name: "Working out the teams",
    detail: "Separating the two kits, so a shirt colour becomes a side.",
  },
  {
    name: "Following the ball",
    detail: "Building possession sequences and the passes inside them.",
  },
  {
    name: "Finding the moments",
    detail: "Tagging pressing triggers, shots and transitions worth watching.",
  },
] as const;

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
      if (m)
        setRow({
          status: String((m as { status: string }).status),
          duration_s: (m as { duration_s: number | null }).duration_s,
        });
      if (l)
        setNames({
          a: String((l as { name_a: string | null }).name_a ?? "Your team"),
          b: String((l as { name_b: string | null }).name_b ?? "Opponent"),
        });
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

  const phase = ready ? 4 : failed ? -1 : status === "loading" ? -1 : 2;
  const stage = ready ? 3 : failed ? 1 : 1;

  const teamA = names
    ? {
        name: names.a,
        shortCode: shortTeamCode(names.a),
        kitColour: "var(--team-a)",
        ...(crestForTeam(names.a) ? { crestUrl: crestForTeam(names.a)! } : {}),
      }
    : null;
  const teamB = names
    ? {
        name: names.b,
        shortCode: shortTeamCode(names.b),
        kitColour: "var(--team-b)",
        ...(crestForTeam(names.b) ? { crestUrl: crestForTeam(names.b)! } : {}),
      }
    : null;

  return (
    <div className="min-h-screen bg-bg">
      <AppHeader backTo="/library" />
      <Screen className="pb-16 pt-6">
        {/* The fixture, and where it has got to. */}
        <div className="border border-wire bg-surface p-4 sm:p-5">
          <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-4">
            <div className="min-w-0">
              <Eyebrow>
                Match pipeline
                {minutes ? ` · ${minutes} min of video` : ""}
              </Eyebrow>
              <h1 className="mt-2 flex flex-wrap items-center gap-3">
                {teamA && <Crest team={teamA} size={30} />}
                <span className="display-i text-[clamp(26px,4.4vw,40px)] leading-none text-text-bright">
                  {names ? (
                    <>
                      {names.a} <span className="text-text-faint">vs</span> {names.b}
                    </>
                  ) : (
                    "Your match"
                  )}
                </span>
                {teamB && <Crest team={teamB} size={30} />}
              </h1>
            </div>

            <div className="rule-x flex shrink-0 border border-wire" aria-label="Pipeline stage">
              {["Uploading", "Processing", "Ready"].map((label, i) => (
                <span
                  key={label}
                  aria-current={i === stage ? "step" : undefined}
                  className={cn(
                    "label-sm flex h-10 items-center px-3.5",
                    i === stage
                      ? "bg-surface-2 text-text-bright"
                      : i < stage
                        ? "text-text-dim"
                        : "text-text-faint",
                  )}
                >
                  {i + 1}. {label}
                </span>
              ))}
            </div>
          </div>
        </div>

        {status === "missing" ? (
          <Notice
            title="We can't find this upload"
            body="It may still be finishing. Check your matches in a minute — it appears there as soon as the pipeline picks it up."
            onBack={() => navigate({ to: "/library" })}
          />
        ) : failed ? (
          <Notice
            alarm
            title="We couldn't analyse this match"
            body="The video is safely stored. We'll look at what went wrong and run it again — you don't need to upload it a second time."
            onBack={() => navigate({ to: "/library" })}
          />
        ) : (
          <>
            <div className="mt-4 flex flex-wrap items-center justify-between gap-x-6 gap-y-2 border border-wire bg-surface px-4 py-3 sm:px-5">
              <p className="flex items-center gap-2.5">
                <span
                  aria-hidden="true"
                  className={cn(
                    "h-2 w-2 shrink-0 rounded-full",
                    ready ? "bg-cream" : "stage-pulse bg-cream",
                  )}
                />
                <span className="display-i text-[18px] leading-none text-text-bright">
                  {ready ? "Analysis complete" : "Tactical extraction in progress"}
                </span>
              </p>
              <p className="text-[12.5px] text-text-dim">
                {ready
                  ? "Every finding is written and the moments are tagged."
                  : "You can close this page — the work carries on, and the match opens from your library when it's done."}
              </p>
            </div>

            <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)] lg:items-start">
              <section className="border border-wire bg-surface" aria-labelledby="engine-view">
                <header className="flex flex-wrap items-baseline justify-between gap-x-5 gap-y-1 p-4 sm:p-5">
                  <p className="label-sm text-text-faint">Spatial engine</p>
                  <h2 id="engine-view" className="text-[15px] font-semibold text-text-bright">
                    {ready ? "Match reconstructed" : STEPS[Math.min(phase, 3)]?.name}
                  </h2>
                </header>
                <div className="px-4 pb-5 sm:px-5">
                  <MatchBuild
                    phase={phase}
                    pct={null}
                    status={ready ? "complete" : failed ? "failed" : "running"}
                  />
                </div>
              </section>

              <section className="border border-wire bg-surface" aria-labelledby="pipeline-steps">
                <header className="flex items-baseline justify-between gap-3 border-b border-wire p-4 sm:p-5">
                  <h2 id="pipeline-steps" className="text-[15px] font-semibold text-text-bright">
                    Processing pipeline
                  </h2>
                  <span className="label-xs text-text-faint">{STEPS.length} steps</span>
                </header>
                <ol className="rule-y">
                  {STEPS.map((step, i) => {
                    const done = ready;
                    const active = !ready && i === Math.min(phase, STEPS.length - 1);
                    return (
                      <li
                        key={step.name}
                        className={cn("flex gap-3 p-4 sm:p-5", active && "bg-surface-2")}
                      >
                        <span
                          aria-hidden="true"
                          className={cn(
                            "mt-0.5 grid h-5 w-5 shrink-0 place-items-center border",
                            done
                              ? "border-positive bg-positive text-ink"
                              : active
                                ? "border-accent-sea text-accent-sea"
                                : "border-wire text-text-faint",
                          )}
                        >
                          {done ? (
                            <Check size={12} />
                          ) : active ? (
                            <Target size={11} />
                          ) : (
                            <Hourglass size={11} />
                          )}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="flex items-baseline justify-between gap-3">
                            <span
                              className={cn(
                                "text-[14px] font-semibold",
                                done || active ? "text-text-bright" : "text-text-faint",
                              )}
                            >
                              {step.name}
                            </span>
                            <span className="label-xs shrink-0 text-text-faint">
                              {done ? "Done" : active ? "Active" : "Queued"}
                            </span>
                          </span>
                          <span className="mt-1 block text-[12.5px] leading-snug text-text-dim">
                            {step.detail}
                          </span>
                        </span>
                      </li>
                    );
                  })}
                </ol>

                <div className="border-t border-wire p-4 sm:p-5">
                  <p className="label-xs text-text-faint">Touchline note</p>
                  <p className="mt-2 text-[12.5px] leading-snug text-text-dim">
                    The first match at a new ground takes longer, because the pitch has to be mapped
                    once before anything can be measured on it. After that it is about thirty
                    minutes for a forty-five minute half.
                  </p>
                  {ready && id && (
                    <PrimaryButton
                      block
                      className="mt-4"
                      onClick={() =>
                        navigate({ to: "/match/$matchId/insights", params: { matchId: id } })
                      }
                    >
                      Open the analysis
                    </PrimaryButton>
                  )}
                </div>
              </section>
            </div>
          </>
        )}
      </Screen>
    </div>
  );
}

function Notice({
  title,
  body,
  onBack,
  alarm,
}: {
  title: string;
  body: string;
  onBack: () => void;
  alarm?: boolean;
}) {
  return (
    <div className="mt-4 border border-wire bg-surface p-5">
      <p
        className={cn(
          "flex items-center gap-2 text-[15px] font-semibold",
          alarm ? "text-reaction-bad" : "text-text-bright",
        )}
      >
        {alarm && <TriangleAlert size={16} aria-hidden="true" />}
        {title}
      </p>
      <p className="mt-2 max-w-[62ch] text-[13px] leading-relaxed text-text-dim">{body}</p>
      <SecondaryButton className="mt-4" onClick={onBack}>
        Back to matches
      </SecondaryButton>
    </div>
  );
}
