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

let _currentDay = null;

function todayDayKey() {
  return DAYS[(new Date().getDay() + 6) % 7].key;
}

export function renderEntrainements() {
  _currentDay = todayDayKey();
  return `
    <div class="page" id="page-entrainements">
      <div class="page-header">
        <h1>Programme</h1>
      </div>

      <div class="day-tabs" id="prog-day-tabs">
        ${DAYS.map(d => `
          <button class="day-tab${d.key === _currentDay ? ' active' : ''}" data-day="${d.key}">
            ${d.short}
          </button>
        `).join('')}
      </div>

      <div id="plan-content"></div>
    </div>

    <!-- Modal : Créer / Renommer le programme -->
    <div class="modal-overlay centered" id="modal-plan" style="display:none">
      <div class="modal">
        <div class="modal-header">
          <h2 id="modal-plan-title">Nouveau programme</h2>
          <button class="modal-close" id="btn-close-plan">✕</button>
        </div>
        <div class="modal-body">
          <div class="form-group">
            <label>Nom du programme</label>
            <input type="text" id="plan-name-input" placeholder="Pectoraux / Triceps...">
          </div>
          <input type="hidden" id="plan-edit-id">
          <input type="hidden" id="plan-edit-day">
        </div>
        <div class="modal-footer">
          <button class="btn btn-outline" id="btn-cancel-plan">Annuler</button>
          <button class="btn btn-primary" id="btn-save-plan">Enregistrer</button>
        </div>
      </div>
    </div>

    <!-- Modal : Ajouter / Modifier exercice -->
    <div class="modal-overlay centered" id="modal-exercise" style="display:none">
      <div class="modal">
        <div class="modal-header">
          <h2 id="modal-ex-title">Exercice</h2>
          <button class="modal-close" id="btn-close-ex">✕</button>
        </div>
        <div class="modal-body">
          <input type="hidden" id="ex-edit-id">
          <input type="hidden" id="ex-plan-id">
          <div class="form-group">
            <label>Exercice</label>
            <input type="text" id="ex-name" list="exercise-suggestions" placeholder="Développé couché...">
          </div>
          <div class="form-row">
            <div class="form-group">
              <label>Séries</label>
              <input type="number" id="ex-sets" value="3" min="1" max="20">
            </div>
            <div class="form-group">
              <label>Répétitions</label>
              <input type="text" id="ex-reps" value="10" placeholder="10 ou 8-12">
            </div>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label>Poids (kg)</label>
              <input type="number" id="ex-weight" placeholder="Ex: 80" min="0" step="0.5">
            </div>
            <div class="form-group">
              <label>Repos (sec)</label>
              <select id="ex-rest">
                <option value="0">—</option>
                <option value="45">45s</option>
                <option value="60">60s</option>
                <option value="90" selected>90s</option>
                <option value="120">2 min</option>
                <option value="180">3 min</option>
              </select>
            </div>
          </div>
          <div class="form-group">
            <label>Note / consigne</label>
            <input type="text" id="ex-notes" placeholder="Serrer les omoplates...">
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-outline" id="btn-cancel-ex">Annuler</button>
          <button class="btn btn-primary" id="btn-save-ex">Enregistrer</button>
        </div>
      </div>
    </div>
  `;
}

