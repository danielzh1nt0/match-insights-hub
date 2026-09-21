import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { motion } from "motion/react";
import { UploadCloud } from "lucide-react";
import { AppHeader, Screen } from "@/components/ip/chrome";
import { Field, Input, PrimaryButton, Segmented } from "@/components/ip/primitives";
import { useApp } from "@/store/app-store";
import { useRegistration } from "@/store/registration-store";
import { uploadMatch, type UploadProgress } from "@/lib/upload";

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
  const reg = useRegistration();
  const [team, setTeam] = useState(reg.teamName || reg.clubName || teams[0]?.name || "");
  const [opponent, setOpponent] = useState("");
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [competition, setCompetition] = useState("");
  const [venue, setVenue] = useState<"home" | "away">("home");
  const [file, setFile] = useState<File | null>(null);
  const fileName = file?.name ?? null;
  const setFileName = (_: string | null) => undefined; // kept for the drop-zone markup below
  void setFileName;
  const [dragging, setDragging] = useState(false);
  const [progress, setProgress] = useState<UploadProgress | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (!uploading) return;
    const warn = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [uploading]);

  async function start() {
    setError(null);
    if (!file) return setError("Choose the match video first.");
    if (!team.trim() || !opponent.trim()) return setError("Add your team and the opponent.");
    setUploading(true);
    abortRef.current = new AbortController();
    try {
      const { match_id } = await uploadMatch(
        file,
        { team: team.trim(), opponent: opponent.trim(), date, competition: competition.trim(), venue, ageGroup: reg.ageGroup || teams[0]?.ageGroup, kitColour: reg.kitColour },
        setProgress,
        abortRef.current.signal,
      );
      navigate({ to: "/processing", search: { id: match_id } });
    } catch (e) {
      setError(e instanceof Error ? e.message : "The upload stopped.");
    } finally {
      setUploading(false);
    }
  }

  const mb = (b: number) => (b / 1024 / 1024).toFixed(0);
  const pct = progress ? Math.floor((progress.sentBytes / Math.max(progress.totalBytes, 1)) * 100) : 0;
  const eta = progress && progress.bytesPerSec > 0 ? (progress.totalBytes - progress.sentBytes) / progress.bytesPerSec : null;
  const etaText = eta === null ? "" : eta > 3600 ? ` · about ${Math.round(eta / 3600)} h left` : eta > 90 ? ` · about ${Math.round(eta / 60)} min left` : " · almost done";

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
                  if (f) setFile(f);
                }}
                className={`flex min-h-[156px] cursor-pointer flex-col items-center justify-center gap-2 rounded-[4px] border border-dashed px-4 py-6 text-center transition-colors duration-150 ease-out ${
                  dragging ? "border-cream bg-cream/5" : "border-wire bg-surface-2"
                }`}
              >
                <UploadCloud size={22} className="text-text-faint" aria-hidden="true" />
                <span className="text-[13px] font-semibold text-text">
                  {fileName ?? "Drop a video here"}
                </span>
                <span className="text-[11.5px] text-text-faint">{file ? `${(file.size / 1024 / 1024 / 1024).toFixed(2)} GB` : "MP4, MOV · full match, up to 12 GB"}</span>
                <input
                  type="file"
                  accept="video/*"
                  className="hidden"
                  aria-label="Choose a video file"
                  onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                />
              </label>
            </Field>

            {uploading || progress ? (
              <div className="flex flex-col gap-2" role="status" aria-live="polite">
                <div className="h-2 w-full overflow-hidden rounded-full bg-surface-2">
                  <div className="h-full rounded-full bg-cream transition-[width] duration-300 ease-out" style={{ width: `${pct}%` }} />
                </div>
                <p className="num text-[12px] text-text-dim">
                  {progress ? `${pct}% · ${mb(progress.sentBytes)} of ${mb(progress.totalBytes)} MB · ${(progress.bytesPerSec / 1024 / 1024).toFixed(1)} MB/s${etaText}` : "Preparing upload…"}
                </p>
                {uploading && <p className="text-[11.5px] text-text-faint">Keep this page open until the upload finishes. If the connection drops, choose the same file again — it continues where it stopped.</p>}
              </div>
            ) : null}
            {error && <p className="text-[12.5px] text-quality-bad" role="alert">{error}</p>}
            <PrimaryButton block className="h-12" onClick={start} disabled={uploading}>
              {uploading ? "Uploading…" : error && progress ? "Continue upload" : "Start analysis"}
            </PrimaryButton>
          </div>
        </motion.div>
      </Screen>
    </div>
  );
}
