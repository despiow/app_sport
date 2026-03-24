import DB from '../db.js';

const MEAL_LABELS = {
  breakfast: '🌅 Petit-déjeuner',
  lunch: '☀️ Déjeuner',
  dinner: '🌙 Dîner',
  snack: '🍎 Collation'
};

const FOOD_DB = [
  { name: 'Œuf entier', calories: 155, protein: 13, carbs: 1.1, fat: 11 },
  { name: 'Blanc de poulet', calories: 165, protein: 31, carbs: 0, fat: 3.6 },
  { name: 'Riz blanc cuit', calories: 130, protein: 2.7, carbs: 28, fat: 0.3 },
  { name: 'Flocons d\'avoine', calories: 389, protein: 17, carbs: 66, fat: 7 },
  { name: 'Fromage blanc 0%', calories: 45, protein: 8, carbs: 4, fat: 0.2 },
  { name: 'Lait demi-écrémé', calories: 46, protein: 3.2, carbs: 5, fat: 1.5 },
  { name: 'Pain complet', calories: 247, protein: 9, carbs: 41, fat: 3.4 },
  { name: 'Banane', calories: 89, protein: 1.1, carbs: 23, fat: 0.3 },
  { name: 'Pomme', calories: 52, protein: 0.3, carbs: 14, fat: 0.2 },
  { name: 'Bœuf haché 5%', calories: 137, protein: 21, carbs: 0, fat: 5 },
  { name: 'Saumon', calories: 208, protein: 20, carbs: 0, fat: 13 },
  { name: 'Pâtes cuites', calories: 131, protein: 5, carbs: 25, fat: 1 },
  { name: 'Brocoli', calories: 34, protein: 2.8, carbs: 7, fat: 0.4 },
  { name: 'Épinards', calories: 23, protein: 2.9, carbs: 3.6, fat: 0.4 },
  { name: 'Patate douce cuite', calories: 86, protein: 1.6, carbs: 20, fat: 0.1 },
  { name: 'Yaourt nature', calories: 61, protein: 3.5, carbs: 4.7, fat: 3.3 },
  { name: 'Amandes', calories: 579, protein: 21, carbs: 22, fat: 50 },
  { name: 'Protéine whey', calories: 400, protein: 80, carbs: 8, fat: 5 },
  { name: 'Thon en boîte', calories: 116, protein: 26, carbs: 0, fat: 1 },
  { name: 'Huile d\'olive', calories: 884, protein: 0, carbs: 0, fat: 100 },
];

export function renderDiet() {
  const today = DB.today();
  const day = DB.getDietDay(today);
  return `
    <div class="page" id="page-diet">
      <div class="page-header">
        <h1>Nutrition</h1>
        <input type="date" id="diet-date" value="${today}" class="date-picker">
      </div>
      <div id="diet-day-content">
        ${renderDietDay(today, day)}
      </div>
    </div>

    <!-- Modal: Add Food -->
    <div class="modal-overlay" id="modal-food" style="display:none">
      <div class="modal">
        <div class="modal-header">
          <h2>Ajouter un aliment</h2>
          <button class="modal-close" onclick="document.getElementById('modal-food').style.display='none'">✕</button>
        </div>
        <div class="modal-body">
          <div class="food-search-section">
            <input type="text" id="food-search" placeholder="Rechercher un aliment..." class="food-search-input">
            <div id="food-suggestions" class="food-suggestions"></div>
          </div>
          <form id="form-food">
            <input type="hidden" id="ff-meal">
            <input type="hidden" id="ff-date">
            <div class="form-group">
              <label>Aliment</label>
              <input type="text" id="ff-name" placeholder="Nom de l'aliment" required>
            </div>
            <div class="form-row">
              <div class="form-group">
                <label>Quantité (g)</label>
                <input type="number" id="ff-qty" value="100" min="1" step="1" required>
              </div>
              <div class="form-group">
                <label>Calories (kcal/100g)</label>
                <input type="number" id="ff-calories" placeholder="150" min="0" step="1">
              </div>
            </div>
            <div class="form-row">
              <div class="form-group">
                <label>Protéines (g/100g)</label>
                <input type="number" id="ff-protein" placeholder="20" min="0" step="0.1">
              </div>
              <div class="form-group">
                <label>Glucides (g/100g)</label>
                <input type="number" id="ff-carbs" placeholder="30" min="0" step="0.1">
              </div>
              <div class="form-group">
                <label>Lipides (g/100g)</label>
                <input type="number" id="ff-fat" placeholder="5" min="0" step="0.1">
              </div>
            </div>
            <div class="form-actions">
              <button type="button" class="btn btn-ghost" onclick="document.getElementById('modal-food').style.display='none'">Annuler</button>
              <button type="submit" class="btn btn-primary">Ajouter</button>
            </div>
          </form>
        </div>
      </div>
    </div>
  `;
}

