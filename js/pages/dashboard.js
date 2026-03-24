import DB from '../db.js';

export function renderDashboard() {
  const workouts = DB.getWorkouts();
  const weights = DB.getWeightEntries();
  const profile = DB.getProfile();
  const today = DB.today();
  const todayDiet = DB.getDietDay(today);

  const todayWorkout = workouts.find(w => w.date === today);
  const lastWeight = weights.at(-1);
  const prevWeight = weights.at(-2);
  const weightDiff = lastWeight && prevWeight
    ? (lastWeight.weight - prevWeight.weight).toFixed(1)
    : null;

  // Calories today
  let calsToday = 0;
  Object.values(todayDiet.meals).forEach(foods =>
    foods.forEach(f => { calsToday += Number(f.calories) * (f.qty || 1) / 100; })
  );
  calsToday = Math.round(calsToday);

  const tdee = calcTDEE(profile);
  const streak = calcStreak(workouts);

  // Last 5 workouts
  const recent = workouts.slice(0, 5);

  return `
    <div class="page" id="page-dashboard">
      <div class="page-header">
        <h1>Bonjour${profile.name ? ', ' + profile.name : ''} 👋</h1>
        <p class="subtitle">${formatDate(new Date())}</p>
      </div>

      <div class="stats-grid">
        <div class="stat-card accent">
          <div class="stat-icon">🔥</div>
          <div class="stat-value">${streak}</div>
          <div class="stat-label">Jours consécutifs</div>
        </div>
        <div class="stat-card ${weightDiff !== null ? (weightDiff <= 0 ? 'success' : 'warning') : ''}">
          <div class="stat-icon">⚖️</div>
          <div class="stat-value">${lastWeight ? lastWeight.weight + ' kg' : '—'}</div>
          <div class="stat-label">Poids actuel ${weightDiff !== null ? `<span class="${weightDiff <= 0 ? 'down' : 'up'}">${weightDiff > 0 ? '+' : ''}${weightDiff} kg</span>` : ''}</div>
        </div>
        <div class="stat-card">
          <div class="stat-icon">🍽️</div>
          <div class="stat-value">${calsToday} <span class="stat-unit">kcal</span></div>
          <div class="stat-label">Calories aujourd'hui ${tdee ? `<br><small>/ ${tdee} objectif</small>` : ''}</div>
        </div>
        <div class="stat-card ${todayWorkout ? 'success' : ''}">
          <div class="stat-icon">💪</div>
          <div class="stat-value">${workouts.length}</div>
          <div class="stat-label">Séances total</div>
        </div>
      </div>

      ${todayWorkout ? `
      <div class="section">
        <h2 class="section-title">Séance du jour</h2>
        <div class="workout-card today-workout" data-id="${todayWorkout.id}">
          <div class="wc-header">
            <span class="wc-type-badge type-${todayWorkout.type}">${typeLabel(todayWorkout.type)}</span>
            <span class="difficulty-stars">${'★'.repeat(todayWorkout.difficulty || 0)}${'☆'.repeat(5 - (todayWorkout.difficulty || 0))}</span>
          </div>
          <div class="wc-name">${todayWorkout.name}</div>
          <div class="wc-meta">
            ${todayWorkout.duration ? `<span>⏱ ${todayWorkout.duration} min</span>` : ''}
            ${todayWorkout.exercises?.length ? `<span>💪 ${todayWorkout.exercises.length} exercices</span>` : ''}
          </div>
        </div>
      </div>
      ` : `
      <div class="section">
        <div class="empty-today">
          <p>Aucune séance enregistrée aujourd'hui</p>
          <button class="btn btn-primary" onclick="app.navigate('workouts'); setTimeout(()=>document.getElementById('btn-add-workout')?.click(),100)">
            + Ajouter une séance
          </button>
        </div>
      </div>
      `}

      ${recent.length > 0 ? `
      <div class="section">
        <div class="section-header">
          <h2 class="section-title">Dernières séances</h2>
          <button class="btn-link" onclick="app.navigate('workouts')">Voir tout</button>
        </div>
        <div class="workout-list">
          ${recent.map(w => `
            <div class="workout-row" data-id="${w.id}" onclick="app.navigate('workouts')">
              <div class="wr-left">
                <span class="wc-type-badge type-${w.type}">${typeLabel(w.type)}</span>
                <div>
                  <div class="wr-name">${w.name}</div>
                  <div class="wr-date">${formatDateShort(w.date)}</div>
                </div>
              </div>
              <div class="wr-right">
                ${w.duration ? `<span>⏱ ${w.duration}min</span>` : ''}
                <span>${'★'.repeat(w.difficulty || 0)}</span>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
      ` : ''}

      <div class="section quick-actions">
        <h2 class="section-title">Actions rapides</h2>
        <div class="quick-btns">
          <button class="quick-btn" onclick="app.navigate('workouts'); setTimeout(()=>document.getElementById('btn-add-workout')?.click(),100)">
            <span>💪</span>Séance
          </button>
          <button class="quick-btn" onclick="app.navigate('weight'); setTimeout(()=>document.getElementById('btn-add-weight')?.click(),100)">
            <span>⚖️</span>Poids
          </button>
          <button class="quick-btn" onclick="app.navigate('diet')">
            <span>🥗</span>Repas
          </button>
          <button class="quick-btn" onclick="app.navigate('profile')">
            <span>👤</span>Profil
          </button>
        </div>
      </div>
    </div>
  `;
}

function calcStreak(workouts) {
  if (!workouts.length) return 0;
  const dates = [...new Set(workouts.map(w => w.date))].sort().reverse();
  let streak = 0;
  let current = new Date();
  current.setHours(0, 0, 0, 0);
  for (const d of dates) {
    const wd = new Date(d);
    const diff = Math.round((current - wd) / 86400000);
    if (diff <= 1) { streak++; current = wd; }
    else break;
  }
  return streak;
}

function calcTDEE(profile) {
  if (!profile.weight || !profile.height || !profile.age) return null;
  const bmr = profile.gender === 'female'
    ? 10 * profile.weight + 6.25 * profile.height - 5 * profile.age - 161
    : 10 * profile.weight + 6.25 * profile.height - 5 * profile.age + 5;
  const mult = { sedentary: 1.2, light: 1.375, moderate: 1.55, active: 1.725, veryactive: 1.9 };
  return Math.round(bmr * (mult[profile.activityLevel] || 1.55));
}

export function typeLabel(type) {
  const labels = { strength: 'Musculation', cardio: 'Cardio', hiit: 'HIIT', flexibility: 'Souplesse', sport: 'Sport', other: 'Autre' };
  return labels[type] || type;
}

export function formatDate(d) {
  return new Date(d).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
}

export function formatDateShort(str) {
  return new Date(str + 'T12:00:00').toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
}
