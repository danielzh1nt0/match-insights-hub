import { createFileRoute, Link } from "@tanstack/react-router";
import { Card } from "@/components/ip/primitives";
import { PublicShell } from "@/components/ip/public-shell";
import { PlayerReport } from "@/components/ip/player-report";
import { buildMatchData } from "@/lib/match-data";
import { decodeShareToken } from "@/lib/share";

export const Route = createFileRoute("/s/player/$token")({
  head: () => ({
    meta: [
      { title: "Player report — Ipanema" },
      { name: "description", content: "One player's own numbers from a match, shared by their coach." },
      { property: "og:title", content: "Player report — Ipanema" },
      { property: "og:description", content: "Touches, passes, balls won and where they played." },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: SharedPlayer,
});

function SharedPlayer() {
  const { token } = Route.useParams();
  const payload = decodeShareToken(token);
  const data = payload ? buildMatchData(payload.m, payload.d) : null;
  const player = data && payload?.p ? data.players.find((p) => p.id === payload.p) : undefined;

  if (!payload || !data || !player) {
    return (
      <PublicShell>
        <Card className="mt-4">
          <h1 className="display text-[19px] text-text">This link doesn't work any more</h1>
          <p className="mt-2 text-[13px] text-text-dim">
            Ask your coach for a new one, or{" "}
            <Link to="/" className="text-cream underline">
              see what Ipanema does
            </Link>
            .
          </p>
        </Card>
      </PublicShell>
    );
  }

  return (
    <PublicShell note={`Shared from ${payload.a} – ${payload.b}. Match analysis that ends in Tuesday's session.`}>
      <div className="flex flex-col gap-3">
        <Card small className="flex items-center justify-between gap-3">
          <span className="display truncate text-[13px] text-text">
            {payload.a} – {payload.b}
          </span>
          <span className="num text-[20px] text-cream">
            {payload.sa} : {payload.sb}
          </span>
        </Card>
        <PlayerReport player={player} events={data.events} teamA={payload.a} />
        <Card>
          <p className="text-[12.5px] leading-relaxed text-text-dim">
            Not sure what a number means?{" "}
            <Link to="/glossary" className="text-cream underline">
              Read the glossary
            </Link>
            . Every term is explained in one line.
          </p>
        </Card>
      </div>
    </PublicShell>
  );
}
