import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { ChevronRight } from "lucide-react";
import type { Period, TeamScope } from "@/components/ip/chrome";
import { MatchShell } from "@/components/ip/match-shell";
import { Card, Chip } from "@/components/ip/primitives";
import { Visual } from "@/components/ip/visual";
import { useMatch } from "@/hooks/use-match";

export const Route = createFileRoute("/_authenticated/match/$matchId/stats")({
  head: () => ({
    meta: [
      { title: "Match stats — Ipanema" },
      { name: "description", content: "Ball, pressing, shape, shooting, players and passes in plain numbers." },
      { property: "og:title", content: "Match stats — Ipanema" },
      { property: "og:description", content: "Every number next to the target you set." },
    ],
  }),
  component: Stats,
});

function Stats() {
  const { matchId } = Route.useParams();
  const { match, data } = useMatch(matchId);
  const [scope, setScope] = useState<TeamScope>("both");
  const [period, setPeriod] = useState<Period>("full");
  const [tab, setTab] = useState("ball");

  const active = data?.stats.find((t) => t.key === tab);

  return (
    <MatchShell
      matchId={matchId}
      match={match}
      scope={scope}
      setScope={setScope}
      period={period}
      setPeriod={setPeriod}
    >
      {data && match && active && (
        <>
          <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 md:mx-0 md:px-0">
            {data.stats.map((t) => (
              <Chip key={t.key} active={tab === t.key} onClick={() => setTab(t.key)}>
                {t.label}
              </Chip>
            ))}
          </div>

          <Visual
            question={`What do the ${active.label.toLowerCase()} numbers say?`}
            caption={active.caption}
            info={{
              title: active.label,
              rows: [
                { label: "What it covers", value: active.caption },
                { label: "Rows", value: `${active.rows.length || data.players.length}` },
                { label: "Left column", value: match.teamA, cream: true },
                { label: "Right column", value: match.teamB },
                { label: "Target column", value: "Shown in cream", cream: true },
              ],
            }}
          >
            {active.key === "players" ? (
              <ul>
                {data.players.map((p) => (
                  <li key={p.id}>
                    <Link
                      to="/match/$matchId/player/$playerId"
                      params={{ matchId, playerId: p.id }}
                      className="tap flex items-center gap-3 border-b border-wire-2 py-2.5 last:border-0 hover:bg-surface-2"
                    >
                      <span className="num w-7 shrink-0 text-[13px] text-cream">{p.shirt}</span>
                      <span className="min-w-0 flex-1 truncate text-[13.5px] text-text">{p.name}</span>
                      <span className="shrink-0 text-[11.5px] text-text-faint">{p.position}</span>
                      <span className="num shrink-0 text-[12.5px] text-text-dim">{p.touches} touches</span>
                      <ChevronRight size={15} className="shrink-0 text-text-faint" aria-hidden="true" />
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <div>
                <div className="flex items-center gap-3 border-b border-wire pb-2 text-[11px] uppercase tracking-[0.06em] text-text-faint">
                  <span className="flex-1" />
                  <span className="w-14 text-right">{match.teamA.split(" ").at(-1)}</span>
                  <span className="w-14 text-right">{match.teamB.split(" ").at(-1)}</span>
                  <span className="w-14 text-right">Target</span>
                </div>
                {active.rows.map((r) => (
                  <div
                    key={r.label}
                    className="flex items-center gap-3 border-b border-wire-2 py-2.5 text-[13px] last:border-0"
                  >
                    <span className="min-w-0 flex-1 text-text-dim">{r.label}</span>
                    <span className="num w-14 text-right text-text">{r.a}</span>
                    <span className="num w-14 text-right text-text-dim">{r.b}</span>
                    <span className="num w-14 text-right text-cream">{r.target ?? "—"}</span>
                  </div>
                ))}
              </div>
            )}
          </Visual>

          <Card>
            <p className="text-[12.5px] leading-relaxed text-text-dim">
              Numbers in cream are the targets from your club setup. Anything without a target is there for
              context, not judgement.
            </p>
          </Card>
        </>
      )}
    </MatchShell>
  );
}
