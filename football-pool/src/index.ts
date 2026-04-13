import { Hono } from 'hono';
import type { Env } from './types';
import admin from './routes/admin';
import picks from './routes/picks';
import leaderboard from './routes/leaderboard';
import { layout } from './views/layout';
import { html } from 'hono/html';

const app = new Hono<Env>();

// Home page — redirect to leaderboard
app.get('/', (c) => {
  return c.html(
    layout(
      'Inicio',
      html`
        <div style="text-align: center; padding: 40px 0;">
          <div style="font-size: 3rem; margin-bottom: 16px;">⚽</div>
          <h2 style="font-size: 1.4rem; margin-bottom: 8px;">Quiniela Mundial 2026</h2>
          <p style="color: var(--text-muted); max-width: 400px; margin: 0 auto 24px; font-size: 0.9rem;">
            Pronostica los resultados de la fase de grupos del Mundial 2026.
            Elige <strong>Local</strong>, <strong>Empate</strong> o <strong>Visita</strong> para cada partido.
          </p>
          <a href="/leaderboard" class="btn btn-primary">Ver tabla de posiciones</a>
        </div>
      `.toString()
    )
  );
});

// Mount routes — admin is scoped to /admin, others at root
app.route('/admin', admin);
app.route('/', picks);
app.route('/', leaderboard);

export default app;
