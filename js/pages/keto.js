// Date de démarrage du plan kéto (à modifier si besoin)
const KETO_START = '2026-04-08';

const DAYS = [
  {
    name: 'Lundi', type: 'repos', glucides: 22,
    kcal: 1920, prot: 168,
    meals: {
      'Petit-déjeuner (7h00)': ['2 petits suisses 3% MG', '40g emmental ou 60g chèvre frais', '1 café sans sucre', '15g noix'],
      'Collation (16h00)':     ['2 petits suisses 3% MG', '20g amandes'],
      'Déjeuner (12h30)':      ['180g blanc de poulet grillé', '200g haricots verts', '200g courgettes', '9g huile pépins de raisin', '1 fromage blanc 0% (100g)'],
      'Dîner (19h30)':         ['2 hauts de cuisse poulet (≈150g, sans peau)', '300g épinards sautés à l\'ail', '9g huile pépins de raisin', '30g emmental râpé'],
    },
    tip: 'Jour de repos — bouillon de légumes si fringale le soir (quasi 0 glucides).'
  },
  {
    name: 'Mardi', type: 'séance', glucides: 19,
    kcal: 1880, prot: 172,
    meals: {
      'Petit-déjeuner (6h15 — avant séance)': ['2 petits suisses 3% MG', '40g emmental', '1 café sans sucre'],
      'Collation (16h00)':                    ['2 petits suisses 3% MG', '15g noix'],
      'Post-séance / Déjeuner (8h30)':        ['180g blanc de poulet', '200g brocolis vapeur', '200g haricots verts', '9g huile pépins de raisin', '1 fromage blanc 0% (100g)'],
      'Dîner (19h30)':                        ['3 œufs en omelette aux herbes', '200g champignons poêlés', '9g huile pépins de raisin', '30g fromage de chèvre'],
    },
    tip: 'Jour de séance — s\'attendre à une séance difficile semaines 1-2. Réduire les charges si fatigue.'
  },
  {
    name: 'Mercredi', type: 'repos', glucides: 21,
    kcal: 1870, prot: 164,
    meals: {
      'Petit-déjeuner (7h00)': ['2 petits suisses 3% MG', '60g chèvre frais', '1 café sans sucre', '15g amandes'],
      'Collation (16h00)':     ['1 fromage blanc 0% (100g)', '15g noix'],
      'Déjeuner (12h30)':      ['200g thon naturel (conserve)', '200g tomates + concombre + salade', '9g huile pépins de raisin', '40g emmental'],
      'Dîner (19h30)':         ['150g tranche de poulet', '300g poêlée courgettes / poivrons', '9g huile pépins de raisin', '30g emmental râpé'],
    },
    tip: 'Repos — bouillon salé le soir si maux de tête (électrolytes).'
  },
  {
    name: 'Jeudi', type: 'séance', glucides: 20,
    kcal: 1890, prot: 170,
    meals: {
      'Petit-déjeuner (6h15 — avant séance)': ['2 petits suisses 3% MG', '40g emmental', '1 café sans sucre'],
      'Collation (16h00)':                    ['2 petits suisses 3% MG', '20g amandes'],
      'Post-séance / Déjeuner (8h30)':        ['180g blanc de poulet grillé', '200g brocolis + haricots verts', '9g huile pépins de raisin', '1 fromage blanc 0% (100g)'],
      'Dîner (19h30)':                        ['2 hauts de cuisse poulet (≈150g, sans peau)', '250g ratatouille maison (sans pomme de terre)', '9g huile pépins de raisin'],
    },
    tip: 'Jour de séance — bien s\'hydrater, viser 3L d\'eau aujourd\'hui.'
  },
  {
    name: 'Vendredi', type: 'repos', glucides: 22,
    kcal: 1900, prot: 165,
    meals: {
      'Petit-déjeuner (7h00)': ['2 petits suisses 3% MG', '60g chèvre frais', '1 café sans sucre', '15g noix'],
      'Collation (16h00)':     ['1 fromage blanc 0%', '15g amandes'],
      'Déjeuner (12h30)':      ['180g blanc de poulet', '200g haricots verts', '200g salade verte + concombre', '9g huile pépins de raisin', '40g emmental'],
      'Dîner (19h30)':         ['1 cuisse de poulet (≈160g, sans peau)', '300g épinards + champignons poêlés', '9g huile pépins de raisin', '30g fromage chèvre'],
    },
    tip: 'Fin de semaine — prépare tes repas du week-end à l\'avance pour éviter les écarts.'
  },
  {
    name: 'Samedi', type: 'séance', glucides: 21,
    kcal: 1930, prot: 168,
    meals: {
      'Petit-déjeuner (6h15 — avant séance)': ['2 petits suisses 3% MG', '40g emmental', '1 café sans sucre'],
      'Collation (15h00)':                    ['2 petits suisses 3% MG', '15g noix'],
      'Post-séance / Déjeuner (9h00)':        ['200g blanc de poulet', '200g brocolis vapeur', '200g courgettes', '9g huile pépins de raisin', '1 fromage blanc 0%'],
      'Dîner — repas libre keto (19h30)':     ['Repas plaisir DANS le keto', 'Ex : viande grillée + fromage + légumes verts', 'Pas de glucides même le soir — tenir le cap !'],
    },
    tip: 'Repas libre mais keto only — le week-end est le moment le plus difficile.'
  },
  {
    name: 'Dimanche', type: 'repos', glucides: 20,
    kcal: 1870, prot: 158,
    meals: {
      'Petit-déjeuner (8h00)': ['2 petits suisses 3% MG', '60g emmental ou chèvre', '1 café sans sucre', '15g amandes'],
      'Collation (16h00)':     ['1 fromage blanc 0%', '15g noix'],
      'Déjeuner (13h00)':      ['Poulet rôti ou grillé (≈180g, sans peau)', 'Légumes verts rôtis au four', '9g huile pépins de raisin', '30g fromage'],
      'Dîner léger (19h30)':   ['3 œufs omelette ou 150g poulet froid', 'Salade verte + concombre', '9g huile pépins de raisin'],
    },
    tip: 'Dimanche = meal prep keto ! Cuis ton poulet et tes légumes pour toute la semaine.'
  },
];

