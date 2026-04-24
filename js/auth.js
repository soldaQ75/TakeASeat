/* global generateId, escapeHtml */

const AUTH = (() => {
  const USERS_KEY   = 'lesBancs_users_v1';
  const SESSION_KEY = 'lesBancs_session_v1';

  // ── Hachage SHA-256 (Web Crypto) ──────────────────────────────────────────

  async function _hash(password) {
    const data = new TextEncoder().encode(`lesBancs::${password}`);
    const buf  = await crypto.subtle.digest('SHA-256', data);
    return Array.from(new Uint8Array(buf))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
  }

  // ── Stockage ──────────────────────────────────────────────────────────────

  function _getUsers() {
    try { return JSON.parse(localStorage.getItem(USERS_KEY) || '[]'); }
    catch { return []; }
  }

  function _saveUsers(u) { localStorage.setItem(USERS_KEY, JSON.stringify(u)); }

  function _setSession(user) {
    localStorage.setItem(SESSION_KEY, JSON.stringify({
      id: user.id, username: user.username, role: user.role,
    }));
  }

  // ── Init compte admin (une seule fois) ────────────────────────────────────

  (async () => {
    const users = _getUsers();
    if (users.some(u => u.role === 'admin')) return;
    users.push({
      id:           'root',
      username:     'Admin',
      passwordHash: await _hash('admin2025'),
      role:         'admin',
      createdAt:    Date.now(),
    });
    _saveUsers(users);
  })();

  // ── API publique ──────────────────────────────────────────────────────────

  return {
    async register(username, password) {
      username = username.trim();
      if (username.length < 3 || username.length > 20)
        throw new Error('Le pseudo doit faire entre 3 et 20 caractères.');
      if (!/^[a-zA-Z0-9_\-À-ÿ]+$/.test(username))
        throw new Error('Le pseudo ne peut contenir que des lettres, chiffres, - et _.');
      const users = _getUsers();
      if (users.some(u => u.username.toLowerCase() === username.toLowerCase()))
        throw new Error('Ce pseudo est déjà pris.');
      const user = {
        id:           generateId(),
        username,
        passwordHash: await _hash(password),
        role:         'user',
        createdAt:    Date.now(),
      };
      users.push(user);
      _saveUsers(users);
      _setSession(user);
      return user;
    },

    async login(username, password) {
      const users = _getUsers();
      const user  = users.find(u => u.username.toLowerCase() === username.trim().toLowerCase());
      if ((!user) || (await _hash(password) !== user.passwordHash)) throw new Error('Identitants incorrects.');
      _setSession(user);
      return user;
    },

    logout() { localStorage.removeItem(SESSION_KEY); },

    getSession() {
      try { return JSON.parse(localStorage.getItem(SESSION_KEY) || 'null'); }
      catch { return null; }
    },

    isLoggedIn()   { return !!this.getSession(); },
    isAdmin()      { const s = this.getSession(); return !!(s && (s.role === 'admin' || s.role === 'moderator')); },
    isSuperAdmin() { const s = this.getSession(); return !!(s && s.role === 'admin'); },
    getUsername()  { const s = this.getSession(); return s ? s.username : null; },
    getId()        { const s = this.getSession(); return s ? s.id : null; },

    getUsers() {
      return _getUsers().map(({ id, username, role, createdAt }) => ({ id, username, role, createdAt }));
    },

    setRole(userId, newRole) {
      const users = _getUsers();
      const u = users.find(u => u.id === userId);
      if (!u || u.role === 'admin') return;
      u.role = newRole;
      _saveUsers(users);
    },
  };
})();

// ── Mise à jour du header selon l'état d'auth ─────────────────────────────────

function updateHeaderAuth(opts = {}) {
  const slot = document.getElementById('header-auth-slot');
  if (!slot) return;

  const session = AUTH.getSession();
  const authHref = opts.authPath || 'pages/auth.html';
  const returnTo = encodeURIComponent(window.location.href);

  if (session) {
    const isSuper = session.role === 'admin';
    const isMod   = session.role === 'moderator';
    const badgeClass = isSuper ? ' user-badge-admin' : (isMod ? ' user-badge-mod' : '');
    const icon       = isSuper ? '👑' : (isMod ? '🛡️' : '👤');
    const adminHref  = authHref.replace('auth.html', 'admin.html');
    const panelBtn   = isSuper
      ? `<a class="btn btn-secondary btn-sm" href="${adminHref}">Panel</a>`
      : '';
    slot.innerHTML = `
      <div class="user-badge${badgeClass}">
        <span>${icon}</span>
        <span class="user-badge-name">${escapeHtml(session.username)}</span>
      </div>
      ${panelBtn}
      <button class="btn btn-secondary btn-sm" id="btn-logout">Déconnexion</button>
    `;
    document.getElementById('btn-logout').addEventListener('click', () => {
      AUTH.logout();
      window.location.href = opts.homeUrl || 'index.html';
    });
  } else {
    slot.innerHTML = `
      <a class="btn btn-primary btn-sm" href="${authHref}?return=${returnTo}">
        Se connecter
      </a>
    `;
  }
}
