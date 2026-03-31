/**
 * Seed : remplit les training_plans et les diet_templates
 * Usage : node seed.js
 */
require('dotenv/config');
const { createPool } = require('./db');

const db = createPool();

// ─── Macros lookup (pour 100g) ────────────────────────────────────────────

const F = {
  petits_suisses:   { name: 'Petits suisses 3% MG',          calories:  72, protein: 7.5, carbs:  4.0, fat:  3.2 },
  pain_mais:        { name: 'Pain au maïs',                   calories: 230, protein: 5.0, carbs: 50.0, fat:  2.0 },
  blanc_poulet:     { name: 'Blanc de poulet grillé',         calories: 165, protein:31.0, carbs:  0.0, fat:  3.6 },
  brocoli:          { name: 'Brocolis vapeur',                calories:  34, protein: 2.8, carbs:  6.6, fat:  0.4 },
  courgette:        { name: 'Courgettes',                     calories:  17, protein: 1.2, carbs:  3.1, fat:  0.3 },
  konjac:           { name: 'Nouilles de konjac',             calories:   6, protein: 0.2, carbs:  1.2, fat:  0.1 },
  huile:            { name: 'Huile pépins de raisin',         calories: 900, protein: 0.0, carbs:  0.0, fat:100.0 },
  fb0:              { name: 'Fromage blanc 0%',               calories:  45, protein: 8.0, carbs:  4.0, fat:  0.2 },
  oeuf:             { name: 'Oeufs entiers',                  calories: 155, protein:13.0, carbs:  1.1, fat: 11.0 },
  epinards:         { name: 'Épinards',                       calories:  23, protein: 2.9, carbs:  3.6, fat:  0.4 },
  riz:              { name: 'Riz blanc cuit',                 calories: 130, protein: 2.7, carbs: 28.0, fat:  0.3 },
  haricots:         { name: 'Haricots verts',                 calories:  31, protein: 1.8, carbs:  6.6, fat:  0.2 },
  thon:             { name: 'Thon naturel (conserve)',        calories: 116, protein:26.0, carbs:  0.0, fat:  1.0 },
  tomate:           { name: 'Tomates',                        calories:  18, protein: 0.9, carbs:  3.9, fat:  0.2 },
  concombre:        { name: 'Concombre',                      calories:  12, protein: 0.6, carbs:  2.0, fat:  0.1 },
  salade:           { name: 'Salade verte',                   calories:  13, protein: 1.4, carbs:  1.8, fat:  0.2 },
  cuisse_poulet:    { name: 'Cuisse de poulet (sans peau)',   calories: 155, protein:26.0, carbs:  0.0, fat:  5.0 },
  poivron:          { name: 'Poivrons',                       calories:  31, protein: 1.0, carbs:  6.0, fat:  0.3 },
  ratatouille:      { name: 'Ratatouille maison',             calories:  55, protein: 1.5, carbs:  8.0, fat:  2.0 },
  amandes:          { name: 'Amandes',                        calories: 579, protein:21.0, carbs: 22.0, fat: 50.0 },
  dinde:            { name: 'Escalope de dinde',              calories: 135, protein:30.0, carbs:  0.0, fat:  1.0 },
  legumes_vapeur:   { name: 'Légumes verts vapeur',          calories:  30, protein: 2.5, carbs:  5.0, fat:  0.3 },
  courgette_poivron:{ name: 'Poêlée courgettes / poivrons',  calories:  22, protein: 1.1, carbs:  4.5, fat:  0.3 },
};

function food(key, qty) {
  const f = F[key];
  return { name: f.name, qty, calories: f.calories, protein: f.protein, carbs: f.carbs, fat: f.fat };
}

// ─── Plans alimentaires par jour ──────────────────────────────────────────

