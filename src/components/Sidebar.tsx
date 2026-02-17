import { TournamentWithCoords } from "@/lib/matchplay";
import { ActivityFeed } from "./ActivityFeed";
import { TournamentCard } from "./TournamentCard";

interface SidebarProps {
  tournaments: TournamentWithCoords[];
  selectedId: number | null;
  onSelect: (id: number) => void;
  isLoading: boolean;
  lastUpdated: Date | null;
}

export function Sidebar({ tournaments, selectedId, onSelect, isLoading, lastUpdated }: SidebarProps) {
  const active = tournaments.filter(t => t.status === "started");
  const other = tournaments.filter(t => t.status !== "started");

  return (
    <div className="h-full flex flex-col bg-background/95 backdrop-blur-xl border-r border-border overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-border">
        <h1 className="font-display text-lg font-bold neon-text-cyan tracking-wider">
          MATCHPLAY
        </h1>
        <p className="font-display text-[10px] tracking-[0.3em] text-muted-foreground mt-0.5">
          LIVE TOURNAMENT MAP
        </p>
        <div className="flex items-center gap-2 mt-3">
          <div className={`w-2 h-2 rounded-full ${isLoading ? "bg-accent animate-pulse-glow" : "bg-neon-green"}`} />
          <span className="text-[10px] text-muted-foreground font-mono">
            {isLoading ? "UPDATING..." : lastUpdated ? `LIVE · ${lastUpdated.toLocaleTimeString()}` : "CONNECTING..."}
          </span>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-2 p-4 border-b border-border">
        <div className="glass-panel p-3 text-center">
          <div className="font-display text-xl font-bold neon-text-cyan">{active.length}</div>
          <div className="text-[9px] text-muted-foreground tracking-wider mt-1">IN PROGRESS</div>
        </div>
        <div className="glass-panel p-3 text-center">
          <div className="font-display text-xl font-bold neon-text-magenta">{tournaments.length}</div>
          <div className="text-[9px] text-muted-foreground tracking-wider mt-1">TOTAL</div>
        </div>
      </div>

      {/* Tournament List */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {active.length > 0 && (
          <>
            <div className="text-[10px] font-display tracking-[0.2em] text-neon-green px-1 mb-2">
              ● LIVE
            </div>
            {active.map(t => (
              <TournamentCard
                key={t.tournamentId}
                tournament={t}
                isSelected={selectedId === t.tournamentId}
                onClick={() => onSelect(t.tournamentId)}
              />
            ))}
          </>
        )}

        {other.length > 0 && (
          <>
            <div className="text-[10px] font-display tracking-[0.2em] text-secondary px-1 mt-4 mb-2">
              ◆ OTHER
            </div>
            {other.map(t => (
              <TournamentCard
                key={t.tournamentId}
                tournament={t}
                isSelected={selectedId === t.tournamentId}
                onClick={() => onSelect(t.tournamentId)}
              />
            ))}
          </>
        )}

        {tournaments.length === 0 && !isLoading && (
          <div className="text-center py-8 text-muted-foreground text-xs">
            No tournaments with mapped locations found.
          </div>
        )}
      </div>

      {/* Activity Feed */}
      <ActivityFeed tournaments={tournaments} />
    </div>
  );
}
