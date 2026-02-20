import { useState, useEffect, useRef, useCallback } from "react";
import { TournamentWithCoords } from "@/lib/matchplay";

const CYCLE_DURATION_MS = 30_000;
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL
  || `https://${import.meta.env.VITE_SUPABASE_PROJECT_ID}.supabase.co/functions/v1`;
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

async function fetchUserProfile(userId: number) {
  const userRes = await fetch(
    `${API_BASE_URL}/matchplay-proxy?endpoint=users/${userId}&includeIfpa=1`,
    { headers: { apikey: apiKey, 'Content-Type': 'application/json' } }
  );
  if (!userRes.ok) return null;
  return userRes.json();
}

async function fetchIfpaAvatar(ifpaId: number): Promise<string | null> {
  // IFPA profile images follow a known URL pattern
  const url = `https://www.ifpapinball.com/images/profiles/players/${ifpaId}.jpg`;
  try {
    // Verify the image actually exists with a HEAD-like check via image preload
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => resolve(url);
      img.onerror = () => resolve(null);
      img.src = url;
      // Timeout after 3 seconds
      setTimeout(() => resolve(null), 3000);
    });
  } catch {
    return null;
  }
}

function scorePlayer(avatar: string | null, worldRank: number | null): number {
  let score = 0;
  if (avatar) score += 100;                          // strong bonus for having a picture
  if (worldRank && worldRank > 0) score += Math.max(0, 500 - worldRank); // higher rank = better score
  return score;
}

async function fetchTournamentTopPlayer(tournament: TournamentWithCoords): Promise<SpotlightPlayer | null> {
  try {
    // Fetch tournament details with players via the proxy
    const tRes = await fetch(
      `${API_BASE_URL}/matchplay-proxy?endpoint=tournaments/${tournament.tournamentId}&includePlayers=1`,
      { headers: { apikey: apiKey, 'Content-Type': 'application/json' } }
    );
    if (!tRes.ok) {
      console.warn(`Spotlight: failed to fetch tournament ${tournament.tournamentId} (${tRes.status}), skipping player details`);
      // Return a basic spotlight without player details
      return {
        name: "Tournament Player",
        ifpaId: null,
        avatar: null,
        worldRank: null,
        countryRank: null,
        stateRank: null,
        country: null,
        profileUrl: null,
        tournamentPosition: 1,
        tournament,
      };
    }

    const tJson = await tRes.json();
    const allPlayers: Array<{
      playerId: number;
      name: string;
      ifpaId: number | null;
      claimedBy: number | null;
    }> = tJson?.data?.players ?? [];

    if (allPlayers.length === 0) {
      return {
        name: "Tournament Player",
        ifpaId: null,
        avatar: null,
        worldRank: null,
        countryRank: null,
        stateRank: null,
        country: null,
        profileUrl: null,
        tournamentPosition: 1,
        tournament,
      };
    }

    // Prefer players with claimed accounts (have profiles/avatars), shuffle for variety
    const claimed = allPlayers.filter(p => p.claimedBy != null);
    const candidates = claimed.length > 0 ? claimed : allPlayers;
    const shuffled = [...candidates].sort(() => Math.random() - 0.5);
    const batch = shuffled.slice(0, 6);

    // Fetch profiles in parallel
    const profiles = await Promise.all(
      batch.map(async (p) => {
        if (!p.claimedBy) return { player: p, userJson: null };
        try {
          const userJson = await fetchUserProfile(p.claimedBy);
          return { player: p, userJson };
        } catch {
          return { player: p, userJson: null };
        }
      })
    );

    // Score each candidate, fetching IFPA avatar as fallback
    const scored = await Promise.all(
      profiles.map(async ({ player, userJson }) => {
        let avatar: string | null = userJson?.user?.avatar ?? null;
        const ifpa = userJson?.ifpa;
        const worldRank: number | null = ifpa?.rank ?? null;
        const countryRank: number | null = ifpa?.countryRank ?? null;
        const stateRank: number | null = ifpa?.stateRank ?? null;
        const country: string | null = ifpa?.countryCode ?? userJson?.user?.flag ?? null;

        // Fallback: fetch IFPA profile photo if no Matchplay avatar
        if (!avatar && (player.ifpaId || ifpa?.ifpaId)) {
          const id = player.ifpaId || ifpa?.ifpaId;
          avatar = await fetchIfpaAvatar(id);
        }

        return {
          player,
          avatar,
          worldRank,
          countryRank,
          stateRank,
          country,
          score: scorePlayer(avatar, worldRank),
        };
      })
    );

    scored.sort((a, b) => b.score - a.score);
    const best = scored[0];

    const position = allPlayers.findIndex(p => p.playerId === best.player.playerId) + 1;

    return {
      name: best.player.name ?? "Unknown Player",
      ifpaId: best.player.ifpaId ?? null,
      avatar: best.avatar,
      worldRank: best.worldRank,
      countryRank: best.countryRank,
      stateRank: best.stateRank,
      country: best.country,
      profileUrl: best.player.ifpaId ? `https://www.ifpapinball.com/players/view.php?p=${best.player.ifpaId}` : null,
      tournamentPosition: position,
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

  const wasActiveRef = useRef(false);

  useEffect(() => {
    if (!isActive) {
      wasActiveRef.current = false;
      clearTimers();
      setSpotlight(null);
      setProgress(0);
      onResetView();
      return;
    }

    const validTourns = tournaments.filter(t => t.status === "started");
    if (validTourns.length === 0) return;

    // Only reset index when first activating, not on subsequent tournament refreshes
    if (!wasActiveRef.current) {
      indexRef.current = 0;
      wasActiveRef.current = true;
      runCycle(validTourns);
    }

    // Always restart the interval so it references the latest tournament list
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      runCycle(validTourns);
    }, CYCLE_DURATION_MS);

    return clearTimers;
  }, [isActive, tournaments, runCycle, clearTimers, onResetView]);

  return { spotlight, progress };
}
