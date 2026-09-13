import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { AuthShell } from "@/components/ip/auth-shell";
import { Field, Input, PrimaryButton } from "@/components/ip/primitives";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/reset-password")({
  head: () => ({
    meta: [
      { title: "Set a new password — Ipanema" },
      { name: "description", content: "Choose a new password for your Ipanema coaching account." },
      { property: "og:title", content: "Set a new password — Ipanema" },
      { property: "og:description", content: "Choose a new password for your Ipanema account." },
    ],
  }),
  component: ResetPassword,
});

function ResetPassword() {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  if (done) {
    return (
      <AuthShell sub="Password updated">
        <div className="flex flex-col items-center gap-3 py-4 text-center">
          <h1 className="display text-[20px] text-text">You're all set</h1>
          <p className="text-[13px] text-text-dim">Your password has been changed.</p>
          <Link to="/library" className="tap text-[12.5px] text-cream hover:underline">
            Open your library
          </Link>
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
    setBusy(true);
    setError(null);
    const { error: updateError } = await supabase.auth.updateUser({ password });
    setBusy(false);
    if (updateError) {
      setError(
        "We couldn't change the password. The link may have expired — request a new one from the sign-in page.",
      );
      return;
    }
    setDone(true);
    setTimeout(() => navigate({ to: "/library" }), 800);
  }

  return (
    <AuthShell
      sub="Set a new password"
      foot={
        <Link to="/signin" className="text-cream underline-offset-2 hover:underline">
          Back to sign in
        </Link>
      }
    >
      <form className="flex flex-col gap-4" onSubmit={submit}>
        <Field label="New password" error={error ?? undefined}>
          <Input
            type="password"
            value={password}
            autoComplete="new-password"
            placeholder="••••••••"
            onChange={(e) => setPassword(e.target.value)}
            aria-label="New password"
          />
        </Field>
        <PrimaryButton type="submit" block className="h-12" disabled={busy}>
          {busy ? "Saving…" : "Save password"}
        </PrimaryButton>
      </form>
    </AuthShell>
  );
}
