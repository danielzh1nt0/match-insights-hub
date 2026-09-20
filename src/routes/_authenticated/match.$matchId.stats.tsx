import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import type { Period, TeamScope } from "@/components/ip/chrome";
import { MatchShell } from "@/components/ip/match-shell";
import { Card, Chip } from "@/components/ip/primitives";
import { StatsVisual } from "@/components/ip/stats-visuals";
import { DeepAnswer, LineBreakHero, LineStates, LineTimeline } from "@/components/ip/line-break-cards";
import { Visual } from "@/components/ip/visual";
import { useAnalysis } from "@/hooks/use-match";
import { countEvents, countLine } from "@/lib/event-reviews";
import { feedLabel } from "@/lib/match-source";

/** Which detected moments each stats card is built from. */
const SECTION_EVENTS: Record<string, string[]> = {
  ball: ["turnover_lost", "turnover_won", "sequence_end"],
  pressing: ["turnover_lost", "turnover_won", "high_turnover"],
  shooting: ["shot", "goal", "set_piece"],
  passes: ["better_option", "pass_bad", "pass_risky"],
};

const SECTION_QUESTIONS: Record<string, string> = {
  ball: "Who had the ball?",
  pressing: "How fast did we react?",
  shape: "How compact were we?",
  shooting: "Where did shots come from?",
  players: "Who covered the ground?",
  passes: "Who progressed the ball?",
};

function numeric(value: string | undefined) {
  if (!value || value === "—") return null;
  const parsed = Number.parseFloat(value.replace(/[^0-9.-]/g, ""));
  return Number.isFinite(parsed) ? parsed : null;
}

