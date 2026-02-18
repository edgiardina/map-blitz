import { useState, useRef, useCallback } from "react";
import { TournamentMap, TournamentMapHandle } from "@/components/TournamentMap";
import { Sidebar } from "@/components/Sidebar";
import { SpotlightCard } from "@/components/SpotlightCard";
import { useTournaments } from "@/hooks/useTournaments";
import { useIdleSpotlight } from "@/hooks/useIdleSpotlight";
import { Maximize2 } from "lucide-react";

const Index = () => {
  const { tournaments, isLoading, error, lastUpdated } = useTournaments();
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [idleMode, setIdleMode] = useState(false);
  const mapRef = useRef<TournamentMapHandle>(null);

  const handleSelect = useCallback((id: number) => {
    setSelectedId(id);
  }, []);

  const handleResetView = useCallback(() => {
    setSelectedId(null);
    mapRef.current?.fitAll();
  }, []);

  const handleFocusTournament = useCallback((id: number, lat: number, lng: number) => {
    // During idle mode, only move the map — don't update selectedId which causes
    // cascading marker re-renders and the "spazzing" effect
    mapRef.current?.focusLatLng(lat, lng);
    // Open the popup a beat after the pan animation starts
    setTimeout(() => mapRef.current?.openTournamentPopup(id), 600);
  }, []);

  const handleToggleIdle = () => {
    setIdleMode(prev => !prev);
  };

  const { spotlight, progress } = useIdleSpotlight(
    tournaments,
    idleMode,
    handleFocusTournament,
    handleResetView,
  );

  return (
    <div className="flex h-screen w-screen overflow-hidden">
      {/* Sidebar */}
      <div className="w-80 flex-shrink-0 z-10">
        <Sidebar
          tournaments={tournaments}
          selectedId={selectedId}
          onSelect={handleSelect}
          isLoading={isLoading}
          lastUpdated={lastUpdated}
          idleMode={idleMode}
          onToggleIdle={handleToggleIdle}
        />
      </div>

      {/* Map */}
      <div className="flex-1 relative">
        <TournamentMap
          ref={mapRef}
          tournaments={tournaments}
          selectedId={selectedId}
          onSelect={handleSelect}
        />

        {/* Reset view button — only visible when an event is selected and not in idle mode */}
        {selectedId !== null && !idleMode && (
          <button
            onClick={handleResetView}
            className="absolute top-4 right-4 z-[1000] flex items-center gap-2 px-3 py-2 text-[11px] font-display tracking-widest glass-panel neon-border hover:opacity-80 transition-opacity"
          >
            <Maximize2 size={12} />
            RESET VIEW
          </button>
        )}

        {/* Spotlight card (idle mode) */}
        {idleMode && spotlight && (
          <SpotlightCard
            player={spotlight}
            progress={progress}
            onClose={() => setIdleMode(false)}
          />
        )}

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
