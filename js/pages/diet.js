import DB from '../db.js';

const DAYS = [
  { key: 'lundi',    short: 'Lun', full: 'Lundi',    type: 'Jour bas',     kcal: 1570 },
  { key: 'mardi',    short: 'Mar', full: 'Mardi',    type: 'Jour modéré',  kcal: 1850 },
  { key: 'mercredi', short: 'Mer', full: 'Mercredi', type: 'Jour bas',     kcal: 1570 },
  { key: 'jeudi',    short: 'Jeu', full: 'Jeudi',    type: 'Jour modéré',  kcal: 1850 },
  { key: 'vendredi', short: 'Ven', full: 'Vendredi', type: 'Jour bas',     kcal: 1570 },
  { key: 'samedi',   short: 'Sam', full: 'Samedi',   type: 'Jour modéré',  kcal: 1850 },
  { key: 'dimanche', short: 'Dim', full: 'Dimanche', type: 'Jour recharge',kcal: 2100 },
];

const MEAL_KEYS   = ['breakfast', 'lunch', 'dinner', 'snack'];
const MEAL_LABELS = {
  breakfast: { icon: '🌅', label: 'Petit-déjeuner' },
  lunch:     { icon: '☀️', label: 'Déjeuner' },
  dinner:    { icon: '🌙', label: 'Dîner' },
  snack:     { icon: '🍎', label: 'Collation' },
};


function todayDayKey() { return DAYS[(new Date().getDay() + 6) % 7].key; }

let _activeTab   = 'plan';
let _planDayKey  = null;

// ─── Render ───────────────────────────────────────────────────────────────

export function renderDiet() {
  if (!_planDayKey) _planDayKey = todayDayKey();
  const today = DB.today();

  return `
    <div class="page" id="page-diet">
      <div class="page-header"><h1>Nutrition</h1></div>

      <div class="diet-tabs">
        <button class="diet-tab${_activeTab === 'plan' ? ' active' : ''}" data-tab="plan">📋 Ma Diète</button>
        <button class="diet-tab${_activeTab === 'journal' ? ' active' : ''}" data-tab="journal">📓 Journal</button>
      </div>

      <div id="diet-tab-content">
        ${_activeTab === 'plan'
          ? renderPlanTab(_planDayKey)
          : renderJournalTab(today, DB.getDietDay(today), DB.getDietTemplate(todayDayKey()))
        }
      </div>
    </div>

    ${renderFoodModal()}
  `;
}

// ─── Onglet Plan ──────────────────────────────────────────────────────────

function renderPlanTab(dayKey) {
  const dayObj   = DAYS.find(d => d.key === dayKey);
  const template = DB.getDietTemplate(dayKey);
  const allFoods = Object.values(template.meals).flat();
  const macros   = calcMacros(allFoods);
  const isEmpty  = allFoods.length === 0;

  return `
    <!-- Onglets jours -->
    <div class="day-tabs" id="plan-day-tabs">
      ${DAYS.map(d => `
        <button class="day-tab${d.key === dayKey ? ' active' : ''}" data-day="${d.key}">
          ${d.short}
        </button>
      `).join('')}
    </div>

    <!-- Badge type de jour -->
    <div class="day-type-badge ${dayObj.type === 'Jour bas' ? 'bas' : dayObj.type === 'Jour modéré' ? 'modere' : 'recharge'}">
      ${dayObj.full} — ${dayObj.type} — ${dayObj.kcal} kcal cible
    </div>

    ${isEmpty ? `
      <div class="prog-empty" style="padding-top:32px">
        <div class="prog-empty-icon">🥗</div>
        <p class="prog-empty-title">Aucun plan pour ${dayObj.full}</p>
        <p class="prog-empty-sub">Ajoute tes repas types pour ce jour</p>
      </div>
    ` : `
      <div class="diet-macro-card">
        <p class="diet-macro-card-title">Macros du plan</p>
        ${renderMacroBlock(macros, null)}
      </div>
    `}

    ${MEAL_KEYS.map(mk => renderPlanMeal(mk, template.meals[mk] || [], dayKey)).join('')}

    ${!isEmpty ? `
      <button class="btn btn-outline btn-full"
        style="margin-top:4px;color:var(--danger);border-color:var(--danger)"
        data-diet-action="reset-plan" data-day="${dayKey}">
        Réinitialiser ${dayObj.full}
      </button>
    ` : ''}
  `;
}

