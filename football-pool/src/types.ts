export type Env = {
  Bindings: {
    DB: D1Database;
    ADMIN_PASSWORD: string;
    ENCRYPTION_KEY: string;
    FOOTBALL_API_KEY: string;
  };
};

export type Match = {
  id: number;
  api_match_id: number | null;
  matchday: number | null;
  group_name: string;
  home_team: string;
  away_team: string;
  home_crest: string | null;
  away_crest: string | null;
  match_date: string;
  venue: string | null;
  city: string | null;
  result: 'L' | 'E' | 'V' | null;
  home_score: number | null;
  away_score: number | null;
  status: string;
};

export type Participant = {
  id: number;
  name: string;
  pin_hash: string;
  paid: number;
  encrypted_code: string;
  created_at: string;
};

export type Pick = {
  id: number;
  participant_id: number;
  match_id: number;
  pick: 'L' | 'E' | 'V';
  updated_at: string;
};
