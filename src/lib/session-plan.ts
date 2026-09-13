import type { Finding } from "@/lib/match-data";

export type DrillTemplateId = "passing" | "rondo" | "positional" | "match";

export type DrillPlan = {
  id: string;
  title: string;
  duration: string;
  type: string;
  description: string;
  template: DrillTemplateId;
  players: string;
  space: string;
  equipment: string;
  setup: string;
  rules: string[];
  why: string;
  cues: string[];
  harder: string[];
  easier: string[];
};

type SessionTheme = "better-option" | "press-2s" | "block-length" | "general";

function themeFor(findingId: string): SessionTheme {
  if (findingId === "better-option") return "better-option";
  if (findingId === "press-2s") return "press-2s";
  if (findingId === "block-length") return "block-length";
  return "general";
}

const themeCopy: Record<SessionTheme, { mechanic: string; why: string; cues: string[] }> = {
  "better-option": {
    mechanic: "scan and play forward when the line opens",
    why: "The decision rule rewards seeing the forward option before receiving, matching the missed passes in the game.",
    cues: ["Check both shoulders before the ball arrives", "First touch opens the forward lane", "Play forward when the next line is free"],
  },
  "press-2s": {
    mechanic: "press within two seconds after losing the ball",
    why: "The restart clock rehearses the exact reaction that was late after losses in the match.",
    cues: ["Nearest player steps in immediately", "Second defender blocks the forward pass", "Back line squeezes as the press begins"],
  },
  "block-length": {
    mechanic: "move together and keep the block compact",
    why: "The zone constraint keeps the units connected and reduces the long gaps found in the match.",
    cues: ["Back line moves as the ball travels", "Midfield stays connected to the press", "Far-side player narrows into the block"],
  },
  general: {
    mechanic: "recognise the next action before the ball arrives",
    why: "The repeated decision gives players a clear match action to recognise under pressure.",
    cues: ["Scan before receiving", "Support behind and beyond the ball", "React together when possession changes"],
  },
};

export function buildSessionPlan(finding: Finding, playerCount: number | undefined, version = 0): DrillPlan[] {
  const theme = themeFor(finding.id);
  const copy = themeCopy[theme];
  const players = playerCount ? `${playerCount}` : "—";
  const variation = version % 2 === 1;

  return [
    {
      id: "warm-up",
      title: "Warm-up",
      duration: "12 minutes",
      type: "Passing pattern",
      description: "Pass, scan and move through four gates before pressure arrives.",
      template: "passing",
      players: playerCount ? `${players} · groups of 4` : "—",
      space: "20 × 20 m",
      equipment: "Balls · 4 gates · bibs",
      setup: "20 × 20 m grid with four coloured gates, groups of four, one ball per group. Whole squad active.",
      rules: [
        "Receiver calls the colour of the free gate before the ball arrives.",
        "Wrong call means the ball goes back to the previous player.",
        variation ? "One defender becomes active after the third pass." : "One passive defender moves between the gates.",
      ],
      why: copy.why,
      cues: copy.cues,
      harder: ["Make the defender fully active", "Limit outside players to one touch", "Reduce the grid to 16 × 16 m"],
      easier: ["Remove the defender", "Allow two touches", "Keep the gates fixed and clearly marked"],
    },
    {
      id: "main-exercise",
      title: "Main exercise",
      duration: "20 minutes",
      type: "Possession",
      description: `A constrained small-sided game to ${copy.mechanic}.`,
      template: theme === "block-length" ? "positional" : "rondo",
      players: playerCount ? `${players} · 5v5 + neutral` : "—",
      space: "30 × 25 m",
      equipment: "Balls · 2 mini-goals · bibs",
      setup: "30 × 25 m grid with two mini-goals. Play five against five with one neutral player and spare balls nearby.",
      rules: [
        "A goal only counts after the team plays through the middle player.",
        theme === "press-2s" ? "After a loss, the nearest player has two seconds to press." : "The first look after receiving must be forward.",
        "If the forward route is closed, secure the ball and move to create a new line.",
        variation ? "Restart immediately from the coach after the ball leaves the area." : "Rotate the neutral player every two minutes.",
      ],
      why: `The constraint makes players ${copy.mechanic}. It turns the match finding into a repeated, visible action.`,
      cues: copy.cues,
      harder: ["Remove the neutral player", "Limit the team in possession to two touches", "Award two goals for a first-time forward pass"],
      easier: ["Add a second neutral player", "Widen the area by five metres", "Allow an unopposed restart"],
    },
    {
      id: "game",
      title: "Game",
      duration: "18 minutes",
      type: "Free play",
      description: "Normal football with one condition that carries the session theme into the game.",
      template: "match",
      players: playerCount ? `${players} · balanced teams` : "—",
      space: "Half pitch",
      equipment: "Balls · goals · bibs",
      setup: "Half pitch with normal goals and goalkeepers. Balance the teams and keep spare balls beside each goal.",
      rules: [
        `Normal rules; reward the team when they ${copy.mechanic}.`,
        "The coach only stops play for a clear repeat of the match finding.",
      ],
      why: "The single condition keeps the game realistic while asking players to transfer the trained action into match play.",
      cues: copy.cues.slice(0, 2),
      harder: ["Remove the bonus point", "Play with the offside line higher", "Restart from the goalkeeper under pressure"],
      easier: ["Use a neutral player with the team in possession", "Pause once to show the available option", "Make the pitch five metres wider"],
    },
  ];
}