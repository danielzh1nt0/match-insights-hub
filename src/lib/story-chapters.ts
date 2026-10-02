/**
 * The chapters of a match story.
 *
 * One list, used by the rail at the top of Insights and by the story viewer
 * itself, so a bubble always opens the chapter it is labelled with.
 */
export type ChapterId = "score" | "strength" | "player" | "improve" | "verdict";

export type Chapter = {
  id: ChapterId;
  /** The word under the bubble. Short enough not to wrap at 78px. */
  nav: string;
  /** What kind of chapter this is, for the rail's eyebrow: "01 · Final". */
  kind: string;
  durationMs: number;
};

export const STORY_CHAPTERS: Chapter[] = [
  { id: "score", nav: "The match", kind: "Final", durationMs: 7000 },
  { id: "strength", nav: "What worked", kind: "Tactical", durationMs: 7500 },
  { id: "player", nav: "Who stood out", kind: "Tracking", durationMs: 7500 },
  { id: "improve", nav: "The one thing", kind: "Core deficit", durationMs: 9000 },
  { id: "verdict", nav: "Tuesday", kind: "Action", durationMs: 8000 },
];

export function chapterIndex(id: string | undefined) {
  const found = STORY_CHAPTERS.findIndex((chapter) => chapter.id === id);
  return found === -1 ? 0 : found;
}
