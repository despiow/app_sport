import DB from '../db.js';

let weightChart = null;

export function renderWeight() {
  const entries = DB.getWeightEntries();
  const last = entries.at(-1);
  const profile = DB.getProfile();

  let bmi = null;
  if (last && profile.height) {
    bmi = (last.weight / Math.pow(profile.height / 100, 2)).toFixed(1);
  }

  return `
    <div class="page" id="page-weight">
      <div class="page-header">
        <h1>Suivi du poids</h1>
        <button class="btn btn-primary btn-sm" id="btn-add-weight">+ Entrée</button>
      </div>

      ${last ? `
      <div class="stats-grid cols-3">
        <div class="stat-card accent">
          <div class="stat-icon">⚖️</div>
          <div class="stat-value">${last.weight} <span class="stat-unit">kg</span></div>
          <div class="stat-label">Poids actuel</div>
        </div>
        ${bmi ? `
        <div class="stat-card ${bmiCategory(bmi).cls}">
          <div class="stat-icon">📊</div>
          <div class="stat-value">${bmi}</div>
          <div class="stat-label">IMC — ${bmiCategory(bmi).label}</div>
        </div>` : ''}
        ${entries.length >= 2 ? `
        <div class="stat-card">
          <div class="stat-icon">${entries.at(-1).weight < entries.at(-2).weight ? '📉' : '📈'}</div>
          <div class="stat-value ${entries.at(-1).weight < entries.at(-2).weight ? 'text-success' : 'text-warning'}">
            ${(entries.at(-1).weight - entries.at(-2).weight) > 0 ? '+' : ''}${(entries.at(-1).weight - entries.at(-2).weight).toFixed(1)} kg
          </div>
          <div class="stat-label">Depuis dernière entrée</div>
        </div>` : ''}
      </div>
      ` : ''}

      <div class="section">
        <div class="section-header">
          <h2 class="section-title">Évolution</h2>
          <div class="range-btns" id="weight-range">
            <button class="range-btn active" data-days="30">30j</button>
            <button class="range-btn" data-days="60">60j</button>
            <button class="range-btn" data-days="90">90j</button>
            <button class="range-btn" data-days="0">Tout</button>
          </div>
        </div>
        <div class="chart-container">
          <canvas id="weight-chart"></canvas>
        </div>
      </div>

      <div class="section">
        <h2 class="section-title">Historique</h2>
        <div id="weight-history">
          ${renderWeightHistory(entries)}
        </div>
      </div>
    </div>

    <!-- Modal: Add Weight -->
    <div class="modal-overlay" id="modal-weight" style="display:none">
      <div class="modal modal-sm">
        <div class="modal-header">
          <h2>Enregistrer le poids</h2>
          <button class="modal-close" onclick="document.getElementById('modal-weight').style.display='none'">✕</button>
        </div>
        <div class="modal-body">
          <form id="form-weight">
            <div class="form-group">
              <label>Date</label>
              <input type="date" id="wt-date" required>
            </div>
            <div class="form-group">
              <label>Poids (kg)</label>
              <input type="number" id="wt-weight" step="0.1" min="20" max="300" placeholder="75.5" required>
            </div>
            <div class="form-group">
              <label>Note (optionnel)</label>
              <input type="text" id="wt-note" placeholder="Matin, après sport...">
            </div>
            <div class="form-actions">
              <button type="button" class="btn btn-ghost" onclick="document.getElementById('modal-weight').style.display='none'">Annuler</button>
              <button type="submit" class="btn btn-primary">Enregistrer</button>
            </div>
          </form>
        </div>
      </div>
    </div>
  `;
}

function renderWeightHistory(entries) {
  if (!entries.length) return `<div class="empty-state"><div class="empty-icon">⚖️</div><p>Aucune entrée</p></div>`;
  return `
    <div class="weight-history-list">
      ${[...entries].reverse().map(e => `
        <div class="weight-entry-row">
          <div class="we-date">${formatDate(e.date)}</div>
          <div class="we-weight">${e.weight} kg</div>
          ${e.note ? `<div class="we-note">${e.note}</div>` : '<div></div>'}
          <button class="btn-icon danger" onclick="deleteWeight('${e.id}')">🗑️</button>
        </div>
      `).join('')}
    </div>
  `;
}

