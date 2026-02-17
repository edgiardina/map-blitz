import { useState } from "react";
import { TournamentMap } from "@/components/TournamentMap";
import { Sidebar } from "@/components/Sidebar";
import { useTournaments } from "@/hooks/useTournaments";

const Index = () => {
  const { tournaments, isLoading, error, lastUpdated } = useTournaments();
  const [selectedId, setSelectedId] = useState<number | null>(null);

  return (
    <div className="flex h-screen w-screen overflow-hidden">
      {/* Sidebar */}
      <div className="w-80 flex-shrink-0 z-10">
        <Sidebar
          tournaments={tournaments}
          selectedId={selectedId}
          onSelect={setSelectedId}
          isLoading={isLoading}
          lastUpdated={lastUpdated}
        />
      </div>

      {/* Map */}
      <div className="flex-1 relative">
        <TournamentMap
          tournaments={tournaments}
          selectedId={selectedId}
          onSelect={setSelectedId}
        />

        {/* Error overlay */}
        {error && (
          <div className="absolute top-4 right-4 glass-panel p-3 neon-border max-w-xs z-[1000]">
            <div className="text-[10px] font-display tracking-wider text-destructive mb-1">ERROR</div>
            <div className="text-[11px] text-foreground/70">{error}</div>
          </div>
        )}

        {/* Loading overlay on first load */}
        {isLoading && tournaments.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/80 backdrop-blur-sm z-[1000]">
            <div className="text-center">
              <div className="font-display text-sm neon-text-cyan animate-pulse-glow tracking-widest">
                SCANNING FREQUENCIES...
              </div>
              <div className="text-[10px] text-muted-foreground mt-2">
                Connecting to Matchplay Events
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Index;
