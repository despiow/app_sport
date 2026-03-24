import DB from '../db.js';
import { typeLabel, formatDateShort } from './dashboard.js';

const EXERCISE_SUGGESTIONS = [
  'Squat', 'Développé couché', 'Soulevé de terre', 'Tractions', 'Dips',
  'Développé militaire', 'Curl biceps', 'Extension triceps', 'Rowing barre',
  'Leg press', 'Fentes', 'Hip thrust', 'Mollets', 'Gainage', 'Crunchs',
  'Pompes', 'Tirage horizontal', 'Tirage vertical', 'Écarté couché',
  'Course à pied', 'Vélo', 'Natation', 'Corde à sauter', 'Burpees',
  'Mountain climbers', 'Jump squats', 'Box jump', 'Kettlebell swing'
];

export function renderWorkouts() {
  const workouts = DB.getWorkouts();
  const types = ['all', 'strength', 'cardio', 'hiit', 'flexibility', 'sport', 'other'];

  return `
    <div class="page" id="page-workouts">
      <div class="page-header">
        <h1>Entraînements</h1>
        <button class="btn btn-primary btn-sm" id="btn-add-workout">+ Nouvelle séance</button>
      </div>

      <div class="filter-tabs" id="workout-filter">
        ${types.map(t => `<button class="filter-tab ${t === 'all' ? 'active' : ''}" data-type="${t}">${t === 'all' ? 'Tout' : typeLabel(t)}</button>`).join('')}
      </div>

      <div id="workout-list-container">
        ${renderWorkoutList(workouts)}
      </div>
    </div>

    <!-- Modal: Add/Edit Workout -->
    <div class="modal-overlay" id="modal-workout" style="display:none">
      <div class="modal">
        <div class="modal-header">
          <h2 id="modal-workout-title">Nouvelle séance</h2>
          <button class="modal-close" onclick="closeWorkoutModal()">✕</button>
        </div>
        <div class="modal-body">
          <form id="form-workout">
            <input type="hidden" id="wf-id">
            <div class="form-row">
              <div class="form-group flex-2">
                <label>Nom de la séance</label>
                <input type="text" id="wf-name" placeholder="Push Day, Run matinal..." required>
              </div>
              <div class="form-group">
                <label>Type</label>
                <select id="wf-type">
                  <option value="strength">Musculation</option>
                  <option value="cardio">Cardio</option>
                  <option value="hiit">HIIT</option>
                  <option value="flexibility">Souplesse</option>
                  <option value="sport">Sport</option>
                  <option value="other">Autre</option>
                </select>
              </div>
            </div>
            <div class="form-row">
              <div class="form-group">
                <label>Date</label>
                <input type="date" id="wf-date" required>
              </div>
              <div class="form-group">
                <label>Durée (min)</label>
                <input type="number" id="wf-duration" placeholder="60" min="1">
              </div>
              <div class="form-group">
                <label>Difficulté</label>
                <div class="star-input" id="wf-difficulty-stars">
                  ${[1,2,3,4,5].map(n => `<span class="star" data-val="${n}">★</span>`).join('')}
                </div>
                <input type="hidden" id="wf-difficulty" value="3">
              </div>
            </div>
            <div class="form-group">
              <label>Mémo / Notes</label>
              <textarea id="wf-notes" rows="2" placeholder="Sensations, difficultés, objectifs..."></textarea>
            </div>

            <div class="exercises-section">
              <div class="section-header">
                <h3>Exercices</h3>
                <button type="button" class="btn btn-outline btn-sm" onclick="addExercise()">+ Exercice</button>
              </div>
              <div id="exercises-list"></div>
            </div>

            <div class="form-actions">
              <button type="button" class="btn btn-ghost" onclick="closeWorkoutModal()">Annuler</button>
              <button type="submit" class="btn btn-primary">Enregistrer</button>
            </div>
          </form>
        </div>
      </div>
    </div>

    <!-- Modal: View Workout -->
    <div class="modal-overlay" id="modal-workout-view" style="display:none">
      <div class="modal">
        <div class="modal-header">
          <h2 id="modal-view-title">Détail séance</h2>
          <button class="modal-close" onclick="document.getElementById('modal-workout-view').style.display='none'">✕</button>
        </div>
        <div class="modal-body" id="modal-view-body"></div>
      </div>
    </div>
  `;
}

