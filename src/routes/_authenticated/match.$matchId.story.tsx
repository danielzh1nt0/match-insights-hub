import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo } from "react";
import type { Loss } from "@/components/visuals/PitchArt";
import type { ReviewedEvent } from "@/lib/event-reviews";
import type { Finding } from "@/lib/match-data";
import type { StatsFile, TeamKey, Thresholds } from "@/lib/match-analysis";
import type { LibraryMatch } from "@/lib/sample-data";
import { MatchStory } from "@/components/ip/match-story";
import { Card } from "@/components/ip/primitives";
import { useAnalysis } from "@/hooks/use-match";
import { useMatchModel } from "@/hooks/use-match-model";
import { useMatchVideo } from "@/hooks/use-match-video";
import { teamIdentities } from "@/lib/team-identity";

export const Route = createFileRoute("/_authenticated/match/$matchId/story")({
  validateSearch: (search: Record<string, unknown>): { chapter?: string } =>
    typeof search["chapter"] === "string" ? { chapter: search["chapter"] } : {},
  head: () => ({
    meta: [
      { title: "Match recap — Ipanema" },
      {
        name: "description",
        content:
          "A five-slide recap of the match: the score, the strength, the fix and the moment.",
      },
      { property: "og:title", content: "Match recap — Ipanema" },
      { property: "og:description", content: "Watch the 30-second recap of your match analysis." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: StoryPage,
  errorComponent: () => <StoryFallback title="That recap could not be loaded" />,
  notFoundComponent: () => <StoryFallback title="That match isn't in your library" />,
});

function StoryFallback({ title }: { title: string }) {
  return (
    <div className="min-h-screen bg-bg p-4">
      <Card>
        <h1 className="display-i text-[21px] text-text-bright">{title}</h1>
        <p className="mt-2 text-[13px] text-text-dim">
          <Link to="/library" className="text-cream underline">
            Back to your library
          </Link>
        </p>
      </Card>
    </div>
  );
}

function StoryPage() {
  const { matchId } = Route.useParams();
  const { chapter } = Route.useSearch();
  const { match, row, findings, stats, colours, team, loading, events, thresholds } = useAnalysis(
    matchId,
    "a",
  );
  const videoUrl = useMatchVideo(row);

  /** Real loss coordinates only — a moment without them is left out, not guessed. */
  const losses = useMemo(
    () =>
      events
        .filter((event) => event.team === (team ?? "A") && event.type === "turnover_lost")
        .flatMap((event) => {
          const x = event.payload?.["x"] ?? event.payload?.["ball_x"];
          const y = event.payload?.["y"] ?? event.payload?.["ball_y"];
          if (typeof x !== "number" || typeof y !== "number") return [];
          const press = event.payload?.["time_to_press"];
          return [{ x, y, timeToPress: typeof press === "number" ? press : null }];
        }),
    [events, team],
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-bg p-4">
        <div className="h-[2px] w-full overflow-hidden bg-wire">
          <div
            className="h-full w-1/3 bg-cream"
            style={{ animation: "loadbar 1.1s ease-in-out infinite" }}
          />
        </div>
      </div>
    );
  }

  if (!match) {
    return <StoryFallback title="That match isn't in your library" />;
  }

  return (
    <StoryBody
      matchId={matchId}
      match={match}
      findings={findings}
      events={events}
      stats={stats}
      team={team}
      thresholds={thresholds}
      colours={colours}
      losses={losses}
      videoUrl={videoUrl}
      startChapter={chapter}
    />
  );
}

/**
 * Split out so the model hook is only ever called with a match in hand — the
 * loading and not-found branches above return before any of it runs.
 */
function StoryBody({
  matchId,
  match,
  findings,
  events,
  stats,
  team,
  thresholds,
  colours,
  losses,
  videoUrl,
  startChapter,
}: {
  matchId: string;
  match: LibraryMatch;
  findings: Finding[];
  events: ReviewedEvent[];
  stats: StatsFile | undefined;
  team: TeamKey | null;
  thresholds: Thresholds;
  colours: { A: string; B: string };
  losses: Loss[];
  videoUrl?: string | undefined;
  startChapter?: string | undefined;
}) {
  const model = useMatchModel({ match, findings, events, stats, team, thresholds });
  const identities = teamIdentities(match, colours);
  if (!identities) return <StoryFallback title="That match isn't set up yet" />;

  return (
    <MatchStory
      matchId={matchId}
      match={match}
      model={model}
      identities={identities}
      losses={losses}
      videoUrl={videoUrl}
      startChapter={startChapter}
    />
  );
}
