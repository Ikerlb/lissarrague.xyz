import { Hono } from 'hono';
import { html } from 'hono/html';
import type { Env } from '../types';
import { adminLayout } from '../views/layout';
import { encrypt, hashPin } from '../lib/crypto';
import { fetchGroupStageMatches, computeResult } from '../lib/football-api';
import {
  getAllParticipants,
  getAllMatches,
  createParticipant,
  togglePaid,
  deleteParticipant,
  upsertMatch,
} from '../db/queries';

const admin = new Hono<Env>();

// Simple password middleware
admin.use('*', async (c, next) => {
  const cookie = c.req.header('Cookie') || '';
  const hasAuth = cookie.includes('admin_auth=1');

  if (c.req.path === '/admin/login' && c.req.method === 'POST') {
    return next();
  }

  if (!hasAuth && c.req.path !== '/admin/login') {
    return c.html(
      adminLayout(
        'Login',
        html`
          <div style="max-width: 380px; margin: 40px auto; text-align: center;">
            <div class="card">
              <h2>Admin Login</h2>
              <form method="POST" action="/admin/login">
                <div class="form-group">
                  <label>Contraseña</label>
                  <input type="password" name="password" placeholder="••••••••" autofocus />
                </div>
                <button type="submit" class="btn btn-primary" style="width:100%">Entrar</button>
              </form>
            </div>
          </div>
        `.toString()
      )
    );
  }

  return next();
});

admin.post('/login', async (c) => {
  const body = await c.req.parseBody();
  const password = body['password'] as string;

  if (password === c.env.ADMIN_PASSWORD) {
    return new Response(null, {
      status: 302,
      headers: {
        Location: '/admin',
        'Set-Cookie': 'admin_auth=1; Path=/admin; HttpOnly; SameSite=Strict; Max-Age=86400',
      },
    });
  }

  return c.html(
    adminLayout(
      'Login',
      html`
        <div style="max-width: 380px; margin: 40px auto; text-align: center;">
          <div class="card">
            <div class="alert alert-error">Contraseña incorrecta</div>
            <h2>Admin Login</h2>
            <form method="POST" action="/admin/login">
              <div class="form-group">
                <label>Contraseña</label>
                <input type="password" name="password" placeholder="••••••••" autofocus />
              </div>
              <button type="submit" class="btn btn-primary" style="width:100%">Entrar</button>
            </form>
          </div>
        </div>
      `.toString()
    )
  );
});