function renderPlanMeal(mealKey, foods, dayKey) {
  const ml     = MEAL_LABELS[mealKey];
  const macros = calcMacros(foods);
  return `
    <div class="meal-block">
      <div class="meal-block-hdr">
        <div>
          <span class="meal-icon">${ml.icon}</span>
          <span class="meal-title">${ml.label}</span>
          ${foods.length ? `<span class="meal-kcal">${macros.cal} kcal</span>` : ''}
        </div>
        <button class="btn btn-outline btn-sm"
          data-diet-action="open-add" data-source="plan"
          data-meal="${mealKey}" data-day="${dayKey}">+ Ajouter</button>
      </div>
      ${foods.length
        ? `<div class="food-list">${foods.map((f,i) => renderFoodRow(f, i, 'plan', mealKey, null, dayKey)).join('')}</div>`
        : `<p class="meal-empty">Aucun aliment</p>`
      }
    </div>
  `;
}

// ─── Onglet Journal ───────────────────────────────────────────────────────

function renderJournalTab(date, dayLog, template) {
  const targets    = calcTargets(DB.getProfile());
  const logMacros  = calcMacros(Object.values(dayLog.meals).flat());
  const planMacros = calcMacros(Object.values(template.meals).flat());
  const hasPlan    = planMacros.cal > 0;

  const adherence = hasPlan
    ? Math.min(Math.round(logMacros.cal / planMacros.cal * 100), 100)
    : null;

  return `
    <div class="journal-date-row">
      <input type="date" id="diet-date" value="${date}" class="date-picker">
    </div>

    <div class="diet-macro-card">
      ${adherence !== null ? `
        <div class="adherence-row">
          <span class="adherence-label">Suivi du plan</span>
          <span class="adherence-val ${adherence >= 90 ? 'good' : adherence >= 60 ? 'mid' : 'low'}">${adherence}%</span>
        </div>
        <div class="adherence-bar">
          <div class="adherence-fill ${adherence >= 90 ? 'good' : adherence >= 60 ? 'mid' : 'low'}"
            style="width:${adherence}%"></div>
        </div>
      ` : ''}
      ${renderMacroBlock(logMacros, targets)}
    </div>

    ${MEAL_KEYS.map(mk =>
      renderJournalMeal(mk, dayLog.meals[mk] || [], template.meals[mk] || [], date)
    ).join('')}
  `;
}

function renderJournalMeal(mealKey, foods, planFoods, date) {
  const ml         = MEAL_LABELS[mealKey];
  const logMacros  = calcMacros(foods);
  const planMacros = calcMacros(planFoods);
  const hasPlan    = planMacros.cal > 0;
  const ok         = hasPlan && logMacros.cal >= planMacros.cal * 0.85;

  return `
    <div class="meal-block">
      <div class="meal-block-hdr">
        <div>
          <span class="meal-icon">${ml.icon}</span>
          <span class="meal-title">${ml.label}</span>
          ${foods.length ? `<span class="meal-kcal">${logMacros.cal} kcal</span>` : ''}
          ${hasPlan ? `<span class="meal-plan-badge ${ok ? 'ok' : 'pending'}">${ok ? '✓' : '~'} Prévu ${planMacros.cal} kcal</span>` : ''}
        </div>
        <button class="btn btn-outline btn-sm"
          data-diet-action="open-add" data-source="journal"
          data-meal="${mealKey}" data-date="${date}">+ Ajouter</button>
      </div>

      ${hasPlan && planFoods.length ? `
        <div class="plan-preview">
          <span class="plan-preview-label">📋</span>
          ${planFoods.map(f => `<span class="plan-food-chip">${escHtml(f.name)} ${f.qty}g</span>`).join('')}
        </div>
      ` : ''}

      ${foods.length
        ? `<div class="food-list">${foods.map((f,i) => renderFoodRow(f, i, 'journal', mealKey, date, null)).join('')}</div>`
        : `<p class="meal-empty">Rien de loggé</p>`
      }
    </div>
  `;
}

