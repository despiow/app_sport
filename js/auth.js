// ─── Module Auth ──────────────────────────────────────────────────────────────
const TOKEN_KEY = 'sport_token';

const Auth = {
  getToken()  { return localStorage.getItem(TOKEN_KEY); },
  setToken(t) { localStorage.setItem(TOKEN_KEY, t); },
  clearToken(){ localStorage.removeItem(TOKEN_KEY); },

  // Vérifie localement l'expiration sans appel réseau
  isTokenValid() {
    const t = this.getToken();
    if (!t) return false;
    try {
      const [payload] = t.split('.');
      const b64 = payload.replace(/-/g, '+').replace(/_/g, '/');
      const pad = b64 + '='.repeat((4 - b64.length % 4) % 4);
      const { exp } = JSON.parse(atob(pad));
      return exp > Date.now();
    } catch { return false; }
  },

  async hasPIN() {
    try {
      const r = await fetch('/api/auth/check');
      const d = await r.json();
      return d.hasPIN === true;
    } catch { return false; }
  },

  async login(pin) {
    const r = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pin })
    });
    if (!r.ok) throw new Error((await r.json()).error || 'Erreur de connexion');
    const { token } = await r.json();
    this.setToken(token);
  },

  async setup(pin) {
    const r = await fetch('/api/auth/setup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pin })
    });
    if (!r.ok) throw new Error((await r.json()).error || 'Erreur de configuration');
    const { token } = await r.json();
    this.setToken(token);
  },

  async changePin(oldPin, newPin) {
    const r = await fetch('/api/auth/change-pin', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.getToken() || ''}`
      },
      body: JSON.stringify({ oldPin, newPin })
    });
    if (!r.ok) throw new Error((await r.json()).error || 'Erreur');
    const { token } = await r.json();
    this.setToken(token);
  },

  logout() {
    this.clearToken();
    window.location.reload();
  }
};

export default Auth;
