import { renderDashboard } from './pages/dashboard.js';
import { renderWorkouts, initWorkouts } from './pages/workouts.js';
import { renderWeight, initWeight } from './pages/weight.js';
import { renderDiet, initDiet } from './pages/diet.js';
import { renderProfile, initProfile } from './pages/profile.js';

const PAGES = {
  dashboard: { render: renderDashboard, init: null },
  workouts: { render: renderWorkouts, init: initWorkouts },
  weight: { render: renderWeight, init: initWeight },
  diet: { render: renderDiet, init: initDiet },
  profile: { render: renderProfile, init: initProfile }
};

const app = {
  currentPage: 'dashboard',

  navigate(page) {
    if (!PAGES[page]) return;
    this.currentPage = page;

    // Update nav
    document.querySelectorAll('.nav-item').forEach(el => {
      el.classList.toggle('active', el.dataset.page === page);
    });

    // Render page
    const content = document.getElementById('app-content');
    content.innerHTML = PAGES[page].render();

    // Init page
    if (PAGES[page].init) PAGES[page].init();

    // Scroll to top
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

// Initial page
app.navigate('dashboard');
