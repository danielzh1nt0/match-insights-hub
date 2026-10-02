import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowRight, Mail } from "lucide-react";
import { AuthColumn, AuthField } from "@/components/ip/auth-column";
import { Checkbox, Input, PrimaryButton, SecondaryButton } from "@/components/ip/primitives";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import type { Role } from "@/store/app-store";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/signup")({
  head: () => ({
    meta: [
      { title: "Create your account — Ipanema" },
      {
        name: "description",
        content: "Create an Ipanema account for your club and analyse your first match free.",
      },
      { property: "og:title", content: "Create your account — Ipanema" },
      { property: "og:description", content: "One match, free, start to finish." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: SignUp,
});

const roles: Role[] = ["Head coach", "Assistant", "Analyst"];

function SignUp() {
  const navigate = useNavigate();
  const [sent, setSent] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [club, setClub] = useState("");
  const [role, setRole] = useState<Role>("Head coach");
  const [password, setPassword] = useState("");
  const [terms, setTerms] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (sent) {
    return (
      <AuthColumn
        eyebrow="Step 1 of 3"
        meta="Confirm your email"
        title="Check your email"
        sub="We've sent a link to confirm your address. Open it and you're in."
        steps={{ total: 3, done: 1 }}
      >
        <div className="flex items-start gap-4 border border-wire bg-surface p-5">
          <Mail size={20} className="mt-0.5 shrink-0 text-accent-sea" aria-hidden="true" />
          <div className="min-w-0">
            <p className="text-[14px] font-semibold text-text-bright">Sent to {email}</p>
            <p className="mt-1 text-[13px] leading-snug text-text-dim">
              If it hasn&rsquo;t arrived in a minute, check your spam folder — confirmation mail
              often lands there the first time.
            </p>
          </div>
        </div>
        <SecondaryButton block onClick={() => navigate({ to: "/onboarding" })}>
          Set up your club
        </SecondaryButton>
      </AuthColumn>
    );
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (password.length < 8) {
      setError("At least 8 characters, one number, one capital.");
      return;
    }
    if (!terms) {
      setError("Please accept the terms to continue.");
      return;
    }
    setBusy(true);
    setError(null);
    const { data, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: window.location.origin,
        data: { full_name: name, club_name: club, role },
      },
    });
    setBusy(false);
    if (signUpError) {
      setError(signUpError.message);
      return;
    }
    if (data.session) {
      navigate({ to: "/onboarding" });
      return;
    }
    setSent(true);
  }

  async function google() {
    setError(null);
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin,
    });
    if (result.error) {
      setError("Google sign-in didn't complete. Try again.");
      return;
    }
    if (result.redirected) return;
    navigate({ to: "/onboarding" });
  }

  return (
    <AuthColumn
      eyebrow="Step 1 of 3"
      meta="Your account"
      title="Create your account"
      sub="Next you'll name your club and set the targets your findings are measured against. Your first match is free, start to finish."
      steps={{ total: 3, done: 1 }}
      note="No card. One match, free — upload, analysis, clips and the session plan."
      foot={
        <>
          <span>Already have an account?</span>
          <Link
            to="/signin"
            className="font-semibold text-accent-sea underline decoration-accent-sea/40 underline-offset-[3px] hover:decoration-accent-sea"
          >
            Sign in
          </Link>
        </>
      }
    >
      <form onSubmit={submit} className="flex flex-col gap-5">
        <AuthField label="Full name">
          <Input
            value={name}
            required
            onChange={(e) => setName(e.target.value)}
            aria-label="Full name"
            className="min-h-14"
          />
        </AuthField>

        <AuthField label="Email">
          <Input
            type="email"
            value={email}
            required
            autoComplete="email"
            onChange={(e) => setEmail(e.target.value)}
            aria-label="Email"
            className="min-h-14"
          />
        </AuthField>

        <AuthField label="Club" help="The name that appears on every report and session sheet.">
          <Input
            value={club}
            onChange={(e) => setClub(e.target.value)}
            aria-label="Club"
            placeholder="Sollentuna FK"
            className="min-h-14"
          />
        </AuthField>

        <AuthField label="Your role">
          <div className="rule-x grid grid-cols-3 border border-wire">
            {roles.map((r) => (
              <button
                key={r}
                type="button"
                aria-pressed={role === r}
                onClick={() => setRole(r)}
                className={cn(
                  "label-sm flex min-h-14 items-center justify-center px-2 text-center transition-colors",
                  role === r
                    ? "bg-surface-2 text-text-bright"
                    : "text-text-dim hover:bg-surface hover:text-text",
                )}
              >
                {r}
              </button>
            ))}
          </div>
        </AuthField>

        <AuthField
          label="Password"
          help="At least 8 characters, one number, one capital."
          error={error ?? undefined}
        >
          <Input
            type="password"
            value={password}
            autoComplete="new-password"
            placeholder="••••••••"
            onChange={(e) => setPassword(e.target.value)}
            aria-label="Password"
            className="min-h-14"
          />
        </AuthField>

        <Checkbox
          checked={terms}
          onChange={setTerms}
          label={<span>I agree to the terms and the privacy policy.</span>}
        />

        <PrimaryButton type="submit" block className="min-h-14" disabled={busy}>
          {busy ? "Creating your account…" : "Create account"}
          {!busy && <ArrowRight size={15} aria-hidden="true" />}
        </PrimaryButton>
      </form>

      <div className="label-xs flex items-center gap-3 text-text-faint">
        <span className="h-px flex-1 bg-wire" />
        or
        <span className="h-px flex-1 bg-wire" />
      </div>

      <SecondaryButton block className="min-h-14" onClick={google}>
        Continue with Google
      </SecondaryButton>
    </AuthColumn>
  );
}
