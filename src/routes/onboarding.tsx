import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import * as motion from "motion/react-client";
import { Upload } from "lucide-react";
import {
  Card,
  Field,
  GhostButton,
  Input,
  PrimaryButton,
  SecondaryButton,
  Wordmark,
} from "@/components/ip/primitives";
import { TARGET_COPY } from "@/lib/sample-data";
import { useApp } from "@/store/app-store";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/onboarding")({
  head: () => ({
    meta: [
      { title: "Set up your club — Ipanema" },
      {
        name: "description",
        content: "Three quick steps: your club, your teams and the targets your findings are measured against.",
      },
      { property: "og:title", content: "Set up your club — Ipanema" },
      { property: "og:description", content: "Your club, your teams, your targets." },
    ],
  }),
  component: Onboarding,
});

function Onboarding() {
  const navigate = useNavigate();
  const { club, setClub, teams, addTeam, updateTeam, targets, setTargets, completeOnboarding, clearMatches } =
    useApp();
  const [step, setStep] = useState(0);
  const [editTargets, setEditTargets] = useState(false);

  function finish() {
    completeOnboarding();
    clearMatches();
    navigate({ to: "/library" });
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-bg px-4 py-10 md:px-7">
      <div className="w-full max-w-[460px]">
        <div className="mb-6 flex items-center justify-between">
          <Wordmark size="sm" />
          <GhostButton className="h-11 px-3 text-[12.5px]" onClick={finish}>
            Skip
          </GhostButton>
        </div>

        <div className="mb-6 flex justify-center gap-2" aria-label={`Step ${step + 1} of 3`}>
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              className={cn(
                "h-2 w-2 rounded-full transition-colors duration-150 ease-out",
                i === step ? "bg-cream" : "bg-wire",
              )}
            />
          ))}
        </div>

        <motion.div
          key={step}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.18, ease: "easeOut" }}
          className="rounded-[16px] border border-wire bg-surface p-6"
        >
          {step === 0 && (
            <div className="flex flex-col gap-4">
              <div>
                <h1 className="display text-[22px] text-text">Your club</h1>
                <p className="mt-1 text-[13px] text-text-dim">
                  This is who owns the account. You can change it later.
                </p>
              </div>
              <Field label="Club name">
                <Input
                  value={club.name}
                  onChange={(e) => setClub({ name: e.target.value, crestInitial: e.target.value.charAt(0) })}
                  aria-label="Club name"
                />
              </Field>
              <Field label="Crest">
                <button
                  type="button"
                  className="tap flex w-full items-center gap-3 rounded-[12px] border border-dashed border-wire bg-surface-2 px-3 py-3 text-left"
                >
                  <span className="display flex h-11 w-11 items-center justify-center rounded-[10px] border border-wire bg-surface-3 text-[18px] text-cream">
                    {club.crestInitial || "K"}
                  </span>
                  <span className="text-[12.5px] text-text-dim">Tap to upload</span>
                  <Upload size={16} className="ml-auto text-text-faint" aria-hidden="true" />
                </button>
              </Field>
              <Field label="Country">
                <Input
                  value={club.country}
                  onChange={(e) => setClub({ country: e.target.value })}
                  aria-label="Country"
                />
              </Field>
              <PrimaryButton block className="h-12" onClick={() => setStep(1)}>
                Continue
              </PrimaryButton>
            </div>
          )}

          {step === 1 && (
            <div className="flex flex-col gap-4">
              <div>
                <h1 className="display text-[22px] text-text">Your teams</h1>
                <p className="mt-1 text-[13px] text-text-dim">Add the teams you coach.</p>
              </div>
              {teams.map((t) => (
                <Card key={t.id} small className="bg-surface-2">
                  <Field label="Team name">
                    <Input
                      value={t.name}
                      onChange={(e) => updateTeam(t.id, { name: e.target.value })}
                      aria-label="Team name"
                    />
                  </Field>
                  <div className="mt-3 grid grid-cols-2 gap-3">
                    <Field label="Age group">
                      <Input
                        value={t.ageGroup}
                        onChange={(e) => updateTeam(t.id, { ageGroup: e.target.value })}
                        aria-label="Age group"
                      />
                    </Field>
                    <div>
                      <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.08em] text-text-dim">
                        Kit colours
                      </span>
                      <div className="flex items-center gap-2 pt-1.5">
                        <span className="inline-flex items-center gap-1.5 text-[12px] text-text-dim">
                          <span className="h-3 w-3 rounded-full bg-team-a" /> Red
                        </span>
                        <span className="inline-flex items-center gap-1.5 text-[12px] text-text-dim">
                          <span className="h-3 w-3 rounded-full bg-team-b" /> Green
                        </span>
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
              <SecondaryButton
                block
                className="h-12"
                onClick={() =>
                  addTeam({
                    id: `team-${Date.now()}`,
                    name: "New team",
                    ageGroup: "P2011",
                    colorA: "#ef4444",
                    colorB: "#22c55e",
                  })
                }
              >
                + Add another team
              </SecondaryButton>
              <PrimaryButton block className="h-12" onClick={() => setStep(2)}>
                Continue
              </PrimaryButton>
            </div>
          )}

          {step === 2 && (
            <div className="flex flex-col gap-3">
              <div>
                <h1 className="display text-[22px] text-text">Your targets</h1>
                <p className="mt-1 text-[13px] text-text-dim">Default thresholds for {teams[0]?.ageGroup ?? "P2009"}.</p>
              </div>
              {TARGET_COPY.map((t) => (
                <Card key={t.key} small className="bg-surface-2">
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="text-[13.5px] font-semibold text-text">{t.name}</span>
                    {editTargets ? (
                      <input
                        type="number"
                        aria-label={t.name}
                        value={targets[t.key]}
                        onChange={(e) => setTargets({ [t.key]: Number(e.target.value) })}
                        className="num w-20 rounded-[8px] border border-wire bg-surface-3 px-2 py-1 text-right text-[16px] text-cream"
                      />
                    ) : (
                      <span className="num text-[20px] text-cream">
                        {t.key === "blockLengthCeiling" ? `${targets[t.key]} m` : `${targets[t.key]}%`}
                      </span>
                    )}
                  </div>
                  <p className="mt-1 text-[11.5px] leading-relaxed text-text-faint">{t.explain}</p>
                </Card>
              ))}
              <div className="mt-1 flex gap-2">
                <PrimaryButton block className="h-12" onClick={finish}>
                  {editTargets ? "Save and finish" : "Use defaults"}
                </PrimaryButton>
                {!editTargets && (
                  <SecondaryButton className="h-12" onClick={() => setEditTargets(true)}>
                    Edit
                  </SecondaryButton>
                )}
              </div>
            </div>
          )}
        </motion.div>

        {step > 0 && (
          <div className="mt-4 flex justify-center">
            <GhostButton className="h-11" onClick={() => setStep(step - 1)}>
              Back
            </GhostButton>
          </div>
        )}
      </div>
    </div>
  );
}