function renderWorkoutList(workouts) {
  if (!workouts.length) return `
    <div class="empty-state">
      <div class="empty-icon">💪</div>
      <p>Aucune séance enregistrée</p>
      <p class="text-muted">Commencez par ajouter votre première séance !</p>
    </div>`;

  // Group by month
  const groups = {};
  workouts.forEach(w => {
    const key = w.date.slice(0, 7);
    if (!groups[key]) groups[key] = [];
    groups[key].push(w);
  });

  return Object.entries(groups).sort((a, b) => b[0].localeCompare(a[0])).map(([month, ws]) => `
    <div class="month-group">
      <div class="month-label">${formatMonth(month)}</div>
      ${ws.map(w => `
        <div class="workout-card" onclick="viewWorkout('${w.id}')">
          <div class="wc-header">
            <span class="wc-type-badge type-${w.type}">${typeLabel(w.type)}</span>
            <span class="difficulty-stars small">${'★'.repeat(w.difficulty || 0)}${'☆'.repeat(5 - (w.difficulty || 0))}</span>
          </div>
          <div class="wc-name">${w.name}</div>
          <div class="wc-meta">
            <span>📅 ${formatDateShort(w.date)}</span>
            ${w.duration ? `<span>⏱ ${w.duration} min</span>` : ''}
            ${w.exercises?.length ? `<span>🏋️ ${w.exercises.length} exercice${w.exercises.length > 1 ? 's' : ''}</span>` : ''}
          </div>
          ${w.notes ? `<div class="wc-notes">📝 ${w.notes}</div>` : ''}
          <div class="wc-actions">
            <button class="btn-icon" onclick="event.stopPropagation(); editWorkout('${w.id}')">✏️</button>
            <button class="btn-icon danger" onclick="event.stopPropagation(); deleteWorkoutConfirm('${w.id}')">🗑️</button>
          </div>
        </div>
      `).join('')}
    </div>
  `).join('');
}

function formatMonth(ym) {
  const [y, m] = ym.split('-');
  const months = ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre'];
  return `${months[parseInt(m) - 1]} ${y}`;
}

export function initWorkouts() {
  // Add workout button
  document.getElementById('btn-add-workout')?.addEventListener('click', () => openWorkoutModal());

  // Filter tabs
  document.getElementById('workout-filter')?.addEventListener('click', e => {
    const tab = e.target.closest('.filter-tab');
    if (!tab) return;
    document.querySelectorAll('#workout-filter .filter-tab').forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
    const type = tab.dataset.type;
    const all = DB.getWorkouts();
    const filtered = type === 'all' ? all : all.filter(w => w.type === type);
    document.getElementById('workout-list-container').innerHTML = renderWorkoutList(filtered);
  });

  // Star input
  initStarInput();

  // Exercise suggestions
  const form = document.getElementById('form-workout');
  form?.addEventListener('submit', e => {
    e.preventDefault();
    saveWorkoutForm();
  });

  // Default date = today
  const dateInput = document.getElementById('wf-date');
  if (dateInput) dateInput.value = DB.today();
}

function initStarInput() {
  const stars = document.querySelectorAll('#wf-difficulty-stars .star');
  const input = document.getElementById('wf-difficulty');
  let val = parseInt(input?.value) || 3;
  updateStars(stars, val);
  stars.forEach(s => {
    s.addEventListener('click', () => {
      val = parseInt(s.dataset.val);
      if (input) input.value = val;
      updateStars(stars, val);
    });
    s.addEventListener('mouseover', () => updateStars(stars, parseInt(s.dataset.val)));
    s.addEventListener('mouseout', () => updateStars(stars, val));
  });
}

function updateStars(stars, val) {
  stars.forEach(s => s.classList.toggle('active', parseInt(s.dataset.val) <= val));
}

window.openWorkoutModal = function(id = null) {
  const modal = document.getElementById('modal-workout');
  const form = document.getElementById('form-workout');
  form.reset();
  document.getElementById('exercises-list').innerHTML = '';
  document.getElementById('wf-id').value = '';
  document.getElementById('wf-date').value = DB.today();
  document.getElementById('wf-difficulty').value = 3;
  initStarInput();

  if (id) {
    const w = DB.getWorkout(id);
    if (w) {
      document.getElementById('modal-workout-title').textContent = 'Modifier la séance';
      document.getElementById('wf-id').value = w.id;
      document.getElementById('wf-name').value = w.name;
      document.getElementById('wf-type').value = w.type;
      document.getElementById('wf-date').value = w.date;
      document.getElementById('wf-duration').value = w.duration || '';
      document.getElementById('wf-difficulty').value = w.difficulty || 3;
      document.getElementById('wf-notes').value = w.notes || '';
      initStarInput();
      (w.exercises || []).forEach(ex => addExercise(ex));
    }
  } else {
    document.getElementById('modal-workout-title').textContent = 'Nouvelle séance';
  }
  modal.style.display = 'flex';
};

window.closeWorkoutModal = function() {
  document.getElementById('modal-workout').style.display = 'none';
};

window.editWorkout = function(id) { openWorkoutModal(id); };

window.deleteWorkoutConfirm = async function(id) {
  if (confirm('Supprimer cette séance ?')) {
    await DB.deleteWorkout(id);
    document.getElementById('workout-list-container').innerHTML = renderWorkoutList(DB.getWorkouts());
  }
};

