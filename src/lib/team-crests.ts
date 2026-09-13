import kolnCrest from "@/assets/fc-koln-crest.png.asset.json";
import wolfsburgCrest from "@/assets/wolfsburg-crest.png.asset.json";

function normaliseTeamName(name: string) {
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

export function crestForTeam(name: string) {
  const normalised = normaliseTeamName(name);

  if (normalised.includes("koln") || normalised.includes("cologne")) return kolnCrest.url;
  if (normalised.includes("wolfsburg")) return wolfsburgCrest.url;

  return undefined;
}