import { createFileRoute, Link } from "@tanstack/react-router";
import { Card } from "@/components/ip/primitives";
import { PublicShell } from "@/components/ip/public-shell";
import { ClipList } from "@/components/ip/clip-list";
import { buildMatchData } from "@/lib/match-data";
import { decodeShareToken } from "@/lib/share";
import { TeamToken, shortTeamCode } from "@/components/team/TeamToken";
import { colourForTeam, crestForTeam } from "@/lib/team-crests";

export const Route = createFileRoute("/s/reel/$token")({
  head: () => ({
    meta: [
      { title: "Clip reel — Ipanema" },
      { name: "description", content: "The handful of moments a coach wants the team to see." },
      { property: "og:title", content: "Clip reel — Ipanema" },
      { property: "og:description", content: "A few moments from the match, each with the reason it's there." },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: SharedReel,
});

function SharedReel() {
  const { token } = Route.useParams();
  const payload = decodeShareToken(token);
  const data = payload ? buildMatchData(payload.m, payload.d) : null;

  if (!payload || !data) {
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
        <div className="mt-1">
          <div className="mb-3 flex items-center gap-3"><TeamToken identity={{ name: payload.a, shortCode: shortTeamCode(payload.a), kitColour: colourForTeam(payload.a, "var(--team-a)"), ...(crestForTeam(payload.a) ? { crestUrl: crestForTeam(payload.a) } : {}) }} size="lg" state="compare" /><span className="display text-[10px] text-text-faint">vs</span><TeamToken identity={{ name: payload.b, shortCode: shortTeamCode(payload.b), kitColour: colourForTeam(payload.b, "var(--team-b)"), ...(crestForTeam(payload.b) ? { crestUrl: crestForTeam(payload.b) } : {}) }} size="lg" state="compare" /></div>
          <h1 className="display text-[26px] uppercase text-text">Clip reel</h1>
          <p className="mt-1 text-[12.5px] text-text-dim">
            {payload.a} – {payload.b} · {payload.sa} : {payload.sb} · {data.clips.length} moments
          </p>
        </div>
        <ClipList clips={data.clips} />
        <Card>
          <p className="text-[12.5px] leading-relaxed text-text-dim">
            Each clip is here for one reason, written above it.{" "}
            <Link to="/glossary" className="text-cream underline">
              The glossary
            </Link>{" "}
            explains the wording.
          </p>
        </Card>
      </div>
    </PublicShell>
  );
}