const DIET_TEMPLATES = {

  // LUNDI — Jour bas 1570 kcal
  lundi: {
    breakfast: [
      food('petits_suisses', 120),
      food('pain_mais', 50),
    ],
    lunch: [
      food('blanc_poulet', 160),
      food('brocoli', 200),
      food('courgette', 200),
      food('konjac', 250),
      food('huile', 9),
      food('fb0', 100),
    ],
    snack: [
      food('petits_suisses', 120),
    ],
    dinner: [
      food('oeuf', 180),         // 3 oeufs ≈ 180g
      food('epinards', 300),
      food('konjac', 250),
      food('huile', 9),
    ],
  },

  // MARDI — Jour modéré 1850 kcal (Séance Push matin)
  mardi: {
    breakfast: [
      food('petits_suisses', 120),
      food('pain_mais', 60),
    ],
    lunch: [                      // post-séance 8h30
      food('blanc_poulet', 180),
      food('riz', 140),
      food('haricots', 200),
      food('huile', 9),
      food('fb0', 150),
    ],
    snack: [
      food('petits_suisses', 120),
    ],
    dinner: [
      food('cuisse_poulet', 160),
      food('courgette_poivron', 250),
      food('konjac', 250),
      food('huile', 9),
    ],
  },

  // MERCREDI — Jour bas 1570 kcal
  mercredi: {
    breakfast: [
      food('petits_suisses', 120),
      food('pain_mais', 50),
    ],
    lunch: [
      food('thon', 160),
      food('tomate', 100),
      food('concombre', 80),
      food('salade', 40),
      food('konjac', 250),
      food('huile', 9),
      food('fb0', 100),
    ],
    snack: [
      food('petits_suisses', 120),
    ],
    dinner: [
      food('blanc_poulet', 150),
      food('courgette_poivron', 300),
      food('konjac', 250),
      food('huile', 9),
    ],
  },

  // JEUDI — Jour modéré 1850 kcal (Séance Pull matin)
  jeudi: {
    breakfast: [
      food('petits_suisses', 120),
      food('pain_mais', 60),
    ],
    lunch: [                      // post-séance 8h30
      food('blanc_poulet', 180),
      food('riz', 140),
      food('brocoli', 100),
      food('haricots', 100),
      food('huile', 9),
      food('fb0', 150),
    ],
    snack: [
      food('petits_suisses', 120),
    ],
    dinner: [
      food('cuisse_poulet', 150),
      food('ratatouille', 250),
      food('konjac', 250),
      food('huile', 9),
    ],
  },

  // VENDREDI — Jour bas 1570 kcal
  vendredi: {
    breakfast: [
      food('petits_suisses', 120),
      food('pain_mais', 50),
    ],
    lunch: [
      food('blanc_poulet', 180),
      food('haricots', 200),
      food('salade', 100),
      food('concombre', 100),
      food('konjac', 250),
      food('huile', 9),
      food('fb0', 100),
    ],
    snack: [
      food('petits_suisses', 120),
    ],
    dinner: [
      food('blanc_poulet', 150),
      food('epinards', 300),
      food('konjac', 250),
      food('huile', 9),
    ],
  },

  // SAMEDI — Jour modéré 1850 kcal (Séance Bas du corps matin)
  samedi: {
    breakfast: [
      food('petits_suisses', 120),
      food('pain_mais', 60),
    ],
    lunch: [                      // post-séance 9h00
      food('blanc_poulet', 200),
      food('riz', 140),
      food('legumes_vapeur', 200),
      food('huile', 9),
      food('fb0', 150),
    ],
    snack: [
      food('petits_suisses', 120),
    ],
    dinner: [
      food('cuisse_poulet', 160),
      food('ratatouille', 250),
      food('konjac', 250),
      food('huile', 9),
    ],
  },

  // DIMANCHE — Jour recharge 2100 kcal
  dimanche: {
    breakfast: [
      food('petits_suisses', 120),
      food('pain_mais', 80),
    ],
    lunch: [
      food('blanc_poulet', 180),
      food('riz', 160),
      food('legumes_vapeur', 200),
      food('huile', 9),
      food('fb0', 150),
    ],
    snack: [
      food('petits_suisses', 120),
      food('amandes', 20),
    ],
    dinner: [
      food('dinde', 160),
      food('legumes_vapeur', 250),
      food('riz', 70),
      food('huile', 9),
    ],
  },
};

// ─── Programmes sport par jour ────────────────────────────────────────────

const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2);
const ex = (name, sets, reps, weight, rest, notes = '') =>
  ({ id: uid(), name, sets, reps: String(reps), weight: weight || null, rest, notes });

