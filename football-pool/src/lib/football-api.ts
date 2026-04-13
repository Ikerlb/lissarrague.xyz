// Client for Football-Data.org API
// Docs: https://www.football-data.org/documentation/api

const BASE_URL = 'https://api.football-data.org/v4';

// World Cup 2026 competition code
const WORLD_CUP_ID = 2000;

type ApiMatch = {
  id: number;
  matchday: number;
  group: string | null;
  utcDate: string;
  venue: string | null;
  status: string;
  homeTeam: {
    name: string;
    crest: string;
  };
  awayTeam: {
    name: string;
    crest: string;
  };
  score: {
    fullTime: {
      home: number | null;
      away: number | null;
    };
  };
};

type ApiResponse = {
  matches: ApiMatch[];
  competition: {
    name: string;
  };
};

export async function fetchGroupStageMatches(apiKey: string): Promise<ApiMatch[]> {
  const response = await fetch(
    `${BASE_URL}/competitions/${WORLD_CUP_ID}/matches?stage=GROUP_STAGE`,
    {
      headers: {
        'X-Auth-Token': apiKey,
      },
    }
  );

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Football API error ${response.status}: ${text}`);
  }

  const data = (await response.json()) as ApiResponse;
  return data.matches;
}

export function computeResult(
  homeScore: number | null,
  awayScore: number | null
): 'L' | 'E' | 'V' | null {
  if (homeScore === null || awayScore === null) return null;
  if (homeScore > awayScore) return 'L';
  if (homeScore < awayScore) return 'V';
  return 'E';
}
