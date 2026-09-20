import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { motion } from "motion/react";
import { UploadCloud } from "lucide-react";
import { AppHeader, Screen } from "@/components/ip/chrome";
import { Field, Input, PrimaryButton, Segmented } from "@/components/ip/primitives";
import { useApp } from "@/store/app-store";

export const Route = createFileRoute("/_authenticated/new")({
  head: () => ({
    meta: [
      { title: "New analysis — Ipanema" },
      {
        name: "description",
        content: "Drop a match video, name the teams and the competition, and start the analysis.",
      },
      { property: "og:title", content: "New analysis — Ipanema" },
      { property: "og:description", content: "Drop your video and tell us what we're looking at." },
       { property: "og:type", content: "website" },
       { name: "twitter:card", content: "summary" },
    ],
  }),
  component: NewAnalysis,
});

function NewAnalysis() {
  const navigate = useNavigate();
  const teams = useApp((s) => s.teams);
  const addMatch = useApp((s) => s.addMatch);
  const [team, setTeam] = useState(teams[0]?.name ?? "1. FC Köln");
  const [opponent, setOpponent] = useState("Wolfsburg");
  const [date, setDate] = useState("2026-09-12");
  const [competition, setCompetition] = useState("Bundesliga sample");
  const [venue, setVenue] = useState<"home" | "away">("home");
  const [fileName, setFileName] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);

  function start() {
    const id = `${opponent.toLowerCase().replace(/\s+/g, "-")}-${date}`;
    addMatch({
      id,
      teamA: team,
      teamB: opponent,
      label: competition,
      date,
      competition,
      durationS: 47,
      status: "processing",
      scoreA: 0,
      scoreB: 0,
      tags: [teams[0]?.ageGroup ?? "P2009", venue],
      summary: { possession: [0, 0], turnovers: [0, 0], shots: [0, 0] },
    });
    navigate({ to: "/processing", search: { id } });
  }

  return (
    <div className="min-h-screen bg-bg">
      <AppHeader backTo="/library" />
      <Screen className="tactical-grid min-h-[calc(100vh-64px)] pt-7 pb-16">
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.18, ease: "easeOut" }}
          className="mx-auto max-w-[560px]"
        >
          <p className="section-kicker">Match intake</p>
          <h1 className="display mt-2 text-[30px] uppercase text-text">New analysis</h1>
          <p className="mt-1 text-[13px] text-text-dim">
            Drop your video and tell us what we're looking at.
          </p>

          <div className="workspace-panel mt-6 flex flex-col gap-4 p-4 md:p-6">
            <Field label="Your team">
              <Input value={team} onChange={(e) => setTeam(e.target.value)} aria-label="Your team" />
            </Field>
            <Field label="Opponent">
              <Input value={opponent} onChange={(e) => setOpponent(e.target.value)} aria-label="Opponent" />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Date">
                <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} aria-label="Date" />
              </Field>
              <Field label="Competition">
                <Input
                  value={competition}
                  onChange={(e) => setCompetition(e.target.value)}
                  aria-label="Competition"
                />
              </Field>
            </div>
            <div>
              <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.08em] text-text-dim">
                Home or away
              </span>
              <Segmented
                ariaLabel="Home or away"
                value={venue}
                onChange={setVenue}
                options={[
                  { value: "home", label: "Home" },
                  { value: "away", label: "Away" },
                ]}
              />
            </div>

            <Field label="Video">
              <label
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragging(true);
                }}
                onDragLeave={() => setDragging(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setDragging(false);
                  const f = e.dataTransfer.files?.[0];
                  if (f) setFileName(f.name);
                }}
                className={`flex min-h-[156px] cursor-pointer flex-col items-center justify-center gap-2 rounded-[4px] border border-dashed px-4 py-6 text-center transition-colors duration-150 ease-out ${
                  dragging ? "border-cream bg-cream/5" : "border-wire bg-surface-2"
                }`}
              >
                <UploadCloud size={22} className="text-text-faint" aria-hidden="true" />
                <span className="text-[13px] font-semibold text-text">
                  {fileName ?? "Drop a video here"}
                </span>
                <span className="text-[11.5px] text-text-faint">MP4, MOV · up to 4 GB</span>
                <input
                  type="file"
                  accept="video/*"
                  className="hidden"
                  aria-label="Choose a video file"
                  onChange={(e) => setFileName(e.target.files?.[0]?.name ?? null)}
                />
              </label>
            </Field>

            <PrimaryButton block className="h-12" onClick={start}>
              Start analysis
            </PrimaryButton>
          </div>
        </motion.div>
      </Screen>
    </div>
  );
}
