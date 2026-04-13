import { Hono } from 'hono';
import { html } from 'hono/html';
import type { Env } from '../types';
import { layout } from '../views/layout';
import { decrypt, hashPin } from '../lib/crypto';
import {
  getParticipantByCode,
  getAllMatches,
  getPicksByParticipant,
  upsertPick,
} from '../db/queries';

const picks = new Hono<Env>();

// Landing page — verify code and show PIN prompt
picks.get('/pick', async (c) => {
  const code = c.req.query('code');
  if (!code) {
    return c.html(
      layout(
        'Error',
        html`
          <div class="pin-container">
            <div class="card">
              <h2>Link inválido</h2>
              <p>Este link no tiene un código válido. Pide tu link personalizado al organizador.</p>
            </div>
          </div>
        `.toString()
      ),
      400
    );
  }

  // Verify code exists in DB
  const participant = await getParticipantByCode(c.env.DB, code);
  if (!participant) {
    return c.html(
      layout(
        'Error',
        html`
          <div class="pin-container">
            <div class="card">
              <h2>Código no encontrado</h2>
              <p>Este link no está asociado a ningún participante. Contacta al organizador.</p>
            </div>
          </div>
        `.toString()
      ),
      404
    );
  }

  const error = c.req.query('error') || '';

  return c.html(
    layout(
      'Ingresa tu PIN',
      html`
        <div class="pin-container">
          <div class="card">
            <h2>Hola, ${participant.name} 👋</h2>
            <p>Ingresa tu PIN de 6 dígitos para ver y editar tus pronósticos.</p>
            ${error ? html`<div class="alert alert-error">${error}</div>` : ''}
            <form method="POST" action="/pick/verify">
              <input type="hidden" name="code" value="${code}" />
              <div class="form-group">
                <input
                  type="text"
                  name="pin"
                  class="pin-input"
                  maxlength="6"
                  pattern="[0-9]{6}"
                  inputmode="numeric"
                  autocomplete="off"
                  placeholder="••••••"
                  autofocus
                  required
                />
              </div>
              <button type="submit" class="btn btn-primary" style="width:100%">Entrar</button>
            </form>
          </div>
        </div>
      `.toString()
    )
  );
});

// Verify PIN and set session cookie
picks.post('/pick/verify', async (c) => {
  const body = await c.req.parseBody();
  const code = body['code'] as string;
  const pin = body['pin'] as string;

  if (!code || !pin) {
    return c.redirect('/pick?code=' + code + '&error=PIN requerido');
  }

  const participant = await getParticipantByCode(c.env.DB, code);
  if (!participant) {
    return c.redirect('/pick?code=' + code + '&error=Participante no encontrado');
  }

  const pinH = await hashPin(pin);
  if (pinH !== participant.pin_hash) {
    return c.redirect('/pick?code=' + code + '&error=PIN incorrecto');
  }

  // Set a session cookie (participant id + code)
  const sessionValue = `${participant.id}:${code}`;
  return new Response(null, {
    status: 302,
    headers: {
      Location: '/pick/grid?code=' + code,
      'Set-Cookie': `session=${sessionValue}; Path=/; HttpOnly; SameSite=Strict; Max-Age=604800`,
    },
  });
});

// Helper to get authenticated participant from cookie
function getSession(cookieHeader: string | undefined): { participantId: number; code: string } | null {
  if (!cookieHeader) return null;
  const match = cookieHeader.match(/session=(\d+):([^;]+)/);
  if (!match) return null;
  return { participantId: parseInt(match[1]), code: match[2] };
}

