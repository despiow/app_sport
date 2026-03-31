import DB from '../db.js';

const MEAL_KEYS   = ['breakfast', 'lunch', 'dinner', 'snack'];
const MEAL_LABELS = {
  breakfast: { icon: '🌅', label: 'Petit-déjeuner' },
  lunch:     { icon: '☀️', label: 'Déjeuner' },
  dinner:    { icon: '🌙', label: 'Dîner' },
  snack:     { icon: '🍎', label: 'Collation' },
};

const FOOD_DB = [
  { name: 'Œuf entier',         calories: 155, protein: 13,   carbs: 1.1, fat: 11  },
  { name: 'Blanc de poulet',    calories: 165, protein: 31,   carbs: 0,   fat: 3.6 },
  { name: 'Riz blanc cuit',     calories: 130, protein: 2.7,  carbs: 28,  fat: 0.3 },
  { name: 'Flocons d\'avoine',  calories: 389, protein: 17,   carbs: 66,  fat: 7   },
  { name: 'Fromage blanc 0%',   calories:  45, protein: 8,    carbs: 4,   fat: 0.2 },
  { name: 'Lait demi-écrémé',   calories:  46, protein: 3.2,  carbs: 5,   fat: 1.5 },
  { name: 'Pain complet',       calories: 247, protein: 9,    carbs: 41,  fat: 3.4 },
  { name: 'Banane',             calories:  89, protein: 1.1,  carbs: 23,  fat: 0.3 },
  { name: 'Pomme',              calories:  52, protein: 0.3,  carbs: 14,  fat: 0.2 },
  { name: 'Bœuf haché 5%',      calories: 137, protein: 21,   carbs: 0,   fat: 5   },
  { name: 'Saumon',             calories: 208, protein: 20,   carbs: 0,   fat: 13  },
  { name: 'Pâtes cuites',       calories: 131, protein: 5,    carbs: 25,  fat: 1   },
  { name: 'Brocoli',            calories:  34, protein: 2.8,  carbs: 7,   fat: 0.4 },
  { name: 'Épinards',           calories:  23, protein: 2.9,  carbs: 3.6, fat: 0.4 },
  { name: 'Patate douce cuite', calories:  86, protein: 1.6,  carbs: 20,  fat: 0.1 },
  { name: 'Yaourt nature',      calories:  61, protein: 3.5,  carbs: 4.7, fat: 3.3 },
  { name: 'Amandes',            calories: 579, protein: 21,   carbs: 22,  fat: 50  },
  { name: 'Protéine whey',      calories: 400, protein: 80,   carbs: 8,   fat: 5   },
  { name: 'Thon en boîte',      calories: 116, protein: 26,   carbs: 0,   fat: 1   },
  { name: 'Huile d\'olive',     calories: 884, protein: 0,    carbs: 0,   fat: 100 },
  { name: 'Beurre de cacahuète',calories: 588, protein: 25,   carbs: 20,  fat: 50  },
  { name: 'Cottage cheese',     calories:  98, protein: 11,   carbs: 3.4, fat: 4.3 },
  { name: 'Quinoa cuit',        calories: 120, protein: 4.4,  carbs: 22,  fat: 1.9 },
  { name: 'Avocat',             calories: 160, protein: 2,    carbs: 9,   fat: 15  },
  { name: 'Tomate',             calories:  18, protein: 0.9,  carbs: 3.9, fat: 0.2 },
];

let _activeTab = 'plan'; // 'plan' | 'journal'

// ─── Render ───────────────────────────────────────────────────────────────

export function renderDiet() {
  const today    = DB.today();
  const template = DB.getDietTemplate();
  const dayLog   = DB.getDietDay(today);

  return `
    <div class="page" id="page-diet">
      <div class="page-header">
        <h1>Nutrition</h1>
      </div>

      <!-- Tabs -->
      <div class="diet-tabs">
        <button class="diet-tab${_activeTab === 'plan' ? ' active' : ''}" data-tab="plan">📋 Ma Diète</button>
        <button class="diet-tab${_activeTab === 'journal' ? ' active' : ''}" data-tab="journal">📓 Journal</button>
      </div>

      <!-- Content -->
      <div id="diet-tab-content">
        ${_activeTab === 'plan'
          ? renderPlanTab(template)
          : renderJournalTab(today, dayLog, template)
        }
      </div>
    </div>

    <!-- Modal : ajouter aliment -->
    ${renderFoodModal()}
  `;
}

