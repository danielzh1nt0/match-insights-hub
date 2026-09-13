import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Mail } from "lucide-react";
import { AuthShell } from "@/components/ip/auth-shell";
import { Field, Input, PrimaryButton, SecondaryButton } from "@/components/ip/primitives";

export const Route = createFileRoute("/reset")({
  head: () => ({
    meta: [
      { title: "Reset your password — Ipanema" },
      { name: "description", content: "Reset the password for your Ipanema coaching account." },
      { property: "og:title", content: "Reset your password — Ipanema" },
      { property: "og:description", content: "Reset the password for your Ipanema account." },
    ],
  }),
  component: Reset,
});

type Stage = "email" | "sent" | "password";

function Reset() {
  const navigate = useNavigate();
  const [stage, setStage] = useState<Stage>("email");
  const [email, setEmail] = useState("coach@koln.de");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  if (stage === "sent") {
    return (
      <AuthShell sub="Reset your password">
        <div className="flex flex-col items-center gap-3 py-4 text-center">
          <Mail size={30} className="text-cream" aria-hidden="true" />
          <h1 className="display text-[20px] text-text">Check your email</h1>
          <p className="text-[13px] text-text-dim">
            We sent a reset link to <strong className="text-text">{email}</strong>.
          </p>
          <SecondaryButton className="mt-2 h-12" onClick={() => setStage("password")}>
            I have the link
          </SecondaryButton>
        </div>
      </AuthShell>
    );
  }

  if (stage === "password") {
    return (
      <AuthShell sub="Set a new password">
        <form
          className="flex flex-col gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            if (password.length < 8) {
              setError("At least 8 characters, one number, one capital.");
              return;
            }
            navigate({ to: "/signin" });
          }}
        >
          <Field label="New password" error={error ?? undefined}>
            <Input
              type="password"
              value={password}
              placeholder="••••••••"
              onChange={(e) => setPassword(e.target.value)}
              aria-label="New password"
            />
          </Field>
          <PrimaryButton type="submit" block className="h-12">
            Save password
          </PrimaryButton>
        </form>
      </AuthShell>
    );
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
      <form
        className="flex flex-col gap-4"
        onSubmit={(e) => {
          e.preventDefault();
          setStage("sent");
        }}
      >
        <Field label="Email" help="We'll send a link that lets you set a new password.">
          <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} aria-label="Email" />
        </Field>
        <PrimaryButton type="submit" block className="h-12">
          Send reset link
        </PrimaryButton>
      </form>
    </AuthShell>
  );
}
