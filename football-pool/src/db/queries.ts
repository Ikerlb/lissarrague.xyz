import type { Match, Participant, Pick } from '../types';

// --- Matches ---

export async function getAllMatches(db: D1Database): Promise<Match[]> {
  const { results } = await db
    .prepare('SELECT * FROM matches ORDER BY match_date ASC, group_name ASC')
    .all<Match>();
  return results;
}

export async function upsertMatch(
  db: D1Database,
  match: Omit<Match, 'id'>
): Promise<void> {
  await db
    .prepare(
      `INSERT INTO matches (api_match_id, matchday, group_name, home_team, away_team, home_crest, away_crest, match_date, venue, city, result, home_score, away_score, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(api_match_id) DO UPDATE SET
         home_team = excluded.home_team,
         away_team = excluded.away_team,
         home_crest = excluded.home_crest,
         away_crest = excluded.away_crest,
         match_date = excluded.match_date,
         venue = excluded.venue,
         city = excluded.city,
         result = excluded.result,
         home_score = excluded.home_score,
         away_score = excluded.away_score,
         status = excluded.status`
    )
    .bind(
      match.api_match_id,
      match.matchday,
      match.group_name,
      match.home_team,
      match.away_team,
      match.home_crest,
      match.away_crest,
      match.match_date,
      match.venue,
      match.city,
      match.result,
      match.home_score,
      match.away_score,
      match.status
    )
    .run();
}

// --- Participants ---

export async function getAllParticipants(db: D1Database): Promise<Participant[]> {
  const { results } = await db
    .prepare('SELECT * FROM participants ORDER BY name ASC')
    .all<Participant>();
  return results;
}

export async function getParticipantByCode(
  db: D1Database,
  encryptedCode: string
): Promise<Participant | null> {
  return db
    .prepare('SELECT * FROM participants WHERE encrypted_code = ?')
    .bind(encryptedCode)
    .first<Participant>();
}

export async function createParticipant(
  db: D1Database,
  name: string,
  pinHash: string,
  encryptedCode: string
): Promise<Participant> {
  const result = await db
    .prepare(
      'INSERT INTO participants (name, pin_hash, encrypted_code) VALUES (?, ?, ?) RETURNING *'
    )
    .bind(name, pinHash, encryptedCode)
    .first<Participant>();
  return result!;
}

export async function togglePaid(db: D1Database, id: number): Promise<void> {
  await db
    .prepare('UPDATE participants SET paid = CASE WHEN paid = 0 THEN 1 ELSE 0 END WHERE id = ?')
    .bind(id)
    .run();
}

export async function deleteParticipant(db: D1Database, id: number): Promise<void> {
  await db.prepare('DELETE FROM picks WHERE participant_id = ?').bind(id).run();
  await db.prepare('DELETE FROM participants WHERE id = ?').bind(id).run();
}

// --- Picks ---

export async function getPicksByParticipant(
  db: D1Database,
  participantId: number
): Promise<Pick[]> {
  const { results } = await db
    .prepare('SELECT * FROM picks WHERE participant_id = ?')
    .bind(participantId)
    .all<Pick>();
  return results;
}

export async function upsertPick(
  db: D1Database,
  participantId: number,
  matchId: number,
  pick: 'L' | 'E' | 'V'
): Promise<void> {
  await db
    .prepare(
      `INSERT INTO picks (participant_id, match_id, pick, updated_at)
       VALUES (?, ?, ?, datetime('now'))
       ON CONFLICT(participant_id, match_id) DO UPDATE SET
         pick = excluded.pick,
         updated_at = excluded.updated_at`
    )
    .bind(participantId, matchId, pick)
    .run();
}

// --- Scoring ---

export type LeaderboardEntry = {
  participant_id: number;
  name: string;
  paid: number;
  correct: number;
  total_picks: number;
  total_decided: number;
};

export async function getLeaderboard(db: D1Database): Promise<LeaderboardEntry[]> {
  const { results } = await db
    .prepare(
      `SELECT
        p.id as participant_id,
        p.name,
        p.paid,
        COALESCE(SUM(CASE WHEN pk.pick = m.result THEN 1 ELSE 0 END), 0) as correct,
        COUNT(pk.id) as total_picks,
        (SELECT COUNT(*) FROM matches WHERE result IS NOT NULL) as total_decided
      FROM participants p
      LEFT JOIN picks pk ON pk.participant_id = p.id
      LEFT JOIN matches m ON m.id = pk.match_id
      GROUP BY p.id
      ORDER BY correct DESC, p.name ASC`
    )
    .all<LeaderboardEntry>();
  return results;
}

export type ParticipantPickDetail = {
  match_id: number;
  group_name: string;
  home_team: string;
  away_team: string;
  match_date: string;
  result: string | null;
  home_score: number | null;
  away_score: number | null;
  pick: string | null;
};

export async function getParticipantPickDetails(
  db: D1Database,
  participantId: number
): Promise<ParticipantPickDetail[]> {
  const { results } = await db
    .prepare(
      `SELECT
        m.id as match_id,
        m.group_name,
        m.home_team,
        m.away_team,
        m.match_date,
        m.result,
        m.home_score,
        m.away_score,
        pk.pick
      FROM matches m
      LEFT JOIN picks pk ON pk.match_id = m.id AND pk.participant_id = ?
      ORDER BY m.match_date ASC`
    )
    .bind(participantId)
    .all<ParticipantPickDetail>();
  return results;
}