export const Route = createFileRoute("/_authenticated/match/$matchId/stats")({
  head: () => ({
    meta: [
      { title: "Match stats — Ipanema" },
      { name: "description", content: "Ball, pressing, shape, shooting, players and passes in plain numbers." },
      { property: "og:title", content: "Match stats — Ipanema" },
      { property: "og:description", content: "Every number next to the target you set." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Stats,
});

function Stats() {
  const { matchId } = Route.useParams();
  const [scope, setScope] = useState<TeamScope>("both");
  const [period, setPeriod] = useState<Period>("full");
  const { match, team, colours, sections, players, loading, events, confirmedCount, stats, file, lineDefending } = useAnalysis(
    matchId,
    scope,
  );
  const [tab, setTab] = useState("ball");

  const active = sections.find((t) => t.key === tab);
  const ownKey = team === "B" ? "b" : "a";
  const otherKey = ownKey === "a" ? "b" : "a";
  const primaryRow = active?.rows[0];
  const ownValue = active?.key === "players"
    ? players.reduce((sum, player) => sum + player.distanceM, 0)
    : numeric(primaryRow?.[ownKey]);
  const otherValue = active?.key === "players" ? null : numeric(primaryRow?.[otherKey]);
  const targetValue = numeric(primaryRow?.target);
  const comparisonValue = targetValue !== null && ownValue !== null
    ? ownValue - targetValue
    : otherValue !== null && ownValue !== null
      ? ownValue - otherValue
      : null;
  const takeawayUnit = active?.key === "players"
    ? "m"
    : primaryRow?.a.replace(/[0-9.,-]/g, "").trim() || null;
  const takeawayLabel = active?.key === "players"
    ? "covered by the selected team"
    : primaryRow?.label.toLowerCase() ?? null;
  const higherIsGood = active?.key !== "shape";
  const sectionTypes = active ? SECTION_EVENTS[active.key] ?? [] : [];
  const sectionDetected = events.filter((event) => sectionTypes.includes(event.type) && (!team || event.team === team)).length;
  const sectionConfirmed = events.filter((event) => sectionTypes.includes(event.type) && (!team || event.team === team) && event.status === "confirmed").length;

  return (
    <MatchShell
      matchId={matchId}
      match={match}
      scope={scope}
      setScope={setScope}
      period={period}
      setPeriod={setPeriod}
    >
      {loading && (
        <div className="h-1 w-full overflow-hidden rounded-full bg-surface-2" role="status" aria-label="Loading">
          <div className="h-full w-1/3 animate-[loadbar_1.1s_ease-in-out_infinite] rounded-full bg-cream" />
        </div>
      )}

      {match && active && (
        <>
          <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 md:mx-0 md:px-0">
            {sections.map((t) => (
              <Chip key={t.key} active={tab === t.key} onClick={() => setTab(t.key)}>
                {t.label}
              </Chip>
            ))}
          </div>

          <Visual
            question={SECTION_QUESTIONS[active.key] ?? `What do the ${active.label.toLowerCase()} numbers say?`}
            caption={active.caption}
            takeaway={{
              value: ownValue ?? "—",
              ...(takeawayUnit ? { unit: takeawayUnit } : {}),
              ...(takeawayLabel ? { label: takeawayLabel } : {}),
            }}
            comparison={{
              label: targetValue !== null ? "vs our target" : otherValue !== null ? "vs the opponent" : "vs season average",
              value: comparisonValue === null ? "—" : `${comparisonValue > 0 ? "+" : ""}${Math.round(comparisonValue * 10) / 10}`,
              tone: comparisonValue === null ? "neutral" : (comparisonValue >= 0) === higherIsGood ? "good" : "bad",
            }}
            honesty={`${sectionConfirmed} confirmed · ${sectionDetected} detected`}
            footerNote={active.key === "players" ? `${players.length} players in view` : `${active.rows.length} measures`}
            info={{
              title: active.label,
              rows: [
                { label: "What it covers", value: active.caption },
                { label: "Rows", value: `${active.rows.length || players.length}` },
                { label: "Left column", value: match.teamA, cream: true },
                { label: "Right column", value: match.teamB },
                { label: "Showing", value: team ? (team === "A" ? match.teamA : match.teamB) : "Both teams", cream: true },
              ],
            }}
          >
            <StatsVisual section={active} players={players} stats={stats} file={file} events={events} team={team ?? "A"} colours={colours} matchId={matchId} />
          </Visual>

          {active.key === "pressing" && lineDefending && <LineBreakHero data={lineDefending} matchId={matchId} />}
          {active.key === "shape" && lineDefending && <><DeepAnswer data={lineDefending} /><LineStates data={lineDefending} matchId={matchId} /><LineTimeline data={lineDefending} matchId={matchId} /></>}

          {SECTION_EVENTS[active.key] && (
            <Card>
              <h3 className="display text-[14px] uppercase text-cream">From the moments we found</h3>
              <ul className="mt-2 flex flex-col gap-1.5">
                {SECTION_EVENTS[active.key]!.map((type) => {
                  const c = countEvents(events, (e) => e.type === type && (!team || e.team === team));
                  return (
                    <li key={type} className="flex items-baseline justify-between gap-3 text-[13px]">
                      <span className="text-text-dim">{feedLabel(type)}</span>
                      <span className="num">
                        <span className={confirmedCount > 0 ? "text-cream" : "text-text"}>
                          {confirmedCount > 0 ? c.confirmed : c.detected}
                        </span>
                        <span className="ml-1.5 text-[11.5px] text-text-faint">{countLine(c)}</span>
                      </span>
                    </li>
                  );
                })}
              </ul>
              {confirmedCount === 0 && (
                <p className="mt-2 text-[11.5px] text-text-faint">
                  Confirm events in the feed to lock these numbers.
                </p>
              )}
            </Card>
          )}

          <Card>
            <p className="text-[12.5px] leading-relaxed text-text-dim">
              Numbers in cream are the targets from this match's setup. Anything without a target is there
              for context, not judgement.
            </p>
          </Card>
        </>
      )}
    </MatchShell>
  );
}
