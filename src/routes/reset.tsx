import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Mail } from "lucide-react";
import { AuthShell } from "@/components/ip/auth-shell";
import { Field, Input, PrimaryButton } from "@/components/ip/primitives";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/reset")({
  head: () => ({
    meta: [
      { title: "Reset your password — Ipanema" },
      { name: "description", content: "Reset the password for your Ipanema coaching account." },
      { property: "og:title", content: "Reset your password — Ipanema" },
      { property: "og:description", content: "Reset the password for your Ipanema account." },
       { property: "og:type", content: "website" },
       { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Reset,
});

function Reset() {
  const [sent, setSent] = useState(false);
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (sent) {
    return (
      <AuthShell sub="Reset your password">
        <div className="flex flex-col items-center gap-3 py-4 text-center">
          <Mail size={30} className="text-cream" aria-hidden="true" />
          <h1 className="display text-[20px] text-text">Check your email</h1>
          <p className="text-[13px] text-text-dim">
            We sent a reset link to <strong className="text-text">{email}</strong>. Open it on this device to
            set a new password.
          </p>
          <Link to="/signin" className="tap text-[12.5px] text-text-dim hover:text-text">
            Back to sign in
          </Link>
        </div>
      </AuthShell>
    );
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setBusy(false);
    if (resetError) {
      setError("We couldn't send that link. Check the email address and try again.");
      return;
    }
    setSent(true);
  }

  return (
    <AuthShell
      sub="Reset your password"
      foot={
        <Link to="/signin" className="text-cream underline-offset-2 hover:underline">
          Back to sign in
        </Link>
      }
    >
      <form className="flex flex-col gap-4" onSubmit={submit}>
        <Field
          label="Email"
          help="We'll send a link that lets you set a new password."
          error={error ?? undefined}
        >
          <Input
            type="email"
            value={email}
            required
            autoComplete="email"
            onChange={(e) => setEmail(e.target.value)}
            aria-label="Email"
          />
        </Field>
        <PrimaryButton type="submit" block className="h-12" disabled={busy}>
          {busy ? "Sending…" : "Send reset link"}
        </PrimaryButton>
      </form>
    </AuthShell>
  );
}