const TRAINING_PLANS = [

  {
    day_of_week: 'lundi',
    name: 'Repos — Marche active',
    notes: 'Pas de salle. Marche extérieure 45-60 min. Récupération musculaire. ~220 kcal brûlés.',
    exercises: [
      ex('Marche extérieure', 1, '45-60 min', null, 0, 'Parc, quartier — rythme confortable, pas de contrainte lombaire'),
    ],
  },

  {
    day_of_week: 'mardi',
    name: 'Séance A — Push (6h30)',
    notes: 'Séance poussée. Tapis 45 min après la séance (5% / 4,5 km/h). ~300 kcal cardio.',
    exercises: [
      ex('Développé couché barre',  4, '8-10',  null, 90, 'Descendre lentement, serrer en haut'),
      ex('Développé militaire',     3, '10-12', null, 90, 'Gainage du tronc, pas de cambrure'),
      ex('Pec deck / Écarté',       3, '12-15', null, 60, 'Étirement complet en bas, squeeze en haut'),
      ex('Extension triceps poulie',3, '12-15', null, 60, 'Coudes fixes'),
      ex('Gainage planche',         3, '45 sec',null, 60, 'Bassin neutre, respiration'),
      ex('Pont fessier',            3, '15',    null, 60, 'Serrer les fessiers en haut, pause 1 sec'),
      ex('Tapis roulant 5% / 4,5km/h', 1, '45 min', null, 0, 'Cardio brûle-graisses post-séance'),
    ],
  },

  {
    day_of_week: 'mercredi',
    name: 'Repos — Marche active',
    notes: 'Récupération active. Marche 45-60 min. Maintient la dépense sans fatiguer les muscles.',
    exercises: [
      ex('Marche extérieure', 1, '45-60 min', null, 0, 'Récupération active — rythme tranquille'),
    ],
  },

  {
    day_of_week: 'jeudi',
    name: 'Séance B — Pull (6h30)',
    notes: 'Séance tirée. Tapis 45 min après la séance (5% / 4,5 km/h). ~300 kcal cardio.',
    exercises: [
      ex('Tirage poulie haute',     4, '10-12', null, 90, 'Coudes le long du corps, poitrine vers la barre'),
      ex('Rowing barre / haltères', 4, '10-12', null, 90, 'Dos plat, coudes serrés'),
      ex('Curl biceps haltères',    3, '12',    null, 60, 'Pas de balancement, supination complète'),
      ex('Face pull',               3, '15',    null, 60, 'Tirage vers le visage, rotation externe'),
      ex('Gainage oblique',         3, '30 sec', null, 60, 'Chaque côté — bassin aligné'),
      ex('Tapis roulant 5% / 4,5km/h', 1, '45 min', null, 0, 'Cardio brûle-graisses post-séance'),
    ],
  },

  {
    day_of_week: 'vendredi',
    name: 'Repos — Marche active',
    notes: '3e marche de la semaine. Creuse le déficit hebdo avant la séance du samedi.',
    exercises: [
      ex('Marche extérieure', 1, '45-60 min', null, 0, 'Récupération — préparer la séance samedi'),
    ],
  },

  {
    day_of_week: 'samedi',
    name: 'Séance C — Bas du corps (6h30)',
    notes: 'Grande séance des jambes. Tapis 45 min après (5% / 4,5 km/h). ~300 kcal cardio.',
    exercises: [
      ex('Presse cuisses',          4, '12-15', null, 90, 'Amplitude complète, genoux dans l\'axe'),
      ex('Leg curl allongé',        3, '12-15', null, 90, 'Descente lente, pause en bas'),
      ex('Abducteurs machine',      3, '15-20', null, 60, 'Mouvement contrôlé'),
      ex('Mollets à la presse',     4, '15-20', null, 60, 'Descendre au maximum, monter sur pointe'),
      ex('Pont fessier',            3, '15',    null, 60, 'Pause 1 sec en haut, serrage fessiers'),
      ex('Planche',                 3, '45 sec',null, 60, 'Gainage total'),
      ex('Tapis roulant 5% / 4,5km/h', 1, '45 min', null, 0, 'Cardio brûle-graisses post-séance'),
    ],
  },

  {
    day_of_week: 'dimanche',
    name: 'Repos complet — Recharge',
    notes: 'Repos total. Jour de recharge calorique (2100 kcal). Meal prep semaine. Balade tranquille optionnelle.',
    exercises: [
      ex('Balade tranquille (optionnel)', 1, '30-45 min', null, 0, 'Pas d\'objectif de performance — si l\'envie est là'),
    ],
  },
];

// ─── Main ─────────────────────────────────────────────────────────────────

async function seed() {
  console.log('🌱  Démarrage du seed…\n');

  // ── Training Plans ──────────────────────────────────────────────────────
  console.log('📋  Suppression des anciens plans sport…');
  await db.query('DELETE FROM training_plans');

  for (const plan of TRAINING_PLANS) {
    const id = uid();
    await db.query(
      `INSERT INTO training_plans (id, day_of_week, name, exercises, notes)
       VALUES (?, ?, ?, ?, ?)`,
      [id, plan.day_of_week, plan.name, JSON.stringify(plan.exercises), plan.notes]
    );
    console.log(`  ✅  ${plan.day_of_week.padEnd(10)} — ${plan.name}`);
  }

  // ── Diet Templates ──────────────────────────────────────────────────────
  console.log('\n🥗  Suppression des anciens plans alimentaires…');
  await db.query("DELETE FROM diet_days WHERE date LIKE 'tpl_%'");

  for (const [dayKey, meals] of Object.entries(DIET_TEMPLATES)) {
    await db.query(
      `INSERT INTO diet_days (date, meals) VALUES (?, ?)
       ON DUPLICATE KEY UPDATE meals=VALUES(meals)`,
      [`tpl_${dayKey}`, JSON.stringify(meals)]
    );
    // Calculer kcal totaux
    const allFoods = Object.values(meals).flat();
    const kcal = Math.round(allFoods.reduce((s, f) => s + (f.calories * f.qty / 100), 0));
    console.log(`  ✅  ${dayKey.padEnd(10)} — ${kcal} kcal`);
  }

  console.log('\n✨  Seed terminé avec succès !');
  process.exit(0);
}

seed().catch(e => {
  console.error('❌  Erreur seed :', e.message);
  process.exit(1);
});
