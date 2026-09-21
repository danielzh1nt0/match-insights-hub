import { create } from "zustand";
import { persist } from "zustand/middleware";

export const KIT_COLOURS = [
  { name: "Black", value: "#0a0a0a" }, { name: "White", value: "#f5f5f5" },
  { name: "Navy", value: "#1e3a5f" }, { name: "Royal blue", value: "#2563eb" },
  { name: "Sky blue", value: "#60a5fa" }, { name: "Red", value: "#dc2626" },
  { name: "Maroon", value: "#7f1d1d" }, { name: "Green", value: "#16a34a" },
  { name: "Yellow", value: "#eab308" }, { name: "Orange", value: "#ea580c" },
] as const;

export function clubMonogram(name: string) {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (!words.length) return "";
  return (words.length === 1 ? words[0]?.slice(0, 2) : `${words[0]?.[0] ?? ""}${words[1]?.[0] ?? ""}`).toUpperCase();
}

export function suggestedTeamName(club: string, ageGroup: string, country: string) {
  if (!ageGroup) return "";
  if (country.toLowerCase().includes("swed")) {
    const age = Number(ageGroup.replace(/\D/g, ""));
    return Number.isFinite(age) ? `P${new Date().getFullYear() - age}` : ageGroup;
  }
  return `${club.trim()} ${ageGroup}`.trim();
}

type RegistrationState = {
  clubName: string; ground: string; country: string; crestMode: "empty" | "monogram" | "image";
  crestImage: string | null; ageGroup: string; teamName: string; teamNameEdited: boolean; kitColour: string;
  set: (patch: Partial<Omit<RegistrationState, "set" | "reset">>) => void; reset: () => void;
};

const initial = { clubName: "", ground: "", country: "Sweden", crestMode: "empty" as const, crestImage: null, ageGroup: "", teamName: "", teamNameEdited: false, kitColour: "#1e3a5f" };

export const useRegistration = create<RegistrationState>()(persist((set) => ({
  ...initial, set: (patch) => set(patch), reset: () => set(initial),
}), { name: "ipanema-registration" }));
