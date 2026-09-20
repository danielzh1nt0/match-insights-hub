import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Mail } from "lucide-react";
import { AuthShell } from "@/components/ip/auth-shell";
import { Checkbox, Field, Input, PrimaryButton, SecondaryButton } from "@/components/ip/primitives";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import type { Role } from "@/store/app-store";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/signup")({
  head: () => ({
    meta: [
      { title: "Request access — Ipanema" },
      {
        name: "description",
        content: "Request access to Ipanema for your club and start analysing your own match video.",
      },
      { property: "og:title", content: "Request access — Ipanema" },
      { property: "og:description", content: "Request access to Ipanema for your club." },
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
      <AuthShell sub="Request access">
        <div className="flex flex-col items-center gap-3 py-4 text-center">
          <Mail size={30} className="text-cream" aria-hidden="true" />
          <h1 className="display text-[20px] text-text">Your account is ready</h1>
          <p className="text-[13px] text-text-dim">
            Signed up as <strong className="text-text">{email}</strong>.
          </p>
          <SecondaryButton className="mt-2 h-12" onClick={() => navigate({ to: "/onboarding" })}>
            Set up your club
          </SecondaryButton>
        </div>
      </AuthShell>
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
    <AuthShell
      sub="Request access"
      foot={
        <>
          Already have an account?{" "}
          <Link to="/signin" className="text-cream underline-offset-2 hover:underline">
            Sign in
          </Link>
        </>
      }
    >
      <form onSubmit={submit} className="flex flex-col gap-4">
        <Field label="Full name">
          <Input value={name} required onChange={(e) => setName(e.target.value)} aria-label="Full name" />
        </Field>
        <Field label="Email">
          <Input
            type="email"
            value={email}
            required
            autoComplete="email"
            onChange={(e) => setEmail(e.target.value)}
            aria-label="Email"
          />
        </Field>
        <Field label="Club">
          <Input value={club} onChange={(e) => setClub(e.target.value)} aria-label="Club" />
        </Field>
        <Field label="Role">
          <div className="flex flex-wrap gap-2">
            {roles.map((r) => (
              <button
                key={r}
                type="button"
                aria-pressed={role === r}
                onClick={() => setRole(r)}
                className={cn(
                  "tap rounded-[22px] border px-4 text-[12.5px] font-semibold transition-colors duration-150 ease-out",
                  role === r
                    ? "border-cream bg-cream text-[#111315]"
                    : "border-wire text-text-dim hover:text-text",
                )}
              >
                {r}
              </button>
            ))}
          </div>
        </Field>
        <Field
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
          />
        </Field>
        <Checkbox
          checked={terms}
          onChange={setTerms}
          label={<span>I agree to the terms and the privacy policy.</span>}
        />
        <PrimaryButton type="submit" block className="h-12" disabled={busy}>
          {busy ? "Creating your account…" : "Request access"}
        </PrimaryButton>
      </form>

      <div className="flex items-center gap-3 text-[11px] uppercase tracking-[0.08em] text-text-faint">
        <span className="h-px flex-1 bg-wire-2" />
        or
        <span className="h-px flex-1 bg-wire-2" />
      </div>

      <SecondaryButton block className="h-12" onClick={google}>
        Continue with Google
      </SecondaryButton>
    </AuthShell>
  );
}