export function initEntrainements() {
  renderPlanContent(_currentDay);

  // Onglets jours
  document.getElementById('prog-day-tabs').addEventListener('click', e => {
    const tab = e.target.closest('.day-tab');
    if (!tab) return;
    document.querySelectorAll('#prog-day-tabs .day-tab').forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
    _currentDay = tab.dataset.day;
    renderPlanContent(_currentDay);
  });

  // Modal plan
  document.getElementById('btn-close-plan').onclick = closePlanModal;
  document.getElementById('btn-cancel-plan').onclick = closePlanModal;
  document.getElementById('btn-save-plan').onclick = savePlan;
  document.getElementById('plan-name-input').addEventListener('keydown', e => {
    if (e.key === 'Enter') savePlan();
  });

  // Modal exercice
  document.getElementById('btn-close-ex').onclick = closeExModal;
  document.getElementById('btn-cancel-ex').onclick = closeExModal;
  document.getElementById('btn-save-ex').onclick = saveExercise;

  // Fermer modals en cliquant overlay
  document.getElementById('modal-plan').addEventListener('click', e => {
    if (e.target === document.getElementById('modal-plan')) closePlanModal();
  });
  document.getElementById('modal-exercise').addEventListener('click', e => {
    if (e.target === document.getElementById('modal-exercise')) closeExModal();
  });

  // Délégation sur le contenu du plan
  document.getElementById('plan-content').addEventListener('click', async e => {
    const btn = e.target.closest('[data-action]');
    if (!btn) return;
    const action = btn.dataset.action;

    if (action === 'create-plan') {
      openPlanModal(null, _currentDay);
    } else if (action === 'edit-plan') {
      const plan = DB.getTrainingPlan(_currentDay);
      openPlanModal(plan, _currentDay);
    } else if (action === 'delete-plan') {
      const plan = DB.getTrainingPlan(_currentDay);
      if (plan && confirm(`Supprimer le programme "${plan.name}" ?`)) {
        await DB.deleteTrainingPlan(plan.id);
        renderPlanContent(_currentDay);
      }
    } else if (action === 'add-exercise') {
      const plan = DB.getTrainingPlan(_currentDay);
      if (plan) openExModal(plan.id, null);
    } else if (action === 'edit-exercise') {
      const plan = DB.getTrainingPlan(_currentDay);
      const ex = plan?.exercises.find(e => e.id === btn.dataset.exId);
      if (ex) openExModal(plan.id, ex);
    } else if (action === 'delete-exercise') {
      const plan = DB.getTrainingPlan(_currentDay);
      const exId = btn.dataset.exId;
      if (plan && confirm('Supprimer cet exercice ?')) {
        plan.exercises = plan.exercises.filter(e => e.id !== exId);
        await DB.saveTrainingPlan(plan);
        renderPlanContent(_currentDay);
      }
    } else if (action === 'move-up') {
      const plan = DB.getTrainingPlan(_currentDay);
      const idx = plan?.exercises.findIndex(e => e.id === btn.dataset.exId) ?? -1;
      if (idx > 0) {
        [plan.exercises[idx - 1], plan.exercises[idx]] = [plan.exercises[idx], plan.exercises[idx - 1]];
        await DB.saveTrainingPlan(plan);
        renderPlanContent(_currentDay);
      }
    } else if (action === 'move-down') {
      const plan = DB.getTrainingPlan(_currentDay);
      const idx = plan?.exercises.findIndex(e => e.id === btn.dataset.exId) ?? -1;
      if (idx >= 0 && idx < plan.exercises.length - 1) {
        [plan.exercises[idx], plan.exercises[idx + 1]] = [plan.exercises[idx + 1], plan.exercises[idx]];
        await DB.saveTrainingPlan(plan);
        renderPlanContent(_currentDay);
      }
    } else if (action === 'save-notes') {
      const plan = DB.getTrainingPlan(_currentDay);
      if (plan) {
        plan.notes = document.getElementById('plan-notes-input').value;
        await DB.saveTrainingPlan(plan);
        showToast('Notes enregistrées');
      }
    }
  });
}

// ─── Rendu du contenu du plan ──────────────────────────────────────────────

function renderPlanContent(day) {
  const plan  = DB.getTrainingPlan(day);
  const dayObj = DAYS.find(d => d.key === day);
  const content = document.getElementById('plan-content');
  if (!content) return;

  if (!plan) {
    content.innerHTML = `
      <div class="prog-empty">
        <div class="prog-empty-icon">📋</div>
        <p class="prog-empty-title">Aucun programme pour ${dayObj?.full || day}</p>
        <p class="prog-empty-sub">Crée ton programme d'entraînement pour ce jour</p>
        <button class="btn btn-primary" data-action="create-plan">+ Créer le programme</button>
      </div>
    `;
    return;
  }

  content.innerHTML = `
    <div class="prog-card">
      <div class="prog-title-row">
        <div>
          <span class="prog-day-label">${dayObj?.full}</span>
          <h2 class="prog-title">${escHtml(plan.name)}</h2>
        </div>
        <div class="prog-title-actions">
          <button class="icon-btn" data-action="edit-plan" title="Renommer">✏️</button>
          <button class="icon-btn danger" data-action="delete-plan" title="Supprimer">🗑️</button>
        </div>
      </div>

      <div id="exercises-list">
        ${plan.exercises.length === 0
          ? '<p class="prog-no-ex">Aucun exercice — ajoute ton premier ci-dessous</p>'
          : plan.exercises.map((ex, i) => renderExerciseCard(ex, i, plan.exercises.length)).join('')
        }
      </div>

      <button class="btn btn-outline prog-add-ex-btn" data-action="add-exercise">
        + Ajouter un exercice
      </button>

      <div class="prog-notes-section">
        <label class="section-label">Notes du programme</label>
        <textarea id="plan-notes-input" class="prog-notes-input" rows="2"
          placeholder="Consignes, objectifs du cycle...">${escHtml(plan.notes || '')}</textarea>
        <button class="btn btn-outline btn-sm" data-action="save-notes">Enregistrer</button>
      </div>
    </div>
  `;
}

