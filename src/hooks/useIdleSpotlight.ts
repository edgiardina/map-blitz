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
    // Use organizer data which is already available in the tournament object
    const organizer = tournament.organizer;
    if (!organizer) return null;

    const ifpaId: number | null = organizer.ifpaId ?? null;
    let worldRank: number | null = null;
    let countryRank: number | null = null;
    let stateRank: number | null = null;
    let country: string | null = organizer.flag ?? null;
    const avatar: string | null = organizer.avatar ?? null;
    const name: string = organizer.name ?? "Unknown Player";

    // Fetch IFPA ranking data if we have an ifpaId
    if (ifpaId) {
      try {
        const userRes = await fetch(
          `https://${projectId}.supabase.co/functions/v1/matchplay-proxy?endpoint=users/${organizer.userId}&includeIfpa=1`,
          { headers: { apikey: apiKey, 'Content-Type': 'application/json' } }
        );
        if (userRes.ok) {
          const userJson = await userRes.json();
          const ifpa = userJson?.ifpa;
          if (ifpa) {
            worldRank = ifpa.rank ?? null;
            countryRank = ifpa.countryRank ?? null;
            stateRank = ifpa.stateRank ?? null;
            country = ifpa.countryCode ?? country;
          }
        }
      } catch {
        // IFPA fetch failed — use Matchplay data only
      }
    }

    return {
      name,
      ifpaId,
      avatar,
      worldRank,
      countryRank,
      stateRank,
      country,
      profileUrl: ifpaId ? `https://www.ifpapinball.com/player/view/player_id/${ifpaId}` : null,
      tournamentPosition: 1,
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
