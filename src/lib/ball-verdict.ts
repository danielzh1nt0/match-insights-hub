/**
 * One reliability verdict for every screen. The strict grade (ball_grade) wins whenever the pipeline wrote one;
 * older matches without it fall back to the single ball_reliable flag.
 */
export function ballVerdict(summary: Record<string, unknown> | null | undefined): { possession: boolean; events: boolean } {
  const grade = summary?.["ball_grade"] as { possession_ok?: boolean; events_ok?: boolean } | null | undefined;
  if (grade && typeof grade === "object") return { possession: grade.possession_ok === true, events: grade.events_ok === true };
  const ok = summary?.["ball_reliable"] !== false;
  return { possession: ok, events: ok };
}
