import { useState, useEffect, useCallback, useRef } from "react";
import { TournamentWithCoords, fetchTournaments } from "@/lib/matchplay";

const POLL_INTERVAL = 5000;

export function useTournaments() {
  const [tournaments, setTournaments] = useState<TournamentWithCoords[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const load = useCallback(async () => {
    try {
      setIsLoading(true);
      const data = await fetchTournaments();
      setTournaments(data);
      setLastUpdated(new Date());
      setError(null);
    } catch (e) {
      console.error("Failed to fetch tournaments:", e);
      setError(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    intervalRef.current = setInterval(load, POLL_INTERVAL);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [load]);

  return { tournaments, isLoading, error, lastUpdated };
}
