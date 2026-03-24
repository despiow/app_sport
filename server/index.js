require('dotenv/config');
const express = require('express');
const cors    = require('cors');
const { createPool } = require('./db');

const app  = express();
const PORT = process.env.PORT || 4000;
const db   = createPool();

app.use(cors());
app.use(express.json({ limit: '2mb' }));

// ── Helpers ────────────────────────────────────────────────────────────────
const wrap = fn => (req, res) => fn(req, res).catch(e => {
  console.error(e);
  res.status(500).json({ error: e.message });
});

// ── Health ─────────────────────────────────────────────────────────────────
app.get('/health', wrap(async (_req, res) => {
  const [rows] = await db.query('SELECT 1 AS ok');
  res.json({ ok: true, db: rows[0]?.ok === 1 });
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

// ── Start ──────────────────────────────────────────────────────────────────
app.listen(PORT, () => console.log(`Sport API listening on port ${PORT}`));
