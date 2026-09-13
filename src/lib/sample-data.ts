export type MatchStatus = "ready" | "processing" | "failed";

export type LibraryMatch = {
  id: string;
  teamA: string;
  teamB: string;
  label?: string;
  date: string;
  competition: string;
  durationS: number;
  status: MatchStatus;
  scoreA: number;
  scoreB: number;
  tags: string[];
  summary: {
    possession: [number, number];
    turnovers: [number, number];
    shots: [number, number];
  };
};

export const SAMPLE_MATCHES: LibraryMatch[] = [
  {
    id: "koln-wolfsburg-2026-09-12",
    teamA: "1. FC Köln",
    teamB: "Wolfsburg",
    label: "Bundesliga sample",
    date: "2026-09-12",
    competition: "Bundesliga sample",
    durationS: 47,
    status: "ready",
    scoreA: 1,
    scoreB: 0,
    tags: ["P2009", "home"],
    summary: {
      possession: [52, 48],
      turnovers: [14, 11],
      shots: [6, 3],
    },
  },
  {
    id: "koln-training-2026-09-06",
    teamA: "1. FC Köln",
    teamB: "Bochum",
    date: "2026-09-06",
    competition: "Friendly",
    durationS: 2700,
    status: "processing",
    scoreA: 0,
    scoreB: 0,
    tags: ["P2009", "away"],
    summary: {
      possession: [0, 0],
      turnovers: [0, 0],
      shots: [0, 0],
    },
  },
  {
    id: "koln-mainz-2026-08-30",
    teamA: "1. FC Köln",
    teamB: "Mainz",
    date: "2026-08-30",
    competition: "Bundesliga sample",
    durationS: 2640,
    status: "failed",
    scoreA: 2,
    scoreB: 2,
    tags: ["P2009", "home"],
    summary: {
      possession: [0, 0],
      turnovers: [0, 0],
      shots: [0, 0],
    },
  },
];

export function matchTitle(m: LibraryMatch) {
  return `${m.teamA} – ${m.teamB}`;
}

export function formatClock(totalSeconds: number) {
  const m = Math.floor(totalSeconds / 60);
  const s = Math.floor(totalSeconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export const DEFAULT_TARGETS = {
  pressWithin2s: 60,
  regainWithin5s: 60,
  blockLengthCeiling: 38,
};

export const TARGET_COPY = [
  {
    key: "pressWithin2s" as const,
    name: "Press within 2 s",
    value: "60%",
    explain: "Share of losses where first pressure arrives inside two seconds.",
  },
  {
    key: "regainWithin5s" as const,
    name: "Regain within 5 s",
    value: "60%",
    explain: "Share of losses recovered inside five seconds.",
  },
  {
    key: "blockLengthCeiling" as const,
    name: "Block length ceiling",
    value: "38 m",
    explain: "Findings flag when the team gets longer than this from back to front.",
  },
];

export const PROCESSING_STAGES = [
  { label: "Reading the pitch", seconds: 2 },
  { label: "Finding players", seconds: 4 },
  { label: "Following the ball", seconds: 6 },
  { label: "Working out possession", seconds: 8 },
  { label: "Writing findings", seconds: 10 },
];
