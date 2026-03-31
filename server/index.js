require('dotenv/config');
const express = require('express');
const cors    = require('cors');
const crypto  = require('crypto');
const { createPool } = require('./db');

const app    = express();
const PORT   = process.env.PORT || 4000;
const db     = createPool();
const SECRET = process.env.SESSION_SECRET || 'sporttracker-secret-change-me';

app.use(cors());
app.use(express.json({ limit: '2mb' }));

// ── Generic error wrapper ──────────────────────────────────────────────────
const wrap = fn => (req, res) => fn(req, res).catch(e => {
  console.error(e);
  res.status(500).json({ error: e.message });
});

// ── Token helpers ─────────────────────────────────────────────────────────
function createToken() {
  const payload = Buffer.from(JSON.stringify({
    exp: Date.now() + 30 * 24 * 60 * 60 * 1000   // 30 jours
  })).toString('base64url');
  const sig = crypto.createHmac('sha256', SECRET).update(payload).digest('base64url');
  return `${payload}.${sig}`;
}

function verifyToken(token) {
  if (!token) return false;
  const parts = token.split('.');
  if (parts.length !== 2) return false;
  const [payload, sig] = parts;
  const expected = crypto.createHmac('sha256', SECRET).update(payload).digest('base64url');
  if (expected !== sig) return false;
  try {
    const { exp } = JSON.parse(Buffer.from(payload, 'base64url').toString());
    return exp > Date.now();
  } catch { return false; }
}

async function hashPin(pin, salt) {
  return new Promise((resolve, reject) =>
    crypto.pbkdf2(String(pin), salt, 100000, 64, 'sha512',
      (err, key) => err ? reject(err) : resolve(key.toString('hex')))
  );
}

// ── Auth middleware ────────────────────────────────────────────────────────
const requireAuth = (req, res, next) => {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) return res.status(401).json({ error: 'Non autorisé' });
  if (verifyToken(header.slice(7))) return next();
  return res.status(401).json({ error: 'Session expirée' });
};

// Protège toutes les routes /api/* sauf /api/auth/*
app.use('/api', (req, res, next) => {
  if (req.path.startsWith('/auth/')) return next();
  return requireAuth(req, res, next);
});

// ── Health ─────────────────────────────────────────────────────────────────
app.get('/health', wrap(async (_req, res) => {
  const [rows] = await db.query('SELECT 1 AS ok');
  res.json({ ok: true, db: rows[0]?.ok === 1 });
}));

// ── Auth ───────────────────────────────────────────────────────────────────
app.get('/api/auth/check', wrap(async (_req, res) => {
  const [rows] = await db.query('SELECT pin_hash FROM profile WHERE id = 1');
  res.json({ hasPIN: !!(rows[0]?.pin_hash) });
}));

app.post('/api/auth/setup', wrap(async (req, res) => {
  const { pin } = req.body;
  if (!pin || String(pin).length < 4)
    return res.status(400).json({ error: 'Code PIN trop court (min 4 chiffres)' });
  const [rows] = await db.query('SELECT pin_hash FROM profile WHERE id = 1');
  if (rows[0]?.pin_hash)
    return res.status(400).json({ error: 'Un code PIN est déjà configuré' });
  const salt = crypto.randomBytes(32).toString('hex');
  const hash = await hashPin(pin, salt);
  await db.query('UPDATE profile SET pin_hash=?, pin_salt=? WHERE id=1', [hash, salt]);
  res.json({ ok: true, token: createToken() });
}));

app.post('/api/auth/login', wrap(async (req, res) => {
  const { pin } = req.body;
  const [rows] = await db.query('SELECT pin_hash, pin_salt FROM profile WHERE id = 1');
  const p = rows[0];
  if (!p?.pin_hash) return res.status(400).json({ error: 'Aucun code PIN configuré' });
  const hash = await hashPin(pin, p.pin_salt);
  if (hash !== p.pin_hash)
    return res.status(401).json({ error: 'Code PIN incorrect' });
  res.json({ ok: true, token: createToken() });
}));

