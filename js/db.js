// ─── Cache in-memory + API sync ───────────────────────────────────────────────
const cache = {
  profile:       null,
  workouts:      [],
  weights:       [],
  diet:          {},   // keyed by date string
  dietTemplates: {},   // keyed by dayKey (lundi, mardi…)
  trainingPlans: [],
  perfLogs:      {}    // keyed by date string
};

const DEFAULT_PROFILE = {
  name: '', age: 25, gender: 'male',
  height: 175, weight: 75, activityLevel: 'moderate', goal: 'maintain'
};

// ── Fetch avec token d'auth ────────────────────────────────────────────────
async function _api(url, opts = {}) {
  const token = localStorage.getItem('sport_token');
  const res = await fetch(url, {
    ...opts,
    headers: {
      ...(opts.body ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
      ...opts.headers,
    }
  });
  if (res.status === 401) {
    localStorage.removeItem('sport_token');
    window.location.reload();
    throw new Error('Session expirée');
  }
  return res;
}

const DB = {

  // ── Init : charge tout depuis l'API au démarrage ───────────────────────────
  async init() {
    try {
      const [profile, workouts, weights, todayDiet, trainingPlans, perfLogs, dietTemplate] = await Promise.all([
        _api('/api/profile').then(r => r.json()),
        _api('/api/workouts').then(r => r.json()),
        _api('/api/weights').then(r => r.json()),
        _api(`/api/diet/${this.today()}`).then(r => r.json()),
        _api('/api/training-plans').then(r => r.json()),
        _api('/api/perf-logs').then(r => r.json()),
        _api('/api/diet-templates').then(r => r.json()),
      ]);
      cache.profile  = this._normalizeProfile(profile);
      cache.workouts = workouts || [];
      cache.weights  = weights  || [];
      cache.diet[this.today()] = todayDiet;
      cache.trainingPlans  = trainingPlans  || [];
      cache.perfLogs = {};
      (perfLogs || []).forEach(log => { cache.perfLogs[log.date] = log; });
      cache.dietTemplates = dietTemplates || {};
    } catch (e) {
      console.warn('API indisponible, fallback localStorage', e);
      cache.profile       = JSON.parse(localStorage.getItem('profile'))        || { ...DEFAULT_PROFILE };
      cache.workouts      = JSON.parse(localStorage.getItem('workouts'))       || [];
      cache.weights       = JSON.parse(localStorage.getItem('weights'))        || [];
      cache.trainingPlans = JSON.parse(localStorage.getItem('trainingPlans'))  || [];
      cache.perfLogs      = JSON.parse(localStorage.getItem('perfLogs'))       || {};
      cache.dietTemplates = JSON.parse(localStorage.getItem('dietTemplates')) || {};
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
      await _api('/api/profile', {
        method: 'PUT',
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
      await _api(isNew ? '/api/workouts' : `/api/workouts/${w.id}`, {
        method: isNew ? 'POST' : 'PUT',
        body: JSON.stringify(w)
      });
    } catch (e) { console.warn('Workout sync failed', e); }
    return w;
  },

  async deleteWorkout(id) {
    cache.workouts = cache.workouts.filter(w => w.id !== id);
    localStorage.setItem('workouts', JSON.stringify(cache.workouts));
    try {
      await _api(`/api/workouts/${id}`, { method: 'DELETE' });
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
      await _api('/api/weights', {
        method: 'POST',
        body: JSON.stringify(entry)
      });
    } catch (e) { console.warn('Weight sync failed', e); }
  },

  async deleteWeight(id) {
    cache.weights = cache.weights.filter(e => e.id !== id);
    localStorage.setItem('weights', JSON.stringify(cache.weights));
    try {
      await _api(`/api/weights/${id}`, { method: 'DELETE' });
    } catch (e) { console.warn('Delete weight failed', e); }
  },

  // ── Diet ───────────────────────────────────────────────────────────────────
  getDietDay(date) {
    return cache.diet[date] || { meals: { breakfast: [], lunch: [], dinner: [], snack: [] } };
  },

  async fetchDietDay(date) {
    if (cache.diet[date]) return cache.diet[date];
    try {
      const data = await _api(`/api/diet/${date}`).then(r => r.json());
      cache.diet[date] = data;
      return data;
    } catch {
      return { meals: { breakfast: [], lunch: [], dinner: [], snack: [] } };
    }
  },

  async saveDietDay(date, data) {
    cache.diet[date] = data;
    try {
      await _api(`/api/diet/${date}`, {
        method: 'PUT',
        body: JSON.stringify(data)
      });
    } catch (e) { console.warn('Diet sync failed', e); }
  },

  // ── Diet Templates (par jour) ───────────────────────────────────────────────
  _emptyMeals() { return { breakfast: [], lunch: [], dinner: [], snack: [] }; },
  getDietTemplate(dayKey) {
    return cache.dietTemplates[dayKey] || { meals: this._emptyMeals() };
  },
  getDietTemplates() { return cache.dietTemplates; },
  async saveDietTemplate(dayKey, data) {
    cache.dietTemplates[dayKey] = data;
    localStorage.setItem('dietTemplates', JSON.stringify(cache.dietTemplates));
    try {
      await _api(`/api/diet-template/${dayKey}`, { method: 'PUT', body: JSON.stringify(data) });
    } catch (e) { console.warn('Diet template sync failed', e); }
  },

  // ── Training Plans ─────────────────────────────────────────────────────────
  getTrainingPlans() { return cache.trainingPlans; },
  getTrainingPlan(dayOfWeek) {
    return cache.trainingPlans.find(p => p.day_of_week === dayOfWeek) || null;
  },

  async saveTrainingPlan(plan) {
    const idx = cache.trainingPlans.findIndex(p => p.id === plan.id);
    const isNew = idx < 0;
    if (isNew) cache.trainingPlans.push(plan); else cache.trainingPlans[idx] = plan;
    localStorage.setItem('trainingPlans', JSON.stringify(cache.trainingPlans));
    try {
      await _api(isNew ? '/api/training-plans' : `/api/training-plans/${plan.id}`, {
        method: isNew ? 'POST' : 'PUT',
        body: JSON.stringify(plan)
      });
    } catch (e) { console.warn('Training plan sync failed', e); }
    return plan;
  },

  async deleteTrainingPlan(id) {
    cache.trainingPlans = cache.trainingPlans.filter(p => p.id !== id);
    localStorage.setItem('trainingPlans', JSON.stringify(cache.trainingPlans));
    try {
      await _api(`/api/training-plans/${id}`, { method: 'DELETE' });
    } catch (e) { console.warn('Delete training plan failed', e); }
  },

  // ── Perf Logs ──────────────────────────────────────────────────────────────
  getPerfLog(date) { return cache.perfLogs[date] || null; },
  getAllPerfLogs()  { return cache.perfLogs; },

  async savePerfLog(date, log) {
    cache.perfLogs[date] = log;
    localStorage.setItem('perfLogs', JSON.stringify(cache.perfLogs));
    try {
      await _api(`/api/perf-logs/${date}`, {
        method: 'PUT',
        body: JSON.stringify(log)
      });
    } catch (e) { console.warn('Perf log sync failed', e); }
  },

  // ── Utils ──────────────────────────────────────────────────────────────────
  uid()   { return Date.now().toString(36) + Math.random().toString(36).slice(2); },
  today() { return new Date().toISOString().slice(0, 10); }
};

export default DB;
