import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { AppHeader, Screen } from "@/components/ip/chrome";
import { Card, Field, Input, PrimaryButton } from "@/components/ip/primitives";
import { deletePlayer, fetchPlayers, savePlayer, setConsent, type ConsentStatus, type Player } from "@/lib/squad";

export const Route = createFileRoute("/_authenticated/squad")({
  head: () => ({
    meta: [
      { title: "Squad — Ipanema" },
      { name: "description", content: "Your players, their shirt numbers and whether they have agreed to a match record." },
      { property: "og:title", content: "Squad — Ipanema" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: SquadPage,
});

const POSITIONS = ["GK", "DF", "MF", "FW"];

/**
 * The squad: the coach's own list of players. Nothing here comes from the tracking; the tracker cannot tell
 * players apart across a match. Consent is recorded per player because match records are personal data —
 * without it a player is only ever a shirt number.
 */
function SquadPage() {
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState({ full_name: "", shirt: "", position: "", birth_year: "" });
  const [busy, setBusy] = useState(false);

  const reload = async () => {
    try {
      setPlayers(await fetchPlayers());
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load the squad");
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    void reload();
  }, []);

  const active = useMemo(() => players.filter((p) => p.active), [players]);
  const consented = active.filter((p) => p.consent_status === "given").length;

  const add = async () => {
    if (!draft.full_name.trim()) return;
    setBusy(true);
    try {
      await savePlayer({
        full_name: draft.full_name,
        shirt: draft.shirt ? Number(draft.shirt) : null,
        position: draft.position,
        birth_year: draft.birth_year ? Number(draft.birth_year) : null,
      });
      setDraft({ full_name: "", shirt: "", position: "", birth_year: "" });
      await reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save the player");
    } finally {
      setBusy(false);
    }
  };

  const consent = async (p: Player, status: ConsentStatus) => {
    await setConsent(p.id, status);
    await reload();
  };

  const remove = async (p: Player) => {
    if (!window.confirm(`Remove ${p.full_name} and every match record for them? This cannot be undone.`)) return;
    await deletePlayer(p.id);
    await reload();
  };

  return (
    <div className="min-h-screen bg-bg">
      <AppHeader backTo="/library" />
      <Screen className="tactical-grid min-h-[calc(100vh-64px)] py-7">
        <p className="section-kicker">Club</p>
        <h1 className="display mt-2 text-[28px] uppercase text-text">Squad</h1>
        <p className="mt-2 max-w-[62ch] text-[13px] text-text-dim">
          {active.length} players, {consented} with consent. A player without consent appears only as a shirt number;
          with it, their lineups and minutes build a record that follows them from match to match.
        </p>
        {error && (
          <p role="alert" className="mt-3 text-[13px] text-quality-bad">
            {error}
          </p>
        )}

        <div className="mt-5 grid gap-3 md:grid-cols-[1fr_320px]">
          <Card>
            <h2 className="display text-[16px] uppercase text-cream">Players</h2>
            {loading ? (
              <p className="mt-3 text-[13px] text-text-faint">Loading…</p>
            ) : active.length === 0 ? (
              <p className="mt-3 text-[13px] text-text-faint">No players yet. Add the squad on the right.</p>
            ) : (
              <ul className="mt-3 divide-y divide-wire-2">
                {active.map((p) => (
                  <li key={p.id} className="py-2.5 text-[13px]">
                    <div className="flex items-center gap-3">
                      <span className="num w-8 text-right text-text-faint">{p.shirt ?? "–"}</span>
                      <span className="flex-1 text-text">
                        {p.full_name}
                        {p.position && <span className="ml-2 text-text-faint">{p.position}</span>}
                        {p.birth_year && <span className="ml-2 text-text-faint">{p.birth_year}</span>}
                      </span>
                      <button type="button" onClick={() => void remove(p)} className="text-[12px] text-text-faint hover:text-quality-bad">
                        Remove
                      </button>
                    </div>
                    <div className="mt-1 pl-11">
                      <ConsentControl status={p.consent_status} onChange={(s) => void consent(p, s)} />
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card>
            <h2 className="display text-[16px] uppercase text-cream">Add a player</h2>
            <div className="mt-3 space-y-3">
              <Field label="Name">
                <Input value={draft.full_name} onChange={(e) => setDraft({ ...draft, full_name: e.target.value })} placeholder="First and last name" />
              </Field>
              <div className="grid grid-cols-3 gap-2">
                <Field label="Shirt">
                  <Input inputMode="numeric" value={draft.shirt} onChange={(e) => setDraft({ ...draft, shirt: e.target.value.replace(/\D/g, "") })} />
                </Field>
                <Field label="Position">
                  <select
                    value={draft.position}
                    onChange={(e) => setDraft({ ...draft, position: e.target.value })}
                    className="tap w-full border border-wire bg-surface-2 px-2 text-[15px] text-text"
                  >
                    <option value="">–</option>
                    {POSITIONS.map((x) => (
                      <option key={x} value={x}>
                        {x}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Born">
                  <Input inputMode="numeric" value={draft.birth_year} onChange={(e) => setDraft({ ...draft, birth_year: e.target.value.replace(/\D/g, "").slice(0, 4) })} placeholder="2009" />
                </Field>
              </div>
              <PrimaryButton type="button" onClick={() => void add()} disabled={busy || !draft.full_name.trim()} className="w-full">
                Add
              </PrimaryButton>
              <p className="text-[11.5px] text-text-faint">
                Only what a team sheet already holds. Consent is given by the player, or a guardian for a minor, and can
                be withdrawn any time; removing a player deletes their whole record.
              </p>
            </div>
          </Card>
        </div>
        <Link to="/library" className="mt-5 inline-block text-[13px] text-text-dim underline-offset-4 hover:underline">
          Back to the library
        </Link>
      </Screen>
    </div>
  );
}

function ConsentControl({ status, onChange }: { status: ConsentStatus; onChange: (s: ConsentStatus) => void }) {
  const label = status === "given" ? "Consent given" : status === "withdrawn" ? "Consent withdrawn" : "No consent";
  const tone = status === "given" ? "text-quality-good" : status === "withdrawn" ? "text-quality-bad" : "text-text-faint";
  return (
    <span className="flex items-center gap-2">
      <span className={`text-[12px] ${tone}`}>{label}</span>
      {status !== "given" ? (
        <button type="button" onClick={() => onChange("given")} className="text-[12px] text-accent-sea underline-offset-4 hover:underline">
          Record consent
        </button>
      ) : (
        <button type="button" onClick={() => onChange("withdrawn")} className="text-[12px] text-text-faint hover:text-text">
          Withdraw
        </button>
      )}
    </span>
  );
}
