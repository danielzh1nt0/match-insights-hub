import {
  forwardRef,
  type ButtonHTMLAttributes,
  type InputHTMLAttributes,
  type ReactNode,
} from "react";
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
        onCream ? "text-ink" : "text-cream",
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
}: {
  children: ReactNode;
  className?: string;
  small?: boolean;
} & React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "border border-wire bg-surface",
        // --r-md / --pad from the prototype's spacing system
        small ? " p-3.5" : " p-5",
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

const btnBase = "btn disabled:pointer-events-none disabled:opacity-40";

export const PrimaryButton = forwardRef<HTMLButtonElement, BtnProps>(function PrimaryButton(
  { className, block, ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      className={cn(btnBase, "btn-primary", block && "w-full", className)}
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
      className={cn(btnBase, "btn-secondary", block && "w-full", className)}
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
      className={cn(
        btnBase,
        "border-transparent text-text-dim hover:bg-surface-2 hover:text-text",
        block && "w-full",
        className,
      )}
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
      className={cn("fchip", active && "fchip-active", className)}
      {...rest}
    >
      {children}
      {count !== undefined && <span className="fchip-badge num-flat">{count}</span>}
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
  // Success is silent in this system: it is chalk, or it is nothing. Only a
  // breached target earns the alarm, and even then as an outline, not a fill.
  const tones = {
    neutral: "border-wire bg-bg text-text-dim",
    good: "border-wire bg-bg text-text",
    risky: "border-quality-risky/60 bg-quality-risky/8 text-quality-risky",
    bad: "alarm",
    cream: "border-cream bg-cream text-ink",
  } as const;
  return (
    <span
      className={cn("label-xs inline-flex items-center border px-2 py-1", tones[tone], className)}
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
          "tap w-full border border-wire bg-surface-2 px-3.5 text-[15px] text-text placeholder:text-text-faint transition-colors duration-150 ease-out focus:border-cream/60",
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
  help?: string | undefined;
  error?: string | undefined;
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
          "flex h-5 w-5 shrink-0 items-center justify-center border",
          checked ? "border-cream bg-cream text-ink" : "border-wire bg-surface-2",
        )}
      >
        {checked && (
          <svg
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="3"
          >
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
      className="rule-x grid w-full border border-wire"
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
              "tap label-sm flex items-center justify-center gap-1.5 px-2 transition-colors duration-150 ease-out",
              active
                ? "bg-surface-2 text-text-bright"
                : "text-text-dim hover:bg-surface hover:text-text",
            )}
          >
            {o.color && (
              <span
                className="h-2 w-2 rounded-full"
                style={{ background: o.color }}
                aria-hidden="true"
              />
            )}
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
