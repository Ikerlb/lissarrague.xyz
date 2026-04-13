CREATE TABLE IF NOT EXISTS matches (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  api_match_id INTEGER UNIQUE,
  matchday INTEGER,
  group_name TEXT NOT NULL,
  home_team TEXT NOT NULL,
  away_team TEXT NOT NULL,
  home_crest TEXT,
  away_crest TEXT,
  match_date TEXT NOT NULL,
  venue TEXT,
  city TEXT,
  result TEXT CHECK(result IN ('L', 'E', 'V') OR result IS NULL),
  home_score INTEGER,
  away_score INTEGER,
  status TEXT DEFAULT 'SCHEDULED'
);

CREATE TABLE IF NOT EXISTS participants (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  pin_hash TEXT NOT NULL,
  paid INTEGER DEFAULT 0,
  encrypted_code TEXT NOT NULL UNIQUE,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS picks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  participant_id INTEGER NOT NULL,
  match_id INTEGER NOT NULL,
  pick TEXT NOT NULL CHECK(pick IN ('L', 'E', 'V')),
  updated_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (participant_id) REFERENCES participants(id),
  FOREIGN KEY (match_id) REFERENCES matches(id),
  UNIQUE(participant_id, match_id)
);

CREATE INDEX IF NOT EXISTS idx_picks_participant ON picks(participant_id);
CREATE INDEX IF NOT EXISTS idx_picks_match ON picks(match_id);
CREATE INDEX IF NOT EXISTS idx_matches_date ON matches(match_date);
