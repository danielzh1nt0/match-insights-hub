import { createFileRoute, Link } from "@tanstack/react-router";
import { MatchStory } from "@/components/ip/match-story";
import { Card } from "@/components/ip/primitives";
import { useMatch } from "@/hooks/use-match";

export const Route = createFileRoute("/_authenticated/match/$matchId/story")({
  head: () => ({
    meta: [
      { title: "Match recap — Ipanema" },
      { name: "description", content: "A five-slide recap of the match: the score, the strength, the fix and the moment." },
      { property: "og:title", content: "Match recap — Ipanema" },
      { property: "og:description", content: "Watch the 30-second recap of your match analysis." },
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
  const { match, data, loading } = useMatch(matchId);

  if (loading) {
    return (
      <div className="min-h-screen bg-bg p-4">
        <div className="h-[2px] w-full overflow-hidden rounded-full bg-wire">
          <div className="h-full w-1/3 bg-cream" style={{ animation: "loadbar 1.1s ease-in-out infinite" }} />
        </div>
      </div>
    );
  }

  if (!match || !data) {
    return <StoryFallback title="That match isn't in your library" />;
  }


  return <MatchStory matchId={matchId} match={match} data={data} />;
}