app.post('/api/auth/change-pin', requireAuth, wrap(async (req, res) => {
  const { oldPin, newPin } = req.body;
  if (!newPin || String(newPin).length < 4)
    return res.status(400).json({ error: 'Nouveau code trop court (min 4 chiffres)' });
  const [rows] = await db.query('SELECT pin_hash, pin_salt FROM profile WHERE id = 1');
  const p = rows[0];
  const oldHash = await hashPin(oldPin, p.pin_salt);
  if (oldHash !== p.pin_hash)
    return res.status(401).json({ error: 'Ancien code PIN incorrect' });
  const salt = crypto.randomBytes(32).toString('hex');
  const hash = await hashPin(newPin, salt);
  await db.query('UPDATE profile SET pin_hash=?, pin_salt=? WHERE id=1', [hash, salt]);
  res.json({ ok: true, token: createToken() });
}));

// ── Profile ────────────────────────────────────────────────────────────────
app.get('/api/profile', wrap(async (_req, res) => {
  const [rows] = await db.query('SELECT * FROM profile WHERE id = 1');
  const p = rows[0];
  if (!p) return res.json({});
  res.json({
    name:          p.name,
    age:           p.age,
    gender:        p.gender,
    height:        p.height,
    weight:        p.weight,
    activityLevel: p.activity_level,
    goal:          p.goal,
  });
}));

app.put('/api/profile', wrap(async (req, res) => {
  const { name, age, gender, height, weight, activityLevel, goal } = req.body;
  await db.query(
    `UPDATE profile SET name=?, age=?, gender=?, height=?, weight=?,
     activity_level=?, goal=? WHERE id=1`,
    [name, age, gender, height, weight, activityLevel, goal]
  );
  res.json({ ok: true });
}));

// ── Workouts ───────────────────────────────────────────────────────────────
app.get('/api/workouts', wrap(async (_req, res) => {
  const [rows] = await db.query(
    'SELECT * FROM workouts ORDER BY date DESC, created_at DESC'
  );
  res.json(rows.map(r => ({ ...r, exercises: r.exercises || [] })));
}));

