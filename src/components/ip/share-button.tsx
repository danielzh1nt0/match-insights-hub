import { useState } from "react";
import { Check, Link2 } from "lucide-react";
import { toast } from "sonner";
import { SecondaryButton } from "./primitives";

/** Copies a public link to the clipboard. */
export function ShareButton({
  path,
  label = "Copy share link",
  what,
}: {
  path: string;
  label?: string;
  what: string;
}) {
  const [copied, setCopied] = useState(false);

  return (
    <SecondaryButton
      className="h-12"
      aria-label={label}
      onClick={async () => {
        const url = `${window.location.origin}${path}`;
        try {
          await navigator.clipboard.writeText(url);
          setCopied(true);
          window.setTimeout(() => setCopied(false), 2000);
          toast.success("Link copied", { description: `Anyone with the link can see ${what}.` });
        } catch {
          toast.error("Couldn't copy the link", { description: url });
        }
      }}
    >
      {copied ? <Check size={16} aria-hidden="true" /> : <Link2 size={16} aria-hidden="true" />}
      {copied ? "Copied" : label}
    </SecondaryButton>
  );
}