// ─── Rendu partagé ────────────────────────────────────────────────────────

function renderFoodRow(f, i, source, mealKey, date, dayKey) {
  const qty  = f.qty || 100;
  const cal  = Math.round((f.calories || 0) * qty / 100);
  const prot = Math.round((f.protein  || 0) * qty / 100);
  const carb = Math.round((f.carbs    || 0) * qty / 100);
  const fat  = Math.round((f.fat      || 0) * qty / 100);
  return `
    <div class="food-item">
      <div class="fi-left">
        <span class="fi-name">${escHtml(f.name)}</span>
        <span class="fi-macros">P ${prot}g · G ${carb}g · L ${fat}g</span>
      </div>
      <div class="fi-right">
        <span class="fi-qty">${qty}g</span>
        <span class="fi-cal">${cal} kcal</span>
        <button class="food-del-btn"
          data-diet-action="del-food" data-source="${source}"
          data-meal="${mealKey}" data-idx="${i}"
          ${date ? `data-date="${date}"` : ''}
          ${dayKey ? `data-day="${dayKey}"` : ''}>✕</button>
      </div>
    </div>
  `;
}

function renderMacroBlock(macros, targets) {
  const cPct = targets?.calories ? Math.min(Math.round(macros.cal  / targets.calories * 100), 100) : null;
  return `
    <div class="macro-summary">
      <div class="macro-big">
        <span class="macro-big-val">${macros.cal}</span>
        <span class="macro-big-unit">kcal</span>
        ${targets ? `<span class="macro-big-target">/ ${targets.calories}</span>` : ''}
      </div>
      <div class="macro-bars">
        ${macroBar('Protéines', macros.prot, targets?.protein, 'prot')}
        ${macroBar('Glucides',  macros.carb, targets?.carbs,   'carb')}
        ${macroBar('Lipides',   macros.fat,  targets?.fat,     'fat')}
      </div>
    </div>
    ${cPct !== null ? `<div class="calbar-wrap"><div class="calbar-fill" style="width:${cPct}%"></div></div>` : ''}
  `;
}

function macroBar(label, val, target, cls) {
  const pct = target ? Math.min(Math.round(val / target * 100), 100) : 50;
  return `
    <div class="mbar-row">
      <span class="mbar-label">${label}</span>
      <div class="mbar-track"><div class="mbar-fill ${cls}" style="width:${pct}%"></div></div>
      <span class="mbar-val">${val}g${target ? `<span class="mbar-target"> / ${target}g</span>` : ''}</span>
    </div>
  `;
}

