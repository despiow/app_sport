import DB from './db.js';
import Auth from './auth.js';
import { renderDashboard } from './pages/dashboard.js';
import { renderWorkouts, initWorkouts } from './pages/workouts.js';
import { renderWeight, initWeight } from './pages/weight.js';
import { renderDiet, initDiet } from './pages/diet.js';
import { renderProfile, initProfile } from './pages/profile.js';
import { renderKeto, initKeto } from './pages/keto.js';

const PAGES = {
  dashboard: { render: renderDashboard, init: null },
  workouts:  { render: renderWorkouts,  init: initWorkouts },
  weight:    { render: renderWeight,    init: initWeight },
  diet:      { render: renderDiet,      init: initDiet },
  keto:      { render: renderKeto,      init: initKeto },
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

window.app  = app;
window.Auth = Auth;

// Register service worker
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/sw.js').catch(() => {});
}

// Navigation clicks
document.getElementById('app-nav').addEventListener('click', e => {
  const item = e.target.closest('.nav-item');
  if (item) app.navigate(item.dataset.page);
});

// ── Écran de connexion PIN ─────────────────────────────────────────────────
async function showLogin() {
  const nav     = document.getElementById('app-nav');
  const content = document.getElementById('app-content');
  nav.style.display = 'none';

  const hasPIN = await Auth.hasPIN();
  const PIN_LEN = 6;
  let step      = hasPIN ? 'login' : 'setup-1';
  let firstPin  = '';
  let digits    = [];

  // Delegation unique sur content
  content.addEventListener('click', e => {
    const btn = e.target.closest('[data-k]');
    if (btn) onKey(btn.dataset.k);
  });

  // Clavier physique (desktop)
  document.addEventListener('keydown', onKeydown);

  function onKeydown(e) {
    if (e.key >= '0' && e.key <= '9') onKey(e.key);
    if (e.key === 'Backspace') onKey('⌫');
  }

  function render(error = '') {
    const titles = {
      'login':   'Entrez votre code PIN',
      'setup-1': 'Créez votre code PIN',
      'setup-2': 'Confirmez votre code PIN',
    };
    const dots = Array.from({ length: PIN_LEN }, (_, i) =>
      `<span class="pin-dot${i < digits.length ? ' filled' : ''}"></span>`
    ).join('');

    content.innerHTML = `
      <div class="login-screen">
        <div class="login-top">
          <div class="login-icon">💪</div>
          <h1 class="login-title">SportTracker</h1>
          <p class="login-sub">${titles[step]}</p>
          ${step === 'setup-1' ? '<p class="login-hint">Choisissez un code à 6 chiffres pour sécuriser votre accès sur tous vos appareils</p>' : ''}
        </div>
        <div class="pin-display">${dots}</div>
        <p class="pin-error">${error}</p>
        <div class="numpad">
          ${[1,2,3,4,5,6,7,8,9,'',0,'⌫'].map(k =>
            k === '' ? '<div class="numpad-key empty"></div>' :
            `<button class="numpad-key${k === '⌫' ? ' del' : ''}" data-k="${k}">${k}</button>`
          ).join('')}
        </div>
      </div>
    `;
  }

  async function onKey(k) {
    if (k === '⌫') {
      digits.pop();
      render();
      return;
    }
    if (digits.length >= PIN_LEN) return;
    digits.push(k);
    render();

    if (digits.length === PIN_LEN) {
      const pin = digits.join('');
      digits = [];
      await handlePin(pin);
    }
  }

  async function handlePin(pin) {
    try {
      if (step === 'login') {
        await Auth.login(pin);
        document.removeEventListener('keydown', onKeydown);
        nav.style.display = '';
        await bootApp();

      } else if (step === 'setup-1') {
        firstPin = pin;
        step = 'setup-2';
        render();

      } else if (step === 'setup-2') {
        if (pin !== firstPin) {
          step = 'setup-1';
          firstPin = '';
          render('Les codes ne correspondent pas, recommencez');
          return;
        }
        await Auth.setup(pin);
        document.removeEventListener('keydown', onKeydown);
        nav.style.display = '';
        await bootApp();
      }
    } catch (e) {
      render(e.message);
    }
  }

  render();
}

// ── Démarrage de l'app après auth ─────────────────────────────────────────
async function bootApp() {
  const content = document.getElementById('app-content');
  content.innerHTML = `
    <div style="display:flex;align-items:center;justify-content:center;height:60vh;flex-direction:column;gap:16px">
      <div class="loader"></div>
      <p style="color:var(--text-muted);font-size:14px">Chargement...</p>
    </div>`;
  await DB.init();
  app.navigate('dashboard');
}

// ── Boot ───────────────────────────────────────────────────────────────────
document.getElementById('app-content').innerHTML = `
  <div style="display:flex;align-items:center;justify-content:center;height:60vh;flex-direction:column;gap:16px">
    <div class="loader"></div>
    <p style="color:var(--text-muted);font-size:14px">Chargement...</p>
  </div>`;

if (Auth.isTokenValid()) {
  bootApp();
} else {
  showLogin();
}