// ─── Onglet Plan ──────────────────────────────────────────────────────────

function renderPlanTab(template) {
  const macros = calcFoodsMacros(Object.values(template.meals).flat());
  const isEmpty = Object.values(template.meals).every(m => m.length === 0);

  if (isEmpty) {
    return `
      <div class="prog-empty" style="padding-top:36px">
        <div class="prog-empty-icon">🥗</div>
        <p class="prog-empty-title">Pas encore de plan alimentaire</p>
        <p class="prog-empty-sub">Définis ta diète type — ce que tu manges chaque jour — pour suivre ton alimentation</p>
        <button class="btn btn-primary" id="btn-start-plan">+ Créer ma diète</button>
      </div>
    `;
  }

  return `
    <!-- Macros du plan -->
    <div class="diet-macro-card">
      <p class="diet-macro-card-title">Plan journalier</p>
      ${renderMacroRings(macros, null)}
    </div>

    <!-- Repas du plan -->
    ${MEAL_KEYS.map(mk => renderPlanMeal(mk, template.meals[mk] || [])).join('')}

    <button class="btn btn-outline btn-full" id="btn-reset-plan"
      style="margin-top:8px;color:var(--danger);border-color:var(--danger)">
      Réinitialiser le plan
    </button>
  `;
}

function renderPlanMeal(mealKey, foods) {
  const ml     = MEAL_LABELS[mealKey];
  const macros = calcFoodsMacros(foods);
  return `
    <div class="meal-block" data-meal="${mealKey}">
      <div class="meal-block-hdr">
        <div>
          <span class="meal-icon">${ml.icon}</span>
          <span class="meal-title">${ml.label}</span>
          ${foods.length ? `<span class="meal-kcal">${macros.cal} kcal</span>` : ''}
        </div>
        <button class="btn btn-outline btn-sm" data-action="open-add-plan" data-meal="${mealKey}">
          + Ajouter
        </button>
      </div>
      ${foods.length ? `
        <div class="food-list">
          ${foods.map((f, i) => renderFoodRow(f, i, 'plan', mealKey)).join('')}
        </div>
      ` : `<p class="meal-empty">Aucun aliment dans ce repas</p>`}
    </div>
  `;
}

// ─── Onglet Journal ───────────────────────────────────────────────────────

function renderJournalTab(date, dayLog, template) {
  const targets  = calcTargets(DB.getProfile());
  const logMacros  = calcFoodsMacros(Object.values(dayLog.meals).flat());
  const planMacros = calcFoodsMacros(Object.values(template.meals).flat());
  const hasPlan    = planMacros.cal > 0;

  // Adherence par repas
  const adherence = hasPlan ? Math.round(
    (logMacros.cal / planMacros.cal) * 100
  ) : null;

  return `
    <div class="journal-date-row">
      <input type="date" id="diet-date" value="${date}" class="date-picker">
    </div>

    <!-- Résumé macros du jour -->
    <div class="diet-macro-card">
      ${adherence !== null ? `
        <div class="adherence-row">
          <span class="adherence-label">Suivi du plan</span>
          <span class="adherence-val ${adherence >= 90 ? 'good' : adherence >= 60 ? 'mid' : 'low'}">
            ${Math.min(adherence, 100)}%
          </span>
        </div>
        <div class="adherence-bar">
          <div class="adherence-fill ${adherence >= 90 ? 'good' : adherence >= 60 ? 'mid' : 'low'}"
            style="width:${Math.min(adherence, 100)}%"></div>
        </div>
      ` : ''}
      ${renderMacroRings(logMacros, targets)}
    </div>

    <!-- Repas -->
    ${MEAL_KEYS.map(mk => renderJournalMeal(mk, dayLog.meals[mk] || [], template.meals[mk] || [], date)).join('')}
  `;
}

