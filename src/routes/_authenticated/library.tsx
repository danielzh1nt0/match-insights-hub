import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getAccount } from "@/lib/profile.functions";
import { Plus, Search, Video } from "lucide-react";
import { AppHeader, Screen } from "@/components/ip/chrome";
import { Input, PrimaryButton } from "@/components/ip/primitives";
import { Crest } from "@/components/ip/touchline";
import { matchTitle, type LibraryMatch } from "@/lib/sample-data";
import { cn } from "@/lib/utils";
import { StoryLauncher } from "@/components/ip/story-launcher";
import { crestForTeam } from "@/lib/team-crests";
import { shortTeamCode } from "@/components/team/TeamToken";
import { matchesDb } from "@/integrations/matches/client";
import { fetchMatches, toLibraryMatch } from "@/lib/match-source";

export const Route = createFileRoute("/_authenticated/library")({
  head: () => ({
    meta: [
      { title: "Matches — Ipanema" },
      {
        name: "description",
        content: "Every match you've uploaded, with the finding that came out of it.",
      },
      { property: "og:title", content: "Matches — Ipanema" },
      { property: "og:description", content: "Choose a match to open its analysis workspace." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: LibraryPage,
});

type StatusTab = "all" | "ready" | "processing";

function LibraryPage() {
  const [query, setQuery] = useState("");
  const [competition, setCompetition] = useState<string | null>(null);
  const [tab, setTab] = useState<StatusTab>("all");
  const navigate = useNavigate();
  const fetchAccount = useServerFn(getAccount);
  const queryClient = useQueryClient();
  const { data: account } = useQuery({ queryKey: ["account"], queryFn: () => fetchAccount() });
  const {
    data: items,
    isPending,
    error,
  } = useQuery({ queryKey: ["matches"], queryFn: fetchMatches });

  useEffect(() => {
    if (account && !account.profile.onboarded) {
      navigate({ to: "/onboarding", replace: true });
    }
  }, [account, navigate]);

  useEffect(() => {
    const channel = matchesDb
      .channel("library-matches")
      .on("postgres_changes", { event: "*", schema: "public", table: "matches" }, () => {
        queryClient.invalidateQueries({ queryKey: ["matches"] });
      })
      .subscribe();
    return () => {
      matchesDb.removeChannel(channel);
    };
  }, [queryClient]);

  const matches = useMemo(() => (items ?? []).map(toLibraryMatch), [items]);

  const competitions = useMemo(() => {
    const set = new Set<string>();
    matches.forEach((m) => m.competition && set.add(m.competition));
    return [...set];
  }, [matches]);

  const counts = useMemo(
    () => ({
      all: matches.length,
      ready: matches.filter((m) => m.status === "ready").length,
      processing: matches.filter((m) => m.status === "processing").length,
    }),
    [matches],
  );

  /** The season record, from the matches that have a result to read. */
  const record = useMemo(() => {
    let won = 0;
    let drawn = 0;
    let lost = 0;
    for (const match of matches) {
      const result = resultOf(match);
      if (result?.key === "W") won += 1;
      else if (result?.key === "D") drawn += 1;
      else if (result?.key === "L") lost += 1;
    }
    return { won, drawn, lost };
  }, [matches]);

  const visible = matches.filter((m) => {
    const q = query.trim().toLowerCase();
    const matchesQuery =
      !q || matchTitle(m).toLowerCase().includes(q) || m.competition.toLowerCase().includes(q);
    const matchesCompetition = !competition || m.competition === competition;
    const matchesTab = tab === "all" || m.status === tab;
    return matchesQuery && matchesCompetition && matchesTab;
  });

  const clubName = account?.profile?.clubName || null;

  return (
    <div className="min-h-screen bg-bg">
      <AppHeader />
      <Screen className="pb-16 pt-6">
        <p className="label-sm flex flex-wrap items-center gap-x-2 text-text-faint">
          {clubName && (
            <>
              <span>{clubName}</span>
              <span aria-hidden="true">/</span>
            </>
          )}
          <span>{new Date().getFullYear()} season</span>
          <span aria-hidden="true">/</span>
          <span className="text-text-dim">Touchline log</span>
        </p>

        <div className="mt-3 flex flex-wrap items-end justify-between gap-x-6 gap-y-4">
          <h1 className="display-i flex items-baseline gap-3 text-[clamp(30px,5vw,42px)] leading-none text-text-bright">
            Matches
            {!isPending && (
              <span className="num-flat text-[12px] font-semibold tracking-normal text-text-faint">
                {counts.all} {counts.all === 1 ? "fixture" : "fixtures"} recorded
              </span>
            )}
          </h1>

          <div className="flex flex-wrap items-center gap-3">
            <div
              className="rule-x flex border border-wire"
              role="tablist"
              aria-label="Match status"
            >
              {(
                [
                  ["all", "All", counts.all],
                  ["ready", "Analysed", counts.ready],
                  ["processing", "Processing", counts.processing],
                ] as const
              ).map(([key, label, count]) => (
                <button
                  key={key}
                  type="button"
                  role="tab"
                  aria-selected={tab === key}
                  onClick={() => setTab(key)}
                  className={cn(
                    "label-sm flex h-11 items-center gap-1.5 px-4 transition-colors",
                    tab === key
                      ? "bg-surface-2 text-text-bright"
                      : "text-text-faint hover:bg-surface hover:text-text",
                  )}
                >
                  {label}
                  <span className="num-flat tracking-normal opacity-70">({count})</span>
                </button>
              ))}
            </div>

            <Link to="/upload">
              <PrimaryButton>
                <Plus size={15} aria-hidden="true" />
                Upload a match
              </PrimaryButton>
            </Link>
          </div>
        </div>

        {isPending && (
          <div
            className="mt-6 h-[3px] w-full overflow-hidden bg-surface-2"
            role="status"
            aria-label="Loading matches"
          >
            <div className="h-full w-1/3 animate-[loadbar_1.1s_ease-in-out_infinite] bg-cream" />
          </div>
        )}

        {error && (
          <p className="mt-6 border border-wire bg-surface p-5 text-[13px] text-text-dim">
            We couldn&apos;t reach your matches just now. Check your connection and try again.
          </p>
        )}

        {!isPending && !error && matches.length === 0 ? (
          <EmptyState />
        ) : (
          <>
            <div className="mt-6 flex flex-wrap items-center justify-between gap-x-6 gap-y-3 border-y border-wire py-3">
              <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-4 gap-y-2">
                <div className="relative w-full max-w-[260px]">
                  <Search
                    size={15}
                    className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-text-faint"
                    aria-hidden="true"
                  />
                  <Input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search matches"
                    aria-label="Search matches"
                    className="h-10 min-h-10 border-wire pl-9 text-[13px]"
                  />
                </div>
                {competitions.length > 1 && (
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="label-xs text-text-faint">Filter by</span>
                    {competitions.map((name) => (
                      <button
                        key={name}
                        type="button"
                        aria-pressed={competition === name}
                        onClick={() => setCompetition(competition === name ? null : name)}
                        className={cn(
                          "label-xs border px-2 py-1.5 transition-colors",
                          competition === name
                            ? "border-cream bg-surface-2 text-text-bright"
                            : "border-wire text-text-dim hover:text-text",
                        )}
                      >
                        {name}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {record.won + record.drawn + record.lost > 0 && (
                <p className="flex shrink-0 items-center gap-4">
                  <RecordChip letter="W" count={record.won} label="won" />
                  <RecordChip letter="D" count={record.drawn} label="drawn" />
                  <RecordChip letter="L" count={record.lost} label="lost" />
                </p>
              )}
            </div>

            <div className="mt-5 grid items-start gap-4 [grid-template-columns:repeat(auto-fill,minmax(290px,1fr))]">
              {visible.map((m) => (
                <MatchCard key={m.id} match={m} />
              ))}
              {visible.length === 0 && !isPending && (
                <p className="text-[13px] text-text-faint">No matches for that search.</p>
              )}
            </div>
          </>
        )}
      </Screen>
    </div>
  );
}

function RecordChip({ letter, count, label }: { letter: string; count: number; label: string }) {
  return (
    <span className="flex items-center gap-1.5">
      <span className="label-xs grid h-[18px] w-[18px] place-items-center border border-wire text-text-dim">
        {letter}
      </span>
      <span className="num-flat text-[12px] text-text-dim">
        {count} {label}
      </span>
    </span>
  );
}

function EmptyState() {
  return (
    <div className="mt-8 flex flex-col items-center gap-3 border border-wire bg-surface py-14 text-center">
      <span className="flex h-12 w-12 items-center justify-center border border-wire text-text-faint">
        <Video size={20} aria-hidden="true" />
      </span>
      <h2 className="display-i text-[22px] text-text-bright">No matches yet</h2>
      <p className="max-w-[340px] text-[13px] text-text-dim">
        Upload a video to get your first analysis. About thirty minutes for a forty-five minute
        half.
      </p>
      <Link to="/upload" className="mt-2">
        <PrimaryButton>
          <Plus size={15} aria-hidden="true" />
          Upload a match
        </PrimaryButton>
      </Link>
    </div>
  );
}

/** Win, draw or loss from the coach's own side, when the labels say which side that is. */
function resultOf(match: LibraryMatch): { key: "W" | "D" | "L"; label: string } | null {
  if (match.status !== "ready" || !match.clubTeam) return null;
  const ours = match.clubTeam === "A" ? match.scoreA : match.scoreB;
  const theirs = match.clubTeam === "A" ? match.scoreB : match.scoreA;
  if (ours === theirs) return { key: "D", label: "Draw" };
  return ours > theirs ? { key: "W", label: "Win" } : { key: "L", label: "Loss" };
}

/**
 * The result square.
 *
 * A win is chalk, because in this system success is stated plainly rather than
 * coloured in; a draw is an outline; a loss is the one result worth catching
 * from across the page, so it takes the alarm outline. No greens and no reds
 * filled in — those belong to the kits.
 */
const resultClasses = {
  W: "border-positive/60 bg-positive/15 text-positive",
  D: "border-wire text-text-dim",
  L: "alarm",
} as const;

function TeamSide({
  name,
  colour,
  align,
}: {
  name: string;
  colour: string | undefined;
  align: "start" | "end";
}) {
  const crestUrl = crestForTeam(name);
  return (
    <span
      className={cn("flex min-w-0 items-center gap-2", align === "end" && "flex-row-reverse")}
      title={name}
    >
      <Crest
        team={{
          name,
          shortCode: shortTeamCode(name),
          kitColour: colour ?? "var(--text-dim)",
          ...(crestUrl ? { crestUrl } : {}),
        }}
        size={26}
      />
      <span className="display text-[13px] text-text">{shortTeamCode(name)}</span>
    </span>
  );
}

function MatchCard({ match }: { match: LibraryMatch }) {
  const ready = match.status === "ready";
  const result = resultOf(match);
  const [poss] = match.summary.possession;
  const [shots] = match.summary.shots;
  const [lost] = match.summary.turnovers;

  const line = !ready
    ? match.status === "processing"
      ? "Detecting player movements and possession phases."
      : "Analysis failed. The video is safely stored."
    : [
        poss ? `${poss}% possession` : null,
        shots ? `${shots} ${shots === 1 ? "shot" : "shots"}` : null,
        lost ? `${lost} balls lost` : null,
      ]
        .filter(Boolean)
        .join(" · ") || "Open the analysis to see the findings.";

  return (
    <article className="flex flex-col border border-wire bg-surface transition-colors hover:border-cream/40">
      <Link
        to={ready ? "/match/$matchId/insights" : "/library"}
        params={{ matchId: match.id }}
        disabled={!ready}
        aria-label={`${match.teamA} ${match.scoreA} – ${match.scoreB} ${match.teamB}${result ? `, ${result.label}` : ""}`}
        className={cn("flex flex-1 flex-col p-4", !ready && "pointer-events-none")}
      >
        <div className="flex items-center justify-between gap-2.5">
          <TeamSide name={match.teamA} colour={match.colourA} align="start" />
          {ready ? (
            <span className="num shrink-0 text-[32px] leading-none text-text-bright">
              {match.scoreA}–{match.scoreB}
            </span>
          ) : (
            <span className="label-xs shrink-0 text-text-faint">vs</span>
          )}
          <TeamSide name={match.teamB} colour={match.colourB} align="end" />
        </div>

        {/* A match still in the pipeline shows how far it has got, not a score
            it does not have yet. */}
        {match.status === "processing" && (
          <div className="mt-3">
            <div className="h-[3px] w-full overflow-hidden bg-surface-3">
              <div className="h-full w-1/3 animate-[loadbar_1.4s_ease-in-out_infinite] bg-cream" />
            </div>
            <p className="label-xs mt-2 text-text-faint">Processing</p>
          </div>
        )}

        <div className="mt-3 flex items-center justify-between gap-2 text-[11.5px] text-text-faint">
          <span className="num-flat truncate">
            {[match.date, match.competition].filter(Boolean).join(" · ")}
          </span>
          {result && (
            <span
              className={cn(
                "display-i grid h-[22px] w-[22px] shrink-0 place-items-center border text-[13px]",
                resultClasses[result.key],
              )}
              title={result.label}
            >
              {result.key}
            </span>
          )}
        </div>

        <p className="mt-3 flex-1 border-t border-wire pt-3 text-[13px] leading-snug text-text-dim">
          {line}
        </p>
      </Link>

      {ready && (
        <div className="border-t border-wire p-2">
          <StoryLauncher matchId={match.id} size="sm" label="Play the story" className="w-full" />
        </div>
      )}
    </article>
  );
}