app.post('/api/workouts', wrap(async (req, res) => {
  const { id, name, type, date, duration, difficulty, notes, exercises } = req.body;
  await db.query(
    `INSERT INTO workouts (id, name, type, date, duration, difficulty, notes, exercises)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [id, name, type, date, duration || null, difficulty || 3, notes || null, JSON.stringify(exercises || [])]
  );
  res.json({ ok: true });
}));

app.put('/api/workouts/:id', wrap(async (req, res) => {
  const { name, type, date, duration, difficulty, notes, exercises } = req.body;
  await db.query(
    `UPDATE workouts SET name=?, type=?, date=?, duration=?, difficulty=?, notes=?, exercises=?
     WHERE id=?`,
    [name, type, date, duration || null, difficulty || 3, notes || null, JSON.stringify(exercises || []), req.params.id]
  );
  res.json({ ok: true });
}));

app.delete('/api/workouts/:id', wrap(async (req, res) => {
  await db.query('DELETE FROM workouts WHERE id=?', [req.params.id]);
  res.json({ ok: true });
}));

// ── Weights ────────────────────────────────────────────────────────────────
app.get('/api/weights', wrap(async (_req, res) => {
  const [rows] = await db.query('SELECT * FROM weight_entries ORDER BY date ASC');
  res.json(rows);
}));

app.post('/api/weights', wrap(async (req, res) => {
  const { id, date, weight, note } = req.body;
  await db.query(
    `INSERT INTO weight_entries (id, date, weight, note) VALUES (?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE weight=VALUES(weight), note=VALUES(note)`,
    [id, date, weight, note || null]
  );
  res.json({ ok: true });
}));

app.delete('/api/weights/:id', wrap(async (req, res) => {
  await db.query('DELETE FROM weight_entries WHERE id=?', [req.params.id]);
  res.json({ ok: true });
}));

// ── Diet Templates (par jour de semaine) ───────────────────────────────────
const parseMeals = v => {
  if (!v) return { breakfast: [], lunch: [], dinner: [], snack: [] };
  if (typeof v === 'string') { try { return JSON.parse(v); } catch { return { breakfast: [], lunch: [], dinner: [], snack: [] }; } }
  return v;
};

app.get('/api/diet-templates', wrap(async (_req, res) => {
  const [rows] = await db.query('SELECT day_key, meals FROM diet_templates');
  const out = {};
  rows.forEach(r => { out[r.day_key] = { meals: parseMeals(r.meals) }; });
  res.json(out);
}));

app.get('/api/diet-template/:day', wrap(async (req, res) => {
  const [rows] = await db.query('SELECT meals FROM diet_templates WHERE day_key=?', [req.params.day]);
  res.json({ meals: rows[0] ? parseMeals(rows[0].meals) : { breakfast: [], lunch: [], dinner: [], snack: [] } });
}));

app.put('/api/diet-template/:day', wrap(async (req, res) => {
  const { meals } = req.body;
  await db.query(
    'INSERT INTO diet_templates (day_key, meals) VALUES (?,?) ON DUPLICATE KEY UPDATE meals=VALUES(meals)',
    [req.params.day, JSON.stringify(meals)]
  );
  res.json({ ok: true });
}));

// ── Diet ───────────────────────────────────────────────────────────────────
app.get('/api/diet/:date', wrap(async (req, res) => {
  const [rows] = await db.query('SELECT * FROM diet_days WHERE date=?', [req.params.date]);
  if (rows[0]) {
    res.json({ date: rows[0].date, meals: parseMeals(rows[0].meals) });
  } else {
    res.json({ date: req.params.date, meals: { breakfast: [], lunch: [], dinner: [], snack: [] } });
  }
}));

app.put('/api/diet/:date', wrap(async (req, res) => {
  const { meals } = req.body;
  await db.query(
    `INSERT INTO diet_days (date, meals) VALUES (?, ?)
     ON DUPLICATE KEY UPDATE meals=VALUES(meals)`,
    [req.params.date, JSON.stringify(meals)]
  );
  res.json({ ok: true });
}));

// ── Training Plans ─────────────────────────────────────────────────────────
const parseExercises = v => {
  if (!v) return [];
  try { return typeof v === 'string' ? JSON.parse(v) : v; } catch { return []; }
};

app.get('/api/training-plans', wrap(async (_req, res) => {
  const [rows] = await db.query('SELECT * FROM training_plans ORDER BY created_at ASC');
  res.json(rows.map(r => ({ ...r, exercises: parseExercises(r.exercises) })));
}));

app.post('/api/training-plans', wrap(async (req, res) => {
  const { id, day_of_week, name, exercises, notes } = req.body;
  await db.query(
    `INSERT INTO training_plans (id, day_of_week, name, exercises, notes)
     VALUES (?, ?, ?, ?, ?)`,
    [id, day_of_week, name, JSON.stringify(exercises || []), notes || null]
  );
  res.json({ ok: true });
}));

app.put('/api/training-plans/:id', wrap(async (req, res) => {
  const { name, exercises, notes } = req.body;
  await db.query(
    `UPDATE training_plans SET name=?, exercises=?, notes=? WHERE id=?`,
    [name, JSON.stringify(exercises || []), notes || null, req.params.id]
  );
  res.json({ ok: true });
}));

app.delete('/api/training-plans/:id', wrap(async (req, res) => {
  await db.query('DELETE FROM training_plans WHERE id=?', [req.params.id]);
  res.json({ ok: true });
}));

// ── Perf Logs ──────────────────────────────────────────────────────────────
app.get('/api/perf-logs', wrap(async (_req, res) => {
  const [rows] = await db.query('SELECT * FROM perf_logs ORDER BY date DESC');
  res.json(rows.map(r => ({ ...r, exercises_done: parseExercises(r.exercises_done) })));
}));

app.put('/api/perf-logs/:date', wrap(async (req, res) => {
  const { id, plan_id, day_of_week, feeling, notes, exercises_done } = req.body;
  await db.query(
    `INSERT INTO perf_logs (id, date, plan_id, day_of_week, feeling, notes, exercises_done)
     VALUES (?, ?, ?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE
       plan_id=VALUES(plan_id), feeling=VALUES(feeling),
       notes=VALUES(notes), exercises_done=VALUES(exercises_done)`,
    [id, req.params.date, plan_id || null, day_of_week || null,
     feeling || null, notes || null, JSON.stringify(exercises_done || [])]
  );
  res.json({ ok: true });
}));

// ── Auto-migration : ajoute les colonnes PIN si absentes ──────────────────
(async () => {
  const cols = [
    ['pin_hash', 'VARCHAR(128)'],
    ['pin_salt', 'VARCHAR(64)'],
  ];
  for (const [name, type] of cols) {
    try {
      await db.query(`ALTER TABLE profile ADD COLUMN ${name} ${type} DEFAULT NULL`);
      console.log(`Migration: colonne ${name} ajoutée`);
    } catch (e) {
      if (e.code !== 'ER_DUP_FIELDNAME') console.error(`Migration ${name}:`, e.message);
    }
  }

  // Nouvelles tables pour le programme et les perfs
  try {
    await db.query(`CREATE TABLE IF NOT EXISTS training_plans (
      id VARCHAR(32) PRIMARY KEY,
      day_of_week VARCHAR(20) NOT NULL,
      name VARCHAR(255) NOT NULL,
      exercises MEDIUMTEXT,
      notes TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`);
    await db.query(`CREATE TABLE IF NOT EXISTS perf_logs (
      id VARCHAR(32) PRIMARY KEY,
      date DATE NOT NULL UNIQUE,
      plan_id VARCHAR(32),
      day_of_week VARCHAR(20),
      feeling VARCHAR(10),
      notes TEXT,
      exercises_done MEDIUMTEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_perf_date (date)
    )`);
    await db.query(`CREATE TABLE IF NOT EXISTS diet_templates (
      day_key VARCHAR(20) PRIMARY KEY,
      meals MEDIUMTEXT,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )`);
    console.log('Migration tables OK');
  } catch (e) {
    console.error('Migration tables:', e.message);
  }

  // ── Seed initial si tables vides ──────────────────────────────────────
  try {
    // Seed idempotent : toujours mettre à jour les templates diet (ON DUPLICATE KEY UPDATE)
    // et ré-insérer les plans si vides/incomplets
    await seedData(db);
    console.log('Seed/sync effectué');
  } catch (e) {
    console.error('Seed error:', e.message);
  }
})();

// ── Seed data ──────────────────────────────────────────────────────────────
async function seedData(db) {
  const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2);
  const F = {
    petits_suisses:    { name:'Petits suisses 3% MG',          calories: 72, protein:7.5, carbs: 4.0, fat: 3.2 },
    pain_mais:         { name:'Pain au maïs',                   calories:230, protein:5.0, carbs:50.0, fat: 2.0 },
    blanc_poulet:      { name:'Blanc de poulet grillé',         calories:165, protein:31,  carbs: 0.0, fat: 3.6 },
    brocoli:           { name:'Brocolis vapeur',                calories: 34, protein:2.8, carbs: 6.6, fat: 0.4 },
    courgette:         { name:'Courgettes',                     calories: 17, protein:1.2, carbs: 3.1, fat: 0.3 },
    konjac:            { name:'Nouilles de konjac',             calories:  6, protein:0.2, carbs: 1.2, fat: 0.1 },
    huile:             { name:'Huile pépins de raisin',         calories:900, protein:0.0, carbs: 0.0, fat:100  },
    fb0:               { name:'Fromage blanc 0%',               calories: 45, protein:8.0, carbs: 4.0, fat: 0.2 },
    oeuf:              { name:'Oeufs entiers',                  calories:155, protein:13,  carbs: 1.1, fat:11   },
    epinards:          { name:'Épinards',                       calories: 23, protein:2.9, carbs: 3.6, fat: 0.4 },
    riz:               { name:'Riz blanc cuit',                 calories:130, protein:2.7, carbs:28.0, fat: 0.3 },
    haricots:          { name:'Haricots verts',                 calories: 31, protein:1.8, carbs: 6.6, fat: 0.2 },
    thon:              { name:'Thon naturel (conserve)',        calories:116, protein:26,  carbs: 0.0, fat: 1.0 },
    tomate:            { name:'Tomates',                        calories: 18, protein:0.9, carbs: 3.9, fat: 0.2 },
    concombre:         { name:'Concombre',                      calories: 12, protein:0.6, carbs: 2.0, fat: 0.1 },
    salade:            { name:'Salade verte',                   calories: 13, protein:1.4, carbs: 1.8, fat: 0.2 },
    cuisse_poulet:     { name:'Cuisse de poulet (sans peau)',   calories:155, protein:26,  carbs: 0.0, fat: 5.0 },
    ratatouille:       { name:'Ratatouille maison',             calories: 55, protein:1.5, carbs: 8.0, fat: 2.0 },
    amandes:           { name:'Amandes',                        calories:579, protein:21,  carbs:22.0, fat:50   },
    dinde:             { name:'Escalope de dinde',              calories:135, protein:30,  carbs: 0.0, fat: 1.0 },
    legumes_v:         { name:'Légumes verts vapeur',           calories: 30, protein:2.5, carbs: 5.0, fat: 0.3 },
    courgette_poivron: { name:'Poêlée courgettes / poivrons',  calories: 22, protein:1.1, carbs: 4.5, fat: 0.3 },
  };
  const f = (key, qty) => ({ ...F[key], qty });

  const diets = {
    lundi:    { breakfast:[f('petits_suisses',120),f('pain_mais',50)],
                lunch:[f('blanc_poulet',160),f('brocoli',200),f('courgette',200),f('konjac',250),f('huile',9),f('fb0',100)],
                snack:[f('petits_suisses',120)],
                dinner:[f('oeuf',180),f('epinards',300),f('konjac',250),f('huile',9)] },
    mardi:    { breakfast:[f('petits_suisses',120),f('pain_mais',60)],
                lunch:[f('blanc_poulet',180),f('riz',140),f('haricots',200),f('huile',9),f('fb0',150)],
                snack:[f('petits_suisses',120)],
                dinner:[f('cuisse_poulet',160),f('courgette_poivron',250),f('konjac',250),f('huile',9)] },
    mercredi: { breakfast:[f('petits_suisses',120),f('pain_mais',50)],
                lunch:[f('thon',160),f('tomate',100),f('concombre',80),f('salade',40),f('konjac',250),f('huile',9),f('fb0',100)],
                snack:[f('petits_suisses',120)],
                dinner:[f('blanc_poulet',150),f('courgette_poivron',300),f('konjac',250),f('huile',9)] },
    jeudi:    { breakfast:[f('petits_suisses',120),f('pain_mais',60)],
                lunch:[f('blanc_poulet',180),f('riz',140),f('brocoli',100),f('haricots',100),f('huile',9),f('fb0',150)],
                snack:[f('petits_suisses',120)],
                dinner:[f('cuisse_poulet',150),f('ratatouille',250),f('konjac',250),f('huile',9)] },
    vendredi: { breakfast:[f('petits_suisses',120),f('pain_mais',50)],
                lunch:[f('blanc_poulet',180),f('haricots',200),f('salade',100),f('concombre',100),f('konjac',250),f('huile',9),f('fb0',100)],
                snack:[f('petits_suisses',120)],
                dinner:[f('blanc_poulet',150),f('epinards',300),f('konjac',250),f('huile',9)] },
    samedi:   { breakfast:[f('petits_suisses',120),f('pain_mais',60)],
                lunch:[f('blanc_poulet',200),f('riz',140),f('legumes_v',200),f('huile',9),f('fb0',150)],
                snack:[f('petits_suisses',120)],
                dinner:[f('cuisse_poulet',160),f('ratatouille',250),f('konjac',250),f('huile',9)] },
    dimanche: { breakfast:[f('petits_suisses',120),f('pain_mais',80)],
                lunch:[f('blanc_poulet',180),f('riz',160),f('legumes_v',200),f('huile',9),f('fb0',150)],
                snack:[f('petits_suisses',120),f('amandes',20)],
                dinner:[f('dinde',160),f('legumes_v',250),f('riz',70),f('huile',9)] },
  };

  const ex = (name,sets,reps,weight,rest,notes='') =>
    ({id:uid(),name,sets,reps:String(reps),weight:weight||null,rest,notes});

  const plans = [
    { day:'lundi',    name:'Repos — Marche active',      notes:'Marche extérieure 45-60 min. Récupération musculaire. ~220 kcal.',
      exercises:[ex('Marche extérieure',1,'45-60 min',null,0,'Parc, quartier — rythme confortable')] },
    { day:'mardi',    name:'Séance A — Push (6h30)',      notes:'Séance poussée. Tapis 45 min après (5%/4,5km/h). ~300 kcal cardio.',
      exercises:[
        ex('Développé couché barre',4,'8-10',null,90,'Descendre lentement, serrer en haut'),
        ex('Développé militaire',3,'10-12',null,90,'Gainage du tronc, pas de cambrure'),
        ex('Pec deck / Écarté',3,'12-15',null,60,'Étirement complet, squeeze en haut'),
        ex('Extension triceps poulie',3,'12-15',null,60,'Coudes fixes'),
        ex('Gainage planche',3,'45 sec',null,60,'Bassin neutre, respiration'),
        ex('Pont fessier',3,'15',null,60,'Serrer fessiers en haut, pause 1 sec'),
        ex('Tapis 5% / 4,5km/h',1,'45 min',null,0,'Cardio brûle-graisses post-séance'),
      ]},
    { day:'mercredi', name:'Repos — Marche active',      notes:'Récupération active. Marche 45-60 min.',
      exercises:[ex('Marche extérieure',1,'45-60 min',null,0,'Récupération — rythme tranquille')] },
    { day:'jeudi',    name:'Séance B — Pull (6h30)',      notes:'Séance tirée. Tapis 45 min après (5%/4,5km/h). ~300 kcal cardio.',
      exercises:[
        ex('Tirage poulie haute',4,'10-12',null,90,'Poitrine vers la barre, coudes le long du corps'),
        ex('Rowing barre',4,'10-12',null,90,'Dos plat, coudes serrés'),
        ex('Curl biceps haltères',3,'12',null,60,'Pas de balancement, supination complète'),
        ex('Face pull',3,'15',null,60,'Tirage vers le visage, rotation externe'),
        ex('Gainage oblique',3,'30 sec',null,60,'Chaque côté — bassin aligné'),
        ex('Tapis 5% / 4,5km/h',1,'45 min',null,0,'Cardio brûle-graisses post-séance'),
      ]},
    { day:'vendredi', name:'Repos — Marche active',      notes:'3e marche. Creuse le déficit avant samedi.',
      exercises:[ex('Marche extérieure',1,'45-60 min',null,0,'Récupération — préparer la séance samedi')] },
    { day:'samedi',   name:'Séance C — Bas du corps (6h30)', notes:'Grande séance jambes. Tapis 45 min après. ~300 kcal cardio.',
      exercises:[
        ex('Presse cuisses',4,'12-15',null,90,'Amplitude complète, genoux dans l\'axe'),
        ex('Leg curl allongé',3,'12-15',null,90,'Descente lente, pause en bas'),
        ex('Abducteurs machine',3,'15-20',null,60,'Mouvement contrôlé'),
        ex('Mollets à la presse',4,'15-20',null,60,'Descendre au max, monter sur pointe'),
        ex('Pont fessier',3,'15',null,60,'Pause 1 sec en haut, serrage fessiers'),
        ex('Planche',3,'45 sec',null,60,'Gainage total'),
        ex('Tapis 5% / 4,5km/h',1,'45 min',null,0,'Cardio brûle-graisses post-séance'),
      ]},
    { day:'dimanche', name:'Repos complet — Recharge',   notes:'Repos total. 2100 kcal. Meal prep semaine. Balade optionnelle.',
      exercises:[ex('Balade tranquille (optionnel)',1,'30-45 min',null,0,'Pas d\'objectif — si l\'envie est là')] },
  ];

  // Plans : re-seeder si moins de 3 plans avec des exercices réels
  const [[{ planCnt }]] = await db.query('SELECT COUNT(*) AS planCnt FROM training_plans');
  let needPlans = planCnt < 3;
  if (!needPlans) {
    // vérifier que les exercises ne sont pas vides
    const [planRows] = await db.query('SELECT exercises FROM training_plans LIMIT 3');
    const hasEx = planRows.some(r => {
      const ex = parseExercises(r.exercises);
      return Array.isArray(ex) && ex.length > 1;
    });
    if (!hasEx) needPlans = true;
  }
  if (needPlans) {
    await db.query('DELETE FROM training_plans');
    for (const p of plans) {
      await db.query(
        'INSERT INTO training_plans (id,day_of_week,name,exercises,notes) VALUES (?,?,?,?,?)',
        [uid(), p.day, p.name, JSON.stringify(p.exercises), p.notes]
      );
    }
    console.log('Training plans insérés :', plans.length);
  }

  // Diet templates : upsert dans la table dédiée diet_templates
  for (const [dayKey, meals] of Object.entries(diets)) {
    await db.query(
      'INSERT INTO diet_templates (day_key, meals) VALUES (?,?) ON DUPLICATE KEY UPDATE meals=VALUES(meals)',
      [dayKey, JSON.stringify(meals)]
    );
  }
  console.log('Diet templates insérés :', Object.keys(diets).length);
}

// ── Start ──────────────────────────────────────────────────────────────────
app.listen(PORT, () => console.log(`Sport API listening on port ${PORT}`));
