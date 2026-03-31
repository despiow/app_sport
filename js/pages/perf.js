import DB from '../db.js';

const DAYS = [
  { key: 'lundi',    short: 'Lun', full: 'Lundi' },
  { key: 'mardi',    short: 'Mar', full: 'Mardi' },
  { key: 'mercredi', short: 'Mer', full: 'Mercredi' },
  { key: 'jeudi',    short: 'Jeu', full: 'Jeudi' },
  { key: 'vendredi', short: 'Ven', full: 'Vendredi' },
  { key: 'samedi',   short: 'Sam', full: 'Samedi' },
  { key: 'dimanche', short: 'Dim', full: 'Dimanche' },
];

const FEELINGS = [
  { emoji: '😴', label: 'Fatigué' },
  { emoji: '😐', label: 'Moyen' },
  { emoji: '😊', label: 'Bien' },
  { emoji: '💪', label: 'Fort' },
  { emoji: '🔥', label: 'Explosif' },
];

// État module
let _selectedDate = null;
let _feeling      = null;
let _chronoTimer  = null;
let _chronoSec    = 90;
let _chronoTotal  = 90;
let _chronoPaused = true;

function todayStr()   { return new Date().toISOString().slice(0, 10); }
function dayKeyOf(dateStr) {
  return DAYS[(new Date(dateStr + 'T12:00:00').getDay() + 6) % 7].key;
}
function addDays(dateStr, n) {
  const d = new Date(dateStr + 'T12:00:00');
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
}
function mostRecentDateFor(dayKey) {
  const todayIdx  = (new Date().getDay() + 6) % 7;
  const targetIdx = DAYS.findIndex(d => d.key === dayKey);
  let diff = todayIdx - targetIdx;
  if (diff < 0) diff += 7;
  return addDays(todayStr(), -diff);
}
function fmtDate(dateStr) {
  return new Date(dateStr + 'T12:00:00').toLocaleDateString('fr-FR', {
    weekday: 'long', day: 'numeric', month: 'long'
  });
}

// ─── Render ───────────────────────────────────────────────────────────────

export function renderPerf() {
  // Nettoyer chrono précédent si on revient sur la page
  _stopChrono();
  _selectedDate = todayStr();
  _feeling      = null;

  return `
    <div class="page" id="page-perf">
      <div class="page-header">
        <h1>Performance</h1>
      </div>

      <div class="day-tabs" id="perf-day-tabs">
        ${DAYS.map(d => `
          <button class="day-tab${d.key === dayKeyOf(_selectedDate) ? ' active' : ''}" data-day="${d.key}">
            ${d.short}
          </button>
        `).join('')}
      </div>

      <div id="perf-content"></div>
    </div>

    <!-- Chrono overlay -->
    <div class="chrono-overlay" id="chrono-overlay" style="display:none">
      <div class="chrono-modal">
        <div class="chrono-hdr">
          <span class="chrono-label">Temps de repos</span>
          <button class="modal-close" id="chrono-close">✕</button>
        </div>
        <div class="chrono-ring-wrap">
          <svg class="chrono-svg" viewBox="0 0 120 120">
            <circle class="crng-bg" cx="60" cy="60" r="50"/>
            <circle class="crng-fill" id="crng-fill" cx="60" cy="60" r="50"/>
          </svg>
          <span class="chrono-digits" id="chrono-digits">1:30</span>
        </div>
        <div class="chrono-presets">
          <button class="chrono-preset" data-sec="60">60 s</button>
          <button class="chrono-preset active" data-sec="90">90 s</button>
          <button class="chrono-preset" data-sec="120">2 min</button>
        </div>
        <div class="chrono-btns">
          <button class="btn btn-outline" id="chrono-reset">↺ Reset</button>
          <button class="btn btn-primary" id="chrono-toggle" style="flex:2">▶ Démarrer</button>
        </div>
      </div>
    </div>

    <!-- FAB chrono -->
    <button class="chrono-fab" id="chrono-fab" title="Chrono repos">⏱</button>
  `;
}

export function initPerf() {
  _renderPerfContent(_selectedDate);

  // Onglets jours
  document.getElementById('perf-day-tabs').addEventListener('click', e => {
    const tab = e.target.closest('.day-tab');
    if (!tab) return;
    document.querySelectorAll('#perf-day-tabs .day-tab').forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
    _selectedDate = mostRecentDateFor(tab.dataset.day);
    _feeling = null;
    _renderPerfContent(_selectedDate);
  });

  // Délégation sur le contenu
  document.getElementById('perf-content').addEventListener('click', e => {
    const btn = e.target.closest('[data-perf-action]');
    if (!btn) return;
    _handleAction(btn);
  });
  document.getElementById('perf-content').addEventListener('input', e => {
    const input = e.target;
    if (input.classList.contains('set-input')) _updateExCompletion(input.closest('.perf-ex'));
  });

  // FAB + chrono
  document.getElementById('chrono-fab').addEventListener('click', () => _openChrono(_chronoSec));
  _initChronoUI();

  // Lancer chrono depuis un badge de repos inline
  window._launchChrono = (sec) => _openChrono(sec);
}

