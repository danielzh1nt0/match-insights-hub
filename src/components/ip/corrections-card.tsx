import { useEffect, useState } from "react";
import { Card, Input, PrimaryButton } from "./primitives";
import { fetchCorrections, saveCorrection, type MatchCorrection } from "@/lib/squad";

/**
 * The coach's own numbers for the match (24 Oct, data strategy): possession and score as they saw it. Saved as a
 * correction row - a label the pipeline is graded and trained against - never written into the match file. What the
 * app shows stays the pipeline's number, with the coach's beside it when they differ.
 */
export function CorrectionsCard({
  matchId,
  ourPossession,
  ourScore,
  teamAName,
  teamBName,
}: {
  matchId: string;
  ourPossession: { A: number; B: number } | null;
  ourScore: { A: number; B: number } | null;
  teamAName: string;
  teamBName: string;
}) {
  const [rows, setRows] = useState<MatchCorrection[]>([]);
  const [possA, setPossA] = useState("");
  const [scoreA, setScoreA] = useState("");
  const [scoreB, setScoreB] = useState("");
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    void fetchCorrections(matchId)
      .then((r) => {
        setRows(r);
        const p = r.find((x) => x.field === "possession_pct")?.value as { A?: number } | undefined;
        const s = r.find((x) => x.field === "score")?.value as { A?: number; B?: number } | undefined;
        if (p?.A !== undefined) setPossA(String(p.A));
        if (s?.A !== undefined) setScoreA(String(s.A));
        if (s?.B !== undefined) setScoreB(String(s.B));
      })
      .catch(() => setRows([]));
  }, [matchId]);

  const save = async () => {
    try {
      const a = possA === "" ? null : Math.max(0, Math.min(100, Number(possA)));
      if (a !== null) await saveCorrection(matchId, "possession_pct", { A: a, B: 100 - a });
      if (scoreA !== "" && scoreB !== "") await saveCorrection(matchId, "score", { A: Number(scoreA), B: Number(scoreB) });
      setMsg("Saved. It does not change the match file; it tells the analysis where it was wrong.");
      setRows(await fetchCorrections(matchId));
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Could not save");
    }
  };

  const saved = rows.length > 0;
  return (
    <Card>
      <p className="section-kicker">Your numbers</p>
      <h2 className="display mt-1 text-[16px] uppercase text-cream">Correct the match</h2>
      <p className="mt-2 text-[12.5px] text-text-dim">
        Our figures: possession {ourPossession ? `${ourPossession.A}–${ourPossession.B}` : "—"}, score{" "}
        {ourScore ? `${ourScore.A}–${ourScore.B}` : "—"} ({teamAName}–{teamBName}). If you saw it differently, say so here — it
        becomes a check the analysis is measured against.
      </p>
      <div className="mt-3 grid grid-cols-3 gap-2">
        <label className="block">
          <span className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.08em] text-text-dim">{teamAName} possession %</span>
          <Input inputMode="numeric" value={possA} onChange={(e) => setPossA(e.target.value.replace(/\D/g, "").slice(0, 3))} placeholder={ourPossession ? String(ourPossession.A) : ""} />
        </label>
        <label className="block">
          <span className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.08em] text-text-dim">{teamAName} goals</span>
          <Input inputMode="numeric" value={scoreA} onChange={(e) => setScoreA(e.target.value.replace(/\D/g, "").slice(0, 2))} placeholder={ourScore ? String(ourScore.A) : ""} />
        </label>
        <label className="block">
          <span className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.08em] text-text-dim">{teamBName} goals</span>
          <Input inputMode="numeric" value={scoreB} onChange={(e) => setScoreB(e.target.value.replace(/\D/g, "").slice(0, 2))} placeholder={ourScore ? String(ourScore.B) : ""} />
        </label>
      </div>
      <div className="mt-3 flex items-center gap-3">
        <PrimaryButton type="button" onClick={() => void save()} disabled={possA === "" && (scoreA === "" || scoreB === "")}>
          {saved ? "Update" : "Save"}
        </PrimaryButton>
        {msg && <span className="text-[12px] text-text-faint">{msg}</span>}
      </div>
    </Card>
  );
}