function renderFoodModal() {
  return `
    <div class="modal-overlay centered" id="modal-food" style="display:none">
      <div class="modal">
        <div class="modal-header">
          <h2 id="modal-food-title">Ajouter un aliment</h2>
          <button class="modal-close" id="btn-close-food">✕</button>
        </div>
        <div class="modal-body">
          <input type="hidden" id="ff-source">
          <input type="hidden" id="ff-meal">
          <input type="hidden" id="ff-date">
          <input type="hidden" id="ff-day">

          <!-- Recherche Open Food Facts -->
          <div class="form-group" style="position:relative">
            <input type="text" id="food-search" placeholder="🔍 Rechercher un aliment…" class="food-search-input" autocomplete="off">
            <div id="food-suggestions" class="food-suggestions"></div>
          </div>

          <!-- Nom sélectionné -->
          <div class="form-group">
            <label>Aliment</label>
            <input type="text" id="ff-name" placeholder="Nom de l'aliment" required>
          </div>

          <!-- Quantité -->
          <div class="form-group">
            <label>Quantité (g)</label>
            <input type="number" id="ff-qty" value="100" min="1" inputmode="numeric">
          </div>

          <!-- Valeurs pour 100g -->
          <p class="ff-section-label">Valeurs pour 100g</p>
          <div class="form-row">
            <div class="form-group"><label>Kcal</label>
              <input type="number" id="ff-cal" placeholder="—" min="0" inputmode="numeric">
            </div>
            <div class="form-group"><label>Protéines</label>
              <input type="number" id="ff-prot" placeholder="—" min="0" step="0.1" inputmode="decimal">
            </div>
            <div class="form-group"><label>Glucides</label>
              <input type="number" id="ff-carb" placeholder="—" min="0" step="0.1" inputmode="decimal">
            </div>
            <div class="form-group"><label>Lipides</label>
              <input type="number" id="ff-fat" placeholder="—" min="0" step="0.1" inputmode="decimal">
            </div>
          </div>

          <!-- Aperçu macros calculées -->
          <div id="ff-macro-preview" class="ff-macro-preview" style="display:none">
            <span class="ff-prev-label">Pour <strong id="ff-qty-lbl">100</strong>g :</span>
            <span class="ff-prev-chip energy">⚡ <span id="prev-cal">0</span> kcal</span>
            <span class="ff-prev-chip prot">P <span id="prev-prot">0</span>g</span>
            <span class="ff-prev-chip carb">G <span id="prev-carb">0</span>g</span>
            <span class="ff-prev-chip fat">L <span id="prev-fat">0</span>g</span>
          </div>

          <div class="modal-footer" style="margin-top:12px;padding:0">
            <button class="btn btn-outline" id="btn-cancel-food">Annuler</button>
            <button class="btn btn-primary" id="btn-submit-food">Ajouter</button>
          </div>
        </div>
      </div>
    </div>
  `;
}

// ─── Init ─────────────────────────────────────────────────────────────────

export function initDiet() {
  // Tabs principaux
  document.querySelectorAll('.diet-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      _activeTab = tab.dataset.tab;
      document.querySelectorAll('.diet-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      _refresh();
    });
  });

  const content = document.getElementById('diet-tab-content');

  // Onglets jours du plan (délégation sur content)
  content.addEventListener('click', async e => {
    // Day tabs
    const dayTab = e.target.closest('#plan-day-tabs .day-tab');
    if (dayTab) {
      _planDayKey = dayTab.dataset.day;
      document.querySelectorAll('#plan-day-tabs .day-tab').forEach(t => t.classList.remove('active'));
      dayTab.classList.add('active');
      _refresh();
      return;
    }

    // Actions
    const btn = e.target.closest('[data-diet-action]');
    if (!btn) return;
    const action = btn.dataset.dietAction;

    if (action === 'open-add') {
      openFoodModal(btn.dataset.source, btn.dataset.meal, btn.dataset.date || null, btn.dataset.day || null);

    } else if (action === 'del-food') {
      const source = btn.dataset.source;
      const meal   = btn.dataset.meal;
      const idx    = parseInt(btn.dataset.idx);
      if (source === 'plan') {
        const dayKey = btn.dataset.day;
        const tpl = DB.getDietTemplate(dayKey);
        tpl.meals[meal].splice(idx, 1);
        await DB.saveDietTemplate(dayKey, tpl);
      } else {
        const date = btn.dataset.date;
        const day  = DB.getDietDay(date);
        day.meals[meal].splice(idx, 1);
        await DB.saveDietDay(date, day);
      }
      _refresh();

    } else if (action === 'reset-plan') {
      const dayKey = btn.dataset.day;
      if (confirm(`Réinitialiser le plan de ${DAYS.find(d=>d.key===dayKey)?.full} ?`)) {
        await DB.saveDietTemplate(dayKey, { meals: { breakfast:[], lunch:[], dinner:[], snack:[] } });
        _refresh();
      }
    }
  });

  // Date picker journal
  content.addEventListener('change', async e => {
    if (e.target.id === 'diet-date') {
      const date = e.target.value;
      const day  = await DB.fetchDietDay(date);
      const dayKey = DAYS[(new Date(date + 'T12:00:00').getDay() + 6) % 7].key;
      document.getElementById('diet-tab-content').innerHTML =
        renderJournalTab(date, day, DB.getDietTemplate(dayKey));
    }
  });

  // Modal food
  document.getElementById('btn-close-food').addEventListener('click', closeFoodModal);
  document.getElementById('btn-cancel-food').addEventListener('click', closeFoodModal);
  document.getElementById('modal-food').addEventListener('click', e => {
    if (e.target === document.getElementById('modal-food')) closeFoodModal();
  });
  document.getElementById('btn-submit-food').addEventListener('click', submitFood);

  // Recherche Open Food Facts (debounced)
  let _searchTimer = null;
  document.getElementById('food-search').addEventListener('input', e => {
    const q = e.target.value.trim();
    const box = document.getElementById('food-suggestions');
    clearTimeout(_searchTimer);
    if (q.length < 2) { box.innerHTML = ''; return; }
    box.innerHTML = '<div class="sug-loading">Recherche en cours…</div>';
    _searchTimer = setTimeout(() => _searchOFF(q), 450);
  });

  document.getElementById('food-suggestions').addEventListener('click', e => {
    const item = e.target.closest('.food-suggestion-item');
    if (!item) return;
    const f = JSON.parse(item.dataset.food);
    document.getElementById('ff-name').value = f.name;
    document.getElementById('ff-cal').value  = f.calories;
    document.getElementById('ff-prot').value = f.protein;
    document.getElementById('ff-carb').value = f.carbs;
    document.getElementById('ff-fat').value  = f.fat;
    document.getElementById('food-search').value = '';
    document.getElementById('food-suggestions').innerHTML = '';
    document.getElementById('ff-qty').focus();
    _updateMacroPreview();
  });

  // Aperçu macros en temps réel
  ['ff-qty','ff-cal','ff-prot','ff-carb','ff-fat'].forEach(id =>
    document.getElementById(id).addEventListener('input', _updateMacroPreview)
  );
}