function getCurrentPhase() {
  const start = new Date(KETO_START);
  const today = new Date();
  const diffDays = Math.floor((today - start) / (1000 * 60 * 60 * 24));
  if (diffDays < 0)   return { num: 0, label: 'Pas encore commencé', color: 'var(--text-muted)', days: diffDays };
  if (diffDays < 14)  return { num: 1, label: 'Phase 1 — Induction', color: '#e07b39', days: diffDays };
  if (diffDays < 28)  return { num: 2, label: 'Phase 2 — Adaptation', color: '#d4a017', days: diffDays };
  if (diffDays < 56)  return { num: 3, label: 'Phase 3 — Kéto établi', color: '#3a9a6e', days: diffDays };
  return { num: 4, label: 'Plan terminé — transition', color: 'var(--primary)', days: diffDays };
}

export function renderKeto() {
  const phase = getCurrentPhase();
  const startDate = new Date(KETO_START).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });

  // Quel jour de la semaine afficher par défaut (0=lundi … 6=dimanche)
  const todayIdx = (new Date().getDay() + 6) % 7;

  return `
    <div class="page" id="page-keto">
      <div class="page-header">
        <h1>🥑 Plan Kéto</h1>
      </div>

      <!-- Bandeau phase -->
      <div class="keto-phase-banner" style="border-left:4px solid ${phase.color}">
        <div class="keto-phase-label" style="color:${phase.color}">${phase.label}</div>
        <div class="keto-phase-sub">
          ${phase.num === 0
            ? `Démarrage le ${startDate} (dans ${Math.abs(phase.days)} jour${Math.abs(phase.days) > 1 ? 's' : ''})`
            : phase.num <= 3
              ? `Jour ${phase.days + 1} / 56 — démarré le ${startDate}`
              : `Terminé — passer en low-carb modéré (80-100g/jour)`
          }
        </div>
        ${phase.num === 1 ? '<div class="keto-phase-tip">⚠️ Grippe cétogène possible — normal et temporaire. Réduire charges muscu de 20-30%.</div>' : ''}
        ${phase.num === 2 ? '<div class="keto-phase-tip">✅ Énergie qui remonte — reprendre intensité normale progressivement.</div>' : ''}
        ${phase.num === 3 ? '<div class="keto-phase-tip">🔥 Perte de graisse optimale — énergie stable, moins de fringales.</div>' : ''}
      </div>

      <!-- Tabs -->
      <div class="keto-tabs">
        <button class="keto-tab active" onclick="ketoTab('plan',this)">Plan semaine</button>
        <button class="keto-tab" onclick="ketoTab('aliments',this)">Aliments</button>
        <button class="keto-tab" onclick="ketoTab('conseils',this)">Conseils</button>
      </div>

      <!-- Tab: Plan semaine -->
      <div id="keto-tab-plan" class="keto-tab-content">
        <div class="keto-days-nav">
          ${DAYS.map((d, i) => `
            <button class="keto-day-btn${i === todayIdx ? ' active' : ''}" onclick="ketoShowDay(${i},this)">
              <span class="keto-day-name">${d.name.slice(0,3)}</span>
              <span class="keto-day-type ${d.type === 'séance' ? 'tag-seance' : 'tag-repos'}">${d.type === 'séance' ? '💪' : '😴'}</span>
            </button>
          `).join('')}
        </div>
        <div id="keto-day-detail">
          ${renderDay(todayIdx)}
        </div>
      </div>

      <!-- Tab: Aliments -->
      <div id="keto-tab-aliments" class="keto-tab-content" style="display:none">
        <div class="keto-food-grid">
          <div class="keto-food-col allowed">
            <h3>✅ Autorisés</h3>
            ${[
              ['Viandes','Poulet, dinde, bœuf, veau, jambon blanc'],
              ['Poissons','Thon (conserve), colin, cabillaud, sardines, maquereaux'],
              ['Œufs','Omelette, brouillés, durs'],
              ['Fromages','Emmental, chèvre, mozzarella, camembert, comté'],
              ['Légumes verts','Courgettes, épinards, brocolis, haricots verts, poivrons, salade, concombre, champignons, céleri, radis'],
              ['Matières grasses','Huile pépins de raisin, huile d\'olive, beurre (modération)'],
              ['Laitiers','Petits suisses 3%, fromage blanc 0% (modération)'],
              ['Oléagineux','Noix, amandes, noisettes (20-25g max/jour)'],
              ['Boissons','Eau (3L min), café, thé, eau pétillante sans sucre'],
              ['Fruits (50g max)','Fraises, framboises, myrtilles'],
            ].map(([cat, items]) => `
              <div class="keto-food-item">
                <span class="keto-food-cat">${cat}</span>
                <span class="keto-food-desc">${items}</span>
              </div>
            `).join('')}
          </div>
          <div class="keto-food-col forbidden">
            <h3>❌ Interdits</h3>
            ${[
              'Pain, biscottes, viennoiseries, farines',
              'Riz, pâtes, semoule, quinoa, avoine, céréales',
              'Légumineuses : lentilles, pois chiches, haricots rouges',
              'Pommes de terre, patate douce, maïs',
              'Fruits sucrés : banane, raisin, mangue, ananas, pomme',
              'Sucre, miel, sirop, sodas, jus de fruits, alcool sucré',
              'Yaourts sucrés, lait de vache',
            ].map(item => `<div class="keto-food-item forbidden-item">— ${item}</div>`).join('')}
          </div>
        </div>
      </div>

      <!-- Tab: Conseils -->
      <div id="keto-tab-conseils" class="keto-tab-content" style="display:none">
        <div class="keto-advice-section">
          <h3>⚡ Électrolytes — essentiel</h3>
          <div class="keto-advice-list">
            <div class="keto-advice-item"><span class="keto-advice-icon">🧂</span><div><strong>Sodium</strong> — Saler chaque repas. Bouillon de légumes le soir.</div></div>
            <div class="keto-advice-item"><span class="keto-advice-icon">🥦</span><div><strong>Potassium</strong> — Légumes verts à chaque repas. Évite les crampes musculaires.</div></div>
            <div class="keto-advice-item"><span class="keto-advice-icon">🥜</span><div><strong>Magnésium</strong> — Noix et épinards. Si crampes persistantes, complément en pharmacie.</div></div>
            <div class="keto-advice-item"><span class="keto-advice-icon">💧</span><div><strong>Eau</strong> — Minimum 3L par jour. Le corps élimine beaucoup d'eau en keto.</div></div>
          </div>
        </div>
        <div class="keto-advice-section">
          <h3>💪 Kéto + Sport</h3>
          <div class="keto-advice-list">
            <div class="keto-advice-item"><span class="keto-advice-icon">📉</span><div>Sem. 1-2 : réduire les charges de <strong>20-30%</strong>, énergie basse — c'est normal.</div></div>
            <div class="keto-advice-item"><span class="keto-advice-icon">📈</span><div>Sem. 3-4 : énergie remonte, reprendre intensité normale.</div></div>
            <div class="keto-advice-item"><span class="keto-advice-icon">🏃</span><div>Le tapis roulant est idéal en keto — brûle les graisses directement.</div></div>
            <div class="keto-advice-item"><span class="keto-advice-icon">🍗</span><div>Manger <strong>170-180g de protéines/jour</strong> pour préserver le muscle.</div></div>
            <div class="keto-advice-item"><span class="keto-advice-icon">🧘</span><div>S'étirer après chaque séance, risque de crampes plus élevé en keto.</div></div>
            <div class="keto-advice-item"><span class="keto-advice-icon">⚠️</span><div>Si douleur lombaire : stopper immédiatement. Corps fatigué = mauvaise posture.</div></div>
          </div>
        </div>
        <div class="keto-advice-section">
          <h3>🔬 Les 3 phases</h3>
          <div class="keto-phases-list">
            <div class="keto-phase-item" style="border-left:3px solid #e07b39">
              <strong>Phase 1 — Induction (sem. 1-2)</strong>
              <p>Corps épuise le glycogène. Fatigue, maux de tête, irritabilité = grippe cétogène, temporaire. Après 5-7 jours, production de cétones.</p>
            </div>
            <div class="keto-phase-item" style="border-left:3px solid #d4a017">
              <strong>Phase 2 — Adaptation (sem. 3-4)</strong>
              <p>Cétose établie. Énergie revient, faim diminue, perte de poids s'accélère. Reprendre séances à intensité normale.</p>
            </div>
            <div class="keto-phase-item" style="border-left:3px solid #3a9a6e">
              <strong>Phase 3 — Kéto établi (sem. 5-8)</strong>
              <p>Perte de graisse optimale, énergie stable. Bandelettes urinaires (pharmacie) : objectif 0,5–3 mmol/L.</p>
            </div>
            <div class="keto-phase-item" style="border-left:3px solid var(--primary)">
              <strong>Sortie du keto (après 2 mois)</strong>
              <p>Ne pas réintroduire les glucides brutalement. D'abord légumineuses et fruits, puis céréales complètes. Viser 80-100g/jour en croisière.</p>
            </div>
          </div>
        </div>
        <div class="keto-advice-section">
          <p class="keto-medical-note">🩺 <em>Faire une prise de sang avant et après les 2 mois (bilan lipidique, glycémie, fonction rénale). Consulter ton médecin si doute ou symptôme inhabituel.</em></p>
        </div>
      </div>
    </div>
  `;
}

