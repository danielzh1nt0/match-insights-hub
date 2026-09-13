import { create } from "zustand";
import { persist } from "zustand/middleware";
import { DEFAULT_TARGETS, SAMPLE_MATCHES, type LibraryMatch } from "@/lib/sample-data";

export type Role = "Head coach" | "Assistant" | "Analyst";

export type Team = {
  id: string;
  name: string;
  ageGroup: string;
  colorA: string;
  colorB: string;
};

export type Club = { name: string; country: string; crestInitial: string };

type AppState = {
  hydrated: boolean;
  markHydrated: () => void;


  onboarded: boolean;
  club: Club;
  teams: Team[];
  targets: typeof DEFAULT_TARGETS;
  setClub: (club: Partial<Club>) => void;
  addTeam: (team: Team) => void;
  updateTeam: (id: string, patch: Partial<Team>) => void;
  removeTeam: (id: string) => void;
  setTargets: (t: Partial<typeof DEFAULT_TARGETS>) => void;
  completeOnboarding: () => void;

  matches: LibraryMatch[];
  addMatch: (m: LibraryMatch) => void;
  setMatchStatus: (id: string, status: LibraryMatch["status"]) => void;
  clearMatches: () => void;
  resetSampleMatches: () => void;
};

export const useApp = create<AppState>()(
  persist(
    (set) => ({
      hydrated: false,
      markHydrated: () => set({ hydrated: true }),


      onboarded: false,
      club: { name: "1. FC Köln P2009", country: "Germany", crestInitial: "K" },
      teams: [
        { id: "team-a", name: "1. FC Köln P2009", ageGroup: "P2009", colorA: "#ef4444", colorB: "#22c55e" },
      ],
      targets: DEFAULT_TARGETS,
      setClub: (club) => set((s) => ({ club: { ...s.club, ...club } })),
      addTeam: (team) => set((s) => ({ teams: [...s.teams, team] })),
      updateTeam: (id, patch) =>
        set((s) => ({ teams: s.teams.map((t) => (t.id === id ? { ...t, ...patch } : t)) })),
      removeTeam: (id) => set((s) => ({ teams: s.teams.filter((t) => t.id !== id) })),
      setTargets: (t) => set((s) => ({ targets: { ...s.targets, ...t } })),
      completeOnboarding: () => set({ onboarded: true }),

      matches: SAMPLE_MATCHES,
      addMatch: (m) => set((s) => ({ matches: [m, ...s.matches] })),
      setMatchStatus: (id, status) =>
        set((s) => ({ matches: s.matches.map((m) => (m.id === id ? { ...m, status } : m)) })),
      clearMatches: () => set({ matches: [] }),
      resetSampleMatches: () => set({ matches: SAMPLE_MATCHES }),
    }),
    {
      name: "ipanema-app",
      partialize: (s) => ({
        onboarded: s.onboarded,
        club: s.club,
        teams: s.teams,
        targets: s.targets,
        matches: s.matches,
      }),
      onRehydrateStorage: () => (state) => {
        state?.markHydrated();
      },
    },
  ),
);
