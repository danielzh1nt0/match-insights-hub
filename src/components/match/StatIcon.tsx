
import React from 'react';

export type StatIconName =
  | 'goal' | 'shot' | 'on-target' | 'corner'
  | 'free-kick' | 'offside' | 'foul' | 'attempt'
  | 'possession' | 'pass' | 'progressive-pass'
  | 'turnover-won' | 'turnover-lost' | 'high-turnover'
  | 'field-tilt' | 'press' | 'counter-press'
  | 'block-length' | 'line-height' | 'quality'
  | 'better-option' | 'run' | 'save'
  | 'substitution' | 'sequence';

type Props = {
  name: StatIconName;
  size?: number;
  color?: string;
  filled?: boolean;
};

export function StatIcon({ name, size = 24, color = 'var(--cream)', filled = false }: Props) {
  const common = {
    width: size,
    height: size,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: color,
    strokeWidth: 1.8,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
  };

  switch (name) {
    case 'goal':
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="9" />
          <path d="M12 8l2 2v4l-2 2-2-2v-4z" fill="{color}" />
        </svg>
      );
    case 'shot':
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="8" />
          <circle cx="12" cy="12" r="3" />
        </svg>
      );
    case 'on-target':
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="8" />
          <circle cx="12" cy="12" r="3" fill="{color}" />
        </svg>
      );
    case 'corner':
      return (
        <svg {...common}>
          <path d="M4 21V4l10 3-1 4 6 2-6 2 1 4-10-3z" />
        </svg>
      );
    case 'free-kick':
      return (
        <svg {...common}>
          <rect x="8" y="3" width="8" height="12" rx="4" />
          <circle cx="12" cy="7" r="1.5" />
          <path d="M12 15v4M10 19h4" />
        </svg>
      );
    case 'offside':
      return (
        <svg {...common}>
          <path d="M3 12h18" strokeDasharray="3 3" />
          <path d="M16 7l5 5-5 5" />
        </svg>
      );
    case 'foul':
      return (
        <svg {...common}>
          <path d="M12 2L3 14h9l-1 8 10-12h-9z" />
        </svg>
      );
    case 'attempt':
      return (
        <svg {...common}>
          <path d="M7 17L17 7M9 7h8v8" />
        </svg>
      );
    case 'possession':
      return (
        <svg {...common}>
          <path d="M12 2a10 10 0 100 20M12 12l9-4" />
        </svg>
      );
    case 'pass':
    case 'progressive-pass':
      return (
        <svg {...common}>
          <path d="M3 18h10l6-3 2-4-5-1-3-4-5 2v10z" />
          {name === 'progressive-pass' && <path d="M16 8l5-3-3 5" />}
        </svg>
      );
    case 'turnover-won':
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="9" />
          <path d="M8 13l4-4 4 4" />
        </svg>
      );
    case 'turnover-lost':
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="9" />
          <path d="M8 11l4 4 4-4" />
        </svg>
      );
    case 'high-turnover':
      return (
        <svg {...common}>
          <path d="M7 11l-4 4 4 4" />
          <path d="M17 17l4-4-4-4" />
          <path d="M3 15h18" />
          <path d="M17 5l3-3M20 5l-3-3" />
        </svg>
      );
    case 'field-tilt':
      return (
        <svg {...common}>
          <rect x="4" y="7" width="16" height="10" rx="1" />
          <path d="M4 12h16" />
        </svg>
      );
    case 'press':
      return (
        <svg {...common}>
          <path d="M4 12l5-5M4 12l5 5M20 12l-5-5M20 12l-5 5" />
        </svg>
      );
    case 'counter-press':
      return (
        <svg {...common}>
          <path d="M21 12a9 9 0 11-3-6.7" />
          <path d="M21 3v6h-6" />
        </svg>
      );
    case 'block-length':
      return (
        <svg {...common}>
          <path d="M3 12h18M7 8v8M17 8v8" />
        </svg>
      );
    case 'line-height':
      return (
        <svg {...common}>
          <path d="M12 3v18M8 7h8M8 17h8" />
        </svg>
      );
    case 'quality':
      return (
        <svg {...common}>
          <path d="M3 18h10l6-3 2-4-5-1-3-4-5 2v10z" />
          <path d="M3 20h16" />
        </svg>
      );
    case 'better-option':
      return (
        <svg {...common}>
          <path d="M3 18h10l6-3 2-4-5-1-3-4-5 2v10z" strokeDasharray="3 2" />
        </svg>
      );
    case 'run':
      return (
        <svg {...common}>
          <path d="M5 19L19 5M9 5h10v10" />
        </svg>
      );
    case 'save':
      return (
        <svg {...common}>
          <path d="M3 12h18M12 3v18" />
          <path d="M5 5l14 14" />
        </svg>
      );
    case 'substitution':
      return (
        <svg {...common}>
          <path d="M7 10l-4 4 4 4" />
          <path d="M17 14l4-4-4-4" />
          <path d="M3 14h18" />
        </svg>
      );
    case 'sequence':
      return (
        <svg {...common}>
          <circle cx="6" cy="12" r="2" />
          <circle cx="12" cy="12" r="2" />
          <circle cx="18" cy="12" r="2" />
        </svg>
      );
    default:
      return null;
  }
}