function renderDay(idx) {
  const d = DAYS[idx];
  return `
    <div class="keto-day-header">
      <span class="keto-day-title">${d.name}</span>
      <span class="keto-day-badge ${d.type === 'séance' ? 'tag-seance' : 'tag-repos'}">${d.type === 'séance' ? '💪 Séance' : '😴 Repos'}</span>
      <span class="keto-day-glucides">🍬 ${d.glucides}g glucides</span>
    </div>
    <div class="keto-day-macros">
      <div class="keto-macro-chip">🔥 ${d.kcal} kcal</div>
      <div class="keto-macro-chip">🍗 ${d.prot}g prot.</div>
      <div class="keto-macro-chip keto-carbs-chip ${d.glucides > 25 ? 'warn' : ''}">🌿 ${d.glucides}g / 30g max</div>
    </div>
    ${Object.entries(d.meals).map(([meal, items]) => `
      <div class="keto-meal-block">
        <div class="keto-meal-title">${meal}</div>
        <ul class="keto-meal-list">
          ${items.map(i => `<li>${i}</li>`).join('')}
        </ul>
      </div>
    `).join('')}
    <div class="keto-day-tip">💡 ${d.tip}</div>
  `;
}

export function initKeto() {}

window.ketoTab = function(tab, btn) {
  document.querySelectorAll('.keto-tab').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  ['plan','aliments','conseils'].forEach(t => {
    document.getElementById(`keto-tab-${t}`).style.display = t === tab ? 'block' : 'none';
  });
};

window.ketoShowDay = function(idx, btn) {
  document.querySelectorAll('.keto-day-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  document.getElementById('keto-day-detail').innerHTML = renderDay(idx);
};
