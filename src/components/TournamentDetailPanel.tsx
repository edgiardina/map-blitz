import { X, Trophy, Users, Zap, ChevronRight } from "lucide-react";
import { TournamentDetails, PlayerData, GameData, RoundData } from "@/hooks/useTournamentDetails";
import { TournamentWithCoords } from "@/lib/matchplay";
import { ScrollArea } from "@/components/ui/scroll-area";

interface TournamentDetailPanelProps {
  tournament: TournamentWithCoords;
  details: TournamentDetails;
  isLoading: boolean;
  onClose: () => void;
}

function getPlayerName(playerId: number, players: PlayerData[]): string {
  return players.find(p => p.playerId === playerId)?.name ?? `Player ${playerId}`;
}

function GameCard({ game, players, roundName }: { game: GameData; players: PlayerData[]; roundName?: string }) {
  const isActive = game.status !== "completed";

  return (
    <div className={`glass-panel p-3 rounded-lg ${isActive ? "neon-border" : "border-border/50"}`}>
      {roundName && (
        <div className="text-[8px] font-display tracking-widest text-muted-foreground/60 mb-1.5">
          {roundName.toUpperCase()}
        </div>
      )}
      <div className="space-y-1">
        {game.playerIds.map((pid, i) => {
          const name = getPlayerName(pid, players);
          const points = game.resultPoints?.[i];
          const isWinner = game.resultPositions?.[0] === pid;

          return (
            <div key={pid} className="flex items-center justify-between text-[11px]">
              <span className={`truncate flex-1 ${isWinner ? "text-primary font-bold" : "text-foreground/80"}`}>
                {isWinner && <span className="text-accent mr-1">▸</span>}
                {name}
              </span>
              {points && (
                <span className={`font-mono text-[10px] ml-2 ${isWinner ? "neon-text-cyan" : "text-muted-foreground"}`}>
                  {parseFloat(points).toFixed(1)}
                </span>
              )}
            </div>
          );
        })}
      </div>
      {isActive && (
        <div className="mt-2 flex items-center gap-1">
          <div className="w-1.5 h-1.5 rounded-full bg-neon-green animate-pulse" />
          <span className="text-[8px] font-display tracking-widest text-neon-green">IN PROGRESS</span>
        </div>
      )}
    </div>
  );
}

function StandingsTable({ standings, players }: { standings: TournamentDetails["standings"]; players: PlayerData[] }) {
  const top = standings.slice(0, 10);

  return (
    <div className="space-y-1">
      {top.map((s, i) => {
        const name = getPlayerName(s.playerId, players);
        return (
          <div
            key={s.playerId}
            className={`flex items-center gap-2 text-[11px] px-2 py-1.5 rounded ${
              i < 3 ? "glass-panel" : ""
            }`}
          >
            <span className={`font-mono w-5 text-right text-[10px] ${
              i === 0 ? "neon-text-gold" : i < 3 ? "text-primary" : "text-muted-foreground"
            }`}>
              {s.position}
            </span>
            <span className="flex-1 truncate text-foreground/90">{name}</span>
            <span className="font-mono text-[10px] text-muted-foreground">
              {s.points}pts
            </span>
          </div>
        );
      })}
    </div>
  );
}

function RoundTimeline({ rounds }: { rounds: RoundData[] }) {
  return (
    <div className="flex items-center gap-1 overflow-x-auto pb-1">
      {rounds.map((r, i) => {
        const isActive = r.status === "started";
        const isDone = r.status === "completed";

        return (
          <div key={r.roundId} className="flex items-center">
            <div
              className={`px-2 py-1 rounded text-[8px] font-display tracking-wider whitespace-nowrap ${
                isActive
                  ? "bg-primary/20 text-primary neon-border"
                  : isDone
                  ? "bg-muted text-muted-foreground"
                  : "bg-muted/50 text-muted-foreground/40"
              }`}
            >
              {r.name.toUpperCase()}
            </div>
            {i < rounds.length - 1 && (
              <ChevronRight size={10} className="text-muted-foreground/30 mx-0.5 flex-shrink-0" />
            )}
          </div>
        );
      })}
    </div>
  );
}

