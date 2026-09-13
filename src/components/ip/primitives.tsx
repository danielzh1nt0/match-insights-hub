import { forwardRef, type ButtonHTMLAttributes, type InputHTMLAttributes, type ReactNode } from "react";
import { cn } from "@/lib/utils";

/* ---------------- Wordmark ---------------- */

const wordmarkSizes = {
  sm: "text-[18px]",
  default: "text-[24px]",
  lg: "text-[72px] leading-[0.9]",
  hero: "text-[88px] leading-[0.9]",
} as const;

export function Wordmark({
  size = "default",
  className,
  onCream = false,
}: {
  size?: keyof typeof wordmarkSizes;
  className?: string;
  onCream?: boolean;
}) {
  return (
    <span
      className={cn(
        "display-i select-none",
        wordmarkSizes[size],
        onCream ? "text-[#111315]" : "text-cream",
        className,
      )}
    >
      IPANEMA
    </span>
  );
}

/* ---------------- Card ---------------- */

export function Card({
  children,
  className,
  small = false,
  ...rest
}: { children: ReactNode; className?: string; small?: boolean } & React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "border border-wire bg-surface",
        small ? "rounded-[12px] p-3" : "rounded-[16px] p-4",
        className,
      )}
      {...rest}
    >
      {children}
    </div>
  );
}

/* ---------------- Buttons ---------------- */

type BtnProps = ButtonHTMLAttributes<HTMLButtonElement> & { block?: boolean };

const btnBase =
  "tap inline-flex items-center justify-center gap-2 rounded-[12px] px-5 text-sm font-semibold transition-colors duration-150 ease-out disabled:opacity-50 disabled:pointer-events-none";

export const PrimaryButton = forwardRef<HTMLButtonElement, BtnProps>(function PrimaryButton(
  { className, block, ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      className={cn(btnBase, "bg-cream text-[#111315] hover:bg-cream-dim", block && "w-full", className)}
      {...rest}
    />
  );
});

export const SecondaryButton = forwardRef<HTMLButtonElement, BtnProps>(function SecondaryButton(
  { className, block, ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      className={cn(
        btnBase,
        "border border-cream/60 text-cream hover:bg-cream/10",
        block && "w-full",
        className,
      )}
      {...rest}
    />
  );
});

export const GhostButton = forwardRef<HTMLButtonElement, BtnProps>(function GhostButton(
  { className, block, ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      className={cn(btnBase, "text-text-dim hover:text-text hover:bg-surface-2", block && "w-full", className)}
      {...rest}
    />
  );
});

export function Button({
  variant = "primary",
  ...rest
}: BtnProps & { variant?: "primary" | "secondary" | "ghost" }) {
  if (variant === "secondary") return <SecondaryButton {...rest} />;
  if (variant === "ghost") return <GhostButton {...rest} />;
  return <PrimaryButton {...rest} />;
}

/* ---------------- Chip / Pill ---------------- */

export function Chip({
  children,
  active = false,
  count,
  className,
  ...rest
}: {
  children: ReactNode;
  active?: boolean;
  count?: number;
  className?: string;
} & ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      aria-pressed={active}
      className={cn(
        "inline-flex min-h-11 items-center gap-2 whitespace-nowrap rounded-[10px] border px-3 text-xs font-semibold transition-colors duration-150 ease-out",
        active
          ? "border-cream bg-cream text-[#111315]"
          : "border-wire text-text-dim hover:border-cream/40 hover:text-text",
        className,
      )}
      {...rest}
    >
      {children}
      {count !== undefined && (
        <span
          className={cn(
            "num rounded-full px-1.5 text-[11px]",
            active ? "bg-[#111315]/10 text-[#111315]" : "bg-surface-3 text-text-dim",
          )}
        >
          {count}
        </span>
      )}
    </button>
  );
}

export function Pill({
  children,
  tone = "neutral",
  className,
}: {
  children: ReactNode;
  tone?: "neutral" | "good" | "risky" | "bad" | "cream";
  className?: string;
}) {
  const tones = {
    neutral: "border-wire bg-surface-2 text-text-dim",
    good: "border-quality-good/40 bg-quality-good/10 text-quality-good",
    risky: "border-quality-risky/40 bg-quality-risky/10 text-quality-risky",
    bad: "border-quality-bad/40 bg-quality-bad/10 text-quality-bad",
    cream: "border-cream bg-cream text-[#111315]",
  } as const;
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-[22px] border px-3 py-1 text-[11px] font-semibold",
        tones[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

/* ---------------- Form fields ---------------- */

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  function Input({ className, ...rest }, ref) {
    return (
      <input
        ref={ref}
        className={cn(
          "tap w-full rounded-[12px] border border-wire bg-surface-2 px-3.5 text-[15px] text-text placeholder:text-text-faint transition-colors duration-150 ease-out focus:border-cream/60",
          className,
        )}
        {...rest}
      />
    );
  },
);

export function Field({
  label,
  help,
  error,
  children,
}: {
  label: string;
  help?: string;
  error?: string;
  children: ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.08em] text-text-dim">
        {label}
      </span>
      {children}
      {help && !error && <span className="mt-1.5 block text-[11.5px] text-text-faint">{help}</span>}
      {error && (
        <span role="alert" className="mt-1.5 block text-[11.5px] text-quality-bad">
          {error}
        </span>
      )}
    </label>
  );
}

export function Checkbox({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: ReactNode;
}) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="tap flex w-full items-center gap-3 text-left text-[13px] text-text-dim"
    >
      <span
        className={cn(
          "flex h-5 w-5 shrink-0 items-center justify-center rounded-[6px] border",
          checked ? "border-cream bg-cream text-[#111315]" : "border-wire bg-surface-2",
        )}
      >
        {checked && (
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
            <path d="M5 13l4 4L19 7" />
          </svg>
        )}
      </span>
      <span>{label}</span>
    </button>
  );
}

/* ---------------- Segmented control ---------------- */

export function Segmented<T extends string>({
  options,
  value,
  onChange,
  ariaLabel,
}: {
  options: { value: T; label: string; color?: string }[];
  value: T;
  onChange: (v: T) => void;
  ariaLabel: string;
}) {
  return (
    <div
      role="group"
      aria-label={ariaLabel}
      className="grid w-full gap-1 rounded-[12px] border border-wire bg-surface p-1"
      style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}
    >
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(o.value)}
            className={cn(
              "tap flex items-center justify-center gap-1.5 rounded-[9px] px-2 text-xs font-semibold transition-colors duration-150 ease-out",
              active ? "bg-cream text-[#111315]" : "text-text-dim hover:text-text",
            )}
          >
            {o.color && (
              <span className="h-2 w-2 rounded-full" style={{ background: o.color }} aria-hidden="true" />
            )}
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