function renderDietDay(date, day) {
  day = day || DB.getDietDay(date);
  const profile = DB.getProfile();
  const targets = calcTargets(profile);

  let totalCals = 0, totalProt = 0, totalCarbs = 0, totalFat = 0;
  Object.values(day.meals).forEach(foods => foods.forEach(f => {
    const q = (f.qty || 100) / 100;
    totalCals += (f.calories || 0) * q;
    totalProt += (f.protein || 0) * q;
    totalCarbs += (f.carbs || 0) * q;
    totalFat += (f.fat || 0) * q;
  }));
  totalCals = Math.round(totalCals);
  totalProt = Math.round(totalProt);
  totalCarbs = Math.round(totalCarbs);
  totalFat = Math.round(totalFat);

  const pct = v => targets ? Math.min(Math.round(v / targets.calories * 100), 100) : 0;

  return `
    <!-- Daily Summary -->
    <div class="diet-summary">
      <div class="macro-total ${targets && totalCals >= targets.calories ? 'over' : ''}">
        <span class="macro-val">${totalCals}</span>
        <span class="macro-unit">kcal</span>
        ${targets ? `<span class="macro-target">/ ${targets.calories}</span>` : ''}
      </div>
      <div class="calorie-bar-wrap">
        <div class="calorie-bar" style="width:${pct(totalCals)}%"></div>
      </div>
      <div class="macros-row">
        <div class="macro-item prot">
          <div class="macro-bar-sm"><div style="width:${targets ? Math.min(totalProt/targets.protein*100,100) : 0}%"></div></div>
          <span class="macro-lbl">Prot. ${totalProt}g${targets ? ` / ${targets.protein}g` : ''}</span>
        </div>
        <div class="macro-item carbs">
          <div class="macro-bar-sm"><div style="width:${targets ? Math.min(totalCarbs/targets.carbs*100,100) : 0}%"></div></div>
          <span class="macro-lbl">Glucides ${totalCarbs}g${targets ? ` / ${targets.carbs}g` : ''}</span>
        </div>
        <div class="macro-item fat">
          <div class="macro-bar-sm"><div style="width:${targets ? Math.min(totalFat/targets.fat*100,100) : 0}%"></div></div>
          <span class="macro-lbl">Lipides ${totalFat}g${targets ? ` / ${targets.fat}g` : ''}</span>
        </div>
      </div>
    </div>

    <!-- Meals -->
    ${Object.entries(MEAL_LABELS).map(([mealKey, mealLabel]) => {
      const foods = day.meals[mealKey] || [];
      const mealCals = Math.round(foods.reduce((s, f) => s + (f.calories || 0) * (f.qty || 100) / 100, 0));
      return `
        <div class="meal-section">
          <div class="meal-header">
            <span class="meal-title">${mealLabel}</span>
            <span class="meal-cals">${mealCals} kcal</span>
            <button class="btn btn-outline btn-sm" onclick="openAddFood('${mealKey}', '${date}')">+ Ajouter</button>
          </div>
          ${foods.length ? `
            <div class="food-list">
              ${foods.map((f, i) => `
                <div class="food-item">
                  <div class="fi-name">${f.name}</div>
                  <div class="fi-qty">${f.qty || 100}g</div>
                  <div class="fi-cals">${Math.round((f.calories||0)*(f.qty||100)/100)} kcal</div>
                  <div class="fi-macros">P:${Math.round((f.protein||0)*(f.qty||100)/100)}g G:${Math.round((f.carbs||0)*(f.qty||100)/100)}g L:${Math.round((f.fat||0)*(f.qty||100)/100)}g</div>
                  <button class="btn-icon danger sm" onclick="removeFood('${mealKey}','${date}',${i})">✕</button>
                </div>
              `).join('')}
            </div>
          ` : `<div class="meal-empty">Aucun aliment ajouté</div>`}
        </div>
      `;
    }).join('')}
  `;
}