// Main admin page
admin.get('/', async (c) => {
  const participants = await getAllParticipants(c.env.DB);
  const matches = await getAllMatches(c.env.DB);
  const message = c.req.query('msg') || '';
  const error = c.req.query('error') || '';
  const baseUrl = new URL(c.req.url).origin;

  const matchesWithResults = matches.filter((m) => m.result !== null).length;

  const content = html`
    ${message ? html`<div class="alert alert-success">${message}</div>` : ''}
    ${error ? html`<div class="alert alert-error">${error}</div>` : ''}

    <div class="stats">
      <div class="stat">
        <div class="stat-value">${participants.length}</div>
        <div class="stat-label">Participantes</div>
      </div>
      <div class="stat">
        <div class="stat-value">${matches.length}</div>
        <div class="stat-label">Partidos</div>
      </div>
      <div class="stat">
        <div class="stat-value">${matchesWithResults}</div>
        <div class="stat-label">Resultados</div>
      </div>
      <div class="stat">
        <div class="stat-value">${participants.filter((p) => p.paid).length}/${participants.length}</div>
        <div class="stat-label">Pagados</div>
      </div>
    </div>

    <!-- Add Participant -->
    <div class="card">
      <h2>Agregar Participante</h2>
      <form method="POST" action="/admin/participant">
        <div class="form-row">
          <div class="form-group">
            <label>Nombre</label>
            <input type="text" name="name" placeholder="Juan Pérez" required />
          </div>
          <div class="form-group">
            <label>PIN (6 dígitos)</label>
            <input type="text" name="pin" pattern="[0-9]{6}" maxlength="6" placeholder="123456" required />
          </div>
        </div>
        <button type="submit" class="btn btn-primary">Agregar</button>
      </form>
    </div>

    <!-- Participants List -->
    <div class="card">
      <h2>Participantes</h2>
      ${
        participants.length === 0
          ? html`<p style="color:var(--text-muted); font-size:0.85rem;">No hay participantes todavía.</p>`
          : html`
              <table class="admin-table">
                <thead>
                  <tr>
                    <th>Nombre</th>
                    <th>Estado</th>
                    <th>Link</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  ${participants.map(
                    (p) => html`
                      <tr>
                        <td>${p.name}</td>
                        <td>
                          <span class="badge ${p.paid ? 'badge-paid' : 'badge-unpaid'}">
                            ${p.paid ? 'Pagado' : 'Pendiente'}
                          </span>
                        </td>
                        <td>
                          <div class="link-display">${baseUrl}/pick?code=${p.encrypted_code}</div>
                        </td>
                        <td>
                          <div class="actions">
                            <form method="POST" action="/admin/participant/${p.id}/toggle-paid" style="margin:0">
                              <button type="submit" class="btn btn-secondary btn-sm">
                                ${p.paid ? '✕ Desmarcar pago' : '✓ Marcar pagado'}
                              </button>
                            </form>
                            <form method="POST" action="/admin/participant/${p.id}/delete" style="margin:0"
                              onsubmit="return confirm('¿Eliminar a ${p.name}?')">
                              <button type="submit" class="btn btn-danger btn-sm">Eliminar</button>
                            </form>
                          </div>
                        </td>
                      </tr>
                    `
                  )}
                </tbody>
              </table>
            `
      }
    </div>

    <!-- Sync Matches -->
    <div class="card">
      <h2>Partidos (${matches.length})</h2>
      <div style="display: flex; gap: 12px; margin-bottom: 16px;">
        <form method="POST" action="/admin/sync" style="margin:0">
          <button type="submit" class="btn btn-primary">Sincronizar desde API</button>
        </form>
      </div>
      ${
        matches.length === 0
          ? html`<p style="color:var(--text-muted); font-size:0.85rem;">No hay partidos. Sincroniza desde la API.</p>`
          : html`
              <table class="admin-table">
                <thead>
                  <tr>
                    <th>Grupo</th>
                    <th>Partido</th>
                    <th>Fecha</th>
                    <th>Sede</th>
                    <th>Resultado</th>
                    <th>Estado</th>
                  </tr>
                </thead>
                <tbody>
                  ${matches.map(
                    (m) => html`
                      <tr>
                        <td>${m.group_name}</td>
                        <td>${m.home_team} vs ${m.away_team}</td>
                        <td style="font-size:0.75rem">${new Date(m.match_date).toLocaleString('es-MX', { timeZone: 'America/Mexico_City' })}</td>
                        <td style="font-size:0.75rem">${m.venue || '—'}${m.city ? `, ${m.city}` : ''}</td>
                        <td>
                          ${m.result ? html`<span style="font-weight:700">${m.home_score} - ${m.away_score} (${m.result})</span>` : '—'}
                        </td>
                        <td style="font-size:0.75rem">${m.status}</td>
                      </tr>
                    `
                  )}
                </tbody>
              </table>
            `
      }
    </div>
  `.toString();

  return c.html(adminLayout('Panel', content));
});

// Create participant
admin.post('/participant', async (c) => {
  const body = await c.req.parseBody();
  const name = (body['name'] as string)?.trim();
  const pin = (body['pin'] as string)?.trim();

  if (!name || !pin || !/^\d{6}$/.test(pin)) {
    return c.redirect('/admin?error=Nombre y PIN de 6 dígitos requeridos');
  }

  const pinH = await hashPin(pin);
  const encCode = await encrypt(String(Date.now()) + ':' + name, c.env.ENCRYPTION_KEY);
  await createParticipant(c.env.DB, name, pinH, encCode);

  return c.redirect('/admin?msg=Participante agregado: ' + name);
});

// Toggle paid
admin.post('/participant/:id/toggle-paid', async (c) => {
  const id = parseInt(c.req.param('id'));
  await togglePaid(c.env.DB, id);
  return c.redirect('/admin');
});

// Delete participant
admin.post('/participant/:id/delete', async (c) => {
  const id = parseInt(c.req.param('id'));
  await deleteParticipant(c.env.DB, id);
  return c.redirect('/admin?msg=Participante eliminado');
});

// Sync matches from Football-Data.org API
admin.post('/sync', async (c) => {
  try {
    const apiMatches = await fetchGroupStageMatches(c.env.FOOTBALL_API_KEY);

    for (const m of apiMatches) {
      const result = computeResult(m.score.fullTime.home, m.score.fullTime.away);
      await upsertMatch(c.env.DB, {
        api_match_id: m.id,
        matchday: m.matchday,
        group_name: m.group || 'TBD',
        home_team: m.homeTeam.name,
        away_team: m.awayTeam.name,
        home_crest: m.homeTeam.crest || null,
        away_crest: m.awayTeam.crest || null,
        match_date: m.utcDate,
        venue: m.venue || null,
        city: null,
        result,
        home_score: m.score.fullTime.home,
        away_score: m.score.fullTime.away,
        status: m.status,
      });
    }

    return c.redirect(`/admin?msg=Sincronizados ${apiMatches.length} partidos`);
  } catch (err: any) {
    return c.redirect('/admin?error=Error al sincronizar: ' + err.message);
  }
});

export default admin;
