import DB from './db.js';
import { renderDashboard } from './pages/dashboard.js';
import { renderWorkouts, initWorkouts } from './pages/workouts.js';
import { renderWeight, initWeight } from './pages/weight.js';
import { renderDiet, initDiet } from './pages/diet.js';
import { renderProfile, initProfile } from './pages/profile.js';

const PAGES = {
  dashboard: { render: renderDashboard, init: null },
  workouts:  { render: renderWorkouts,  init: initWorkouts },
  weight:    { render: renderWeight,    init: initWeight },
  diet:      { render: renderDiet,      init: initDiet },
  profile:   { render: renderProfile,   init: initProfile }
};

const app = {
  currentPage: 'dashboard',

  navigate(page) {
    if (!PAGES[page]) return;
    this.currentPage = page;

    document.querySelectorAll('.nav-item').forEach(el =>
      el.classList.toggle('active', el.dataset.page === page)
    );

    const content = document.getElementById('app-content');
    content.innerHTML = PAGES[page].render();
    if (PAGES[page].init) PAGES[page].init();
    content.scrollTop = 0;
  }
};

window.app = app;

// Register service worker
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/sw.js').catch(() => {});
}

// Navigation clicks
document.getElementById('app-nav').addEventListener('click', e => {
  const item = e.target.closest('.nav-item');
  if (item) app.navigate(item.dataset.page);
});

// ── Boot ───────────────────────────────────────────────────────────────────
document.getElementById('app-content').innerHTML = `
  <div style="display:flex;align-items:center;justify-content:center;height:60vh;flex-direction:column;gap:16px">
    <div class="loader"></div>
    <p style="color:var(--text-muted);font-size:14px">Chargement...</p>
  </div>`;

DB.init().then(() => {
  app.navigate('dashboard');
});