// ─── Recherche Open Food Facts ────────────────────────────────────────────

async function _searchOFF(query) {
  const box = document.getElementById('food-suggestions');
  if (!box) return;
  try {
    const token = localStorage.getItem('sport_token');
    const res   = await fetch(`/api/food-search?q=${encodeURIComponent(query)}`, {
      headers: token ? { 'Authorization': `Bearer ${token}` } : {}
    });
    const results = await res.json();
    if (!results.length) {
      box.innerHTML = '<div class="sug-empty">Aucun résultat</div>';
      return;
    }
    box.innerHTML = results.map(f => `
      <div class="food-suggestion-item" data-food='${JSON.stringify(f).replace(/'/g,"&#39;")}'>
        <span class="sug-name">${escHtml(f.name)}</span>
        <span class="sug-kcal">${f.calories} kcal · P${f.protein}g G${f.carbs}g L${f.fat}g</span>
      </div>`).join('');
  } catch {
    box.innerHTML = '<div class="sug-empty">Erreur — réessaie</div>';
  }
}

function _updateMacroPreview() {
  const qty  = parseFloat(document.getElementById('ff-qty')?.value)  || 0;
  const cal  = parseFloat(document.getElementById('ff-cal')?.value)  || 0;
  const prot = parseFloat(document.getElementById('ff-prot')?.value) || 0;
  const carb = parseFloat(document.getElementById('ff-carb')?.value) || 0;
  const fat  = parseFloat(document.getElementById('ff-fat')?.value)  || 0;
  const prev = document.getElementById('ff-macro-preview');
  if (!prev) return;
  if (!cal && !prot && !carb && !fat) { prev.style.display = 'none'; return; }
  const q = qty / 100;
  prev.style.display = 'flex';
  document.getElementById('ff-qty-lbl').textContent  = qty || 100;
  document.getElementById('prev-cal').textContent   = Math.round(cal  * q);
  document.getElementById('prev-prot').textContent  = Math.round(prot * q);
  document.getElementById('prev-carb').textContent  = Math.round(carb * q);
  document.getElementById('prev-fat').textContent   = Math.round(fat  * q);
}

// ─── Modal ────────────────────────────────────────────────────────────────