function calcTargets(profile) {
  if (!profile.weight || !profile.height || !profile.age) return null;
  const bmr = profile.gender === 'female'
    ? 10 * profile.weight + 6.25 * profile.height - 5 * profile.age - 161
    : 10 * profile.weight + 6.25 * profile.height - 5 * profile.age + 5;
  const mult = { sedentary: 1.2, light: 1.375, moderate: 1.55, active: 1.725, veryactive: 1.9 };
  const tdee = Math.round(bmr * (mult[profile.activityLevel] || 1.55));
  const adj = profile.goal === 'lose' ? -500 : profile.goal === 'gain' ? 300 : 0;
  const calories = tdee + adj;
  const protein = Math.round(profile.weight * 2);
  const fat = Math.round(calories * 0.25 / 9);
  const carbs = Math.round((calories - protein * 4 - fat * 9) / 4);
  return { calories, protein, carbs, fat };
}

export function initDiet() {
  document.getElementById('diet-date')?.addEventListener('change', async e => {
    const date = e.target.value;
    const day = await DB.fetchDietDay(date);
    document.getElementById('diet-day-content').innerHTML = renderDietDay(date, day);
  });

  document.getElementById('food-search')?.addEventListener('input', e => {
    const q = e.target.value.toLowerCase();
    const suggestions = document.getElementById('food-suggestions');
    if (!q) { suggestions.innerHTML = ''; return; }
    const matches = FOOD_DB.filter(f => f.name.toLowerCase().includes(q)).slice(0, 6);
    suggestions.innerHTML = matches.map(f => `
      <div class="food-suggestion-item" onclick="selectFoodSuggestion(${JSON.stringify(f).replace(/"/g, '&quot;')})">
        <span>${f.name}</span>
        <span class="text-muted">${f.calories} kcal/100g</span>
      </div>
    `).join('');
  });

  document.getElementById('form-food')?.addEventListener('submit', async e => {
    e.preventDefault();
    const meal = document.getElementById('ff-meal').value;
    const date = document.getElementById('ff-date').value;
    const food = {
      name: document.getElementById('ff-name').value,
      qty: parseFloat(document.getElementById('ff-qty').value) || 100,
      calories: parseFloat(document.getElementById('ff-calories').value) || 0,
      protein: parseFloat(document.getElementById('ff-protein').value) || 0,
      carbs: parseFloat(document.getElementById('ff-carbs').value) || 0,
      fat: parseFloat(document.getElementById('ff-fat').value) || 0,
    };
    const day = DB.getDietDay(date);
    day.meals[meal].push(food);
    await DB.saveDietDay(date, day);
    document.getElementById('modal-food').style.display = 'none';
    document.getElementById('diet-day-content').innerHTML = renderDietDay(date, day);
  });
}

window.openAddFood = function(meal, date) {
  document.getElementById('ff-meal').value = meal;
  document.getElementById('ff-date').value = date;
  document.getElementById('ff-name').value = '';
  document.getElementById('ff-qty').value = 100;
  document.getElementById('ff-calories').value = '';
  document.getElementById('ff-protein').value = '';
  document.getElementById('ff-carbs').value = '';
  document.getElementById('ff-fat').value = '';
  document.getElementById('food-search').value = '';
  document.getElementById('food-suggestions').innerHTML = '';
  document.getElementById('modal-food').style.display = 'flex';
};

window.selectFoodSuggestion = function(food) {
  document.getElementById('ff-name').value = food.name;
  document.getElementById('ff-calories').value = food.calories;
  document.getElementById('ff-protein').value = food.protein;
  document.getElementById('ff-carbs').value = food.carbs;
  document.getElementById('ff-fat').value = food.fat;
  document.getElementById('food-search').value = '';
  document.getElementById('food-suggestions').innerHTML = '';
};

window.removeFood = async function(meal, date, idx) {
  const day = DB.getDietDay(date);
  day.meals[meal].splice(idx, 1);
  await DB.saveDietDay(date, day);
  document.getElementById('diet-day-content').innerHTML = renderDietDay(date, day);
};
