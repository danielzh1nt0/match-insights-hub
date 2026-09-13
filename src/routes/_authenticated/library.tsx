import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getAccount } from "@/lib/profile.functions";
import { motion } from "motion/react";
import { Search, Video } from "lucide-react";
import { AppHeader, Screen } from "@/components/ip/chrome";
import { Card, Chip, Input, Pill, PrimaryButton } from "@/components/ip/primitives";
import { formatClock, matchTitle, type LibraryMatch } from "@/lib/sample-data";
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
      <Screen className="pt-5 pb-16">
        <h1 className="display text-[26px] text-text">Library</h1>
        <p className="mt-1 text-[13px] text-text-dim">Choose a match to open its analysis workspace.</p>

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
            <div className="mt-5 flex flex-col gap-3">
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

            <div className="mt-5 grid gap-4 lg:grid-cols-2">
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

        <div className="mt-6">
          <Link to="/new">
            <PrimaryButton className="h-12">+ New analysis</PrimaryButton>
          </Link>
        </div>
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
      <Link to="/new">
        <PrimaryButton className="mt-2 h-12">+ New analysis</PrimaryButton>
      </Link>
    </Card>
  );
}

function MatchCard({ match }: { match: LibraryMatch }) {
  const title = matchTitle(match);
  const ready = match.status === "ready";
  const crestA = crestForTeam(match.teamA);
  const crestB = crestForTeam(match.teamB);
  const turnovers =
    match.summary.turnovers[1] === 0
      ? `${match.summary.turnovers[0]}`
      : `${match.summary.turnovers[0]} / ${match.summary.turnovers[1]}`;

  return (
    <Card className="p-0 overflow-hidden">
      <div className="pitch-turf relative h-[132px] border-b border-wire">
        <span className="absolute left-3 top-3">
          <Pill tone={statusTone[match.status]}>{statusLabel[match.status]}</Pill>
        </span>
        <div className="absolute inset-x-0 top-1/2 flex -translate-y-1/2 items-center justify-center gap-5" aria-hidden="true">
          {crestA ? (
            <img src={crestA} alt="" className="h-12 w-12 object-contain" />
          ) : (
            <span className="h-3 w-3 rounded-full bg-team-a" />
          )}
          {crestB ? (
            <img src={crestB} alt="" className="h-12 w-12 object-contain" />
          ) : (
            <span className="h-3 w-3 rounded-full bg-team-b" />
          )}
        </div>
        <span className="num absolute bottom-3 right-3 text-[13px] text-cream">
          {formatClock(match.durationS)}
        </span>
      </div>
      <div className="p-4">
        <h3 className="display text-[17px] text-text">{title}</h3>
        <p className="mt-1 flex flex-wrap items-center gap-1.5 text-[11.5px] text-text-faint">
          <span>{match.date}</span>
          <span>·</span>
          <span>{match.competition}</span>
          <span>·</span>
          <span className="num">{formatClock(match.durationS)}</span>
        </p>

        <div className="mt-3 grid grid-cols-3 gap-2">
          <SummaryChip label="Poss." value={`${match.summary.possession[0]} / ${match.summary.possession[1]}`} />
          <SummaryChip label="Turnovers" value={turnovers} />
          <SummaryChip label="Shots" value={`${match.summary.shots[0]} / ${match.summary.shots[1]}`} />
        </div>

        {ready && <StoryLauncher matchId={match.id} className="mt-4" />}

        <div className="mt-3">
          {ready ? (
            <Link to="/match/$matchId/insights" params={{ matchId: match.id }}>
              <PrimaryButton className="h-11 w-full">Open analysis</PrimaryButton>
            </Link>
          ) : (
            <span className="tap flex items-center justify-center rounded-[12px] border border-wire text-[13px] font-semibold text-text-faint">
              {match.status === "processing" ? "Still being analysed" : "Analysis failed"}
            </span>
          )}
        </div>
      </div>
    </Card>
  );
}

function SummaryChip({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[10px] border border-wire bg-surface-2 px-2.5 py-2 text-center">
      <div className="text-[10px] uppercase tracking-[0.06em] text-text-faint">{label}</div>
      <div className="num mt-0.5 text-[15px] text-cream">{value}</div>
    </div>
  );
}