// ─── Actions délégation ───────────────────────────────────────────────────

function _handleAction(btn) {
  const action = btn.dataset.perfAction;

  if (action === 'pick-feeling') {
    document.querySelectorAll('.feeling-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    _feeling = btn.dataset.f;

  } else if (action === 'toggle-set') {
    btn.classList.toggle('set-checked');
    const row = btn.closest('.set-row');
    if (row) row.classList.toggle('row-done', btn.classList.contains('set-checked'));
    _updateExCompletion(btn.closest('.perf-ex'));

  } else if (action === 'add-set') {
    _addSetRow(btn.closest('.perf-ex'));

  } else if (action === 'del-set') {
    const row = btn.closest('.set-row');
    const list = row?.closest('.sets-body');
    if (list && list.querySelectorAll('.set-row').length > 1) row.remove();

  } else if (action === 'save-perf') {
    _savePerfLog();
  }
}

// ─── Rendu contenu perf ───────────────────────────────────────────────────

function _renderPerfContent(dateStr) {
  const dayKey     = dayKeyOf(dateStr);
  const dayObj     = DAYS.find(d => d.key === dayKey);
  const plan       = DB.getTrainingPlan(dayKey);
  const perfLog    = DB.getPerfLog(dateStr);
  const lastWeekDt = addDays(dateStr, -7);
  const lastWeekLog = DB.getPerfLog(lastWeekDt);
  const content    = document.getElementById('perf-content');
  const isToday    = dateStr === todayStr();

  // Restaurer feeling depuis log existant
  if (perfLog?.feeling && !_feeling) _feeling = perfLog.feeling;

  if (!plan) {
    content.innerHTML = `
      <div class="perf-date-card">
        <span class="perf-date-txt">${fmtDate(dateStr)}</span>
      </div>
      <div class="prog-empty">
        <div class="prog-empty-icon">⚡</div>
        <p class="prog-empty-title">Pas de programme ce jour</p>
        <p class="prog-empty-sub">Crée ton programme dans l'onglet <strong>Programme</strong></p>
        <button class="btn btn-outline" onclick="app.navigate('entrainements')">→ Programme</button>
      </div>
    `;
    return;
  }

  const exercises = plan.exercises.map(ex => {
    const loggedEx   = perfLog?.exercises_done?.find(e => e.exercise_id === ex.id) || null;
    const lastWeekEx = lastWeekLog?.exercises_done?.find(e => e.exercise_id === ex.id) || null;
    return { planned: ex, logged: loggedEx, lastWeek: lastWeekEx };
  });

  content.innerHTML = `
    <div class="perf-date-card">
      <div>
        <span class="perf-date-txt">${fmtDate(dateStr)}</span>
        <span class="perf-plan-lbl">${escHtml(plan.name)}</span>
      </div>
      ${!isToday ? `<span class="perf-past-badge">Passé</span>` : '<span class="perf-today-badge">Aujourd\'hui</span>'}
    </div>

    <div id="perf-exercises">
      ${exercises.map(e => _renderPerfExercise(e)).join('')}
    </div>

    <div class="perf-footer-card">
      <p class="section-label">Ressenti</p>
      <div class="feeling-row">
        ${FEELINGS.map(f => `
          <button class="feeling-btn${_feeling === f.emoji ? ' active' : ''}"
            data-perf-action="pick-feeling" data-f="${f.emoji}" title="${f.label}">
            ${f.emoji}
          </button>
        `).join('')}
      </div>

      <p class="section-label" style="margin-top:14px">Notes de séance</p>
      <textarea id="perf-notes" class="perf-notes-input" rows="3"
        placeholder="Sensations, points à améliorer...">${escHtml(perfLog?.notes || '')}</textarea>

      <button class="btn btn-primary btn-full" style="margin-top:14px"
        data-perf-action="save-perf"
        data-date="${dateStr}" data-plan-id="${plan.id}" data-day="${dayKey}">
        💾 Enregistrer la séance
      </button>

      ${lastWeekLog ? `
        <div class="lw-summary">
          <span class="lw-sum-label">Semaine dernière :</span>
          ${lastWeekLog.feeling ? `<span>${lastWeekLog.feeling}</span>` : ''}
          ${lastWeekLog.notes   ? `<em class="lw-sum-note">"${escHtml(lastWeekLog.notes)}"</em>` : ''}
        </div>
      ` : ''}
    </div>
  `;
}

function _renderPerfExercise({ planned, logged, lastWeek }) {
  const nbSets = parseInt(planned.sets) || 3;
  const isDone = logged?.completed || false;

  // Construire les lignes de séries depuis le log ou depuis le plan
  const logSets = logged?.sets || [];
  const setRows = [];
  for (let i = 0; i < Math.max(nbSets, logSets.length); i++) {
    const ls = logSets[i] || {};
    setRows.push({
      idx:    i,
      reps:   ls.reps   ?? (typeof planned.reps === 'number' ? planned.reps : ''),
      weight: ls.weight ?? (planned.weight || ''),
      done:   ls.done   ?? false,
    });
  }

  // Résumé semaine passée
  const lwSets = lastWeek?.sets || [];
  const lwHtml = lwSets.length > 0
    ? lwSets.map(s => `<span class="lw-chip${s.done ? '' : ' missed'}">${s.reps}×${s.weight || '?'}kg</span>`).join('')
    : '';

  return `
    <div class="perf-ex${isDone ? ' ex-done' : ''}" data-ex-id="${planned.id}">
      <div class="perf-ex-hdr">
        <div class="perf-ex-title-row">
          <span class="perf-ex-name">${escHtml(planned.name)}</span>
          ${isDone ? '<span class="ex-done-badge">✓</span>' : ''}
        </div>
        <div class="perf-ex-meta">
          <span>Prévu : ${nbSets} × ${escHtml(String(planned.reps))}${planned.weight ? ` @ ${planned.weight} kg` : ''}</span>
          ${planned.rest > 0 ? `
            <button class="rest-chip" onclick="window._launchChrono(${planned.rest})">
              ⏱ ${planned.rest}s
            </button>
          ` : ''}
        </div>
      </div>

      ${lwHtml ? `
        <div class="lw-row">
          <span class="lw-row-label">Sem. passée :</span>
          ${lwHtml}
        </div>
      ` : ''}

      <div class="sets-wrap">
        <div class="sets-hdr">
          <span>Série</span><span>Reps</span><span>Poids kg</span><span>✓</span><span></span>
        </div>
        <div class="sets-body">
          ${setRows.map(s => _renderSetRow(s)).join('')}
        </div>
      </div>

      <button class="add-set-link" data-perf-action="add-set">+ Série</button>
    </div>
  `;
}

function _renderSetRow(s) {
  return `
    <div class="set-row${s.done ? ' row-done' : ''}" data-idx="${s.idx}">
      <span class="set-num">${s.idx + 1}</span>
      <input type="number" class="set-input reps-inp" value="${s.reps}" placeholder="10" min="0" inputmode="numeric">
      <input type="number" class="set-input wgt-inp"  value="${s.weight}" placeholder="0"  min="0" step="0.5" inputmode="decimal">
      <button class="set-check-btn${s.done ? ' set-checked' : ''}" data-perf-action="toggle-set">✓</button>
      <button class="set-del-btn" data-perf-action="del-set">−</button>
    </div>
  `;
}

function _addSetRow(exEl) {
  const body = exEl.querySelector('.sets-body');
  const rows = body.querySelectorAll('.set-row');
  const last = rows[rows.length - 1];
  const lastReps   = last?.querySelector('.reps-inp')?.value  || '';
  const lastWeight = last?.querySelector('.wgt-inp')?.value   || '';
  const div = document.createElement('div');
  div.innerHTML = _renderSetRow({ idx: rows.length, reps: lastReps, weight: lastWeight, done: false });
  body.appendChild(div.firstElementChild);
}

function _updateExCompletion(exEl) {
  if (!exEl) return;
  const checkBtns = exEl.querySelectorAll('.set-check-btn');
  const allDone = checkBtns.length > 0 && [...checkBtns].every(b => b.classList.contains('set-checked'));
  exEl.classList.toggle('ex-done', allDone);
  const badge = exEl.querySelector('.ex-done-badge');
  const titleRow = exEl.querySelector('.perf-ex-title-row');
  if (allDone && !badge && titleRow) {
    titleRow.insertAdjacentHTML('beforeend', '<span class="ex-done-badge">✓</span>');
  } else if (!allDone && badge) {
    badge.remove();
  }
}

// ─── Sauvegarde ──────────────────────────────────────────────────────────

async function _savePerfLog() {
  const saveBtn = document.querySelector('[data-perf-action="save-perf"]');
  if (!saveBtn) return;
  const dateStr = saveBtn.dataset.date;
  const planId  = saveBtn.dataset.planId;
  const dayKey  = saveBtn.dataset.day;
  const plan    = DB.getTrainingPlan(dayKey);
  if (!plan) return;

  const exercises_done = [];
  document.querySelectorAll('.perf-ex').forEach(exEl => {
    const exId      = exEl.dataset.exId;
    const plannedEx = plan.exercises.find(e => e.id === exId);
    if (!plannedEx) return;

    const sets = [];
    exEl.querySelectorAll('.set-row').forEach((row, i) => {
      const done = row.querySelector('.set-check-btn')?.classList.contains('set-checked') || false;
      sets.push({
        set_num: i + 1,
        reps:    parseInt(row.querySelector('.reps-inp')?.value)  || 0,
        weight:  parseFloat(row.querySelector('.wgt-inp')?.value) || 0,
        done,
      });
    });

    exercises_done.push({
      exercise_id: exId,
      name:        plannedEx.name,
      completed:   sets.length > 0 && sets.every(s => s.done),
      sets,
    });
  });

  const existingLog = DB.getPerfLog(dateStr);
  const log = {
    id:             existingLog?.id || DB.uid(),
    date:           dateStr,
    plan_id:        planId,
    day_of_week:    dayKey,
    feeling:        _feeling || document.querySelector('.feeling-btn.active')?.dataset.f || null,
    notes:          document.getElementById('perf-notes')?.value?.trim() || '',
    exercises_done,
  };

  await DB.savePerfLog(dateStr, log);
  _showToast('Séance enregistrée 💪');
  _renderPerfContent(dateStr);
}

// ─── Chronométre ──────────────────────────────────────────────────────────

function _initChronoUI() {
  const overlay = document.getElementById('chrono-overlay');
  if (!overlay) return;

  document.getElementById('chrono-close').addEventListener('click', _closeChrono);
  overlay.addEventListener('click', e => { if (e.target === overlay) _closeChrono(); });

  document.querySelectorAll('.chrono-preset').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.chrono-preset').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      _resetChrono(parseInt(btn.dataset.sec));
    });
  });

  document.getElementById('chrono-reset').addEventListener('click', () => {
    _resetChrono(_chronoTotal);
  });
  document.getElementById('chrono-toggle').addEventListener('click', _toggleChrono);
}