function formatDate(str) {
  return new Date(str + 'T12:00:00').toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });
}

function bmiCategory(bmi) {
  const v = parseFloat(bmi);
  if (v < 18.5) return { label: 'Sous-poids', cls: 'warning' };
  if (v < 25) return { label: 'Normal', cls: 'success' };
  if (v < 30) return { label: 'Surpoids', cls: 'warning' };
  return { label: 'Obésité', cls: 'danger' };
}

export function initWeight() {
  document.getElementById('btn-add-weight')?.addEventListener('click', () => {
    document.getElementById('wt-date').value = DB.today();
    document.getElementById('wt-weight').value = '';
    document.getElementById('wt-note').value = '';
    document.getElementById('modal-weight').style.display = 'flex';
  });

  document.getElementById('form-weight')?.addEventListener('submit', async e => {
    e.preventDefault();
    const entry = {
      id: DB.uid(),
      date: document.getElementById('wt-date').value,
      weight: parseFloat(document.getElementById('wt-weight').value),
      note: document.getElementById('wt-note').value
    };
    await DB.addWeight(entry);
    document.getElementById('modal-weight').style.display = 'none';
    refreshWeightPage();
  });

  document.getElementById('weight-range')?.addEventListener('click', e => {
    const btn = e.target.closest('.range-btn');
    if (!btn) return;
    document.querySelectorAll('.range-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    drawChart(parseInt(btn.dataset.days));
  });

  drawChart(30);
}

function refreshWeightPage() {
  const entries = DB.getWeightEntries();
  document.getElementById('weight-history').innerHTML = renderWeightHistory(entries);
  const activeDays = parseInt(document.querySelector('.range-btn.active')?.dataset.days || 30);
  drawChart(activeDays);

  // Update stats
  const last = entries.at(-1);
  const profile = DB.getProfile();
  if (last && profile.height) {
    const bmi = (last.weight / Math.pow(profile.height / 100, 2)).toFixed(1);
    // Simple refresh - reload page section
  }
}

function drawChart(days) {
  const canvas = document.getElementById('weight-chart');
  if (!canvas) return;

  let entries = DB.getWeightEntries();
  if (days > 0) {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);
    entries = entries.filter(e => new Date(e.date) >= cutoff);
  }

  const labels = entries.map(e => {
    const d = new Date(e.date + 'T12:00:00');
    return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
  });
  const data = entries.map(e => e.weight);

  if (weightChart) { weightChart.destroy(); weightChart = null; }

  if (!entries.length) {
    canvas.parentElement.innerHTML = `
      <div class="chart-empty">
        <p>Aucune donnée pour cette période</p>
      </div>`;
    return;
  }

  const ctx = canvas.getContext('2d');
  const gradient = ctx.createLinearGradient(0, 0, 0, 300);
  gradient.addColorStop(0, 'rgba(108, 99, 255, 0.4)');
  gradient.addColorStop(1, 'rgba(108, 99, 255, 0)');

  weightChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels,
      datasets: [{
        label: 'Poids (kg)',
        data,
        borderColor: '#6c63ff',
        backgroundColor: gradient,
        borderWidth: 2.5,
        pointBackgroundColor: '#6c63ff',
        pointBorderColor: '#fff',
        pointBorderWidth: 2,
        pointRadius: 4,
        pointHoverRadius: 6,
        fill: true,
        tension: 0.4
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: '#1a1a2e',
          borderColor: '#6c63ff',
          borderWidth: 1,
          titleColor: '#f0f0ff',
          bodyColor: '#8888aa',
          callbacks: {
            label: ctx => ` ${ctx.raw} kg`
          }
        }
      },
      scales: {
        x: {
          grid: { color: 'rgba(255,255,255,0.05)' },
          ticks: { color: '#8888aa', maxRotation: 45 }
        },
        y: {
          grid: { color: 'rgba(255,255,255,0.05)' },
          ticks: {
            color: '#8888aa',
            callback: v => v + ' kg'
          }
        }
      }
    }
  });
}

window.deleteWeight = async function(id) {
  if (confirm('Supprimer cette entrée ?')) {
    await DB.deleteWeight(id);
    refreshWeightPage();
  }
};
