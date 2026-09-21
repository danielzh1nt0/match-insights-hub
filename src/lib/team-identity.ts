import { shortTeamCode, type TeamIdentity } from "@/components/team/TeamToken";
import { crestForTeam } from "@/lib/team-crests";

/** One place that turns a match's team names and kit colours into crest-first identities (monogram fallback in TeamToken). */
export function teamIdentities(
  match: { teamA: string; teamB: string } | null | undefined,
  colours: { A: string; B: string },
): { A: TeamIdentity; B: TeamIdentity } | null {
  if (!match) return null;
  const make = (name: string, kitColour: string): TeamIdentity => {
    const crestUrl = crestForTeam(name);
    return { name, shortCode: shortTeamCode(name), kitColour, ...(crestUrl ? { crestUrl } : {}) };
  };
  return { A: make(match.teamA, colours.A), B: make(match.teamB, colours.B) };
}
