import { useEffect, useRef, forwardRef, useImperativeHandle } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { TournamentWithCoords } from "@/lib/matchplay";

export interface TournamentMapHandle {
  fitAll: () => void;
  focusLatLng: (lat: number, lng: number) => void;
}

interface TournamentMapProps {
  tournaments: TournamentWithCoords[];
  selectedId: number | null;
  onSelect: (id: number) => void;
}

function getStatusColor(status: string): string {
  switch (status) {
    case "started": return "#00e5ff";
    case "planned": return "#ff4da6";
    case "completed": return "#ffc107";
    default: return "#00e5ff";
  }
}

function formatType(type: string) {
  return type.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function createPulsingIcon(status: string, isSelected: boolean) {
  const color = getStatusColor(status);
  const size = isSelected ? 20 : 14;
  const ringSize = isSelected ? 40 : 28;

  return L.divIcon({
    className: "",
    html: `
      <div style="position: relative; width: ${ringSize}px; height: ${ringSize}px; display: flex; align-items: center; justify-content: center;">
        <div class="pulse-ring" style="
          position: absolute;
          width: ${ringSize}px;
          height: ${ringSize}px;
          border-radius: 50%;
          border: 2px solid ${color};
          opacity: 0.6;
        "></div>
        <div class="pulse-marker" style="
          width: ${size}px;
          height: ${size}px;
          border-radius: 50%;
          background: ${color};
          box-shadow: 0 0 ${isSelected ? 20 : 12}px ${color}80, 0 0 ${isSelected ? 40 : 24}px ${color}40;
          cursor: pointer;
          position: relative;
          z-index: 2;
        "></div>
      </div>
    `,
    iconSize: [ringSize, ringSize],
    iconAnchor: [ringSize / 2, ringSize / 2],
  });
}

export const TournamentMap = forwardRef<TournamentMapHandle, TournamentMapProps>(
function TournamentMap({ tournaments, selectedId, onSelect }, ref) {
  const mapRef = useRef<L.Map | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const markersRef = useRef<Map<number, L.Marker>>(new Map());
  const fittedRef = useRef(false);
  const tournamentsRef = useRef(tournaments);
  tournamentsRef.current = tournaments;

  useImperativeHandle(ref, () => ({
    fitAll() {
      const map = mapRef.current;
      const ts = tournamentsRef.current;
      if (!map || ts.length === 0) return;
      const bounds = L.latLngBounds(ts.map(t => [t.lat, t.lng] as [number, number]));
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 12 });
    },
    focusLatLng(lat: number, lng: number) {
      const map = mapRef.current;
      if (!map) return;
      map.setView([lat, lng], Math.max(map.getZoom(), 12), { animate: true });
    },
  }));

  // Initialize map
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = L.map(containerRef.current, {
      center: [39.8283, -98.5795],
      zoom: 4,
      zoomControl: true,
    });

    L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/">CARTO</a>',
    }).addTo(map);

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Update markers (only when tournaments list changes, not on selection)
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    // Remove old markers
    markersRef.current.forEach((marker) => marker.remove());
    markersRef.current.clear();

    // Add new markers
    tournaments.forEach((t) => {
      const icon = createPulsingIcon(t.status, false);
      const marker = L.marker([t.lat, t.lng], { icon }).addTo(map);

      marker.bindTooltip(`
        <div style="font-family: 'Space Mono', monospace; min-width: 180px; padding: 2px 0;">
          <div style="font-family: 'Orbitron', sans-serif; font-size: 11px; font-weight: 700; color: ${getStatusColor(t.status)}; margin-bottom: 4px; line-height: 1.3;">
            ${t.name}
          </div>
          <div style="font-size: 10px; opacity: 0.7; margin-bottom: 2px;">📍 ${t.location?.name || "Unknown"}</div>
          <div style="font-size: 10px; opacity: 0.7;">🏆 ${formatType(t.type)}</div>
        </div>
      `, {
        className: "dark-tooltip",
        direction: "top",
        offset: [0, -8],
      });

      marker.bindPopup(`
        <div style="font-family: 'Space Mono', monospace; color: #b0e0e6; min-width: 200px; padding: 4px;">
          <div style="font-family: 'Orbitron', sans-serif; font-size: 13px; font-weight: 700; color: ${getStatusColor(t.status)}; margin-bottom: 6px;">
            ${t.name}
          </div>
          <div style="font-size: 11px; opacity: 0.7; margin-bottom: 4px;">📍 ${t.location?.name || "Unknown"}</div>
          <div style="font-size: 11px; opacity: 0.7; margin-bottom: 4px;">🏆 ${formatType(t.type)}</div>
          <div style="font-size: 11px; opacity: 0.7;">⏱ ${t.status.toUpperCase()}</div>
        </div>
      `, {
        className: "dark-popup",
      });

      marker.on("click", () => onSelect(t.tournamentId));
      markersRef.current.set(t.tournamentId, marker);
    });

    // Fit bounds on first load
    if (tournaments.length > 0 && !fittedRef.current) {
      const bounds = L.latLngBounds(tournaments.map(t => [t.lat, t.lng] as [number, number]));
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 12 });
      fittedRef.current = true;
    }
  }, [tournaments, onSelect]);

  // Update selected marker icon without recreating all markers
  const prevSelectedRef = useRef<number | null>(null);
  useEffect(() => {
    const prev = prevSelectedRef.current;
    const next = selectedId;

    if (prev !== null) {
      const marker = markersRef.current.get(prev);
      const t = tournaments.find(t => t.tournamentId === prev);
      if (marker && t) marker.setIcon(createPulsingIcon(t.status, false));
    }
    if (next !== null) {
      const marker = markersRef.current.get(next);
      const t = tournaments.find(t => t.tournamentId === next);
      if (marker && t) marker.setIcon(createPulsingIcon(t.status, true));
    }

    prevSelectedRef.current = next;
  }, [selectedId, tournaments]);

  // Fly to selected (manual click only, not idle mode which calls focusLatLng directly)
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !selectedId) return;

    const marker = markersRef.current.get(selectedId);
    if (marker) {
      marker.openPopup();
    }
  }, [selectedId]);

  return <div ref={containerRef} className="h-full w-full" />;
});