function renderJournalMeal(mealKey, foods, planFoods, date) {
  const ml        = MEAL_LABELS[mealKey];
  const logMacros  = calcFoodsMacros(foods);
  const planMacros = calcFoodsMacros(planFoods);
  const hasPlan    = planMacros.cal > 0;

  let adherenceHtml = '';
  if (hasPlan) {
    const pct = Math.min(Math.round(logMacros.cal / planMacros.cal * 100), 100);
    const ok  = logMacros.cal >= planMacros.cal * 0.85;
    adherenceHtml = `
      <span class="meal-plan-badge ${ok ? 'ok' : 'pending'}">
        ${ok ? '✓' : '~'} Prévu ${planMacros.cal} kcal
      </span>
    `;
  }

  return `
    <div class="meal-block" data-meal="${mealKey}">
      <div class="meal-block-hdr">
        <div>
          <span class="meal-icon">${ml.icon}</span>
          <span class="meal-title">${ml.label}</span>
          ${foods.length ? `<span class="meal-kcal">${logMacros.cal} kcal</span>` : ''}
          ${adherenceHtml}
        </div>
        <button class="btn btn-outline btn-sm"
          data-action="open-add-journal" data-meal="${mealKey}" data-date="${date}">
          + Ajouter
        </button>
      </div>

      ${hasPlan && planFoods.length ? `
        <div class="plan-preview">
          <span class="plan-preview-label">📋 Plan :</span>
          ${planFoods.map(f => `<span class="plan-food-chip">${f.name} ${f.qty}g</span>`).join('')}
        </div>
      ` : ''}

      ${foods.length ? `
        <div class="food-list">
          ${foods.map((f, i) => renderFoodRow(f, i, 'journal', mealKey, date)).join('')}
        </div>
      ` : `<p class="meal-empty">Rien de loggé</p>`}
    </div>
  `;
}

// ─── Rendu partagé ────────────────────────────────────────────────────────

function renderFoodRow(f, i, source, mealKey, date) {
  const qty  = f.qty || 100;
  const cal  = Math.round((f.calories || 0) * qty / 100);
  const prot = Math.round((f.protein  || 0) * qty / 100);
  const carb = Math.round((f.carbs    || 0) * qty / 100);
  const fat  = Math.round((f.fat      || 0) * qty / 100);
  const del  = source === 'plan'
    ? `data-action="del-plan-food" data-meal="${mealKey}" data-idx="${i}"`
    : `data-action="del-journal-food" data-meal="${mealKey}" data-date="${date}" data-idx="${i}"`;
  return `
    <div class="food-item">
      <div class="fi-left">
        <span class="fi-name">${escHtml(f.name)}</span>
        <span class="fi-macros">P ${prot}g · G ${carb}g · L ${fat}g</span>
      </div>
      <div class="fi-right">
        <span class="fi-qty">${qty}g</span>
        <span class="fi-cal">${cal} kcal</span>
        <button class="food-del-btn" ${del}>✕</button>
      </div>
    </div>
  `;
}

function renderMacroRings(macros, targets) {
  const pPct = targets?.protein ? Math.min(Math.round(macros.prot / targets.protein * 100), 100) : null;
  const gPct = targets?.carbs   ? Math.min(Math.round(macros.carb / targets.carbs   * 100), 100) : null;
  const lPct = targets?.fat     ? Math.min(Math.round(macros.fat  / targets.fat     * 100), 100) : null;
  const cPct = targets?.calories? Math.min(Math.round(macros.cal  / targets.calories* 100), 100) : null;

  return `
    <div class="macro-summary">
      <div class="macro-big">
        <span class="macro-big-val">${macros.cal}</span>
        <span class="macro-big-unit">kcal</span>
        ${targets ? `<span class="macro-big-target">/ ${targets.calories}</span>` : ''}
      </div>
      <div class="macro-bars">
        ${renderMacroBar('Protéines', macros.prot, targets?.protein, 'prot', pPct)}
        ${renderMacroBar('Glucides',  macros.carb, targets?.carbs,   'carb', gPct)}
        ${renderMacroBar('Lipides',   macros.fat,  targets?.fat,     'fat',  lPct)}
      </div>
    </div>
    ${cPct !== null ? `
      <div class="calbar-wrap"><div class="calbar-fill" style="width:${cPct}%"></div></div>
    ` : ''}
  `;
}

function renderMacroBar(label, val, target, cls, pct) {
  return `
    <div class="mbar-row">
      <span class="mbar-label">${label}</span>
      <div class="mbar-track">
        <div class="mbar-fill ${cls}" style="width:${pct ?? Math.min(Math.round(val / 1 * 10), 100)}%"></div>
      </div>
      <span class="mbar-val">${val}g${target ? `<span class="mbar-target"> / ${target}g</span>` : ''}</span>
    </div>
  `;
}

