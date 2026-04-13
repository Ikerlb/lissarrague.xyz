import { Hono } from 'hono';
import { html } from 'hono/html';
import type { Env } from '../types';
import { layout } from '../views/layout';
import { getLeaderboard, getParticipantPickDetails, getAllMatches } from '../db/queries';

const leaderboard = new Hono<Env>();

leaderboard.get('/leaderboard', async (c) => {
  const entries = await getLeaderboard(c.env.DB);
  const matches = await getAllMatches(c.env.DB);
  const totalDecided = matches.filter((m) => m.result !== null).length;
  const totalMatches = matches.length;

  const content = html`
    <div class="card">
      <h2>Tabla de Posiciones</h2>
      <div style="color: var(--text-muted); font-size: 0.8rem; margin-bottom: 16px;">
        ${totalDecided} de ${totalMatches} partidos decididos
      </div>

      ${
        entries.length === 0
          ? html`<p style="color: var(--text-muted); font-size: 0.85rem;">No hay participantes todavía.</p>`
          : html`
              <table class="leaderboard-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Nombre</th>
                    <th>Aciertos</th>
                    <th>Pronósticos</th>
                    <th>Pago</th>
                  </tr>
                </thead>
                <tbody>
                  ${entries.map((entry, i) => {
                    const rank = i + 1;
                    const rankClass = rank <= 3 ? `rank-${rank}` : '';
                    const pct = entry.total_picks > 0 && totalDecided > 0
                      ? Math.round((entry.correct / totalDecided) * 100)
                      : 0;

                    return html`
                      <tr style="cursor: pointer" onclick="toggleDetail(${entry.participant_id})">
                        <td class="rank ${rankClass}">${rank}</td>
                        <td>
                          <strong>${entry.name}</strong>
                        </td>
                        <td>
                          <strong>${entry.correct}</strong>
                          ${totalDecided > 0 ? html`<span style="color:var(--text-muted);font-size:0.75rem"> (${pct}%)</span>` : ''}
                        </td>
                        <td style="color: var(--text-muted)">${entry.total_picks} / ${totalMatches}</td>
                        <td>
                          <span class="badge ${entry.paid ? 'badge-paid' : 'badge-unpaid'}">
                            ${entry.paid ? 'Pagado' : 'Pendiente'}
                          </span>
                        </td>
                      </tr>
                      <tr id="detail-${entry.participant_id}" style="display:none">
                        <td colspan="5" style="padding:0">
                          <div class="picks-detail" id="picks-${entry.participant_id}" style="padding: 12px 16px; background: var(--bg-card-alt);">
                            Cargando...
                          </div>
                        </td>
                      </tr>
                    `;
                  })}
                </tbody>
              </table>
            `
      }
    </div>

    <script>
      const loadedDetails = {};

      async function toggleDetail(participantId) {
        const row = document.getElementById('detail-' + participantId);
        if (!row) return;

        if (row.style.display === 'none') {
          row.style.display = '';
          if (!loadedDetails[participantId]) {
            try {
              const resp = await fetch('/leaderboard/detail/' + participantId);
              const html = await resp.text();
              document.getElementById('picks-' + participantId).innerHTML = html;
              loadedDetails[participantId] = true;
            } catch {
              document.getElementById('picks-' + participantId).innerHTML = 'Error al cargar';
            }
          }
        } else {
          row.style.display = 'none';
        }
      }
    </script>
  `.toString();

  return c.html(layout('Tabla', content));
});

// Detail fragment for a participant's picks
leaderboard.get('/leaderboard/detail/:id', async (c) => {
  const id = parseInt(c.req.param('id'));
  const details = await getParticipantPickDetails(c.env.DB, id);

  const groups = new Map<string, typeof details>();
  for (const d of details) {
    if (!groups.has(d.group_name)) groups.set(d.group_name, []);
    groups.get(d.group_name)!.push(d);
  }

  const fragment = html`
    ${Array.from(groups.entries()).map(
      ([groupName, groupMatches]) => html`
        <div style="font-size:0.7rem;font-weight:600;text-transform:uppercase;letter-spacing:1px;color:var(--accent);padding:8px 0 4px;">
          Grupo ${groupName}
        </div>
        ${groupMatches.map((m) => {
          const pickLabel = m.pick === 'L' ? 'Local' : m.pick === 'E' ? 'Empate' : m.pick === 'V' ? 'Visita' : '—';
          const isCorrect = m.result !== null && m.pick === m.result;
          const isIncorrect = m.result !== null && m.pick !== null && m.pick !== m.result;
          const color = isCorrect ? 'var(--green)' : isIncorrect ? 'var(--red)' : 'var(--text-muted)';
          const icon = isCorrect ? '✓' : isIncorrect ? '✕' : '';

          return html`
            <div style="display:flex;justify-content:space-between;align-items:center;padding:4px 0;font-size:0.8rem;border-bottom:1px solid var(--border);">
              <span>${m.home_team} vs ${m.away_team}</span>
              <span style="color:${color};font-weight:600;">
                ${icon} ${pickLabel}
                ${m.result !== null ? html` <span style="font-size:0.7rem;color:var(--text-muted)">(${m.home_score}-${m.away_score})</span>` : ''}
              </span>
            </div>
          `;
        })}
      `
    )}
  `;

  return c.html(fragment);
});

export default leaderboard;
