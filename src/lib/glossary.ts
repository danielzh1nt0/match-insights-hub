export type GlossaryTerm = {
  id: string;
  term: string;
  plain: string;
  why: string;
};

export const GLOSSARY: GlossaryTerm[] = [
  {
    id: "possession",
    term: "Time with the ball",
    plain: "The share of playing time your team had the ball at its feet.",
    why: "On its own it says little. It matters next to what you did with the ball.",
  },
  {
    id: "spell",
    term: "Spell with the ball",
    plain: "One unbroken run of your team keeping the ball, measured in seconds.",
    why: "Long spells mean the team can settle and pick a moment instead of rushing.",
  },
  {
    id: "turnover",
    term: "Ball lost, ball won",
    plain: "The moment the ball changes team, either away from you or back to you.",
    why: "The seconds either side of a turnover decide most goals in youth football.",
  },
  {
    id: "press-2s",
    term: "Pressure inside 2 seconds",
    plain: "How often the nearest player closed the ball down within two seconds of losing it.",
    why: "Quick pressure stops the counter before it starts. The default target is 60%.",
  },
  {
    id: "regain-5s",
    term: "Ball back inside 5 seconds",
    plain: "How often you won the ball back within five seconds of losing it.",
    why: "It shows whether the pressure actually worked, not just that it happened.",
  },
  {
    id: "high-turnover",
    term: "Ball won high up",
    plain: "A ball won in the opponent's half, close to their goal.",
    why: "These are the cheapest chances you will get all match.",
  },
  {
    id: "better-option",
    term: "Better pass available",
    plain: "A moment where a clearly better pass was open and a safer one was played instead.",
    why: "It shows decisions, not technique. A handful per match is normal.",
  },
  {
    id: "risky-pass",
    term: "Risky pass",
    plain: "A pass that was completed but had a real chance of being cut out.",
    why: "Risk in the right area is fine. Risk in your own third is not.",
  },
  {
    id: "block-length",
    term: "Length back to front",
    plain: "The distance in metres from your deepest player to your highest player.",
    why: "The longer the team, the more space opens in the middle. Default ceiling 38 m.",
  },
  {
    id: "compact-band",
    term: "Width side to side",
    plain: "The distance in metres from your widest player on one side to the other.",
    why: "Too narrow and they play around you, too wide and they play through you.",
  },
  {
    id: "shape-snapshot",
    term: "Shape snapshot",
    plain: "A freeze-frame of where all ten outfield players stood, taken every 30 seconds.",
    why: "Snapshots make a habit visible without watching the whole match again.",
  },
  {
    id: "heat-map",
    term: "Heat map",
    plain: "Brighter areas of the pitch are where more time was spent.",
    why: "It answers where the team or a player actually played, not where they were meant to.",
  },
  {
    id: "momentum",
    term: "Momentum strip",
    plain: "A bar per slice of the match, leaning to whichever team was on top.",
    why: "It finds the spells worth rewatching in seconds.",
  },
  {
    id: "target",
    term: "Target",
    plain: "The number you set for your team in club setup, shown in cream.",
    why: "Findings compare what happened against your target, not a league average.",
  },
  {
    id: "finding",
    term: "Finding",
    plain: "One habit the analysis noticed, with the number, your target and the moments behind it.",
    why: "Findings are what turn into Tuesday's session.",
  },
];
