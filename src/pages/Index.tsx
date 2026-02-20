import { useState, useRef, useCallback, useMemo } from "react";
import { TournamentMap, TournamentMapHandle } from "@/components/TournamentMap";
import { Sidebar } from "@/components/Sidebar";
import { SpotlightCard } from "@/components/SpotlightCard";
import { TournamentDetailPanel } from "@/components/TournamentDetailPanel";
import { useTournaments } from "@/hooks/useTournaments";
import { useIdleSpotlight } from "@/hooks/useIdleSpotlight";
import { useTournamentDetails } from "@/hooks/useTournamentDetails";
import { Maximize2 } from "lucide-react";

const Index = () => {
  const { tournaments, isLoading, error, lastUpdated } = useTournaments();
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [idleMode, setIdleMode] = useState(false);
  const mapRef = useRef<TournamentMapHandle>(null);

  const handleSelect = useCallback((id: number) => {
    setSelectedId(id);
    if (idleMode) setIdleMode(false);
    const t = tournaments.find(t => t.tournamentId === id);
    if (t) {
      mapRef.current?.focusLatLng(t.lat, t.lng);
    }
  }, [tournaments, idleMode]);

  const handleResetView = useCallback(() => {
    setSelectedId(null);
    mapRef.current?.fitAll();
  }, []);

  const handleFocusTournament = useCallback((id: number, lat: number, lng: number) => {
    mapRef.current?.flyToLocation(lat, lng);
    setTimeout(() => mapRef.current?.openTournamentPopup(id), 3800);
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

  // Resolve which tournament to show details for (selected or spotlighted)
  const activeTournamentId = idleMode
    ? (spotlight?.tournament?.tournamentId ?? null)
    : selectedId;

  const selectedTournament = useMemo(
    () => tournaments.find(t => t.tournamentId === activeTournamentId) ?? null,
    [tournaments, activeTournamentId]
  );

  const { details, isLoading: detailsLoading } = useTournamentDetails(activeTournamentId);

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

        {/* Reset view button */}
        {selectedId !== null && !idleMode && (
          <button
            onClick={handleResetView}
            className="absolute top-4 left-1/2 -translate-x-1/2 z-[1000] flex items-center gap-2 px-3 py-2 text-[11px] font-display tracking-widest glass-panel neon-border hover:opacity-80 transition-opacity"
          >
            <Maximize2 size={12} />
            RESET VIEW
          </button>
        )}

        {/* Tournament detail panel — shown both when selected and during spotlight */}
        {selectedTournament && details && (
          <TournamentDetailPanel
            tournament={selectedTournament}
            details={details}
            isLoading={detailsLoading}
            onClose={idleMode ? () => setIdleMode(false) : handleResetView}
          />
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
