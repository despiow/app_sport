import DB from '../db.js';

export function renderProfile() {
  const p = DB.getProfile();
  const results = calcNutrition(p);

  return `
    <div class="page" id="page-profile">
      <div class="page-header">
        <h1>Mon Profil</h1>
      </div>

      <form id="form-profile">
        <div class="section">
          <h2 class="section-title">Informations personnelles</h2>
          <div class="form-group">
            <label>Prénom</label>
            <input type="text" id="p-name" value="${p.name || ''}" placeholder="Votre prénom">
          </div>
          <div class="form-row">
            <div class="form-group">
              <label>Âge</label>
              <input type="number" id="p-age" value="${p.age || ''}" min="10" max="100" placeholder="25">
            </div>
            <div class="form-group">
              <label>Sexe</label>
              <select id="p-gender">
                <option value="male" ${p.gender === 'male' ? 'selected' : ''}>Homme</option>
                <option value="female" ${p.gender === 'female' ? 'selected' : ''}>Femme</option>
              </select>
            </div>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label>Taille (cm)</label>
              <input type="number" id="p-height" value="${p.height || ''}" min="100" max="250" placeholder="175">
            </div>
            <div class="form-group">
              <label>Poids (kg)</label>
              <input type="number" id="p-weight" value="${p.weight || ''}" min="30" max="300" step="0.1" placeholder="75">
            </div>
          </div>
        </div>

        <div class="section">
          <h2 class="section-title">Activité & Objectif</h2>
          <div class="form-group">
            <label>Niveau d'activité</label>
            <select id="p-activity">
              <option value="sedentary" ${p.activityLevel === 'sedentary' ? 'selected' : ''}>Sédentaire (bureau, peu ou pas de sport)</option>
              <option value="light" ${p.activityLevel === 'light' ? 'selected' : ''}>Légèrement actif (1-3 séances/semaine)</option>
              <option value="moderate" ${p.activityLevel === 'moderate' ? 'selected' : ''}>Modérément actif (3-5 séances/semaine)</option>
              <option value="active" ${p.activityLevel === 'active' ? 'selected' : ''}>Très actif (6-7 séances/semaine)</option>
              <option value="veryactive" ${p.activityLevel === 'veryactive' ? 'selected' : ''}>Extrêmement actif (sport intensif + travail physique)</option>
            </select>
          </div>
          <div class="form-group">
            <label>Objectif</label>
            <div class="goal-buttons" id="p-goal-btns">
              <button type="button" class="goal-btn ${p.goal === 'lose' ? 'active' : ''}" data-goal="lose">
                <span>📉</span>Perte de poids
              </button>
              <button type="button" class="goal-btn ${p.goal === 'maintain' ? 'active' : ''}" data-goal="maintain">
                <span>⚖️</span>Maintien
              </button>
              <button type="button" class="goal-btn ${p.goal === 'gain' ? 'active' : ''}" data-goal="gain">
                <span>📈</span>Prise de masse
              </button>
            </div>
            <input type="hidden" id="p-goal" value="${p.goal || 'maintain'}">
          </div>
        </div>

        <div class="form-actions sticky-save">
          <button type="submit" class="btn btn-primary btn-full">💾 Enregistrer le profil</button>
        </div>
      </form>

      <!-- Sécurité -->
      <div class="section">
        <h2 class="section-title">🔒 Sécurité</h2>
        <div class="security-section">
          <div class="security-row">
            <div class="security-row-info">
              <span class="security-row-title">Changer le code PIN</span>
              <span class="security-row-sub">Modifiez votre code d'accès à 6 chiffres</span>
            </div>
            <button class="btn btn-outline btn-sm" id="btn-change-pin">Modifier</button>
          </div>
          <div class="security-row">
            <div class="security-row-info">
              <span class="security-row-title">Se déconnecter</span>
              <span class="security-row-sub">Supprimer la session sur cet appareil</span>
            </div>
            <button class="btn btn-sm" style="border:1.5px solid var(--danger);color:var(--danger)" id="btn-logout">Déconnexion</button>
          </div>
        </div>
      </div>

      <!-- Nutrition Calculator Results -->
      <div class="section" id="nutrition-results">
        ${results ? renderNutritionResults(results) : `
          <div class="info-box">
            <p>Remplissez votre profil pour obtenir vos besoins nutritionnels personnalisés.</p>
          </div>
        `}
      </div>
    </div>
  `;
}

