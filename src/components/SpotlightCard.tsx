import { ExternalLink, Trophy, Globe, MapPin, X } from "lucide-react";
import { SpotlightPlayer } from "@/hooks/useIdleSpotlight";

interface SpotlightCardProps {
  player: SpotlightPlayer;
  progress: number; // 0–100
  onClose: () => void;
}

function RankBadge({ label, value }: { label: string; value: number | null }) {
  if (!value) return null;
  return (
    <div className="flex flex-col items-center glass-panel px-3 py-2 rounded">
      <span className="font-display text-sm font-bold neon-text-cyan">#{value.toLocaleString()}</span>
      <span className="text-[9px] text-muted-foreground tracking-wider mt-0.5">{label}</span>
    </div>
  );
}

export function SpotlightCard({ player, progress, onClose }: SpotlightCardProps) {
  const hasRanks = player.worldRank || player.countryRank || player.stateRank;

  return (
    <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-[1000] w-[340px] animate-fade-in pointer-events-auto">
      {/* Glow backdrop */}
      <div className="absolute inset-0 rounded-xl blur-xl bg-primary/10 pointer-events-none" />

      <div className="relative glass-panel rounded-xl border border-primary/30 overflow-hidden shadow-2xl">
        {/* Progress bar at top */}
        <div className="h-0.5 bg-muted w-full">
          <div
            className="h-full bg-primary transition-all duration-200 ease-linear"
            style={{ width: `${progress}%` }}
          />
        </div>

        <div className="p-4">
          {/* Header */}
          <div className="flex items-start justify-between mb-3">
            <div>
              <div className="text-[9px] font-display tracking-[0.25em] text-primary mb-1">
                ◆ PLAYER SPOTLIGHT
              </div>
              <div className="text-[10px] text-muted-foreground truncate max-w-[220px]">
                {player.tournament.name}
              </div>
              <div className="text-[9px] text-muted-foreground/60 truncate max-w-[220px]">
                📍 {player.tournament.location?.name}
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-muted-foreground hover:text-foreground transition-colors p-1 -mt-1 -mr-1"
            >
              <X size={12} />
            </button>
          </div>

          {/* Player info */}
          <div className="flex items-center gap-3">
            {/* Avatar */}
            <div className="flex-shrink-0 relative">
              {player.avatar ? (
                <img
                  src={player.avatar}
                  alt={player.name}
                  className="w-16 h-16 rounded-full object-cover border-2 border-primary/40"
                  style={{ boxShadow: "0 0 16px hsl(185 100% 50% / 0.3)" }}
                  onError={(e) => {
                    (e.currentTarget as HTMLImageElement).style.display = "none";
                    (e.currentTarget.nextSibling as HTMLElement)?.style?.removeProperty("display");
                  }}
                />
              ) : null}
              <div
                className="w-16 h-16 rounded-full border-2 border-primary/40 bg-muted flex items-center justify-center text-muted-foreground"
                style={{ display: player.avatar ? "none" : "flex", boxShadow: "0 0 16px hsl(185 100% 50% / 0.2)" }}
              >
                <span className="font-display text-lg font-bold text-primary/60">
                  {player.name.charAt(0).toUpperCase()}
                </span>
              </div>
              {player.tournamentPosition === 1 && (
                <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-accent flex items-center justify-center">
                  <Trophy size={9} className="text-accent-foreground" />
                </div>
              )}
            </div>

            {/* Name & details */}
            <div className="flex-1 min-w-0">
              <div className="font-display text-sm font-bold text-foreground leading-tight truncate">
                {player.name}
              </div>
              <div className="flex items-center gap-1.5 mt-1">
                {player.country && (
                  <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                    <Globe size={9} />
                    {player.country.toUpperCase()}
                  </span>
                )}
                <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                  <MapPin size={9} />
                  P{player.tournamentPosition}
                </span>
              </div>
              {player.ifpaId && (
                <div className="text-[9px] text-muted-foreground/60 mt-1">
                  IFPA #{player.ifpaId}
                </div>
              )}
            </div>
          </div>

          {/* Ranks */}
          {hasRanks && (
            <div className="flex items-center justify-center gap-2 mt-3">
              <RankBadge label="WORLD" value={player.worldRank} />
              <RankBadge label="COUNTRY" value={player.countryRank} />
              <RankBadge label="STATE" value={player.stateRank} />
            </div>
          )}

          {/* Footer links */}
          <div className="flex items-center justify-between mt-3 pt-3 border-t border-border">
            <a
              href={`https://app.matchplay.events/tournaments/${player.tournament.tournamentId}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-[9px] font-display tracking-widest text-muted-foreground hover:text-primary transition-colors"
            >
              TOURNAMENT <ExternalLink size={8} />
            </a>
            {player.profileUrl && (
              <a
                href={player.profileUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-[9px] font-display tracking-widest text-muted-foreground hover:text-primary transition-colors"
              >
                IFPA PROFILE <ExternalLink size={8} />
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
