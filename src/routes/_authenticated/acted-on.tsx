import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { AppHeader, Screen } from "@/components/ip/chrome";
import { Card } from "@/components/ip/primitives";
import { fetchAllFindingUses, type FindingUseRow } from "@/lib/squad";
import { fetchMatches, toLibraryMatch } from "@/lib/match-source";

export const Route = createFileRoute("/_authenticated/acted-on")({
  head: () => ({
    meta: [
      { title: "Acted on — Ipanema" },
      { name: "description", content: "The findings you put into a session or a reel, match by match." },
      { property: "og:title", content: "Acted on — Ipanema" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ActedOnPage,
});

const KIND_LABEL: Record<string, string> = { session: "Session", reel: "Reel", shown: "Shown", dismissed: "Dismissed" };

/**
 * What the coach acted on (24 Oct, data strategy): every finding they saved into a session, cut into a reel, showed
 * the team or dismissed, grouped by match. The point for the coach: a record of what they chose to work on. The point
 * for us: these choices are the only ground truth for which findings matter, so this is also what the analysis is
 * tuned against. Nothing here is written by the tracker.
 */
function ActedOnPage() {
  const [uses, setUses] = useState<FindingUseRow[]>([]);
  const [names, setNames] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([fetchAllFindingUses(), fetchMatches().catch(() => [])])
      .then(([u, matches]) => {
        setUses(u);
        const n: Record<string, string> = {};
        for (const m of matches) {
          const lm = toLibraryMatch(m);
          n[lm.id] = `${lm.teamA} – ${lm.teamB}${lm.date ? ` · ${lm.date}` : ""}`;
        }
        setNames(n);
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Could not load"))
      .finally(() => setLoading(false));
  }, []);

  const byMatch = useMemo(() => {
    const groups = new Map<string, FindingUseRow[]>();
    for (const u of uses) {
      if (u.kind === "dismissed") continue;
      const g = groups.get(u.match_id) ?? [];
      g.push(u);
      groups.set(u.match_id, g);
    }
    return [...groups.entries()];
  }, [uses]);
  const dismissed = uses.filter((u) => u.kind === "dismissed").length;
  const acted = uses.length - dismissed;

  return (
    <div className="min-h-screen bg-bg">
      <AppHeader backTo="/library" />
      <Screen className="tactical-grid min-h-[calc(100vh-64px)] py-7">
        <p className="section-kicker">Club</p>
        <h1 className="display mt-2 text-[28px] uppercase text-text">Acted on</h1>
        <p className="mt-2 max-w-[62ch] text-[13px] text-text-dim">
          {acted} findings put into a session or a reel{dismissed ? `, ${dismissed} dismissed` : ""}. This is your record of what
          you chose to work on — and it is how the analysis learns which findings are worth showing.
        </p>
        {error && (
          <p role="alert" className="mt-3 text-[13px] text-quality-bad">
            {error}
          </p>
        )}
        {loading ? (
          <p className="mt-5 text-[13px] text-text-faint">Loading…</p>
        ) : byMatch.length === 0 ? (
          <Card className="mt-5">
            <p className="text-[13px] text-text-faint">
              Nothing yet. On a match's Insights page, add a finding to a session or a reel and it appears here.
            </p>
          </Card>
        ) : (
          <div className="mt-5 space-y-3">
            {byMatch.map(([matchId, rows]) => (
              <Card key={matchId}>
                <div className="flex items-baseline justify-between gap-3">
                  <h2 className="display text-[16px] uppercase text-cream">{names[matchId] ?? matchId}</h2>
                  <Link to="/match/$matchId/insights" params={{ matchId }} className="text-[12px] text-text-faint hover:text-text">
                    Open insights
                  </Link>
                </div>
                <ul className="mt-3 divide-y divide-wire-2">
                  {rows.map((u) => (
                    <li key={`${u.finding_id}-${u.kind}`} className="flex items-center gap-3 py-2 text-[13px]">
                      <span className="w-16 shrink-0 text-[11px] font-semibold uppercase tracking-[0.08em] text-text-faint">
                        {KIND_LABEL[u.kind] ?? u.kind}
                      </span>
                      <span className="flex-1 text-text">{u.headline ?? u.finding_id}</span>
                      <span className="num text-[11px] text-text-faint">{u.created_at.slice(0, 10)}</span>
                    </li>
                  ))}
                </ul>
              </Card>
            ))}
          </div>
        )}
      </Screen>
    </div>
  );
}
