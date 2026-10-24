import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { X } from "lucide-react";
import { toast } from "sonner";
import { GhostButton, Input, PrimaryButton, Segmented } from "@/components/ip/primitives";
import { saveMatchLabel, signedUrl, type MatchListItem } from "@/lib/match-source";
import { kpiTargetsFrom } from "@/lib/kpi";

function Label({ children }: { children: React.ReactNode }) {
  return (
    <span className="mb-1 block text-[10.5px] font-bold uppercase tracking-[0.08em] text-text-faint">
      {children}
    </span>
  );
}

export function MatchSetupSheet({
  item,
  open,
  onClose,
}: {
  item: MatchListItem;
  open: boolean;
  onClose: () => void;
}) {
  const label = item.label;
  /** Sollentuna v Brommapojkarna arrives unlabelled — start from the real kits. */
  const isSfkBp = item.row.id.toUpperCase().includes("SFKBP");
  const [nameA, setNameA] = useState(label?.name_a ?? (isSfkBp ? "SFK" : ""));
  const [nameB, setNameB] = useState(label?.name_b ?? (isSfkBp ? "BP" : ""));
  const [colourA, setColourA] = useState(
    label?.colour_a ?? (isSfkBp ? "var(--ink)" : "var(--reaction-bad)"),
  );
  const [colourB, setColourB] = useState(
    label?.colour_b ?? (isSfkBp ? "#e7eaee" : "var(--positive)"),
  );
  const [attackRight, setAttackRight] = useState<"left" | "right">(
    label?.attack_right_override?.["A"] === true ? "right" : "left",
  );
  const thumbPath = item.row.files.thumb;
  const { data: thumbUrl } = useQuery({
    queryKey: ["match-thumb", item.row.id],
    queryFn: () => signedUrl(thumbPath!),
    enabled: Boolean(thumbPath),
    staleTime: 30 * 60_000,
  });
  const [clubTeam, setClubTeam] = useState<"A" | "B">(label?.club_team ?? "A");
  const [scoreA, setScoreA] = useState(String(label?.score_a ?? 0));
  const [scoreB, setScoreB] = useState(String(label?.score_b ?? 0));
  const [date, setDate] = useState(label?.date ?? item.row.created_at.slice(0, 10));
  const [competition, setCompetition] = useState(label?.competition ?? "");
  const [tags, setTags] = useState((label?.tags ?? []).join(", "));
  const thresholds = label?.thresholds ?? {};
  const [press, setPress] = useState(String(thresholds["press_within_2s"] ?? 60));
  const [regain, setRegain] = useState(String(thresholds["regain_within_5s"] ?? 60));
  const [block, setBlock] = useState(String(thresholds["block_ceiling_m"] ?? 38));

  // The season's targets, scored on the stats page. Kept on the match label
  // alongside the thresholds so one save writes both.
  const kpi = kpiTargetsFrom(thresholds);
  const [kPoss, setKPoss] = useState(String(kpi.possessionPct));
  const [kShots, setKShots] = useState(String(kpi.shots));
  const [kEntries, setKEntries] = useState(String(kpi.finalThirdEntries));
  const [kComp, setKComp] = useState(String(kpi.passCompletionPct));
  const [kShotsAg, setKShotsAg] = useState(String(kpi.shotsConceded));
  const [kGoalsAg, setKGoalsAg] = useState(String(kpi.goalsConceded));
  const [kEntriesAg, setKEntriesAg] = useState(String(kpi.entriesConceded));

  const queryClient = useQueryClient();
  const save = useMutation({
    mutationFn: () =>
      saveMatchLabel({
        match_id: item.row.id,
        club_team: clubTeam,
        name_a: nameA.trim(),
        name_b: nameB.trim(),
        colour_a: colourA,
        colour_b: colourB,
        opponent: clubTeam === "A" ? nameB.trim() : nameA.trim(),
        score_a: Number(scoreA) || 0,
        score_b: Number(scoreB) || 0,
        date,
        competition: competition.trim(),
        tags: tags
          .split(",")
          .map((t) => t.trim().replace(/^#/, ""))
          .filter(Boolean),
        attack_right_override: { A: attackRight === "right", B: attackRight !== "right" },
        thresholds: {
          press_within_2s: Number(press) || 0,
          regain_within_5s: Number(regain) || 0,
          block_ceiling_m: Number(block) || 0,
          kpi_possession_pct: Number(kPoss) || 0,
          kpi_shots: Number(kShots) || 0,
          kpi_final_third_entries: Number(kEntries) || 0,
          kpi_pass_completion_pct: Number(kComp) || 0,
          kpi_shots_conceded: Number(kShotsAg) || 0,
          kpi_goals_conceded: Number(kGoalsAg) || 0,
          kpi_entries_conceded: Number(kEntriesAg) || 0,
        },
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["match", item.row.id] });
      queryClient.invalidateQueries({ queryKey: ["matches"] });
      toast.success("Match details saved");
      onClose();
    },
    onError: () => toast.error("Could not save the match details"),
  });

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <button
        type="button"
        aria-label="Close match setup"
        onClick={onClose}
        className="absolute inset-0 bg-black/60"
      />
      <div
        role="dialog"
        aria-label="Match setup"
        className="relative max-h-[88vh] w-full overflow-y-auto border border-wire bg-surface p-4 sm:max-w-[520px] sm: sm:p-6"
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="display text-[19px] text-cream">Match setup</h2>
            <p className="mt-1 text-[12px] text-text-dim">
              Name both teams so the analysis reads like your match.
            </p>
          </div>
          <button
            type="button"
            aria-label="Close match setup"
            onClick={onClose}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-text-faint hover:text-text"
          >
            <X size={18} aria-hidden="true" />
          </button>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <div>
            <Label>Team A name</Label>
            <Input
              value={nameA}
              onChange={(e) => setNameA(e.target.value)}
              aria-label="Team A name"
            />
          </div>
          <div>
            <Label>Team B name</Label>
            <Input
              value={nameB}
              onChange={(e) => setNameB(e.target.value)}
              aria-label="Team B name"
            />
          </div>
          <div>
            <Label>Team A kit</Label>
            <input
              type="color"
              value={colourA}
              onChange={(e) => setColourA(e.target.value)}
              aria-label="Team A kit colour"
              className="h-11 w-full border border-wire bg-surface-2 p-1"
            />
          </div>
          <div>
            <Label>Team B kit</Label>
            <input
              type="color"
              value={colourB}
              onChange={(e) => setColourB(e.target.value)}
              aria-label="Team B kit colour"
              className="h-11 w-full border border-wire bg-surface-2 p-1"
            />
          </div>
          <div className="sm:col-span-2">
            <Label>Which side is your team?</Label>
            <Segmented
              ariaLabel="Your team"
              value={clubTeam}
              onChange={(v) => setClubTeam(v as "A" | "B")}
              options={[
                { value: "A", label: nameA || "Team A" },
                { value: "B", label: nameB || "Team B" },
              ]}
            />
          </div>
          <div>
            <Label>Score A</Label>
            <Input
              value={scoreA}
              inputMode="numeric"
              onChange={(e) => setScoreA(e.target.value)}
              aria-label="Score for team A"
            />
          </div>
          <div>
            <Label>Score B</Label>
            <Input
              value={scoreB}
              inputMode="numeric"
              onChange={(e) => setScoreB(e.target.value)}
              aria-label="Score for team B"
            />
          </div>
          <div>
            <Label>Date</Label>
            <Input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              aria-label="Match date"
            />
          </div>
          <div>
            <Label>Competition</Label>
            <Input
              value={competition}
              onChange={(e) => setCompetition(e.target.value)}
              aria-label="Competition"
            />
          </div>
          <div className="sm:col-span-2">
            <Label>Tags</Label>
            <Input
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              placeholder="P2009, home"
              aria-label="Tags"
            />
          </div>
        </div>

        <h3 className="display mt-5 text-[14px] uppercase text-text-dim">
          Which side do we attack in the 1st half?
        </h3>
        <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-center">
          {thumbUrl && (
            <img
              src={thumbUrl}
              alt="First frame of the match video"
              className="h-20 w-full border border-wire object-cover sm:w-40"
            />
          )}
          <div className="flex-1">
            <Segmented
              ariaLabel="Attacking direction in the first half"
              value={attackRight}
              onChange={(v) => setAttackRight(v as "left" | "right")}
              options={[
                { value: "left", label: "Left" },
                { value: "right", label: "Right" },
              ]}
            />
            <p className="mt-1 text-[11px] text-text-faint">
              This is used instead of the direction the pipeline guessed.
            </p>
          </div>
        </div>

        <h3 className="display mt-5 text-[14px] uppercase text-text-dim">Targets for this match</h3>
        <div className="mt-2 grid gap-3 sm:grid-cols-3">
          <div>
            <Label>Press within 2 s %</Label>
            <Input
              value={press}
              inputMode="numeric"
              onChange={(e) => setPress(e.target.value)}
              aria-label="Press within two seconds target"
            />
          </div>
          <div>
            <Label>Regain within 5 s %</Label>
            <Input
              value={regain}
              inputMode="numeric"
              onChange={(e) => setRegain(e.target.value)}
              aria-label="Regain within five seconds target"
            />
          </div>
          <div>
            <Label>Block ceiling m</Label>
            <Input
              value={block}
              inputMode="numeric"
              onChange={(e) => setBlock(e.target.value)}
              aria-label="Block length ceiling"
            />
          </div>
        </div>

        <h3 className="display mt-5 text-[14px] uppercase text-text-dim">
          Team KPIs — what we are aiming for
        </h3>
        <p className="mt-1 text-[11.5px] text-text-faint">
          Scored on the stats page as Attack, Defence and Overall. A target this match file cannot
          measure is left out of the score rather than counted as missed.
        </p>
        <p className="label-xs mt-3 text-text-faint">Attack — at least</p>
        <div className="mt-1.5 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div>
            <Label>Possession %</Label>
            <Input
              value={kPoss}
              inputMode="numeric"
              onChange={(e) => setKPoss(e.target.value)}
              aria-label="Possession target"
            />
          </div>
          <div>
            <Label>Shots</Label>
            <Input
              value={kShots}
              inputMode="numeric"
              onChange={(e) => setKShots(e.target.value)}
              aria-label="Shots target"
            />
          </div>
          <div>
            <Label>Final-third entries</Label>
            <Input
              value={kEntries}
              inputMode="numeric"
              onChange={(e) => setKEntries(e.target.value)}
              aria-label="Final-third entries target"
            />
          </div>
          <div>
            <Label>Pass completion %</Label>
            <Input
              value={kComp}
              inputMode="numeric"
              onChange={(e) => setKComp(e.target.value)}
              aria-label="Pass completion target"
            />
          </div>
        </div>
        <p className="label-xs mt-3 text-text-faint">Defence — at most</p>
        <div className="mt-1.5 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div>
            <Label>Shots conceded</Label>
            <Input
              value={kShotsAg}
              inputMode="numeric"
              onChange={(e) => setKShotsAg(e.target.value)}
              aria-label="Shots conceded target"
            />
          </div>
          <div>
            <Label>Goals conceded</Label>
            <Input
              value={kGoalsAg}
              inputMode="numeric"
              onChange={(e) => setKGoalsAg(e.target.value)}
              aria-label="Goals conceded target"
            />
          </div>
          <div>
            <Label>Entries conceded</Label>
            <Input
              value={kEntriesAg}
              inputMode="numeric"
              onChange={(e) => setKEntriesAg(e.target.value)}
              aria-label="Entries conceded target"
            />
          </div>
        </div>

        <div className="mt-5 flex flex-col gap-2 sm:flex-row-reverse">
          <PrimaryButton
            className="h-12 sm:flex-1"
            disabled={save.isPending || !nameA.trim() || !nameB.trim()}
            onClick={() => save.mutate()}
          >
            {save.isPending ? "Saving…" : "Save match details"}
          </PrimaryButton>
          <GhostButton className="h-12 sm:flex-1" onClick={onClose}>
            Not now
          </GhostButton>
        </div>
      </div>
    </div>
  );
}