function renderNutritionResults(r) {
  return `
    <h2 class="section-title">🔬 Mes besoins nutritionnels</h2>
    <div class="nutrition-cards">
      <div class="nutrition-card bmr">
        <div class="nc-icon">🫀</div>
        <div class="nc-value">${r.bmr}</div>
        <div class="nc-label">kcal/jour</div>
        <div class="nc-desc">Métabolisme de base (BMR)</div>
        <div class="nc-hint">Calories brûlées au repos</div>
      </div>
      <div class="nutrition-card tdee highlight">
        <div class="nc-icon">⚡</div>
        <div class="nc-value">${r.tdee}</div>
        <div class="nc-label">kcal/jour</div>
        <div class="nc-desc">Dépense totale (TDEE)</div>
        <div class="nc-hint">Avec votre niveau d'activité</div>
      </div>
      <div class="nutrition-card target">
        <div class="nc-icon">${r.goalIcon}</div>
        <div class="nc-value">${r.target}</div>
        <div class="nc-label">kcal/jour</div>
        <div class="nc-desc">Objectif calorique</div>
        <div class="nc-hint">${r.goalLabel}</div>
      </div>
    </div>

    <div class="macros-detail">
      <h3>Répartition des macronutriments</h3>
      <div class="macro-detail-grid">
        <div class="macro-detail-card prot">
          <div class="md-header">
            <span class="md-icon">🥩</span>
            <span class="md-name">Protéines</span>
          </div>
          <div class="md-value">${r.protein}g</div>
          <div class="md-cals">${r.protein * 4} kcal</div>
          <div class="md-pct">${Math.round(r.protein * 4 / r.target * 100)}%</div>
          <div class="md-bar"><div class="md-fill prot" style="width:${Math.round(r.protein * 4 / r.target * 100)}%"></div></div>
        </div>
        <div class="macro-detail-card carbs">
          <div class="md-header">
            <span class="md-icon">🍚</span>
            <span class="md-name">Glucides</span>
          </div>
          <div class="md-value">${r.carbs}g</div>
          <div class="md-cals">${r.carbs * 4} kcal</div>
          <div class="md-pct">${Math.round(r.carbs * 4 / r.target * 100)}%</div>
          <div class="md-bar"><div class="md-fill carbs" style="width:${Math.round(r.carbs * 4 / r.target * 100)}%"></div></div>
        </div>
        <div class="macro-detail-card fat">
          <div class="md-header">
            <span class="md-icon">🥑</span>
            <span class="md-name">Lipides</span>
          </div>
          <div class="md-value">${r.fat}g</div>
          <div class="md-cals">${r.fat * 9} kcal</div>
          <div class="md-pct">${Math.round(r.fat * 9 / r.target * 100)}%</div>
          <div class="md-bar"><div class="md-fill fat" style="width:${Math.round(r.fat * 9 / r.target * 100)}%"></div></div>
        </div>
      </div>
    </div>

    <div class="info-box formula-box">
      <strong>Formule utilisée :</strong> Mifflin-St Jeor<br>
      <small>
        ${r.gender === 'female'
          ? 'BMR = (10 × poids) + (6.25 × taille) − (5 × âge) − 161'
          : 'BMR = (10 × poids) + (6.25 × taille) − (5 × âge) + 5'}
      </small>
    </div>
  `;
}

function calcNutrition(p) {
  if (!p.weight || !p.height || !p.age) return null;
  const bmr = Math.round(
    p.gender === 'female'
      ? 10 * p.weight + 6.25 * p.height - 5 * p.age - 161
      : 10 * p.weight + 6.25 * p.height - 5 * p.age + 5
  );
  const mult = { sedentary: 1.2, light: 1.375, moderate: 1.55, active: 1.725, veryactive: 1.9 };
  const tdee = Math.round(bmr * (mult[p.activityLevel] || 1.55));
  const adj = p.goal === 'lose' ? -500 : p.goal === 'gain' ? 300 : 0;
  const target = tdee + adj;
  const protein = Math.round(p.weight * 2);
  const fat = Math.round(target * 0.25 / 9);
  const carbs = Math.round((target - protein * 4 - fat * 9) / 4);
  const goalMap = {
    lose: { icon: '📉', label: 'Déficit de 500 kcal/jour' },
    maintain: { icon: '⚖️', label: 'Maintien du poids actuel' },
    gain: { icon: '📈', label: 'Surplus de 300 kcal/jour' }
  };
  const g = goalMap[p.goal] || goalMap.maintain;
  return { bmr, tdee, target, protein, carbs, fat, goalIcon: g.icon, goalLabel: g.label, gender: p.gender };
}

