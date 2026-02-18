import { useState, useEffect, useRef, useCallback } from "react";
import { TournamentWithCoords } from "@/lib/matchplay";

const CYCLE_DURATION_MS = 30_000;
const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
const apiKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

export interface SpotlightPlayer {
  name: string;
  ifpaId: number | null;
  avatar: string | null;
  worldRank: number | null;
  countryRank: number | null;
  stateRank: number | null;
  country: string | null;
  profileUrl: string | null;
  tournamentPosition: number;
  tournament: TournamentWithCoords;
}

async function fetchTournamentTopPlayer(tournament: TournamentWithCoords): Promise<SpotlightPlayer | null> {
  try {
    const res = await fetch(
      `https://${projectId}.supabase.co/functions/v1/matchplay-proxy?endpoint=tournaments/${tournament.tournamentId}/players&include=user`,
      { headers: { apikey: apiKey, 'Content-Type': 'application/json' } }
    );
    if (!res.ok) return null;
    const json = await res.json();
    const players: any[] = json?.data || [];

    // Sort by position (ascending) and find first player with an ifpaId
    const sorted = [...players].sort((a, b) => (a.position ?? 999) - (b.position ?? 999));
    const top = sorted.find(p => p.user?.ifpaId) || sorted[0];
    if (!top) return null;

    const ifpaId: number | null = top.user?.ifpaId ?? null;
    let worldRank: number | null = null;
    let countryRank: number | null = null;
    let stateRank: number | null = null;
    let country: string | null = top.user?.flag ?? null;
    let avatar: string | null = top.user?.avatar ?? null;

    // Fetch IFPA data if we have an ifpaId
    if (ifpaId) {
      try {
        const ifpaRes = await fetch(
          `https://${projectId}.supabase.co/functions/v1/ifpa-proxy?ifpaId=${ifpaId}`,
          { headers: { apikey: apiKey, 'Content-Type': 'application/json' } }
        );
        if (ifpaRes.ok) {
          const ifpaJson = await ifpaRes.json();
          const player = ifpaJson?.player;
          if (player) {
            worldRank = parseInt(player.rankings?.world_rank) || null;
            countryRank = parseInt(player.rankings?.country_rank) || null;
            stateRank = parseInt(player.rankings?.state_rank) || null;
            country = player.country_code ?? country;
            // Use IFPA photo if available and Matchplay avatar is missing
            if (!avatar && player.player_photo_url) {
              avatar = player.player_photo_url;
            }
          }
        }
      } catch {
        // IFPA fetch failed — use Matchplay data only
      }
    }

    return {
      name: top.user?.name ?? top.name ?? "Unknown Player",
      ifpaId,
      avatar,
      worldRank,
      countryRank,
      stateRank,
      country,
      profileUrl: ifpaId ? `https://www.ifpapinball.com/player/view/player_id/${ifpaId}` : null,
      tournamentPosition: top.position ?? 1,
      tournament,
    };
  } catch {
    return null;
  }
}

export function useIdleSpotlight(
  tournaments: TournamentWithCoords[],
  isActive: boolean,
  onFocusTournament: (id: number, lat: number, lng: number) => void,
  onResetView: () => void,
) {
  const [spotlight, setSpotlight] = useState<SpotlightPlayer | null>(null);
  const [progress, setProgress] = useState(0); // 0–100
  const indexRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const progressRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef<number>(0);

  const clearTimers = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (progressRef.current) clearInterval(progressRef.current);
    timerRef.current = null;
    progressRef.current = null;
  }, []);

  const runCycle = useCallback(async (tourns: TournamentWithCoords[]) => {
    if (tourns.length === 0) return;
    const t = tourns[indexRef.current % tourns.length];
    indexRef.current++;

    // Zoom map
    onFocusTournament(t.tournamentId, t.lat, t.lng);

    // Clear previous spotlight while loading
    setSpotlight(null);
    setProgress(0);
    startTimeRef.current = Date.now();

    // Fetch player data
    const player = await fetchTournamentTopPlayer(t);
    setSpotlight(player);

    // Start progress bar
    if (progressRef.current) clearInterval(progressRef.current);
    progressRef.current = setInterval(() => {
      const elapsed = Date.now() - startTimeRef.current;
      setProgress(Math.min((elapsed / CYCLE_DURATION_MS) * 100, 100));
    }, 200);
  }, [onFocusTournament]);

  useEffect(() => {
    if (!isActive) {
      clearTimers();
      setSpotlight(null);
      setProgress(0);
      onResetView();
      return;
    }

    const validTourns = tournaments.filter(t => t.status === "started");
    if (validTourns.length === 0) return;

    indexRef.current = 0;
    runCycle(validTourns);

    timerRef.current = setInterval(() => {
      runCycle(validTourns);
    }, CYCLE_DURATION_MS);

    return clearTimers;
  }, [isActive, tournaments, runCycle, clearTimers, onResetView]);

  return { spotlight, progress };
}
