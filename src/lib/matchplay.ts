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
    flag: string | null;
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

// Default API base URL points to Lovable Cloud; change this one line to self-host:
// VITE_API_BASE_URL=http://localhost:5000
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL
  || `https://${import.meta.env.VITE_SUPABASE_PROJECT_ID}.supabase.co/functions/v1`;

async function fetchAllPages(): Promise<Tournament[]> {
  const apiKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

  const response = await fetch(
    `${API_BASE_URL}/tournaments`,
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
  return json?.data || [];
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
