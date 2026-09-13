import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { AuthShell } from "@/components/ip/auth-shell";
import { Field, Input, PrimaryButton, SecondaryButton } from "@/components/ip/primitives";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { getAccount } from "@/lib/profile.functions";

export const Route = createFileRoute("/signin")({
  validateSearch: (search: Record<string, unknown>) => ({
    redirect: typeof search["redirect"] === "string" ? (search["redirect"] as string) : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Sign in — Ipanema" },
      { name: "description", content: "Sign in to your club and open your match library in Ipanema." },
      { property: "og:title", content: "Sign in — Ipanema" },
      { property: "og:description", content: "Sign in to your club and open your match library." },
    ],
  }),
  component: SignIn,
});

function SignIn() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
    setBusy(false);
    if (signInError) {
      setError("That email and password don't match. Check the password and try again.");
      return;
    }
    navigate({ to: "/library" });
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
    navigate({ to: "/library" });
  }

  return (
    <AuthShell
      sub="Sign in to your club"
      foot={
        <>
          No account?{" "}
          <Link to="/signup" className="text-cream underline-offset-2 hover:underline">
            Request access
          </Link>
        </>
      }
    >
      <form onSubmit={submit} className="flex flex-col gap-4">
        <Field label="Email">
          <Input
            type="email"
            value={email}
            required
            autoComplete="email"
            placeholder="you@club.com"
            onChange={(e) => setEmail(e.target.value)}
            aria-label="Email"
          />
        </Field>
        <Field label="Password" error={error ?? undefined}>
          <Input
            type="password"
            value={password}
            required
            autoComplete="current-password"
            placeholder="••••••••"
            onChange={(e) => setPassword(e.target.value)}
            aria-label="Password"
          />
        </Field>
        <PrimaryButton type="submit" block className="h-12" disabled={busy}>
          {busy ? "Signing in…" : "Sign in"}
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

      <Link to="/reset" className="tap flex items-center justify-center text-[12.5px] text-text-dim hover:text-text">
        Forgot password?
      </Link>
    </AuthShell>
  );
}
