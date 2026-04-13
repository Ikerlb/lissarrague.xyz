import { html } from 'hono/html';

export function layout(title: string, body: string, extraHead: string = '') {
  return html`<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title} — Quiniela Mundial 2026</title>
  <style>
    :root {
      --bg: #0f1117;
      --bg-card: #1a1d27;
      --bg-card-alt: #222636;
      --border: #2e3347;
      --text: #e4e6f0;
      --text-muted: #8b8fa3;
      --accent: #6c5ce7;
      --accent-hover: #7e70ed;
      --green: #00b894;
      --red: #e17055;
      --yellow: #fdcb6e;
      --gold: #f9ca24;
      --silver: #a0a0a0;
      --bronze: #cd7f32;
      --radius: 10px;
    }

    * { margin: 0; padding: 0; box-sizing: border-box; }

    body {
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      background: var(--bg);
      color: var(--text);
      min-height: 100vh;
      line-height: 1.6;
    }

    .container {
      max-width: 900px;
      margin: 0 auto;
      padding: 20px;
    }

    header {
      text-align: center;
      padding: 30px 0 20px;
      border-bottom: 1px solid var(--border);
      margin-bottom: 30px;
    }

    header h1 {
      font-size: 1.8rem;
      font-weight: 700;
      background: linear-gradient(135deg, var(--accent), #a29bfe);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
    }

    header .subtitle {
      color: var(--text-muted);
      font-size: 0.9rem;
      margin-top: 4px;
    }

    nav {
      display: flex;
      justify-content: center;
      gap: 16px;
      margin-top: 16px;
    }

    nav a {
      color: var(--text-muted);
      text-decoration: none;
      font-size: 0.85rem;
      padding: 6px 14px;
      border-radius: 6px;
      transition: all 0.2s;
    }

    nav a:hover, nav a.active {
      color: var(--text);
      background: var(--bg-card);
    }

    .card {
      background: var(--bg-card);
      border: 1px solid var(--border);
      border-radius: var(--radius);
      padding: 24px;
      margin-bottom: 20px;
    }

    .card h2 {
      font-size: 1.1rem;
      margin-bottom: 16px;
      color: var(--text);
    }

    .group-header {
      font-size: 0.8rem;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 1.5px;
      color: var(--accent);
      padding: 12px 0 8px;
      border-bottom: 1px solid var(--border);
      margin-bottom: 12px;
    }

    .match-row {
      display: grid;
      grid-template-columns: 1fr auto 1fr;
      align-items: center;
      gap: 12px;
      padding: 14px 0;
      border-bottom: 1px solid var(--border);
    }

    .match-row:last-child { border-bottom: none; }

    .team {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 0.9rem;
    }

    .team.home { justify-content: flex-end; text-align: right; }
    .team.away { justify-content: flex-start; }

    .team img.crest {
      width: 24px;
      height: 24px;
      object-fit: contain;
    }

    .match-info {
      text-align: center;
      min-width: 120px;
    }

    .match-score {
      font-size: 1.1rem;
      font-weight: 700;
    }

    .match-meta {
      font-size: 0.7rem;
      color: var(--text-muted);
      line-height: 1.4;
    }

    .pick-buttons {
      display: flex;
      gap: 4px;
      justify-content: center;
      margin-top: 6px;
    }

    .pick-btn {
      padding: 4px 12px;
      border: 1px solid var(--border);
      border-radius: 6px;
      background: var(--bg);
      color: var(--text-muted);
      font-size: 0.75rem;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.15s;
    }

    .pick-btn:hover:not(:disabled):not(.selected) {
      border-color: var(--accent);
      color: var(--text);
    }

    .pick-btn.selected {
      background: var(--accent);
      border-color: var(--accent);
      color: white;
    }

    .pick-btn.correct {
      background: var(--green);
      border-color: var(--green);
      color: white;
    }

    .pick-btn.incorrect {
      background: var(--red);
      border-color: var(--red);
      color: white;
      opacity: 0.7;
    }

    .pick-btn:disabled {
      opacity: 0.4;
      cursor: not-allowed;
    }

    .countdown {
      font-size: 0.7rem;
      color: var(--yellow);
      font-variant-numeric: tabular-nums;
    }

    .match-locked {
      font-size: 0.7rem;
      color: var(--text-muted);
      font-style: italic;
    }

    /* Leaderboard */
    .leaderboard-table {
      width: 100%;
      border-collapse: collapse;
    }

    .leaderboard-table th {
      text-align: left;
      padding: 10px 12px;
      font-size: 0.75rem;
      text-transform: uppercase;
      letter-spacing: 1px;
      color: var(--text-muted);
      border-bottom: 2px solid var(--border);
    }

    .leaderboard-table td {
      padding: 12px;
      border-bottom: 1px solid var(--border);
      font-size: 0.9rem;
    }

    .leaderboard-table tr:hover {
      background: var(--bg-card-alt);
    }

    .rank { font-weight: 700; width: 40px; }
    .rank-1 { color: var(--gold); }
    .rank-2 { color: var(--silver); }
    .rank-3 { color: var(--bronze); }

    .badge {
      display: inline-block;
      padding: 2px 8px;
      border-radius: 4px;
      font-size: 0.7rem;
      font-weight: 600;
    }

    .badge-paid { background: rgba(0,184,148,0.15); color: var(--green); }
    .badge-unpaid { background: rgba(225,112,85,0.15); color: var(--red); }

    /* Forms */
    input, select {
      background: var(--bg);
      border: 1px solid var(--border);
      color: var(--text);
      padding: 10px 14px;
      border-radius: 8px;
      font-size: 0.9rem;
      width: 100%;
      outline: none;
      transition: border 0.2s;
    }

    input:focus { border-color: var(--accent); }

    label {
      display: block;
      font-size: 0.8rem;
      color: var(--text-muted);
      margin-bottom: 6px;
    }

    .form-group { margin-bottom: 16px; }

    button, .btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      padding: 10px 20px;
      border: none;
      border-radius: 8px;
      font-size: 0.85rem;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s;
      text-decoration: none;
    }

    .btn-primary {
      background: var(--accent);
      color: white;
    }

    .btn-primary:hover { background: var(--accent-hover); }

    .btn-secondary {
      background: var(--bg-card-alt);
      color: var(--text);
      border: 1px solid var(--border);
    }

    .btn-secondary:hover { border-color: var(--accent); }

    .btn-danger {
      background: rgba(225,112,85,0.15);
      color: var(--red);
    }

    .btn-sm { padding: 6px 12px; font-size: 0.75rem; }

    .btn-icon {
      padding: 6px 10px;
      background: var(--bg-card-alt);
      color: var(--text-muted);
      border: 1px solid var(--border);
      border-radius: 6px;
    }

    .btn-icon:hover { color: var(--text); border-color: var(--accent); }

    /* Admin table */
    .admin-table {
      width: 100%;
      border-collapse: collapse;
    }

    .admin-table th {
      text-align: left;
      padding: 8px 12px;
      font-size: 0.75rem;
      text-transform: uppercase;
      letter-spacing: 1px;
      color: var(--text-muted);
      border-bottom: 2px solid var(--border);
    }

    .admin-table td {
      padding: 10px 12px;
      border-bottom: 1px solid var(--border);
      font-size: 0.85rem;
    }

    .actions { display: flex; gap: 6px; }

    .link-display {
      background: var(--bg);
      padding: 8px 12px;
      border-radius: 6px;
      font-size: 0.75rem;
      font-family: monospace;
      word-break: break-all;
      color: var(--text-muted);
      border: 1px solid var(--border);
    }

    .alert {
      padding: 12px 16px;
      border-radius: 8px;
      font-size: 0.85rem;
      margin-bottom: 16px;
    }

    .alert-success { background: rgba(0,184,148,0.1); color: var(--green); border: 1px solid rgba(0,184,148,0.2); }
    .alert-error { background: rgba(225,112,85,0.1); color: var(--red); border: 1px solid rgba(225,112,85,0.2); }

    /* PIN page */
    .pin-container {
      max-width: 380px;
      margin: 60px auto;
      text-align: center;
    }

    .pin-container h2 { margin-bottom: 8px; }
    .pin-container p { color: var(--text-muted); font-size: 0.85rem; margin-bottom: 24px; }

    .pin-input {
      font-size: 2rem;
      text-align: center;
      letter-spacing: 12px;
      padding: 14px;
      font-weight: 700;
    }

    /* Save bar */
    .save-bar {
      position: fixed;
      bottom: 0;
      left: 0;
      right: 0;
      background: var(--bg-card);
      border-top: 1px solid var(--border);
      padding: 14px 20px;
      display: flex;
      justify-content: center;
      gap: 12px;
      z-index: 100;
    }

    .save-status {
      font-size: 0.8rem;
      color: var(--text-muted);
      align-self: center;
    }

    .progress-bar {
      width: 100%;
      height: 4px;
      background: var(--bg);
      border-radius: 2px;
      overflow: hidden;
      margin-top: 8px;
    }

    .progress-fill {
      height: 100%;
      background: var(--accent);
      border-radius: 2px;
      transition: width 0.3s;
    }

    /* Responsive */
    @media (max-width: 600px) {
      .match-row {
        grid-template-columns: 1fr;
        text-align: center;
        gap: 6px;
      }
      .team.home, .team.away {
        justify-content: center;
        text-align: center;
      }
      .container { padding: 12px; }
      header h1 { font-size: 1.3rem; }
      .leaderboard-table, .admin-table { font-size: 0.8rem; }
    }
  </style>
  ${extraHead}
</head>
<body>
  <div class="container">
    <header>
      <h1>⚽ Quiniela Mundial 2026</h1>
      <div class="subtitle">Fase de Grupos</div>
      <nav>
        <a href="/leaderboard">Tabla</a>
      </nav>
    </header>
    ${body}
  </div>
</body>
</html>`;
}