export function initProfile() {
  // Déconnexion
  document.getElementById('btn-logout')?.addEventListener('click', () => {
    if (confirm('Se déconnecter de cet appareil ?')) window.Auth?.logout();
  });

  // Changer le PIN
  document.getElementById('btn-change-pin')?.addEventListener('click', () => showChangePinModal());

  // Goal buttons
  document.getElementById('p-goal-btns')?.addEventListener('click', e => {
    const btn = e.target.closest('.goal-btn');
    if (!btn) return;
    document.querySelectorAll('.goal-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById('p-goal').value = btn.dataset.goal;
    updateResults();
  });

  // Live update on change
  ['p-age', 'p-weight', 'p-height', 'p-gender', 'p-activity'].forEach(id => {
    document.getElementById(id)?.addEventListener('change', updateResults);
  });

  document.getElementById('form-profile')?.addEventListener('submit', async e => {
    e.preventDefault();
    const profile = {
      name: document.getElementById('p-name').value,
      age: parseInt(document.getElementById('p-age').value) || 0,
      gender: document.getElementById('p-gender').value,
      height: parseFloat(document.getElementById('p-height').value) || 0,
      weight: parseFloat(document.getElementById('p-weight').value) || 0,
      activityLevel: document.getElementById('p-activity').value,
      goal: document.getElementById('p-goal').value
    };
    await DB.saveProfile(profile);
    showToast('Profil enregistré !');
    updateResults();
  });
}

function getFormProfile() {
  return {
    age: parseInt(document.getElementById('p-age')?.value) || 0,
    gender: document.getElementById('p-gender')?.value || 'male',
    height: parseFloat(document.getElementById('p-height')?.value) || 0,
    weight: parseFloat(document.getElementById('p-weight')?.value) || 0,
    activityLevel: document.getElementById('p-activity')?.value || 'moderate',
    goal: document.getElementById('p-goal')?.value || 'maintain'
  };
}

function updateResults() {
  const results = calcNutrition(getFormProfile());
  const container = document.getElementById('nutrition-results');
  if (container) {
    container.innerHTML = results ? renderNutritionResults(results) : `
      <div class="info-box">
        <p>Remplissez votre profil pour obtenir vos besoins nutritionnels personnalisés.</p>
      </div>`;
  }
}

function showChangePinModal() {
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.innerHTML = `
    <div class="modal modal-sm">
      <div class="modal-header">
        <h2>Changer le code PIN</h2>
        <button class="modal-close" id="close-pin-modal">✕</button>
      </div>
      <div class="modal-body">
        <div class="form-group">
          <label>Ancien code PIN</label>
          <input type="password" inputmode="numeric" id="old-pin" maxlength="6" placeholder="••••••">
        </div>
        <div class="form-group">
          <label>Nouveau code PIN</label>
          <input type="password" inputmode="numeric" id="new-pin" maxlength="6" placeholder="••••••">
        </div>
        <div class="form-group">
          <label>Confirmer le nouveau code</label>
          <input type="password" inputmode="numeric" id="confirm-pin" maxlength="6" placeholder="••••••">
        </div>
        <p id="pin-modal-error" style="color:var(--danger);font-size:13px;min-height:18px"></p>
        <div class="form-actions" style="margin-top:8px;padding-top:8px">
          <button class="btn btn-outline" id="cancel-pin-modal">Annuler</button>
          <button class="btn btn-primary" id="save-pin-modal">Enregistrer</button>
        </div>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);

  const close = () => overlay.remove();
  document.getElementById('close-pin-modal').addEventListener('click', close);
  document.getElementById('cancel-pin-modal').addEventListener('click', close);
  overlay.addEventListener('click', e => { if (e.target === overlay) close(); });

  document.getElementById('save-pin-modal').addEventListener('click', async () => {
    const oldPin  = document.getElementById('old-pin').value;
    const newPin  = document.getElementById('new-pin').value;
    const confirm = document.getElementById('confirm-pin').value;
    const errEl   = document.getElementById('pin-modal-error');

    if (!oldPin || !newPin || !confirm) { errEl.textContent = 'Remplissez tous les champs'; return; }
    if (newPin.length < 4) { errEl.textContent = 'Code trop court (min 4 chiffres)'; return; }
    if (newPin !== confirm) { errEl.textContent = 'Les codes ne correspondent pas'; return; }

    try {
      await window.Auth?.changePin(oldPin, newPin);
      close();
      showToast('Code PIN mis à jour !');
    } catch (e) {
      errEl.textContent = e.message;
    }
  });
}

function showToast(msg) {
  const t = document.createElement('div');
  t.className = 'toast';
  t.textContent = msg;
  document.body.appendChild(t);
  setTimeout(() => t.classList.add('show'), 10);
  setTimeout(() => { t.classList.remove('show'); setTimeout(() => t.remove(), 300); }, 2500);
}
