# Quiniela Mundial 2026

Football pool app for World Cup 2026 group stage. Pick **Local**, **Empate**, or **Visita** for each match.

## Stack

- **Runtime**: Cloudflare Workers
- **Framework**: Hono
- **Database**: Cloudflare D1 (serverless SQLite)
- **Match Data**: Football-Data.org API
- **Local Dev**: Bun + Wrangler

## Setup

### 1. Install dependencies

```bash
bun install
```

### 2. Create a D1 database

```bash
npx wrangler d1 create football-pool-db
```

Copy the `database_id` from the output into `wrangler.toml`.

### 3. Run the migration

```bash
# Local
bun run db:migrate:local

# Remote (after deploy)
bun run db:migrate:remote
```

### 4. Set secrets

Create a `.dev.vars` file (see `.dev.vars.example`):

```
ADMIN_PASSWORD=your-password
ENCRYPTION_KEY=a-random-secret-string
FOOTBALL_API_KEY=your-key-from-football-data.org
```

For production, set these as Cloudflare Workers secrets:

```bash
npx wrangler secret put ADMIN_PASSWORD
npx wrangler secret put ENCRYPTION_KEY
npx wrangler secret put FOOTBALL_API_KEY
```

### 5. Run locally

```bash
bun run dev
```

### 6. Deploy

```bash
bun run deploy
```

## How it works

1. **Admin** (`/admin`) — Add participants (name + 6-digit PIN), sync matches from Football-Data.org, toggle payment status
2. **Personalized links** — Each participant gets a unique encrypted URL
3. **Picks** (`/pick?code=...`) — Participant enters PIN, picks L/E/V for each match
4. **Auto-lock** — Picks lock when each match kicks off (countdown timer)
5. **Leaderboard** (`/leaderboard`) — Public scoreboard with expandable pick details
6. **Auto-score** — Results sync from Football-Data.org API
