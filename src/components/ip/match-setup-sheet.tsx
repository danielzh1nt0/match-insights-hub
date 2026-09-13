import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { X } from "lucide-react";
import { toast } from "sonner";
import { GhostButton, Input, PrimaryButton, Segmented } from "@/components/ip/primitives";
import { saveMatchLabel, type MatchListItem } from "@/lib/match-source";

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
  const [nameA, setNameA] = useState(label?.name_a ?? "");
  const [nameB, setNameB] = useState(label?.name_b ?? "");
  const [colourA, setColourA] = useState(label?.colour_a ?? "#ef4444");
  const [colourB, setColourB] = useState(label?.colour_b ?? "#22c55e");
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
        thresholds: {
          press_within_2s: Number(press) || 0,
          regain_within_5s: Number(regain) || 0,
          block_ceiling_m: Number(block) || 0,
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
        className="relative max-h-[88vh] w-full overflow-y-auto rounded-t-[16px] border border-wire bg-surface p-4 sm:max-w-[520px] sm:rounded-[16px] sm:p-6"
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
            <Input value={nameA} onChange={(e) => setNameA(e.target.value)} aria-label="Team A name" />
          </div>
          <div>
            <Label>Team B name</Label>
            <Input value={nameB} onChange={(e) => setNameB(e.target.value)} aria-label="Team B name" />
          </div>
          <div>
            <Label>Team A kit</Label>
            <input
              type="color"
              value={colourA}
              onChange={(e) => setColourA(e.target.value)}
              aria-label="Team A kit colour"
              className="h-11 w-full rounded-[10px] border border-wire bg-surface-2 p-1"
            />
          </div>
          <div>
            <Label>Team B kit</Label>
            <input
              type="color"
              value={colourB}
              onChange={(e) => setColourB(e.target.value)}
              aria-label="Team B kit colour"
              className="h-11 w-full rounded-[10px] border border-wire bg-surface-2 p-1"
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
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} aria-label="Match date" />
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
