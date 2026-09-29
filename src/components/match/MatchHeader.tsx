import { Settings } from "lucide-react";
import { cn } from "@/lib/utils";

type Team = {
  id: "A" | "B";
  name: string;
  shortName: string;
  colour: string;
  crestUrl?: string | null;
};

function TeamTile({ team }: { team: Team }) {
  return (
    <div className="flex flex-col items-center gap-1.5">
      <div
        className={cn(
          "display-i grid h-12 w-12 place-items-center rounded-[8px] border-[1.5px] border-white/10 text-[22px] text-white",
          team.crestUrl && "bg-surface-2",
        )}
        style={team.crestUrl ? undefined : { background: team.colour }}
      >
        {team.crestUrl ? (
          <img src={team.crestUrl} alt="" className="h-[42px] w-[42px] object-contain" />
        ) : (
          team.id
        )}
      </div>
      <div className="text-[9px] font-bold uppercase tracking-[0.08em] text-text-faint">{team.shortName}</div>
    </div>
  );
}

export function MatchHeader({ home, away, scoreHome, scoreAway, periodLabel, attackDirection, attackTeam, durationSeconds, onSettingsTap }: {
  home: Team;
  away: Team;
  scoreHome: number;
  scoreAway: number;
  periodLabel: string;
  attackDirection: "left" | "right";
  attackTeam: string;
  durationSeconds: number;
  onSettingsTap: () => void;
}) {
  const duration = `${Math.floor(durationSeconds / 60)}:${Math.floor(durationSeconds % 60).toString().padStart(2, "0")}`;

  return (
    <div className="border-b border-wire-2 bg-surface px-5 pb-3 pt-4">
      <div className="flex items-center justify-between gap-2.5">
        <TeamTile team={home} />
        <div className="display-i num text-[44px] leading-none tracking-[0.02em] text-cream">
          {scoreHome} : {scoreAway}
        </div>
        <TeamTile team={away} />
      </div>

      <div className="mt-2.5 flex items-center justify-center gap-1.5 text-[11.5px] text-text-dim">
        <strong className="font-semibold">{periodLabel}</strong>
        <span className="opacity-50" aria-hidden="true">·</span>
        <span>{attackTeam} attack {attackDirection}</span>
        <span className="opacity-50" aria-hidden="true">·</span>
        <span className="num">{duration}</span>
        <button
          type="button"
          onClick={onSettingsTap}
          aria-label="Match setup"
          className="ml-1.5 grid h-11 w-11 place-items-center rounded-full border-[1.5px] border-wire bg-surface text-text-faint transition-colors hover:text-cream"
        >
          <Settings size={13} aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}
