import { createFileRoute, Link } from "@tanstack/react-router";
import { Card } from "@/components/ip/primitives";
import { PublicShell } from "@/components/ip/public-shell";
import { PlayerReport } from "@/components/ip/player-report";
import { buildMatchData } from "@/lib/match-data";
import { decodeShareToken } from "@/lib/share";
import { TeamToken, shortTeamCode } from "@/components/team/TeamToken";
import { colourForTeam, crestForTeam } from "@/lib/team-crests";

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
          <div className="flex min-w-0 items-center gap-3"><TeamToken identity={{ name: payload.a, shortCode: shortTeamCode(payload.a), kitColour: colourForTeam(payload.a, "var(--team-a)"), ...(crestForTeam(payload.a) ? { crestUrl: crestForTeam(payload.a) } : {}) }} size="lg" state="compare" /><span className="display text-[10px] text-text-faint">vs</span><TeamToken identity={{ name: payload.b, shortCode: shortTeamCode(payload.b), kitColour: colourForTeam(payload.b, "var(--team-b)"), ...(crestForTeam(payload.b) ? { crestUrl: crestForTeam(payload.b) } : {}) }} size="md" state="compare" /></div>
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