function _openChrono(sec = 90) {
  const overlay = document.getElementById('chrono-overlay');
  if (!overlay) return;
  // Activer le bon preset
  document.querySelectorAll('.chrono-preset').forEach(b => {
    b.classList.toggle('active', parseInt(b.dataset.sec) === sec);
  });
  _resetChrono(sec);
  overlay.style.display = 'flex';
}

function _closeChrono() {
  _stopChrono();
  const overlay = document.getElementById('chrono-overlay');
  if (overlay) overlay.style.display = 'none';
}

function _resetChrono(sec) {
  _stopChrono();
  _chronoSec   = sec;
  _chronoTotal = sec;
  _chronoPaused = true;
  _updateChronoDisplay(sec, sec);
  const toggleBtn = document.getElementById('chrono-toggle');
  if (toggleBtn) toggleBtn.textContent = '▶ Démarrer';
}

function _toggleChrono() {
  if (!_chronoPaused) {
    _stopChrono();
    const btn = document.getElementById('chrono-toggle');
    if (btn) btn.textContent = '▶ Démarrer';
  } else {
    _startChrono();
    const btn = document.getElementById('chrono-toggle');
    if (btn) btn.textContent = '⏸ Pause';
  }
}

function _startChrono() {
  _chronoPaused = false;
  _chronoTimer  = setInterval(() => {
    _chronoSec--;
    _updateChronoDisplay(_chronoSec, _chronoTotal);

    if (_chronoSec <= 0) {
      _stopChrono();
      if (navigator.vibrate) navigator.vibrate([300, 100, 300]);
      const dEl = document.getElementById('chrono-digits');
      if (dEl) dEl.textContent = 'GO !';
      const btn = document.getElementById('chrono-toggle');
      if (btn) btn.textContent = '▶ Démarrer';
      setTimeout(() => _resetChrono(_chronoTotal), 2000);
    }
  }, 1000);
}

function _stopChrono() {
  _chronoPaused = true;
  if (_chronoTimer) {
    clearInterval(_chronoTimer);
    _chronoTimer = null;
  }
}

function _updateChronoDisplay(remaining, total) {
  const mins = Math.floor(remaining / 60);
  const secs = remaining % 60;
  const dEl  = document.getElementById('chrono-digits');
  const ring = document.getElementById('crng-fill');

  if (dEl) dEl.textContent = `${mins}:${String(secs).padStart(2, '0')}`;
  if (ring) {
    const C = 2 * Math.PI * 50; // r=50
    const progress = total > 0 ? remaining / total : 1;
    ring.style.strokeDasharray  = `${C}`;
    ring.style.strokeDashoffset = `${C * (1 - progress)}`;
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────

function _showToast(msg) {
  const t = document.createElement('div');
  t.className  = 'toast';
  t.textContent = msg;
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 2500);
}

function escHtml(s) {
  return String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
