import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { UploadCloud } from "lucide-react";
import { AppHeader, Screen } from "@/components/ip/chrome";
import { Field, Input, PrimaryButton, Segmented } from "@/components/ip/primitives";
import { Eyebrow } from "@/components/ip/touchline";
import { cn } from "@/lib/utils";
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
        {
          team: team.trim(),
          opponent: opponent.trim(),
          date,
          competition: competition.trim(),
          venue,
          ageGroup: reg.ageGroup || teams[0]?.ageGroup,
          kitColour: reg.kitColour,
        },
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
  const pct = progress
    ? Math.floor((progress.sentBytes / Math.max(progress.totalBytes, 1)) * 100)
    : 0;
  const eta =
    progress && progress.bytesPerSec > 0
      ? (progress.totalBytes - progress.sentBytes) / progress.bytesPerSec
      : null;
  const etaText =
    eta === null
      ? ""
      : eta > 3600
        ? ` · about ${Math.round(eta / 3600)} h left`
        : eta > 90
          ? ` · about ${Math.round(eta / 60)} min left`
          : " · almost done";

  return (
    <div className="min-h-screen bg-bg">
      <AppHeader backTo="/library" />
      <Screen className="pb-16 pt-6">
        <Eyebrow>Match intake</Eyebrow>
        <h1 className="display-i mt-2 text-[clamp(28px,4.6vw,40px)] leading-none text-text-bright">
          New analysis
        </h1>
        <p className="mt-2 max-w-[60ch] text-[13.5px] text-text-dim">
          Drop the video and tell us what we are looking at. The team names and kit colours are what
          let the pipeline tell the two sides apart, so they are worth getting right.
        </p>

        <div className="mt-6 grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:items-start">
          {/* The video. Given first, because it is the long pole. */}
          <section className="border border-wire bg-surface" aria-labelledby="intake-video">
            <header className="border-b border-wire p-4 sm:p-5">
              <h2 id="intake-video" className="text-[15px] font-semibold text-text-bright">
                The video
              </h2>
              <p className="mt-1 text-[12.5px] text-text-dim">
                One continuous file of the match, from any fixed camera.
              </p>
            </header>

            <div className="p-4 sm:p-5">
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
                className={cn(
                  "flex min-h-[200px] cursor-pointer flex-col items-center justify-center gap-2.5 border border-dashed px-4 py-8 text-center transition-colors",
                  dragging ? "border-cream bg-surface-2" : "border-wire hover:border-cream/50",
                )}
              >
                <UploadCloud size={26} className="text-text-faint" aria-hidden="true" />
                <span className="text-[14px] font-semibold text-text-bright">
                  {fileName ?? "Drop a video here"}
                </span>
                <span className="num-flat text-[12px] text-text-faint">
                  {file
                    ? `${(file.size / 1024 / 1024 / 1024).toFixed(2)} GB`
                    : "MP4 or MOV · full match · up to 12 GB"}
                </span>
                <input
                  type="file"
                  accept="video/*"
                  className="hidden"
                  aria-label="Choose a video file"
                  onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                />
              </label>

              {(uploading || progress) && (
                <div className="mt-4" role="status" aria-live="polite">
                  <div className="h-[6px] w-full overflow-hidden bg-surface-3">
                    <div
                      className="h-full bg-cream transition-[width] duration-300 ease-out"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <p className="num-flat mt-2 text-[12px] text-text-dim">
                    {progress
                      ? `${pct}% · ${mb(progress.sentBytes)} of ${mb(progress.totalBytes)} MB · ${(progress.bytesPerSec / 1024 / 1024).toFixed(1)} MB/s${etaText}`
                      : "Preparing upload…"}
                  </p>
                  {uploading && (
                    <p className="mt-2 text-[12px] leading-snug text-text-faint">
                      Keep this page open until the upload finishes. If the connection drops, choose
                      the same file again — it carries on from where it stopped.
                    </p>
                  )}
                </div>
              )}
            </div>

            <div className="border-t border-wire p-4 sm:p-5">
              <p className="label-xs text-text-faint">What happens next</p>
              <ol className="mt-3 flex flex-col gap-2">
                {[
                  "Finding the players",
                  "Working out the teams",
                  "Following the ball",
                  "Finding the moments",
                ].map((step, i) => (
                  <li
                    key={step}
                    className="flex items-baseline gap-2.5 text-[12.5px] text-text-dim"
                  >
                    <span className="num-flat shrink-0 text-text-faint">{i + 1}</span>
                    {step}
                  </li>
                ))}
              </ol>
              <p className="mt-3 text-[12px] leading-snug text-text-faint">
                About thirty minutes for a forty-five minute half. The first match at a new ground
                takes longer, because the pitch is mapped once before anything can be measured on
                it.
              </p>
            </div>
          </section>

          {/* The fixture. */}
          <section className="border border-wire bg-surface" aria-labelledby="intake-fixture">
            <header className="border-b border-wire p-4 sm:p-5">
              <h2 id="intake-fixture" className="text-[15px] font-semibold text-text-bright">
                The fixture
              </h2>
              <p className="mt-1 text-[12.5px] text-text-dim">
                Who played, when, and which way round.
              </p>
            </header>

            <div className="flex flex-col gap-4 p-4 sm:p-5">
              <Field label="Your team">
                <Input
                  value={team}
                  onChange={(e) => setTeam(e.target.value)}
                  aria-label="Your team"
                />
              </Field>
              <Field label="Opponent">
                <Input
                  value={opponent}
                  onChange={(e) => setOpponent(e.target.value)}
                  aria-label="Opponent"
                />
              </Field>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Date">
                  <Input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    aria-label="Date"
                  />
                </Field>
                <Field label="Competition" help="Optional">
                  <Input
                    value={competition}
                    onChange={(e) => setCompetition(e.target.value)}
                    aria-label="Competition"
                  />
                </Field>
              </div>
              <div>
                <span className="label-sm mb-2 block text-text-dim">Home or away</span>
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
            </div>

            <div className="border-t border-wire p-4 sm:p-5">
              {error && (
                <p className="alarm mb-3 px-3 py-2 text-[12.5px]" role="alert">
                  {error}
                </p>
              )}
              <PrimaryButton block onClick={start} disabled={uploading}>
                {uploading
                  ? "Uploading…"
                  : error && progress
                    ? "Continue upload"
                    : "Start analysis"}
              </PrimaryButton>
            </div>
          </section>
        </div>
      </Screen>
    </div>
  );
}
