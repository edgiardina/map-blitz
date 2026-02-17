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

export async function fetchTournaments(): Promise<TournamentWithCoords[]> {
  const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
  const apiKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

  // Build date range: now to 7 days from now
  const now = new Date();
  const weekLater = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const dateInterval = `${now.toISOString()};${weekLater.toISOString()}`;

  const params = new URLSearchParams({
    endpoint: 'tournaments',
    status: 'started',
    dateInterval,
    sortAsc: 'true',
    page: '1',
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

  // Filter to tournaments with locations
  const withLocations = tournaments.filter(t => t.location);

  const results: TournamentWithCoords[] = [];

  for (const t of withLocations) {
    // Use lat/lng from API if available
    if (t.location!.lat != null && t.location!.lng != null) {
      results.push({ ...t, lat: t.location!.lat, lng: t.location!.lng });
      continue;
    }
    // Fallback to geocoding the address
    if (t.location!.address) {
      const coords = await geocodeAddress(t.location!.address);
      if (coords) {
        results.push({ ...t, lat: coords.lat, lng: coords.lng });
      }
    }
  }

  return results;
}
