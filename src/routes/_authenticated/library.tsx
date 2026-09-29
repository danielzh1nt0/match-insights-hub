import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getAccount } from "@/lib/profile.functions";
import { motion } from "motion/react";
import { Plus, Search, Video } from "lucide-react";
import { AppHeader, Screen } from "@/components/ip/chrome";
import { Card, Chip, Input, Pill, PrimaryButton } from "@/components/ip/primitives";
import { matchTitle, type LibraryMatch } from "@/lib/sample-data";
import { cn } from "@/lib/utils";
import { StoryLauncher } from "@/components/ip/story-launcher";
import { crestForTeam } from "@/lib/team-crests";
import { matchesDb } from "@/integrations/matches/client";
import { fetchMatches, toLibraryMatch } from "@/lib/match-source";

export const Route = createFileRoute("/_authenticated/library")({
  head: () => ({
    meta: [
      { title: "Library — Ipanema" },
      { name: "description", content: "Every match you've uploaded, with possession, turnovers and shots at a glance." },
      { property: "og:title", content: "Library — Ipanema" },
      { property: "og:description", content: "Choose a match to open its analysis workspace." },
       { property: "og:type", content: "website" },
       { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: LibraryPage,
});

const statusTone = { ready: "good", processing: "risky", failed: "bad" } as const;
const statusLabel = { ready: "Ready", processing: "Processing", failed: "Failed" } as const;

function LibraryPage() {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<string | null>(null);
  const navigate = useNavigate();
  const fetchAccount = useServerFn(getAccount);
  const queryClient = useQueryClient();
  const { data: account } = useQuery({ queryKey: ["account"], queryFn: () => fetchAccount() });
  const { data: items, isPending, error } = useQuery({ queryKey: ["matches"], queryFn: fetchMatches });

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

  const filters = useMemo(() => {
    const set = new Set<string>();
    matches.forEach((m) => {
      set.add(m.competition);
      m.tags.forEach((t) => set.add(t));
    });
    return [...set];
  }, [matches]);

  const visible = matches.filter((m) => {
    const q = query.trim().toLowerCase();
    const matchesQuery =
      !q || matchTitle(m).toLowerCase().includes(q) || m.competition.toLowerCase().includes(q);
    const matchesFilter = !filter || m.competition === filter || m.tags.includes(filter);
    return matchesQuery && matchesFilter;
  });

  return (
    <div className="min-h-screen bg-bg">
      <AppHeader />
      <Screen className="pb-16 pt-7">
        <div className="flex flex-col gap-4 border-b border-wire-2 pb-6 sm:flex-row sm:items-end sm:justify-between">
          <div><p className="section-kicker">Analysis workspace</p><h1 className="display-i mt-1 text-[38px] leading-none text-cream md:text-[48px]">Match library</h1><p className="mt-2 text-[13px] text-text-dim">Choose a match to open its coaching review.</p></div>
          <Link to="/upload"><PrimaryButton className="h-12"><Plus size={16}/>New analysis</PrimaryButton></Link>
        </div>

        {isPending && (
          <div className="mt-5 h-1 w-full overflow-hidden rounded-full bg-surface-2" role="status" aria-label="Loading matches">
            <div className="h-full w-1/3 animate-[loadbar_1.1s_ease-in-out_infinite] rounded-full bg-cream" />
          </div>
        )}

        {error && (
          <Card className="mt-5">
            <p className="text-[13px] text-text-dim">
              We couldn't reach your matches just now. Check your connection and try again.
            </p>
          </Card>
        )}

        {!isPending && !error && matches.length === 0 ? (
          <EmptyState />
        ) : (
          <>
            <div className="mt-6 grid gap-3 md:grid-cols-[minmax(240px,420px)_1fr] md:items-start">
              <div className="relative">
                <Search
                  size={16}
                  className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-text-faint"
                  aria-hidden="true"
                />
                <Input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search matches"
                  aria-label="Search matches"
                  className="pl-9"
                />
              </div>
              <div className="flex flex-wrap gap-2">
                {filters.map((f) => (
                  <Chip
                    key={f}
                    active={filter === f}
                    count={matches.filter((m) => m.competition === f || m.tags.includes(f)).length}
                    onClick={() => setFilter(filter === f ? null : f)}
                  >
                    {f}
                  </Chip>
                ))}
              </div>
            </div>

            <div className="mt-6 grid items-start gap-4 lg:grid-cols-2">
              {visible.map((m, i) => (
                <motion.div
                  key={m.id}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.18, ease: "easeOut", delay: i * 0.03 }}
                >
                  <MatchCard match={m} />
                </motion.div>
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

function EmptyState() {
  return (
    <Card className="mt-6 flex flex-col items-center gap-3 py-12 text-center">
      <span className="flex h-12 w-12 items-center justify-center rounded-[12px] border border-wire bg-surface-2 text-text-faint">
        <Video size={20} aria-hidden="true" />
      </span>
      <h2 className="display text-[19px] text-text">No matches yet</h2>
      <p className="max-w-[320px] text-[13px] text-text-dim">
        Upload a video to get your first analysis. About 30 minutes for a 45-minute half.
      </p>
      <Link to="/upload">
        <PrimaryButton className="mt-2 h-12">+ New analysis</PrimaryButton>
      </Link>
    </Card>
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

const resultClasses = {
  W: "bg-reaction-good/15 text-reaction-good",
  D: "bg-text-faint/15 text-text-dim",
  L: "bg-reaction-bad/15 text-reaction-bad",
} as const;

/**
 * `ours` hides the name on a phone. The coach's own club is the same on every
 * row, so it is the name worth losing when the opponent would otherwise
 * truncate to "BOLLSTA…". The crest still identifies the side.
 */
function TeamSide({ name, crest, colour, align, ours }: { name: string; crest: string | undefined; colour: string | undefined; align: "start" | "end"; ours: boolean }) {
  return (
    <span className={cn("flex min-w-0 items-center gap-2", ours ? "shrink-0 sm:min-w-0 sm:flex-1" : "flex-1", align === "end" && "flex-row-reverse")}>
      {crest ? (
        <img src={crest} alt={ours ? name : ""} className="h-8 w-8 shrink-0 object-contain" />
      ) : (
        <span className="h-8 w-8 shrink-0 rounded-full border border-wire" style={{ background: colour ?? "var(--surface-3)" }} aria-hidden="true" />
      )}
      <span className={cn("display truncate text-[14px] text-text", ours && "hidden sm:inline")}>{name}</span>
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
      ? "Still being analysed. This usually takes about 30 minutes for a half."
      : "Analysis failed. The video is safely stored."
    : [
        poss ? `${poss}% possession` : null,
        shots ? `${shots} ${shots === 1 ? "shot" : "shots"}` : null,
        lost ? `${lost} balls lost` : null,
      ].filter(Boolean).join(" · ") || "Open the analysis to see the findings.";

  return (
    <Card className="group overflow-hidden p-0 transition-colors hover:border-cream/30">
      <Link
        to={ready ? "/match/$matchId/insights" : "/library"}
        params={{ matchId: match.id }}
        disabled={!ready}
        aria-label={`${match.teamA} ${match.scoreA} – ${match.scoreB} ${match.teamB}${result ? `, ${result.label}` : ""}`}
        className={cn("block px-4 pb-3 pt-4", !ready && "pointer-events-none")}
      >
        <div className="flex items-center gap-3">
          <TeamSide name={match.teamA} crest={crestForTeam(match.teamA)} colour={match.colourA} align="start" ours={match.clubTeam === "A"} />
          {ready ? (
            <span className="display-i shrink-0 text-[26px] leading-none text-cream">{match.scoreA}–{match.scoreB}</span>
          ) : (
            <span className="display shrink-0 text-[11px] uppercase text-text-faint">vs</span>
          )}
          <TeamSide name={match.teamB} crest={crestForTeam(match.teamB)} colour={match.colourB} align="end" ours={match.clubTeam === "B"} />
        </div>

        <div className="mt-3 flex items-center justify-between gap-2 text-[11.5px] text-text-faint">
          <span className="truncate">{match.date} · {match.competition}</span>
          {result ? (
            <span className={cn("shrink-0 rounded-[6px] px-2 py-0.5 text-[10px] font-bold uppercase", resultClasses[result.key])}>{result.label}</span>
          ) : (
            <Pill tone={statusTone[match.status]}>{statusLabel[match.status]}</Pill>
          )}
        </div>

        <p className="mt-2 text-[12.5px] leading-normal text-text-dim">{line}</p>
      </Link>

      {ready && (
        <div className="flex items-center gap-2 border-t border-wire-2 px-4 py-2.5">
          <StoryLauncher matchId={match.id} size="sm" label="Recap" className="flex-1" />
          <Link to="/match/$matchId/insights" params={{ matchId: match.id }} className="shrink-0">
            <PrimaryButton className="h-10 px-4 text-[12.5px]">Open analysis</PrimaryButton>
          </Link>
        </div>
      )}
    </Card>
  );
}