window.viewWorkout = function(id) {
  const w = DB.getWorkout(id);
  if (!w) return;
  const modal = document.getElementById('modal-workout-view');
  document.getElementById('modal-view-title').textContent = w.name;
  document.getElementById('modal-view-body').innerHTML = `
    <div class="view-workout">
      <div class="view-meta">
        <span class="wc-type-badge type-${w.type}">${typeLabel(w.type)}</span>
        <span>📅 ${formatDateShort(w.date)}</span>
        ${w.duration ? `<span>⏱ ${w.duration} min</span>` : ''}
        <span class="difficulty-stars">${'★'.repeat(w.difficulty || 0)}${'☆'.repeat(5 - (w.difficulty || 0))}</span>
      </div>
      ${w.notes ? `<div class="view-notes"><strong>📝 Notes :</strong> ${w.notes}</div>` : ''}
      ${w.exercises?.length ? `
        <div class="exercises-view">
          <h3>Exercices</h3>
          ${w.exercises.map(ex => `
            <div class="exercise-view-card">
              <div class="ex-name">${ex.name}</div>
              <div class="sets-view">
                ${(ex.sets || []).map((s, i) => `
                  <div class="set-row">
                    <span class="set-num">S${i+1}</span>
                    ${s.reps ? `<span>${s.reps} reps</span>` : ''}
                    ${s.weight ? `<span>${s.weight} kg</span>` : ''}
                    ${s.duration ? `<span>${s.duration} s</span>` : ''}
                    ${s.distance ? `<span>${s.distance} m</span>` : ''}
                  </div>
                `).join('')}
              </div>
              ${ex.notes ? `<div class="ex-notes">📝 ${ex.notes}</div>` : ''}
            </div>
          `).join('')}
        </div>
      ` : ''}
      <div class="view-actions">
        <button class="btn btn-outline" onclick="document.getElementById('modal-workout-view').style.display='none'; editWorkout('${w.id}')">✏️ Modifier</button>
      </div>
    </div>
  `;
  modal.style.display = 'flex';
};

let exerciseCount = 0;
window.addExercise = function(ex = null) {
  exerciseCount++;
  const id = `ex-${exerciseCount}`;
  const div = document.createElement('div');
  div.className = 'exercise-form-card';
  div.id = id;
  div.innerHTML = `
    <div class="exercise-form-header">
      <div class="form-group flex-1">
        <input type="text" class="ex-name" placeholder="Nom de l'exercice" value="${ex?.name || ''}" list="exercise-suggestions">
      </div>
      <button type="button" class="btn-icon danger" onclick="document.getElementById('${id}').remove()">✕</button>
    </div>
    <div class="sets-list" id="sets-${id}">
      ${(ex?.sets || [{}]).map((s, i) => renderSetRow(id, s, i)).join('')}
    </div>
    <div class="ex-footer">
      <button type="button" class="btn-link" onclick="addSet('${id}')">+ Série</button>
      <input type="text" class="ex-notes-input" placeholder="Notes exercice..." value="${ex?.notes || ''}">
    </div>
  `;
  document.getElementById('exercises-list').appendChild(div);
};

function renderSetRow(exId, set = {}, idx = 0) {
  return `
    <div class="set-row-form">
      <span class="set-num">S${idx + 1}</span>
      <input type="number" class="set-reps" placeholder="Reps" value="${set.reps || ''}" min="1">
      <input type="number" class="set-weight" placeholder="kg" value="${set.weight || ''}" min="0" step="0.5">
      <input type="text" class="set-extra" placeholder="Notes" value="${set.notes || ''}">
      <button type="button" class="btn-icon danger sm" onclick="this.closest('.set-row-form').remove(); renumberSets('${exId}')">✕</button>
    </div>
  `;
}

window.addSet = function(exId) {
  const list = document.getElementById(`sets-${exId}`);
  const idx = list.children.length;
  list.insertAdjacentHTML('beforeend', renderSetRow(exId, {}, idx));
};

window.renumberSets = function(exId) {
  document.querySelectorAll(`#sets-${exId} .set-num`).forEach((el, i) => el.textContent = `S${i+1}`);
};

async function saveWorkoutForm() {
  const id = document.getElementById('wf-id').value || DB.uid();
  const exercises = [];

  document.querySelectorAll('#exercises-list .exercise-form-card').forEach(card => {
    const name = card.querySelector('.ex-name').value.trim();
    if (!name) return;
    const sets = [];
    card.querySelectorAll('.set-row-form').forEach(row => {
      const reps = row.querySelector('.set-reps').value;
      const weight = row.querySelector('.set-weight').value;
      const notes = row.querySelector('.set-extra').value;
      if (reps || weight) sets.push({ reps: Number(reps) || null, weight: Number(weight) || null, notes });
    });
    const notes = card.querySelector('.ex-notes-input').value;
    exercises.push({ name, sets, notes });
  });

  const workout = {
    id,
    name: document.getElementById('wf-name').value,
    type: document.getElementById('wf-type').value,
    date: document.getElementById('wf-date').value,
    duration: Number(document.getElementById('wf-duration').value) || null,
    difficulty: Number(document.getElementById('wf-difficulty').value) || 3,
    notes: document.getElementById('wf-notes').value,
    exercises
  };

  await DB.saveWorkout(workout);
  closeWorkoutModal();

  // Refresh list
  const activeType = document.querySelector('#workout-filter .filter-tab.active')?.dataset.type || 'all';
  const all = DB.getWorkouts();
  const filtered = activeType === 'all' ? all : all.filter(w => w.type === activeType);
  document.getElementById('workout-list-container').innerHTML = renderWorkoutList(filtered);
}
