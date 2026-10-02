import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowRight } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { AuthColumn, AuthField } from "@/components/ip/auth-column";
import { Input, PrimaryButton, SecondaryButton } from "@/components/ip/primitives";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { getAccount } from "@/lib/profile.functions";

export const Route = createFileRoute("/signin")({
  validateSearch: (search: Record<string, unknown>): { redirect?: string } =>
    typeof search["redirect"] === "string" ? { redirect: search["redirect"] as string } : {},
  head: () => ({
    meta: [
      { title: "Sign in — Ipanema" },
      {
        name: "description",
        content: "Sign in to your club and open your match library in Ipanema.",
      },
      { property: "og:title", content: "Sign in — Ipanema" },
      { property: "og:description", content: "Sign in to your club and open your match library." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: SignIn,
});

function SignIn() {
  const navigate = useNavigate();
  const search = Route.useSearch();
  const account = useServerFn(getAccount);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  /** Back where they were, or onboarding on a first sign-in, otherwise the library. */
  async function land() {
    const back = search.redirect;
    if (back && back.startsWith("/") && !back.startsWith("//") && !back.startsWith("/signin")) {
      navigate({ href: back, replace: true });
      return;
    }
    try {
      const data = await account();
      if (!data.profile.onboarded) {
        navigate({ to: "/onboarding", replace: true });
        return;
      }
    } catch {
      /* fall through to the library */
    }
    navigate({ to: "/library", replace: true });
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
    if (signInError) {
      setBusy(false);
      const message = signInError.message.toLowerCase();
      setError(
        message.includes("confirm")
          ? "This email hasn't been confirmed yet. Open the link we emailed you, then sign in."
          : "That email and password don't match. Check the password and try again.",
      );
      return;
    }
    await land();
    setBusy(false);
  }

  async function google() {
    setError(null);
    try {
      const result = await lovable.auth.signInWithOAuth("google", {
        redirect_uri: window.location.origin,
      });
      if (result.error) {
        const message = String((result.error as { message?: string }).message ?? "").toLowerCase();
        setError(
          message.includes("provider") ||
            message.includes("not enabled") ||
            message.includes("unsupported")
            ? "Google sign-in not enabled."
            : "Google sign-in didn't complete. Try again.",
        );
        return;
      }
      if (result.redirected) return;
      await land();
    } catch {
      setError("Google sign-in not enabled.");
    }
  }

  return (
    <AuthColumn
      eyebrow="Ipanema"
      meta="Season 2026/27"
      title="Sign in"
      sub="Your matches, findings and sessions."
      note="Every number in Ipanema comes from your own match file. Where the file doesn't say, neither do we."
      foot={
        <>
          <span>New club?</span>
          <Link
            to="/signup"
            className="font-semibold text-accent-sea underline decoration-accent-sea/40 underline-offset-[3px] hover:decoration-accent-sea"
          >
            Create an account
          </Link>
        </>
      }
    >
      <form onSubmit={submit} className="flex flex-col gap-5">
        <AuthField label="Email">
          <Input
            type="email"
            value={email}
            required
            autoComplete="email"
            placeholder="you@club.com"
            onChange={(e) => setEmail(e.target.value)}
            aria-label="Email"
            className="min-h-14"
          />
        </AuthField>

        <AuthField
          label="Password"
          error={error ?? undefined}
          action={
            <Link
              to="/reset"
              className="text-[12px] font-semibold text-accent-sea underline decoration-accent-sea/40 underline-offset-[3px] hover:decoration-accent-sea"
            >
              Forgot password
            </Link>
          }
        >
          <Input
            type="password"
            value={password}
            required
            autoComplete="current-password"
            placeholder="••••••••"
            onChange={(e) => setPassword(e.target.value)}
            aria-label="Password"
            className="min-h-14"
          />
        </AuthField>

        <PrimaryButton type="submit" block className="min-h-14" disabled={busy}>
          {busy ? "Signing in…" : "Sign in"}
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
