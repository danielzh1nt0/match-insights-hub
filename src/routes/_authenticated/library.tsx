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
import { shortTeamCode } from "@/components/team/TeamToken";
import { matchesDb } from "@/integrations/matches/client";
import { fetchMatches, toLibraryMatch } from "@/lib/match-source";

export const Route = createFileRoute("/_authenticated/library")({
  head: () => ({
    meta: [
      { title: "Library — Ipanema" },
      {
        name: "description",
        content: "Every match you've uploaded, with possession, turnovers and shots at a glance.",
      },
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
        <div className="flex flex-wrap items-end justify-between gap-3 pb-3.5">
          <div className="min-w-0">
            <h1 className="display-i text-[34px] leading-none text-cream">Matches</h1>
            <p className="mt-1 max-w-[62ch] text-[13px] text-text-dim">
              Every match you upload becomes a story, a feed of moments and a session for Tuesday.
            </p>
          </div>
          <Link to="/upload">
            <PrimaryButton className="h-11">
              <Plus size={16} />
              Upload a match
            </PrimaryButton>
          </Link>
        </div>

        {isPending && (
          <div
            className="mt-5 h-1 w-full overflow-hidden rounded-full bg-surface-2"
            role="status"
            aria-label="Loading matches"
          >
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
            <div className="mt-4 grid gap-3 md:grid-cols-[minmax(240px,420px)_1fr] md:items-start">
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

            <div className="mt-4 grid items-start gap-3 [grid-template-columns:repeat(auto-fill,minmax(290px,1fr))]">
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
      <span className="flex h-12 w-12 items-center justify-center rounded-[14px] border border-wire bg-surface-2 text-text-faint">
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

/** The 22px W / D / L square from the prototype. */
const resultClasses = {
  W: "bg-reaction-good text-ink",
  D: "bg-text-faint text-ink",
  L: "bg-reaction-bad text-ink",
} as const;

/**
 * One side of the score line: crest and short name.
 *
 * The coach's own club is the same on every card, so on a phone its name is
 * the one worth dropping when the opponent would otherwise truncate. The
 * crest still says which side it is.
 */
function TeamSide({
  name,
  crest,
  colour,
  align,
}: {
  name: string;
  crest: string | undefined;
  colour: string | undefined;
  align: "start" | "end";
}) {
  return (
    <span
      className={cn("flex min-w-0 items-center gap-2", align === "end" && "flex-row-reverse")}
      title={name}
    >
      {crest ? (
        <img src={crest} alt="" className="h-7 w-7 shrink-0 object-contain" />
      ) : (
        <span
          className="h-7 w-7 shrink-0 rounded-full border border-wire"
          style={{ background: colour ?? "var(--surface-3)" }}
          aria-hidden="true"
        />
      )}
      <span className="display text-[14px] text-text">{shortTeamCode(name)}</span>
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
      ]
        .filter(Boolean)
        .join(" · ") || "Open the analysis to see the findings.";

  return (
    <article className="overflow-hidden rounded-[14px] border border-wire bg-surface transition-colors hover:border-cream/30">
      <Link
        to={ready ? "/match/$matchId/insights" : "/library"}
        params={{ matchId: match.id }}
        disabled={!ready}
        aria-label={`${match.teamA} ${match.scoreA} – ${match.scoreB} ${match.teamB}${result ? `, ${result.label}` : ""}`}
        className={cn("grid gap-3 p-3.5", !ready && "pointer-events-none")}
      >
        <div className="flex items-center justify-between gap-2.5">
          <TeamSide
            name={match.teamA}
            crest={crestForTeam(match.teamA)}
            colour={match.colourA}
            align="start"
          />
          {ready ? (
            <span className="display-i shrink-0 text-[34px] leading-none text-cream">
              {match.scoreA}–{match.scoreB}
            </span>
          ) : (
            <span className="display shrink-0 text-[11px] uppercase text-text-faint">vs</span>
          )}
          <TeamSide
            name={match.teamB}
            crest={crestForTeam(match.teamB)}
            colour={match.colourB}
            align="end"
          />
        </div>

        <div className="flex items-center justify-between gap-2 text-[11.5px] text-text-faint">
          <span className="truncate">
            {match.date}. {match.competition}
          </span>
          {result ? (
            <span
              className={cn(
                "display-i grid h-[22px] w-[22px] shrink-0 place-items-center rounded-[5px] text-[13px]",
                resultClasses[result.key],
              )}
              title={result.label}
            >
              {result.key}
            </span>
          ) : (
            <Pill tone={statusTone[match.status]}>{statusLabel[match.status]}</Pill>
          )}
        </div>

        <p className="border-t border-wire-2 pt-2.5 text-[12.5px] leading-normal text-text-dim">
          {line}
        </p>
      </Link>

      {ready && (
        <div className="border-t border-wire-2 px-3.5 py-2">
          <StoryLauncher matchId={match.id} size="sm" label="Play the story" className="w-full" />
        </div>
      )}
    </article>
  );
}
