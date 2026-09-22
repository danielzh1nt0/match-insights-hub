import bayernCrest from "@/assets/bayern-crest.png.asset.json";
import bvbCrest from "@/assets/bvb-crest.png.asset.json";
import kolnCrest from "@/assets/fc-koln-crest.png.asset.json";
import wolfsburgCrest from "@/assets/wolfsburg-crest.png.asset.json";
import aikCrest from "@/assets/aik-crest.png.asset.json";
import brommapojkarnaCrest from "@/assets/brommapojkarna-official-crest.png.asset.json";
import sollentunaCrest from "@/assets/sollentuna-fk-crest.png.asset.json";
import djursholmsCrest from "@/assets/djursholms-fotboll-crest.png.asset.json";
import vasalundCrest from "@/assets/vasalund-crest.png.asset.json";
import hammarbyCrest from "@/assets/hammarby-crest.png.asset.json";
import tabyCrest from "@/assets/taby-fotboll-crest.png.asset.json";

function normaliseTeamName(name: string) {
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

export function crestForTeam(name: string) {
  const normalised = normaliseTeamName(name);
  const words = normalised.replace(/[^a-z0-9]+/g, " ").trim().split(/\s+/).filter(Boolean);
  const hasCode = (code: string) => words.includes(code);

  if (normalised.includes("sollentuna") || hasCode("sfk")) return sollentunaCrest.url;
  if (normalised.includes("brommapojkarna") || normalised.includes("bpsod") || normalised.includes("bromma") || hasCode("bp"))
    return brommapojkarnaCrest.url;
  if (normalised.includes("djursholm") || hasCode("fcd")) return djursholmsCrest.url;
  if (normalised.includes("vasalund")) return vasalundCrest.url;
  if (normalised.includes("hammarby") || hasCode("hif")) return hammarbyCrest.url;
  if (normalised.includes("taby")) return tabyCrest.url;
  if (hasCode("aik") || normalised.includes("allmanna idrottsklubben")) return aikCrest.url;
  if (normalised.includes("koln") || normalised.includes("cologne")) return kolnCrest.url;
  if (normalised.includes("wolfsburg")) return wolfsburgCrest.url;
  if (
    normalised.includes("bvb") ||
    normalised.includes("dortmund") ||
    normalised.includes("borussia d")
  )
    return bvbCrest.url;
  if (normalised.includes("bayern") || normalised.includes("fcb") || normalised.includes("munchen"))
    return bayernCrest.url;

  return undefined;
}

/** Majority crest colour for known clubs; saved match colours remain the fallback. */
export function colourForTeam(name: string, fallback: string) {
  const normalised = normaliseTeamName(name);
  if (normalised.includes("bvb") || normalised.includes("dortmund") || normalised.includes("borussia d")) return "var(--club-bvb)";
  if (normalised.includes("bayern") || normalised.includes("fcb") || normalised.includes("munchen")) return "var(--club-bayern)";
  return fallback;
}