function openFoodModal(source, meal, date, dayKey) {
  document.getElementById('modal-food-title').textContent =
    source === 'plan' ? 'Ajouter au plan' : 'Ajouter au journal';
  document.getElementById('ff-source').value = source;
  document.getElementById('ff-meal').value   = meal;
  document.getElementById('ff-date').value   = date || DB.today();
  document.getElementById('ff-day').value    = dayKey || _planDayKey || todayDayKey();
  ['ff-name','ff-cal','ff-prot','ff-carb','ff-fat'].forEach(id =>
    { document.getElementById(id).value = ''; });
  document.getElementById('ff-qty').value = '100';
  document.getElementById('food-search').value = '';
  document.getElementById('food-suggestions').innerHTML = '';
  const prev = document.getElementById('ff-macro-preview');
  if (prev) prev.style.display = 'none';
  document.getElementById('modal-food').style.display = 'flex';
  setTimeout(() => document.getElementById('food-search').focus(), 60);
}

function closeFoodModal() {
  document.getElementById('modal-food').style.display = 'none';
}

async function submitFood() {
  const name = document.getElementById('ff-name').value.trim();
  if (!name) return;
  const source = document.getElementById('ff-source').value;
  const meal   = document.getElementById('ff-meal').value;
  const food   = {
    name,
    qty:      parseFloat(document.getElementById('ff-qty').value)  || 100,
    calories: parseFloat(document.getElementById('ff-cal').value)  || 0,
    protein:  parseFloat(document.getElementById('ff-prot').value) || 0,
    carbs:    parseFloat(document.getElementById('ff-carb').value) || 0,
    fat:      parseFloat(document.getElementById('ff-fat').value)  || 0,
  };

  if (source === 'plan') {
    const dayKey = document.getElementById('ff-day').value;
    const tpl = DB.getDietTemplate(dayKey);
    tpl.meals[meal].push(food);
    await DB.saveDietTemplate(dayKey, tpl);
  } else {
    const date = document.getElementById('ff-date').value;
    const day  = DB.getDietDay(date);
    day.meals[meal].push(food);
    await DB.saveDietDay(date, day);
  }

  closeFoodModal();
  _refresh();
}

// ─── Refresh ───────────────────────────────────────────────────────────────

function _refresh() {
  const content = document.getElementById('diet-tab-content');
  if (!content) return;
  if (_activeTab === 'plan') {
    content.innerHTML = renderPlanTab(_planDayKey || todayDayKey());
  } else {
    const dateInput = document.getElementById('diet-date');
    const date = dateInput?.value || DB.today();
    const dayKey = DAYS[(new Date(date + 'T12:00:00').getDay() + 6) % 7].key;
    content.innerHTML = renderJournalTab(date, DB.getDietDay(date), DB.getDietTemplate(dayKey));
  }
}

// ─── Calculs ───────────────────────────────────────────────────────────────

function calcMacros(foods) {
  let cal = 0, prot = 0, carb = 0, fat = 0;
  foods.forEach(f => {
    const q = (f.qty || 100) / 100;
    cal  += (f.calories || 0) * q;
    prot += (f.protein  || 0) * q;
    carb += (f.carbs    || 0) * q;
    fat  += (f.fat      || 0) * q;
  });
  return { cal: Math.round(cal), prot: Math.round(prot), carb: Math.round(carb), fat: Math.round(fat) };
}

function calcTargets(profile) {
  if (!profile?.weight || !profile?.height || !profile?.age) return null;
  const bmr = profile.gender === 'female'
    ? 10*profile.weight + 6.25*profile.height - 5*profile.age - 161
    : 10*profile.weight + 6.25*profile.height - 5*profile.age + 5;
  const mult = { sedentary:1.2, light:1.375, moderate:1.55, active:1.725, veryactive:1.9 };
  const tdee = Math.round(bmr * (mult[profile.activityLevel] || 1.55));
  const adj  = profile.goal === 'lose' ? -500 : profile.goal === 'gain' ? 300 : 0;
  const calories = tdee + adj;
  return {
    calories,
    protein: Math.round(profile.weight * 2),
    fat:     Math.round(calories * 0.25 / 9),
    carbs:   Math.round((calories - Math.round(profile.weight*2)*4 - Math.round(calories*0.25/9)*9) / 4),
  };
}

function escHtml(s) {
  return String(s ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}
