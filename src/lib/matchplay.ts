import { supabase } from "@/integrations/supabase/client";

export interface Tournament {
  tournamentId: number;
  name: string;
  status: string;
  type: string;
  startUtc: string;
  startLocal: string;
  endUtc: string | null;
  completedAt: string | null;
  organizerId: number;
  locationId: number | null;
  seriesId: number | null;
  description: string | null;
  timezone: string;
  organizer: {
    userId: number;
    name: string;
    ifpaId: number | null;
    location: string;
    avatar: string | null;
  };
  location: {
    locationId: number;
    name: string;
    address: string | null;
    lat: number | null;
    lng: number | null;
  } | null;
}

export interface TournamentWithCoords extends Tournament {
  lat: number;
  lng: number;
}

// Geocoding cache
const geocodeCache = new Map<string, { lat: number; lng: number } | null>();

async function geocodeAddress(address: string): Promise<{ lat: number; lng: number } | null> {
  if (geocodeCache.has(address)) {
    return geocodeCache.get(address) || null;
  }
  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}&limit=1`,
      { headers: { 'User-Agent': 'MatchplayMapViewer/1.0' } }
    );
    const data = await response.json();
    if (data.length > 0) {
      const result = { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
      geocodeCache.set(address, result);
      return result;
    }
  } catch (e) {
    console.error('Geocode error:', e);
  }
  geocodeCache.set(address, null);
  return null;
}

// Max tournament duration in days before we consider it a league
const MAX_TOURNAMENT_DAYS = 3;

function isLikelyLeague(t: Tournament): boolean {
  // Exclude tournaments spanning more than MAX_TOURNAMENT_DAYS
  if (t.startUtc && t.endUtc) {
    const start = new Date(t.startUtc).getTime();
    const end = new Date(t.endUtc).getTime();
    const durationDays = (end - start) / (1000 * 60 * 60 * 24);
    if (durationDays > MAX_TOURNAMENT_DAYS) return true;
  }
  
  return false;
}

async function fetchAllPages(): Promise<Tournament[]> {
  const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
  const apiKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

  // Build dateInterval: Matchplay's "today" window is 05:00 UTC → 04:59:59 UTC next day.
  // If we're between midnight and 05:00 UTC, we're still in the previous day's window.
  const now = new Date();
  const anchorDate = new Date(now);
  if (now.getUTCHours() < 5) {
    anchorDate.setUTCDate(anchorDate.getUTCDate() - 1);
  }
  const start = new Date(Date.UTC(anchorDate.getUTCFullYear(), anchorDate.getUTCMonth(), anchorDate.getUTCDate(), 5, 0, 0, 0));
  const end = new Date(start.getTime() + 24 * 60 * 60 * 1000 - 1);
  const dateInterval = `${start.toISOString()};${end.toISOString()}`;

  let allTournaments: Tournament[] = [];
  let page = 1;
  let lastPage = 1;

  do {
    const params = new URLSearchParams({
      endpoint: 'tournaments',
      status: 'started',
      dateInterval,
      sortAsc: 'true',
      perPage: '100',
      page: String(page),
    });

    const response = await fetch(
      `https://${projectId}.supabase.co/functions/v1/matchplay-proxy?${params.toString()}`,
      {
        headers: {
          'apikey': apiKey,
          'Content-Type': 'application/json',
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to fetch tournaments: ${response.status}`);
    }

    const json = await response.json();
    const tournaments: Tournament[] = json?.data || [];
    allTournaments = allTournaments.concat(tournaments);

    // Get pagination info
    if (json?.meta?.last_page) {
      lastPage = json.meta.last_page;
    }

    page++;
  } while (page <= lastPage);

  return allTournaments;
}

export async function fetchTournaments(): Promise<TournamentWithCoords[]> {
  const tournaments = await fetchAllPages();

  // Filter out leagues and tournaments without locations
  const withLocations = tournaments.filter(t => t.location && !isLikelyLeague(t));

  const results: TournamentWithCoords[] = [];

  for (const t of withLocations) {
    if (t.location!.lat != null && t.location!.lng != null) {
      results.push({ ...t, lat: t.location!.lat, lng: t.location!.lng });
      continue;
    }
    if (t.location!.address) {
      const coords = await geocodeAddress(t.location!.address);
      if (coords) {
        results.push({ ...t, lat: coords.lat, lng: coords.lng });
      }
    }
  }

  return results;
}