// Picks grid
picks.get('/pick/grid', async (c) => {
  const code = c.req.query('code');
  const session = getSession(c.req.header('Cookie'));

  if (!session || session.code !== code) {
    return c.redirect('/pick?code=' + (code || '') + '&error=Sesión expirada, ingresa tu PIN');
  }

  const participant = await getParticipantByCode(c.env.DB, code!);
  if (!participant || participant.id !== session.participantId) {
    return c.redirect('/pick?code=' + (code || ''));
  }

  const matches = await getAllMatches(c.env.DB);
  const existingPicks = await getPicksByParticipant(c.env.DB, participant.id);
  const picksMap = new Map(existingPicks.map((p) => [p.match_id, p.pick]));

  // Group matches by group_name
  const groups = new Map<string, typeof matches>();
  for (const m of matches) {
    if (!groups.has(m.group_name)) groups.set(m.group_name, []);
    groups.get(m.group_name)!.push(m);
  }

  const totalMatches = matches.length;
  const filledPicks = existingPicks.length;

  const content = html`
    <div style="margin-bottom: 12px; display: flex; justify-content: space-between; align-items: center;">
      <div>
        <span style="font-size: 1rem; font-weight: 600;">${participant.name}</span>
        <span style="color: var(--text-muted); font-size: 0.8rem; margin-left: 8px;">
          ${filledPicks}/${totalMatches} pronósticos
        </span>
      </div>
    </div>

    <div class="progress-bar" style="margin-bottom: 24px;">
      <div class="progress-fill" style="width: ${totalMatches > 0 ? (filledPicks / totalMatches) * 100 : 0}%"></div>
    </div>

    <form id="picks-form" method="POST" action="/pick/save">
      <input type="hidden" name="code" value="${code}" />

      ${Array.from(groups.entries()).map(
        ([groupName, groupMatches]) => html`
          <div class="group-header">Grupo ${groupName}</div>
          ${groupMatches.map((m) => {
            const now = new Date();
            const matchDate = new Date(m.match_date);
            const isLocked = now >= matchDate;
            const currentPick = picksMap.get(m.id) || null;

            return html`
              <div class="match-row" data-match-date="${m.match_date}" data-match-id="${m.id}">
                <div class="team home">
                  <span>${m.home_team}</span>
                  ${m.home_crest ? html`<img class="crest" src="${m.home_crest}" alt="" />` : ''}
                </div>
                <div class="match-info">
                  ${
                    m.result !== null
                      ? html`<div class="match-score">${m.home_score} — ${m.away_score}</div>`
                      : html`<div class="countdown" data-kickoff="${m.match_date}"></div>`
                  }
                  <div class="match-meta">
                    ${m.venue ? html`${m.venue}<br />` : ''}
                    ${new Date(m.match_date).toLocaleDateString('es-MX', {
                      day: 'numeric',
                      month: 'short',
                      hour: '2-digit',
                      minute: '2-digit',
                      timeZone: 'America/Mexico_City',
                    })}
                  </div>
                  ${
                    isLocked
                      ? html`<div class="match-locked">Bloqueado</div>`
                      : html`
                          <div class="pick-buttons">
                            ${(['L', 'E', 'V'] as const).map(
                              (val) => {
                                const label = val === 'L' ? 'Local' : val === 'E' ? 'Empate' : 'Visita';
                                const isCorrect = m.result !== null && val === m.result && val === currentPick;
                                const isIncorrect = m.result !== null && val === currentPick && val !== m.result;
                                const classes = [
                                  'pick-btn',
                                  currentPick === val ? 'selected' : '',
                                  isCorrect ? 'correct' : '',
                                  isIncorrect ? 'incorrect' : '',
                                ].filter(Boolean).join(' ');

                                return html`
                                  <button
                                    type="button"
                                    class="${classes}"
                                    data-match="${m.id}"
                                    data-pick="${val}"
                                    ${isLocked ? 'disabled' : ''}
                                  >
                                    ${label}
                                  </button>
                                `;
                              }
                            )}
                          </div>
                        `
                  }
                </div>
                <div class="team away">
                  ${m.away_crest ? html`<img class="crest" src="${m.away_crest}" alt="" />` : ''}
                  <span>${m.away_team}</span>
                </div>
              </div>
            `;
          })}
        `
      )}

      <!-- Hidden inputs for picks (managed by JS) -->
      <div id="pick-inputs"></div>
    </form>

    <div class="save-bar">
      <span class="save-status" id="save-status"></span>
      <button type="button" class="btn btn-primary" id="save-btn" onclick="savePicks()">
        Guardar pronósticos
      </button>
    </div>

    <div style="height: 80px;"></div>

    <script>
      const picks = ${JSON.stringify(Object.fromEntries(picksMap))};

      // Pick button handling
      document.querySelectorAll('.pick-btn:not([disabled])').forEach(btn => {
        btn.addEventListener('click', () => {
          const matchId = btn.dataset.match;
          const pick = btn.dataset.pick;

          // Deselect siblings
          btn.parentElement.querySelectorAll('.pick-btn').forEach(b => b.classList.remove('selected'));
          btn.classList.add('selected');

          picks[matchId] = pick;
          updateStatus();
        });
      });

      function updateStatus() {
        const total = document.querySelectorAll('.match-row:not(:has(.match-locked))').length;
        const filled = Object.keys(picks).length;
        document.getElementById('save-status').textContent = filled + ' pronósticos seleccionados';
      }

      async function savePicks() {
        const btn = document.getElementById('save-btn');
        const status = document.getElementById('save-status');
        btn.disabled = true;
        btn.textContent = 'Guardando...';

        try {
          const resp = await fetch('/pick/save', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              code: '${code}',
              picks: picks
            })
          });

          if (resp.ok) {
            status.textContent = '✓ Guardado';
            status.style.color = 'var(--green)';
          } else {
            const data = await resp.json();
            status.textContent = '✕ Error: ' + (data.error || 'Error desconocido');
            status.style.color = 'var(--red)';
          }
        } catch (e) {
          status.textContent = '✕ Error de conexión';
          status.style.color = 'var(--red)';
        }

        btn.disabled = false;
        btn.textContent = 'Guardar pronósticos';
        setTimeout(() => { status.style.color = ''; }, 3000);
      }

      // Countdown timers
      function updateCountdowns() {
        document.querySelectorAll('.countdown[data-kickoff]').forEach(el => {
          const kickoff = new Date(el.dataset.kickoff).getTime();
          const now = Date.now();
          const diff = kickoff - now;

          if (diff <= 0) {
            el.textContent = 'En juego';
            // Lock the buttons for this match row
            el.closest('.match-row')?.querySelectorAll('.pick-btn').forEach(b => b.disabled = true);
            return;
          }

          const days = Math.floor(diff / 86400000);
          const hours = Math.floor((diff % 86400000) / 3600000);
          const mins = Math.floor((diff % 3600000) / 60000);
          const secs = Math.floor((diff % 60000) / 1000);

          if (days > 0) {
            el.textContent = days + 'd ' + hours + 'h ' + mins + 'm';
          } else if (hours > 0) {
            el.textContent = hours + 'h ' + mins + 'm ' + secs + 's';
          } else {
            el.textContent = mins + 'm ' + secs + 's';
          }
        });
      }

      updateCountdowns();
      setInterval(updateCountdowns, 1000);
      updateStatus();
    </script>
  `.toString();

  return c.html(layout('Mis Pronósticos', content));
});

// Save picks (JSON API)
picks.post('/pick/save', async (c) => {
  const session = getSession(c.req.header('Cookie'));
  if (!session) {
    return c.json({ error: 'No autenticado' }, 401);
  }

  const participant = await getParticipantByCode(c.env.DB, session.code);
  if (!participant || participant.id !== session.participantId) {
    return c.json({ error: 'Participante no encontrado' }, 404);
  }

  const { picks: pickData } = (await c.req.json()) as { code: string; picks: Record<string, string> };

  const matches = await getAllMatches(c.env.DB);
  const matchMap = new Map(matches.map((m) => [m.id, m]));
  const now = new Date();

  let saved = 0;
  for (const [matchIdStr, pick] of Object.entries(pickData)) {
    const matchId = parseInt(matchIdStr);
    const match = matchMap.get(matchId);

    if (!match) continue;
    if (!['L', 'E', 'V'].includes(pick)) continue;

    // Don't allow picks for matches that have already started
    if (new Date(match.match_date) <= now) continue;

    await upsertPick(c.env.DB, participant.id, matchId, pick as 'L' | 'E' | 'V');
    saved++;
  }

  return c.json({ ok: true, saved });
});

export default picks;