export function TournamentDetailPanel({ tournament, details, isLoading, onClose }: TournamentDetailPanelProps) {
  const { activeRound, activeGames, rounds, standings, players, games } = details;

  // Get recently completed games if no active games
  const displayGames = activeGames.length > 0
    ? activeGames.slice(0, 6)
    : games
        .filter(g => g.status === "completed")
        .sort((a, b) => (b.startedAt ?? "").localeCompare(a.startedAt ?? ""))
        .slice(0, 4);

  const displayRoundName = activeRound?.name ?? "Recent Games";

  return (
    <div className="absolute top-4 right-4 z-[1000] w-[320px] animate-fade-in pointer-events-auto">
      {/* Glow */}
      <div className="absolute inset-0 rounded-xl blur-xl bg-primary/8 pointer-events-none" />

      <div className="relative glass-panel rounded-xl border border-primary/20 overflow-hidden shadow-2xl max-h-[calc(100vh-120px)] flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-border flex-shrink-0">
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0">
              <div className="text-[9px] font-display tracking-[0.25em] text-primary mb-1">
                ◆ TOURNAMENT DETAILS
              </div>
              <h3 className="font-display text-xs font-bold text-foreground leading-tight truncate">
                {tournament.name}
              </h3>
              <div className="text-[10px] text-muted-foreground mt-1 truncate">
                📍 {tournament.location?.name ?? "Unknown"}
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-muted-foreground hover:text-foreground transition-colors p-1 -mt-1 -mr-1 flex-shrink-0"
            >
              <X size={14} />
            </button>
          </div>

          {/* Round timeline */}
          {rounds.length > 0 && (
            <div className="mt-3">
              <RoundTimeline rounds={rounds} />
            </div>
          )}
        </div>

        <ScrollArea className="flex-1">
          <div className="p-4 space-y-4">
            {/* Active / Recent Games */}
            {displayGames.length > 0 && (
              <div>
                <div className="flex items-center gap-1.5 mb-2">
                  <Zap size={10} className={activeGames.length > 0 ? "text-neon-green" : "text-muted-foreground"} />
                  <span className="text-[9px] font-display tracking-widest text-muted-foreground">
                    {activeGames.length > 0 ? "LIVE MATCHES" : "RECENT MATCHES"}
                  </span>
                </div>
                <div className="space-y-2">
                  {displayGames.map(g => (
                    <GameCard key={g.gameId} game={g} players={players} />
                  ))}
                </div>
              </div>
            )}

            {/* Standings */}
            {standings.length > 0 && (
              <div>
                <div className="flex items-center gap-1.5 mb-2">
                  <Trophy size={10} className="text-accent" />
                  <span className="text-[9px] font-display tracking-widest text-muted-foreground">
                    STANDINGS
                  </span>
                </div>
                <StandingsTable standings={standings} players={players} />
              </div>
            )}

            {/* Player count */}
            <div className="flex items-center gap-1.5 pt-2 border-t border-border">
              <Users size={10} className="text-muted-foreground" />
              <span className="text-[10px] text-muted-foreground">
                {players.length} players · {rounds.length} rounds · {games.length} games
              </span>
            </div>

            {/* Matchplay link */}
            <a
              href={`https://app.matchplay.events/tournaments/${tournament.tournamentId}`}
              target="_blank"
              rel="noopener noreferrer"
              className="block text-center text-[9px] font-display tracking-widest text-muted-foreground hover:text-primary transition-colors py-2"
            >
              VIEW ON MATCHPLAY ↗
            </a>
          </div>
        </ScrollArea>
      </div>
    </div>
  );
}
