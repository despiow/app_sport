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

// ── Diet Template ──────────────────────────────────────────────────────────
app.get('/api/diet-template', wrap(async (_req, res) => {
  const [rows] = await db.query('SELECT * FROM diet_days WHERE date = "template"');
  if (rows[0]) {
    res.json({ meals: rows[0].meals });
  } else {
    res.json({ meals: { breakfast: [], lunch: [], dinner: [], snack: [] } });
  }
}));

app.put('/api/diet-template', wrap(async (req, res) => {
  const { meals } = req.body;
  await db.query(
    `INSERT INTO diet_days (date, meals) VALUES ("template", ?)
     ON DUPLICATE KEY UPDATE meals=VALUES(meals)`,
    [JSON.stringify(meals)]
  );
  res.json({ ok: true });
}));

// ── Diet ───────────────────────────────────────────────────────────────────
app.get('/api/diet/:date', wrap(async (req, res) => {
  const [rows] = await db.query('SELECT * FROM diet_days WHERE date=?', [req.params.date]);
  if (rows[0]) {
    res.json({ date: rows[0].date, meals: rows[0].meals });
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
app.get('/api/training-plans', wrap(async (_req, res) => {
  const [rows] = await db.query('SELECT * FROM training_plans ORDER BY created_at ASC');
  res.json(rows.map(r => ({ ...r, exercises: r.exercises || [] })));
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
  res.json(rows.map(r => ({ ...r, exercises_done: r.exercises_done || [] })));
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
      exercises JSON,
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
      exercises_done JSON,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_perf_date (date)
    )`);
    console.log('Migration training_plans / perf_logs OK');
  } catch (e) {
    console.error('Migration tables:', e.message);
  }
})();

// ── Start ──────────────────────────────────────────────────────────────────
app.listen(PORT, () => console.log(`Sport API listening on port ${PORT}`));
