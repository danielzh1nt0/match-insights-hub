import { MiniPitch, type PitchHeat } from "./MiniPitch";
type Props = { heat: PitchHeat[]; attackLabel?: string; aspectRatio?: string; ariaLabel?: string };
export function HeatMap({ heat, attackLabel, aspectRatio, ariaLabel = "Team heat map" }: Props) {
  return <MiniPitch heat={heat} {...(attackLabel ? { attackLabel } : {})} {...(aspectRatio ? { aspectRatio } : {})} ariaLabel={ariaLabel} />;
}
