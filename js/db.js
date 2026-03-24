// ─── Cache in-memory + API sync ───────────────────────────────────────────────
const cache = {
  profile:  null,
  workouts: [],
  weights:  [],
  diet:     {}   // keyed by date string
};

const DEFAULT_PROFILE = {
  name: '', age: 25, gender: 'male',
  height: 175, weight: 75, activityLevel: 'moderate', goal: 'maintain'
};

const DB = {

  // ── Init : charge tout depuis l'API au démarrage ───────────────────────────
  async init() {
    try {
      const [profile, workouts, weights, todayDiet] = await Promise.all([
        fetch('/api/profile').then(r => r.json()),
        fetch('/api/workouts').then(r => r.json()),
        fetch('/api/weights').then(r => r.json()),
        fetch(`/api/diet/${this.today()}`).then(r => r.json()),
      ]);
      cache.profile  = this._normalizeProfile(profile);
      cache.workouts = workouts || [];
      cache.weights  = weights  || [];
      cache.diet[this.today()] = todayDiet;
    } catch (e) {
      console.warn('API indisponible, fallback localStorage', e);
      cache.profile  = JSON.parse(localStorage.getItem('profile'))  || { ...DEFAULT_PROFILE };
      cache.workouts = JSON.parse(localStorage.getItem('workouts')) || [];
      cache.weights  = JSON.parse(localStorage.getItem('weights'))  || [];
    }
  },

  _normalizeProfile(p) {
    if (!p) return { ...DEFAULT_PROFILE };
    return {
      name:          p.name          || DEFAULT_PROFILE.name,
      age:           p.age           || DEFAULT_PROFILE.age,
      gender:        p.gender        || DEFAULT_PROFILE.gender,
      height:        p.height        || DEFAULT_PROFILE.height,
      weight:        p.weight        || DEFAULT_PROFILE.weight,
      activityLevel: p.activityLevel || DEFAULT_PROFILE.activityLevel,
      goal:          p.goal          || DEFAULT_PROFILE.goal,
    };
  },

  // ── Profile ────────────────────────────────────────────────────────────────
  getProfile() {
    return cache.profile || { ...DEFAULT_PROFILE };
  },

  async saveProfile(data) {
    cache.profile = data;
    localStorage.setItem('profile', JSON.stringify(data));
    try {
      await fetch('/api/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
    } catch (e) { console.warn('Profile sync failed', e); }
  },

  // ── Workouts ───────────────────────────────────────────────────────────────
  getWorkouts() { return cache.workouts; },
  getWorkout(id) { return cache.workouts.find(w => w.id === id) || null; },

  async saveWorkout(w) {
    const idx = cache.workouts.findIndex(x => x.id === w.id);
    const isNew = idx < 0;
    if (isNew) cache.workouts.unshift(w); else cache.workouts[idx] = w;
    localStorage.setItem('workouts', JSON.stringify(cache.workouts));
    try {
      await fetch(isNew ? '/api/workouts' : `/api/workouts/${w.id}`, {
        method: isNew ? 'POST' : 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(w)
      });
    } catch (e) { console.warn('Workout sync failed', e); }
    return w;
  },

  async deleteWorkout(id) {
    cache.workouts = cache.workouts.filter(w => w.id !== id);
    localStorage.setItem('workouts', JSON.stringify(cache.workouts));
    try {
      await fetch(`/api/workouts/${id}`, { method: 'DELETE' });
    } catch (e) { console.warn('Delete workout failed', e); }
  },

  // ── Weights ────────────────────────────────────────────────────────────────
  getWeightEntries() {
    return [...cache.weights].sort((a, b) => new Date(a.date) - new Date(b.date));
  },

  async addWeight(entry) {
    const idx = cache.weights.findIndex(e => e.date === entry.date);
    if (idx >= 0) cache.weights[idx] = entry; else cache.weights.push(entry);
    localStorage.setItem('weights', JSON.stringify(cache.weights));
    try {
      await fetch('/api/weights', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(entry)
      });
    } catch (e) { console.warn('Weight sync failed', e); }
  },

  async deleteWeight(id) {
    cache.weights = cache.weights.filter(e => e.id !== id);
    localStorage.setItem('weights', JSON.stringify(cache.weights));
    try {
      await fetch(`/api/weights/${id}`, { method: 'DELETE' });
    } catch (e) { console.warn('Delete weight failed', e); }
  },

  // ── Diet ───────────────────────────────────────────────────────────────────
  getDietDay(date) {
    return cache.diet[date] || { meals: { breakfast: [], lunch: [], dinner: [], snack: [] } };
  },

  async fetchDietDay(date) {
    if (cache.diet[date]) return cache.diet[date];
    try {
      const data = await fetch(`/api/diet/${date}`).then(r => r.json());
      cache.diet[date] = data;
      return data;
    } catch {
      return { meals: { breakfast: [], lunch: [], dinner: [], snack: [] } };
    }
  },

  async saveDietDay(date, data) {
    cache.diet[date] = data;
    try {
      await fetch(`/api/diet/${date}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
    } catch (e) { console.warn('Diet sync failed', e); }
  },

  // ── Utils ──────────────────────────────────────────────────────────────────
  uid()   { return Date.now().toString(36) + Math.random().toString(36).slice(2); },
  today() { return new Date().toISOString().slice(0, 10); }
};

export default DB;