export function adminLayout(title: string, body: string, extraHead: string = '') {
  return html`<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title} — Admin</title>
  <style>
    :root {
      --bg: #0f1117;
      --bg-card: #1a1d27;
      --bg-card-alt: #222636;
      --border: #2e3347;
      --text: #e4e6f0;
      --text-muted: #8b8fa3;
      --accent: #6c5ce7;
      --accent-hover: #7e70ed;
      --green: #00b894;
      --red: #e17055;
      --yellow: #fdcb6e;
      --radius: 10px;
    }

    * { margin: 0; padding: 0; box-sizing: border-box; }

    body {
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      background: var(--bg);
      color: var(--text);
      min-height: 100vh;
      line-height: 1.6;
    }

    .container { max-width: 960px; margin: 0 auto; padding: 20px; }

    header {
      padding: 20px 0;
      border-bottom: 1px solid var(--border);
      margin-bottom: 24px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    header h1 { font-size: 1.3rem; }

    nav { display: flex; gap: 12px; }
    nav a {
      color: var(--text-muted);
      text-decoration: none;
      font-size: 0.8rem;
      padding: 6px 12px;
      border-radius: 6px;
      transition: all 0.2s;
    }
    nav a:hover { color: var(--text); background: var(--bg-card); }

    .card {
      background: var(--bg-card);
      border: 1px solid var(--border);
      border-radius: var(--radius);
      padding: 24px;
      margin-bottom: 20px;
    }

    .card h2 { font-size: 1rem; margin-bottom: 16px; }

    input, select {
      background: var(--bg);
      border: 1px solid var(--border);
      color: var(--text);
      padding: 10px 14px;
      border-radius: 8px;
      font-size: 0.9rem;
      width: 100%;
      outline: none;
    }

    input:focus { border-color: var(--accent); }

    label { display: block; font-size: 0.8rem; color: var(--text-muted); margin-bottom: 6px; }
    .form-group { margin-bottom: 16px; }
    .form-row { display: flex; gap: 12px; }
    .form-row .form-group { flex: 1; }

    button, .btn {
      display: inline-flex; align-items: center; justify-content: center; gap: 6px;
      padding: 10px 20px; border: none; border-radius: 8px;
      font-size: 0.85rem; font-weight: 600; cursor: pointer;
      transition: all 0.2s; text-decoration: none;
    }
    .btn-primary { background: var(--accent); color: white; }
    .btn-primary:hover { background: var(--accent-hover); }
    .btn-secondary { background: var(--bg-card-alt); color: var(--text); border: 1px solid var(--border); }
    .btn-danger { background: rgba(225,112,85,0.15); color: var(--red); }
    .btn-sm { padding: 6px 12px; font-size: 0.75rem; }

    .admin-table { width: 100%; border-collapse: collapse; }
    .admin-table th {
      text-align: left; padding: 8px 12px; font-size: 0.7rem;
      text-transform: uppercase; letter-spacing: 1px; color: var(--text-muted);
      border-bottom: 2px solid var(--border);
    }
    .admin-table td { padding: 10px 12px; border-bottom: 1px solid var(--border); font-size: 0.85rem; }

    .badge { display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 0.7rem; font-weight: 600; }
    .badge-paid { background: rgba(0,184,148,0.15); color: var(--green); }
    .badge-unpaid { background: rgba(225,112,85,0.15); color: var(--red); }

    .actions { display: flex; gap: 6px; flex-wrap: wrap; }

    .link-display {
      background: var(--bg); padding: 6px 10px; border-radius: 6px;
      font-size: 0.7rem; font-family: monospace; word-break: break-all;
      color: var(--text-muted); border: 1px solid var(--border); max-width: 300px;
    }

    .alert { padding: 12px 16px; border-radius: 8px; font-size: 0.85rem; margin-bottom: 16px; }
    .alert-success { background: rgba(0,184,148,0.1); color: var(--green); border: 1px solid rgba(0,184,148,0.2); }
    .alert-error { background: rgba(225,112,85,0.1); color: var(--red); border: 1px solid rgba(225,112,85,0.2); }

    .stats { display: flex; gap: 16px; margin-bottom: 20px; flex-wrap: wrap; }
    .stat {
      background: var(--bg-card-alt); padding: 12px 20px; border-radius: 8px;
      border: 1px solid var(--border);
    }
    .stat-value { font-size: 1.4rem; font-weight: 700; }
    .stat-label { font-size: 0.7rem; color: var(--text-muted); text-transform: uppercase; letter-spacing: 1px; }

    @media (max-width: 600px) {
      .form-row { flex-direction: column; }
      .container { padding: 12px; }
    }
  </style>
  ${extraHead}
</head>
<body>
  <div class="container">
    <header>
      <h1>🔧 Admin — Quiniela</h1>
      <nav>
        <a href="/admin">Panel</a>
        <a href="/leaderboard">Tabla</a>
      </nav>
    </header>
    ${body}
  </div>
</body>
</html>`;
}
