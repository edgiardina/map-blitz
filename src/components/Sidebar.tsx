import { useMemo } from "react";
import { TournamentWithCoords } from "@/lib/matchplay";
import { ActivityFeed } from "./ActivityFeed";
import { TournamentCard } from "./TournamentCard";
import { Tv2 } from "lucide-react";

interface SidebarProps {
  tournaments: TournamentWithCoords[];
  selectedId: number | null;
  onSelect: (id: number) => void;
  isLoading: boolean;
  lastUpdated: Date | null;
  idleMode: boolean;
  onToggleIdle: () => void;
}

export function Sidebar({ tournaments, selectedId, onSelect, isLoading, lastUpdated, idleMode, onToggleIdle }: SidebarProps) {
  const active = tournaments.filter(t => t.status === "started");
  const other = tournaments.filter(t => t.status !== "started");
  const countryCount = useMemo(() => {
    const countries = new Set<string>();
    // Known 2-letter country codes and full names we might encounter
    const COUNTRY_CODES = new Set([
      "US", "USA", "CA", "GB", "UK", "DE", "FR", "ES", "IT", "NL", "BE", "AT",
      "CH", "SE", "NO", "DK", "FI", "PL", "CZ", "PT", "IE", "AU", "NZ", "JP",
      "KR", "BR", "MX", "AR", "CL", "CO", "ZA", "IN", "SG", "HK", "TW", "IL",
      "TR", "RU", "HU", "RO", "BG", "HR", "SK", "SI", "LT", "LV", "EE", "IS",
      "LU", "MT", "CY", "GR",
    ]);
    const COUNTRY_NAMES: Record<string, string> = {
      "UNITED STATES": "US", "CANADA": "CA", "NORWAY": "NO", "GERMANY": "DE",
      "FRANCE": "FR", "SPAIN": "ES", "ITALY": "IT", "AUSTRALIA": "AU",
      "UNITED KINGDOM": "GB", "NETHERLANDS": "NL", "SWEDEN": "SE",
      "DENMARK": "DK", "FINLAND": "FI", "POLAND": "PL", "BRAZIL": "BR",
      "MEXICO": "MX", "JAPAN": "JP", "NEW ZEALAND": "NZ", "IRELAND": "IE",
    };

    for (const t of tournaments) {
      let found = false;
      if (t.location?.address) {
        // Try the last comma-separated segment
        const parts = t.location.address.split(',');
        const last = parts[parts.length - 1]?.trim().toUpperCase();
        if (last) {
          // Check if it's a known country code (possibly with zip, e.g. "US" from "73127, US")
          const tokens = last.split(/\s+/);
          for (const tok of tokens) {
            if (COUNTRY_CODES.has(tok)) { countries.add(tok === "USA" ? "US" : tok === "UK" ? "GB" : tok); found = true; break; }
          }
          // Check full country name
          if (!found && COUNTRY_NAMES[last]) { countries.add(COUNTRY_NAMES[last]); found = true; }
        }
      }
      if (!found && t.organizer?.flag) {
        // Flag is like "us", "de", "us-mo" — take first 2 chars as country
        const code = t.organizer.flag.substring(0, 2).toUpperCase();
        if (COUNTRY_CODES.has(code)) countries.add(code);
      }
    }
    return countries.size;
  }, [tournaments]);

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
        <div className="flex items-center justify-between mt-3">
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${isLoading ? "bg-accent animate-pulse-glow" : "bg-neon-green"}`} />
            <span className="text-[10px] text-muted-foreground font-mono">
              {isLoading ? "UPDATING..." : lastUpdated ? `LIVE · ${lastUpdated.toLocaleTimeString()}` : "CONNECTING..."}
            </span>
          </div>
          {/* Idle mode toggle */}
          <button
            onClick={onToggleIdle}
            title={idleMode ? "Stop spotlight mode" : "Start spotlight mode"}
            className={`flex items-center gap-1.5 px-2 py-1 rounded text-[9px] font-display tracking-widest border transition-all duration-200 ${
              idleMode
                ? "border-primary/60 text-primary bg-primary/10 neon-border"
                : "border-border/40 text-muted-foreground/40 hover:border-border hover:text-muted-foreground"
            }`}
          >
            <Tv2 size={10} className={idleMode ? "animate-pulse" : ""} />
            SPOTLIGHT
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-2 p-4 border-b border-border">
        <div className="glass-panel p-3 text-center">
          <div className="font-display text-xl font-bold neon-text-cyan">{active.length}</div>
          <div className="text-[9px] text-muted-foreground tracking-wider mt-1">IN PROGRESS</div>
        </div>
        <div className="glass-panel p-3 text-center">
          <div className="font-display text-xl font-bold neon-text-magenta">{countryCount}</div>
          <div className="text-[9px] text-muted-foreground tracking-wider mt-1">COUNTRIES</div>
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
