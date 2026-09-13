import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { AuthShell } from "@/components/ip/auth-shell";
import { Field, Input, PrimaryButton, SecondaryButton } from "@/components/ip/primitives";
import { useApp } from "@/store/app-store";

export const Route = createFileRoute("/signin")({
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
  const signIn = useApp((s) => s.signIn);
  const onboarded = useApp((s) => s.onboarded);
  const [email, setEmail] = useState("coach@koln.de");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (password.length < 8) {
      setError("That email and password don't match. Check the password and try again.");
      return;
    }
    setError(null);
    signIn(email);
    navigate({ to: onboarded ? "/library" : "/onboarding" });
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
            autoComplete="email"
            onChange={(e) => setEmail(e.target.value)}
            aria-label="Email"
          />
        </Field>
        <Field label="Password" error={error ?? undefined}>
          <Input
            type="password"
            value={password}
            autoComplete="current-password"
            placeholder="••••••••"
            onChange={(e) => setPassword(e.target.value)}
            aria-label="Password"
          />
        </Field>
        <PrimaryButton type="submit" block className="h-12">
          Sign in
        </PrimaryButton>
      </form>

      <div className="flex items-center gap-3 text-[11px] uppercase tracking-[0.08em] text-text-faint">
        <span className="h-px flex-1 bg-wire-2" />
        or
        <span className="h-px flex-1 bg-wire-2" />
      </div>

      <SecondaryButton
        block
        className="h-12"
        onClick={() => {
          signIn(email);
          navigate({ to: onboarded ? "/library" : "/onboarding" });
        }}
      >
        Continue with Google
      </SecondaryButton>

      <Link to="/reset" className="tap flex items-center justify-center text-[12.5px] text-text-dim hover:text-text">
        Forgot password?
      </Link>
    </AuthShell>
  );
}
