import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import type { Period, TeamScope } from "@/components/ip/chrome";
import { MatchShell } from "@/components/ip/match-shell";
import { Card, Input } from "@/components/ip/primitives";
import { useAnalysis } from "@/hooks/use-match";
import {
  fetchLineup,
  fetchPlayers,
  minutesPlayed,
  removeLineupRow,
  saveLineupRow,
  type LineupRow,
  type Player,
} from "@/lib/squad";

export const Route = createFileRoute("/_authenticated/match/$matchId/lineup")({
  head: () => ({
    meta: [
      { title: "Lineup — Ipanema" },
      { name: "description", content: "Who played this match, from the coach: starters, substitutes and minutes." },
      { property: "og:title", content: "Lineup — Ipanema" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: LineupPage,
});

/**
 * Who played: the coach ticks the squad, marks who started, and enters substitution minutes. This is the only
 * honest source of minutes today (the tracker cannot follow one player through a match), and it is the ground
 * truth that will let the pipeline learn to tell players apart later.
 */
function LineupPage() {
  const { matchId } = Route.useParams();
  const { match, file, loading } = useAnalysis(matchId, "a");
  const [scope, setScope] = useState<TeamScope>("a");
  const [period, setPeriod] = useState<Period>("full");
  const [players, setPlayers] = useState<Player[]>([]);
  const [rows, setRows] = useState<LineupRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  // match length from the file's periods (kick-off to final whistle, half-time left out); 90 when the file has none
  const matchMinutes = useMemo(() => {
    const periods = file?.periods;
    if (periods?.length) return Math.round(periods.reduce((s, p) => s + (p.t_end - p.t_start), 0) / 60);
    return 90;
  }, [file]);

  const reload = async () => {
    try {
      const [p, r] = await Promise.all([fetchPlayers(), fetchLineup(matchId)]);
      setPlayers(p.filter((x) => x.active));
      setRows(r);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load the lineup");
    }
  };
  useEffect(() => {
    void reload();
  }, [matchId]);

  const byPlayer = useMemo(() => new Map(rows.map((r) => [r.player_id, r])), [rows]);
  const starters = rows.filter((r) => r.started).length;
  const subs = rows.filter((r) => !r.started).length;
  const totalMin = rows.reduce((s, r) => s + minutesPlayed(r, matchMinutes), 0);

  const toggle = async (p: Player, started: boolean) => {
    const cur = byPlayer.get(p.id);
    try {
      if (cur && cur.started === started) await removeLineupRow(matchId, p.id);
      else await saveLineupRow({ matchId, playerId: p.id, started, minuteOn: cur?.minute_on ?? (started ? 0 : 60), minuteOff: cur?.minute_off ?? null, shirt: p.shirt });
      await reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save");
    }
  };

  const setMinute = async (p: Player, field: "minute_on" | "minute_off", raw: string) => {
    const cur = byPlayer.get(p.id);
    if (!cur) return;
    const v = raw === "" ? null : Math.max(0, Math.min(matchMinutes + 10, Number(raw)));
    try {
      await saveLineupRow({ matchId, playerId: p.id, started: cur.started, minuteOn: field === "minute_on" ? (v ?? 0) : cur.minute_on, minuteOff: field === "minute_off" ? v : cur.minute_off, shirt: cur.shirt });
      await reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save");
    }
  };

  return (
    <MatchShell matchId={matchId} match={match} scope={scope} setScope={setScope} period={period} setPeriod={setPeriod}>
      <Card>
        <p className="section-kicker">Who played</p>
        <h2 className="display mt-1 text-[20px] uppercase text-text">Lineup</h2>
        <p className="mt-2 text-[13px] text-text-dim">
          {starters} started, {subs} came on · {totalMin} player-minutes of {11 * matchMinutes} possible · match length{" "}
          {matchMinutes} min{loading ? " (loading)" : ""}
        </p>
        {error && (
          <p role="alert" className="mt-2 text-[13px] text-quality-bad">
            {error}
          </p>
        )}
        {players.length === 0 ? (
          <p className="mt-3 text-[13px] text-text-faint">
            No squad yet.{" "}
            <Link to="/squad" className="underline underline-offset-4">
              Add your players
            </Link>{" "}
            first.
          </p>
        ) : (
          <table className="mt-3 w-full text-[13px]">
            <thead>
              <tr className="text-left text-[11px] uppercase tracking-[0.08em] text-text-faint">
                <th className="py-1 pr-2">#</th>
                <th className="py-1 pr-2">Player</th>
                <th className="py-1 pr-2">Started</th>
                <th className="py-1 pr-2">Sub</th>
                <th className="py-1 pr-2">On</th>
                <th className="py-1 pr-2">Off</th>
                <th className="py-1 text-right">Min</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-wire-2">
              {players.map((p) => {
                const r = byPlayer.get(p.id);
                return (
                  <tr key={p.id} className={r ? "text-text" : "text-text-dim"}>
                    <td className="num py-2 pr-2">{p.shirt ?? "–"}</td>
                    <td className="py-2 pr-2">
                      {p.full_name}
                      {p.consent_status !== "given" && <span className="ml-2 text-[11px] text-text-faint">no consent</span>}
                    </td>
                    <td className="py-2 pr-2">
                      <input type="checkbox" checked={!!r?.started} onChange={() => void toggle(p, true)} aria-label={`${p.full_name} started`} />
                    </td>
                    <td className="py-2 pr-2">
                      <input type="checkbox" checked={!!r && !r.started} onChange={() => void toggle(p, false)} aria-label={`${p.full_name} came on`} />
                    </td>
                    <td className="py-2 pr-2">
                      {r && !r.started && (
                        <Input inputMode="numeric" className="h-8 w-16 px-2 text-[13px]" defaultValue={r.minute_on} onBlur={(e) => void setMinute(p, "minute_on", e.target.value)} />
                      )}
                    </td>
                    <td className="py-2 pr-2">
                      {r && <Input inputMode="numeric" className="h-8 w-16 px-2 text-[13px]" defaultValue={r.minute_off ?? ""} placeholder="end" onBlur={(e) => void setMinute(p, "minute_off", e.target.value)} />}
                    </td>
                    <td className="num py-2 text-right">{r ? minutesPlayed(r, matchMinutes) : ""}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
        <p className="mt-3 text-[11.5px] text-text-faint">
          Minutes are yours, not the tracker's: it cannot yet follow one player through a match. Each lineup you enter is
          also what will teach it to.
        </p>
      </Card>
    </MatchShell>
  );
}
