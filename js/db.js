// ─── Data Layer ──────────────────────────────────────────────────────────────

const DB = {
  get(key) {
    try { return JSON.parse(localStorage.getItem(key)) || null; } catch { return null; }
  },
  set(key, val) {
    localStorage.setItem(key, JSON.stringify(val));
  },

  // ── Profile ────────────────────────────────────────────────────────────────
  getProfile() {
    return this.get('profile') || {
      name: '', age: 25, gender: 'male',
      height: 175, weight: 75, activityLevel: 'moderate', goal: 'maintain'
    };
  },
  saveProfile(data) { this.set('profile', data); },

  // ── Workouts ───────────────────────────────────────────────────────────────
  getWorkouts() { return this.get('workouts') || []; },
  saveWorkout(w) {
    const list = this.getWorkouts();
    const idx = list.findIndex(x => x.id === w.id);
    if (idx >= 0) list[idx] = w; else list.unshift(w);
    this.set('workouts', list);
    return w;
  },
  deleteWorkout(id) {
    this.set('workouts', this.getWorkouts().filter(w => w.id !== id));
  },
  getWorkout(id) { return this.getWorkouts().find(w => w.id === id) || null; },

  // ── Weight ─────────────────────────────────────────────────────────────────
  getWeightEntries() {
    return (this.get('weights') || []).sort((a, b) => new Date(a.date) - new Date(b.date));
  },
  addWeight(entry) {
    const list = this.get('weights') || [];
    const existing = list.findIndex(e => e.date === entry.date);
    if (existing >= 0) list[existing] = entry; else list.push(entry);
    this.set('weights', list);
  },
  deleteWeight(id) {
    this.set('weights', (this.get('weights') || []).filter(e => e.id !== id));
  },

  // ── Diet ───────────────────────────────────────────────────────────────────
  getDietDay(date) {
    const all = this.get('diet') || {};
    return all[date] || { meals: { breakfast: [], lunch: [], dinner: [], snack: [] } };
  },
  saveDietDay(date, data) {
    const all = this.get('diet') || {};
    all[date] = data;
    this.set('diet', all);
  },

  // ── Utils ──────────────────────────────────────────────────────────────────
  uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2); },
  today() { return new Date().toISOString().slice(0, 10); }
};

export default DB;
