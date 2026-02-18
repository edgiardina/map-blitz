import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const IFPA_API_KEY = Deno.env.get('IFPA_API_KEY');
    if (!IFPA_API_KEY) {
      throw new Error('IFPA_API_KEY is not configured');
    }

    const url = new URL(req.url);
    const ifpaId = url.searchParams.get('ifpaId');

    if (!ifpaId) {
      return new Response(JSON.stringify({ error: 'ifpaId is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const apiUrl = `https://api.ifpapinball.com/v1/player/${ifpaId}?api_key=${IFPA_API_KEY}`;
    console.log(`Fetching IFPA player: ${ifpaId}`);

    const response = await fetch(apiUrl, {
      headers: { 'Accept': 'application/json' },
    });

    const data = await response.json();

    if (!response.ok) {
      console.error(`IFPA API error [${response.status}]:`, JSON.stringify(data));
      return new Response(JSON.stringify({ error: `IFPA API error: ${response.status}` }), {
        status: response.status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
