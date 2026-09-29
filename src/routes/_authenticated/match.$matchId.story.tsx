import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo } from "react";
import { MatchStory } from "@/components/ip/match-story";
import { Card } from "@/components/ip/primitives";
import { useAnalysis } from "@/hooks/use-match";
import { buildMomentShape } from "@/lib/match-analysis";
import { buildRecapAnalysis } from "@/lib/recap-analysis";

export const Route = createFileRoute("/_authenticated/match/$matchId/story")({
  validateSearch: (search: Record<string, unknown>): { chapter?: string } =>
    typeof search["chapter"] === "string" ? { chapter: search["chapter"] } : {},
  head: () => ({
    meta: [
      { title: "Match recap — Ipanema" },
      { name: "description", content: "A five-slide recap of the match: the score, the strength, the fix and the moment." },
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
        <h1 className="display text-[19px] text-text">{title}</h1>
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
  const { match, findings, file, stats, players, colours, team, loading, events, thresholds } = useAnalysis(matchId, "a");

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

  const recap = useMemo(
    () =>
      match
        ? buildRecapAnalysis({
            match,
            data: file,
            stats,
            findings,
            players,
            team: team ?? "A",
            colours,
          })
        : null,
    [match, file, stats, findings, players, team, colours],
  );

  const shape = useMemo(
    () => buildMomentShape(file, recap?.firstMoment ?? undefined),
    [file, recap?.firstMoment],
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-bg p-4">
        <div className="h-[2px] w-full overflow-hidden rounded-full bg-wire">
          <div className="h-full w-1/3 bg-cream" style={{ animation: "loadbar 1.1s ease-in-out infinite" }} />
        </div>
      </div>
    );
  }

  if (!match || !recap) {
    return <StoryFallback title="That match isn't in your library" />;
  }

  return <MatchStory matchId={matchId} match={match} recap={recap} shape={shape} losses={losses} pressTarget={thresholds.pressWithin2s} startChapter={chapter} />;
}
