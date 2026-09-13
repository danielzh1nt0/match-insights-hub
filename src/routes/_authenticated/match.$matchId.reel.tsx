import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Play } from "lucide-react";
import type { Period, TeamScope } from "@/components/ip/chrome";
import { MatchShell } from "@/components/ip/match-shell";
import { Card, Pill } from "@/components/ip/primitives";
import { useMatch } from "@/hooks/use-match";
import { formatClock } from "@/lib/sample-data";

export const Route = createFileRoute("/_authenticated/match/$matchId/reel")({
  head: () => ({
    meta: [
      { title: "Clip reel — Ipanema" },
      { name: "description", content: "The handful of moments worth showing the team." },
      { property: "og:title", content: "Clip reel — Ipanema" },
      { property: "og:description", content: "Four clips, in order, with the reason for each." },
    ],
  }),
  component: Reel,
});

function Reel() {
  const { matchId } = Route.useParams();
  const { match, data } = useMatch(matchId);
  const [scope, setScope] = useState<TeamScope>("both");
  const [period, setPeriod] = useState<Period>("full");

  return (
    <MatchShell
      matchId={matchId}
      match={match}
      scope={scope}
      setScope={setScope}
      period={period}
      setPeriod={setPeriod}
      showSelectors={false}
    >
      {data && (
        <>
          <div>
            <h1 className="display text-[22px] uppercase text-text">Clip reel</h1>
            <p className="mt-1 text-[12.5px] text-text-dim">Four moments, in order, ready for the meeting.</p>
          </div>
          {data.clips.map((c) => (
            <Card key={c.t} className="flex items-center gap-3">
              <Link
                to="/match/$matchId/match"
                params={{ matchId }}
                search={{ t: c.t }}
                aria-label={`Watch ${c.title}`}
                className="tap flex h-16 w-24 shrink-0 items-center justify-center rounded-[10px] bg-surface-2 text-text-faint hover:text-cream"
              >
                <Play size={18} aria-hidden="true" />
              </Link>
              <div className="min-w-0 flex-1">
                <span className="num block text-[12px] text-cream">{formatClock(c.t)}</span>
                <span className="block truncate text-[13.5px] text-text">{c.title}</span>
              </div>
              <Pill>{c.tag}</Pill>
            </Card>
          ))}
        </>
      )}
    </MatchShell>
  );
}
