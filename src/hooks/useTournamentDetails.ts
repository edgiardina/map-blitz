import { useState, useEffect, useCallback } from "react";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL
  || `https://${import.meta.env.VITE_SUPABASE_PROJECT_ID}.supabase.co/functions/v1`;
const apiKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

export interface GameData {
  gameId: number;
  arenaId: number | null;
  playerIds: number[];
  userIds: (number | null)[];
  resultPoints: string[] | null;
  resultPositions: number[] | null;
  status: string;
  roundId: number;
  startedAt: string | null;
}

export interface RoundData {
  roundId: number;
  name: string;
  index: number;
  status: string;
  completedAt: string | null;
}

export interface StandingData {
  playerId: number;
  position: number;
  points: number;
  pointsWithTiebreaker: number;
}

export interface PlayerData {
  playerId: number;
  name: string;
  ifpaId: number | null;
  claimedBy: number | null;
}

export interface TournamentDetails {
  rounds: RoundData[];
  games: GameData[];
  standings: StandingData[];
  players: PlayerData[];
  activeRound: RoundData | null;
  activeGames: GameData[];
}

async function fetchEndpoint(endpoint: string) {
  const res = await fetch(
    `${API_BASE_URL}/matchplay-proxy?endpoint=${encodeURIComponent(endpoint)}`,
    { headers: { apikey: apiKey, 'Content-Type': 'application/json' } }
  );
  if (!res.ok) return null;
  return res.json();
}

export function useTournamentDetails(tournamentId: number | null) {
  const [details, setDetails] = useState<TournamentDetails | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const load = useCallback(async (id: number) => {
    setIsLoading(true);
    try {
      const [roundsJson, gamesJson, standingsJson, tournamentJson] = await Promise.all([
        fetchEndpoint(`tournaments/${id}/rounds`),
        fetchEndpoint(`tournaments/${id}/games?per_page=100`),
        fetchEndpoint(`tournaments/${id}/standings`),
        fetchEndpoint(`tournaments/${id}?includePlayers=1`),
      ]);

      const rounds: RoundData[] = (roundsJson?.data ?? []).sort(
        (a: RoundData, b: RoundData) => a.index - b.index
      );
      const games: GameData[] = gamesJson?.data ?? [];
      const standings: StandingData[] = (standingsJson ?? []).sort(
        (a: StandingData, b: StandingData) => a.position - b.position
      );
      const players: PlayerData[] = tournamentJson?.data?.players ?? [];

      const activeRound = rounds.find(r => r.status === "started") ?? null;
      const activeGames = activeRound
        ? games.filter(g => g.roundId === activeRound.roundId && g.status !== "completed")
        : [];

      setDetails({ rounds, games, standings, players, activeRound, activeGames });
    } catch (e) {
      console.error("Failed to fetch tournament details:", e);
      setDetails(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!tournamentId) {
      setDetails(null);
      return;
    }
    load(tournamentId);
  }, [tournamentId, load]);

  return { details, isLoading };
}