function renderExerciseCard(ex, idx, total) {
  return `
    <div class="prog-exercise">
      <div class="prog-ex-main">
        <div class="prog-ex-info">
          <span class="prog-ex-name">${escHtml(ex.name)}</span>
          <div class="prog-ex-badges">
            <span class="xbadge xbadge-primary">${ex.sets} × ${escHtml(String(ex.reps))}</span>
            ${ex.weight ? `<span class="xbadge xbadge-cyan">${ex.weight} kg</span>` : ''}
            ${ex.rest > 0 ? `<span class="xbadge xbadge-warn">⏱ ${ex.rest}s</span>` : ''}
          </div>
          ${ex.notes ? `<p class="prog-ex-note">${escHtml(ex.notes)}</p>` : ''}
        </div>
        <div class="prog-ex-actions">
          ${idx > 0 ? `<button class="icon-btn sm" data-action="move-up" data-ex-id="${ex.id}" title="Monter">↑</button>` : '<span class="icon-btn-placeholder"></span>'}
          ${idx < total - 1 ? `<button class="icon-btn sm" data-action="move-down" data-ex-id="${ex.id}" title="Descendre">↓</button>` : '<span class="icon-btn-placeholder"></span>'}
          <button class="icon-btn sm" data-action="edit-exercise" data-ex-id="${ex.id}" title="Modifier">✏️</button>
          <button class="icon-btn sm danger" data-action="delete-exercise" data-ex-id="${ex.id}" title="Supprimer">🗑️</button>
        </div>
      </div>
    </div>
  `;
}

// ─── Modals ────────────────────────────────────────────────────────────────

function openPlanModal(plan, day) {
  document.getElementById('modal-plan-title').textContent = plan ? 'Modifier le programme' : 'Nouveau programme';
  document.getElementById('plan-name-input').value = plan?.name || '';
  document.getElementById('plan-edit-id').value   = plan?.id   || '';
  document.getElementById('plan-edit-day').value  = day;
  document.getElementById('modal-plan').style.display = 'flex';
  setTimeout(() => document.getElementById('plan-name-input').focus(), 50);
}
function closePlanModal() {
  document.getElementById('modal-plan').style.display = 'none';
}
async function savePlan() {
  const name = document.getElementById('plan-name-input').value.trim();
  if (!name) return;
  const existingId = document.getElementById('plan-edit-id').value;
  const day = document.getElementById('plan-edit-day').value;

  let plan = existingId ? DB.getTrainingPlan(day) : null;
  if (plan) {
    plan.name = name;
  } else {
    plan = { id: DB.uid(), day_of_week: day, name, exercises: [], notes: '' };
  }
  await DB.saveTrainingPlan(plan);
  closePlanModal();
  renderPlanContent(day);
}

function openExModal(planId, ex) {
  document.getElementById('modal-ex-title').textContent = ex ? 'Modifier l\'exercice' : 'Nouvel exercice';
  document.getElementById('ex-edit-id').value = ex?.id    || '';
  document.getElementById('ex-plan-id').value = planId;
  document.getElementById('ex-name').value    = ex?.name  || '';
  document.getElementById('ex-sets').value    = ex?.sets  ?? 3;
  document.getElementById('ex-reps').value    = ex?.reps  ?? '10';
  document.getElementById('ex-weight').value  = ex?.weight ?? '';
  document.getElementById('ex-rest').value    = ex?.rest  ?? 90;
  document.getElementById('ex-notes').value   = ex?.notes || '';
  document.getElementById('modal-exercise').style.display = 'flex';
  setTimeout(() => document.getElementById('ex-name').focus(), 50);
}
function closeExModal() {
  document.getElementById('modal-exercise').style.display = 'none';
}
async function saveExercise() {
  const name = document.getElementById('ex-name').value.trim();
  if (!name) return;
  const planId = document.getElementById('ex-plan-id').value;
  const exId   = document.getElementById('ex-edit-id').value;
  const plan   = DB.getTrainingPlans().find(p => p.id === planId);
  if (!plan) return;

  const ex = {
    id:     exId || DB.uid(),
    name,
    sets:   parseInt(document.getElementById('ex-sets').value)   || 3,
    reps:   document.getElementById('ex-reps').value.trim()      || '10',
    weight: parseFloat(document.getElementById('ex-weight').value) || null,
    rest:   parseInt(document.getElementById('ex-rest').value)   ?? 90,
    notes:  document.getElementById('ex-notes').value.trim(),
  };

  if (exId) {
    const idx = plan.exercises.findIndex(e => e.id === exId);
    if (idx >= 0) plan.exercises[idx] = ex;
    else plan.exercises.push(ex);
  } else {
    plan.exercises.push(ex);
  }

  await DB.saveTrainingPlan(plan);
  closeExModal();
  renderPlanContent(_currentDay);
}

// ─── Helpers ──────────────────────────────────────────────────────────────

function showToast(msg) {
  const t = document.createElement('div');
  t.className = 'toast';
  t.textContent = msg;
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 2500);
}

function escHtml(s) {
  return String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
