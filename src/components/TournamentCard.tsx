import { ExternalLink } from "lucide-react";
import { TournamentWithCoords } from "@/lib/matchplay";

interface TournamentCardProps {
  tournament: TournamentWithCoords;
  isSelected: boolean;
  onClick: () => void;
}

function getStatusClasses(status: string) {
  switch (status) {
    case "started": return "border-neon-cyan/30 bg-neon-cyan/5";
    case "planned": return "border-secondary/30 bg-secondary/5";
    default: return "border-border bg-muted/20";
  }
}

export function TournamentCard({ tournament, isSelected, onClick }: TournamentCardProps) {
  const formatType = (type: string) =>
    type.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

  return (
    <button
      onClick={onClick}
      className={`w-full text-left p-3 rounded-lg border transition-all duration-200 ${getStatusClasses(tournament.status)} ${
        isSelected
          ? "neon-border ring-1 ring-primary/30"
          : "hover:border-primary/20 hover:bg-primary/5"
      }`}
    >
      <div className="font-display text-[11px] font-semibold text-foreground leading-tight truncate">
        {tournament.name}
      </div>
      <div className="flex items-center gap-2 mt-1.5">
        <span className="text-[9px] text-muted-foreground truncate">
          📍 {tournament.location?.name || "Unknown"}
        </span>
      </div>
      <div className="flex items-center justify-between mt-1.5">
        <span className="text-[9px] font-mono text-muted-foreground">
          {formatType(tournament.type)}
        </span>
        <span className={`text-[9px] font-display font-bold tracking-wider ${
          tournament.status === "started" ? "neon-text-cyan" : "text-secondary"
        }`}>
          {tournament.status.toUpperCase()}
        </span>
      </div>
      <a
        href={`https://app.matchplay.events/tournaments/${tournament.tournamentId}`}
        target="_blank"
        rel="noopener noreferrer"
        onClick={(e) => e.stopPropagation()}
        className="mt-2 w-full inline-flex items-center justify-center gap-1 text-[9px] font-display tracking-widest text-muted-foreground hover:text-primary border border-border hover:border-primary/40 rounded py-1 transition-colors"
      >
        VIEW ON MATCHPLAY <ExternalLink size={8} />
      </a>
    </button>
  );
}