function renderFoodModal() {
  return `
    <div class="modal-overlay" id="modal-food" style="display:none">
      <div class="modal">
        <div class="modal-header">
          <h2 id="modal-food-title">Ajouter un aliment</h2>
          <button class="modal-close" id="btn-close-food">✕</button>
        </div>
        <div class="modal-body">
          <div class="form-group">
            <input type="text" id="food-search" placeholder="🔍 Rechercher dans la base…" class="food-search-input">
            <div id="food-suggestions" class="food-suggestions"></div>
          </div>
          <input type="hidden" id="ff-meal">
          <input type="hidden" id="ff-date">
          <input type="hidden" id="ff-source">
          <div class="form-group">
            <label>Aliment</label>
            <input type="text" id="ff-name" placeholder="Nom de l'aliment" required>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label>Quantité (g)</label>
              <input type="number" id="ff-qty" value="100" min="1" step="1" inputmode="numeric">
            </div>
            <div class="form-group">
              <label>Calories (/100g)</label>
              <input type="number" id="ff-cal" placeholder="150" min="0" inputmode="numeric">
            </div>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label>Protéines (/100g)</label>
              <input type="number" id="ff-prot" placeholder="20" min="0" step="0.1" inputmode="decimal">
            </div>
            <div class="form-group">
              <label>Glucides (/100g)</label>
              <input type="number" id="ff-carb" placeholder="30" min="0" step="0.1" inputmode="decimal">
            </div>
            <div class="form-group">
              <label>Lipides (/100g)</label>
              <input type="number" id="ff-fat" placeholder="5"  min="0" step="0.1" inputmode="decimal">
            </div>
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
  // Tabs
  document.querySelectorAll('.diet-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      _activeTab = tab.dataset.tab;
      document.querySelectorAll('.diet-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      _refreshContent();
    });
  });

  // Date picker (journal)
  document.getElementById('diet-tab-content').addEventListener('change', async e => {
    if (e.target.id === 'diet-date') {
      const date = e.target.value;
      const day = await DB.fetchDietDay(date);
      document.getElementById('diet-tab-content').innerHTML =
        renderJournalTab(date, day, DB.getDietTemplate());
    }
  });

  // Actions déléguées
  document.getElementById('diet-tab-content').addEventListener('click', async e => {
    const btn = e.target.closest('[data-action]');
    if (!btn) return;
    const action = btn.dataset.action;

    if (action === 'open-add-plan') {
      openFoodModal('plan', btn.dataset.meal, null);
    } else if (action === 'open-add-journal') {
      openFoodModal('journal', btn.dataset.meal, btn.dataset.date);
    } else if (action === 'del-plan-food') {
      const tpl = DB.getDietTemplate();
      tpl.meals[btn.dataset.meal].splice(parseInt(btn.dataset.idx), 1);
      await DB.saveDietTemplate(tpl);
      _refreshContent();
    } else if (action === 'del-journal-food') {
      const date = btn.dataset.date;
      const day  = DB.getDietDay(date);
      day.meals[btn.dataset.meal].splice(parseInt(btn.dataset.idx), 1);
      await DB.saveDietDay(date, day);
      _refreshContent(date);
    } else if (action === 'btn-start-plan' || e.target.id === 'btn-start-plan') {
      // Ouvrir directement l'ajout sur le premier repas
      openFoodModal('plan', 'breakfast', null);
    }
  });

  // Bouton start plan (empty state)
  document.getElementById('diet-tab-content').addEventListener('click', e => {
    if (e.target.id === 'btn-start-plan') openFoodModal('plan', 'breakfast', null);
    if (e.target.id === 'btn-reset-plan') {
      if (confirm('Réinitialiser le plan alimentaire ?')) {
        const empty = emptyTemplate();
        DB.saveDietTemplate(empty).then(() => _refreshContent());
      }
    }
  });

  // Modal food
  document.getElementById('btn-close-food').addEventListener('click',  closeFoodModal);
  document.getElementById('btn-cancel-food').addEventListener('click', closeFoodModal);
  document.getElementById('modal-food').addEventListener('click', e => {
    if (e.target === document.getElementById('modal-food')) closeFoodModal();
  });
  document.getElementById('btn-submit-food').addEventListener('click', submitFood);

  // Recherche aliment
  document.getElementById('food-search').addEventListener('input', e => {
    const q = e.target.value.toLowerCase().trim();
    const box = document.getElementById('food-suggestions');
    if (!q) { box.innerHTML = ''; return; }
    const matches = FOOD_DB.filter(f => f.name.toLowerCase().includes(q)).slice(0, 7);
    box.innerHTML = matches.map(f => `
      <div class="food-suggestion-item" data-food='${JSON.stringify(f)}'>
        <span>${escHtml(f.name)}</span>
        <span class="sug-kcal">${f.calories} kcal · P${f.protein}g G${f.carbs}g L${f.fat}g</span>
      </div>
    `).join('');
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
  });
}

// ─── Modal food ────────────────────────────────────────────────────────────

function openFoodModal(source, meal, date) {
  const title = source === 'plan' ? 'Ajouter au plan' : 'Ajouter au journal';
  document.getElementById('modal-food-title').textContent = title;
  document.getElementById('ff-source').value = source;
  document.getElementById('ff-meal').value   = meal;
  document.getElementById('ff-date').value   = date || DB.today();
  document.getElementById('ff-name').value   = '';
  document.getElementById('ff-qty').value    = '100';
  document.getElementById('ff-cal').value    = '';
  document.getElementById('ff-prot').value   = '';
  document.getElementById('ff-carb').value   = '';
  document.getElementById('ff-fat').value    = '';
  document.getElementById('food-search').value = '';
  document.getElementById('food-suggestions').innerHTML = '';
  document.getElementById('modal-food').style.display = 'flex';
  setTimeout(() => document.getElementById('food-search').focus(), 60);
}

function closeFoodModal() {
  document.getElementById('modal-food').style.display = 'none';
}

async function submitFood() {
  const name   = document.getElementById('ff-name').value.trim();
  if (!name) return;
  const source = document.getElementById('ff-source').value;
  const meal   = document.getElementById('ff-meal').value;
  const date   = document.getElementById('ff-date').value;

  const food = {
    name,
    qty:      parseFloat(document.getElementById('ff-qty').value)  || 100,
    calories: parseFloat(document.getElementById('ff-cal').value)  || 0,
    protein:  parseFloat(document.getElementById('ff-prot').value) || 0,
    carbs:    parseFloat(document.getElementById('ff-carb').value) || 0,
    fat:      parseFloat(document.getElementById('ff-fat').value)  || 0,
  };

  if (source === 'plan') {
    const tpl = DB.getDietTemplate();
    tpl.meals[meal].push(food);
    await DB.saveDietTemplate(tpl);
  } else {
    const day = DB.getDietDay(date);
    day.meals[meal].push(food);
    await DB.saveDietDay(date, day);
  }

  closeFoodModal();
  _refreshContent(source === 'journal' ? date : null);
}

// ─── Refresh ───────────────────────────────────────────────────────────────

function _refreshContent(date) {
  const d   = date || document.getElementById('diet-date')?.value || DB.today();
  const tpl = DB.getDietTemplate();
  const content = document.getElementById('diet-tab-content');
  if (!content) return;
  if (_activeTab === 'plan') {
    content.innerHTML = renderPlanTab(tpl);
  } else {
    const day = DB.getDietDay(d);
    content.innerHTML = renderJournalTab(d, day, tpl);
  }
}

// ─── Calculs ───────────────────────────────────────────────────────────────

function calcFoodsMacros(foods) {
  let cal = 0, prot = 0, carb = 0, fat = 0;
  foods.forEach(f => {
    const q = (f.qty || 100) / 100;
    cal  += (f.calories || 0) * q;
    prot += (f.protein  || 0) * q;
    carb += (f.carbs    || 0) * q;
    fat  += (f.fat      || 0) * q;
  });
  return {
    cal:  Math.round(cal),
    prot: Math.round(prot),
    carb: Math.round(carb),
    fat:  Math.round(fat),
  };
}

function calcTargets(profile) {
  if (!profile?.weight || !profile?.height || !profile?.age) return null;
  const bmr = profile.gender === 'female'
    ? 10 * profile.weight + 6.25 * profile.height - 5 * profile.age - 161
    : 10 * profile.weight + 6.25 * profile.height - 5 * profile.age + 5;
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

function emptyTemplate() {
  return { meals: { breakfast: [], lunch: [], dinner: [], snack: [] } };
}

// ─── Helpers ───────────────────────────────────────────────────────────────

function escHtml(s) {
  return String(s ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}
