/* global firebase, db, fbAuth, escapeHtml */

const AUTH = (() => {
  let _user    = null; // Firebase user
  let _doc     = null; // Firestore user document
  let _ready   = false;
  let _waiters = [];

  fbAuth.onAuthStateChanged(async (firebaseUser) => {
    if (firebaseUser) {
      _user = firebaseUser;
      const snap = await db.collection('users').doc(firebaseUser.uid).get();
      _doc = snap.exists ? snap.data() : null;
    } else {
      _user = null;
      _doc  = null;
    }
    if (!_ready) {
      _ready = true;
      _waiters.forEach(cb => cb());
      _waiters = [];
    }
  });

  return {
    // Appelle cb() dès que l'état d'auth est connu (restauration de session incluse)
    onReady(cb) {
      if (_ready) { cb(); return; }
      _waiters.push(cb);
    },

    isLoggedIn()   { return !!_user; },
    isAdmin()      { return !!(_doc && (_doc.role === 'admin' || _doc.role === 'moderator')); },
    isSuperAdmin() { return !!(_doc && _doc.role === 'admin'); },
    getUsername()  { return _doc ? _doc.username : null; },
    getId()        { return _user ? _user.uid : null; },

    async register(username, password) {
      username = username.trim();
      if (username.length < 3 || username.length > 20)
        throw new Error('Le pseudo doit faire entre 3 et 20 caractères.');
      if (!/^[a-zA-Z0-9_\-À-ÿ]+$/.test(username))
        throw new Error('Le pseudo ne peut contenir que des lettres, chiffres, - et _.');

      const existing = await db.collection('users')
        .where('username_lc', '==', username.toLowerCase()).get();
      if (!existing.empty) throw new Error('Ce pseudo est déjà pris.');

      const isFirst = (await db.collection('users').limit(1).get()).empty;
      const email   = `${username.toLowerCase()}@lesbancs.app`;

      let cred;
      try {
        cred = await fbAuth.createUserWithEmailAndPassword(email, password);
      } catch (e) {
        if (e.code === 'auth/weak-password')
          throw new Error('Le mot de passe doit faire au moins 6 caractères.');
        throw new Error('Erreur lors de la création du compte.');
      }

      const userDoc = {
        id:          cred.user.uid,
        username,
        username_lc: username.toLowerCase(),
        role:        isFirst ? 'admin' : 'user',
        createdAt:   Date.now(),
      };
      await db.collection('users').doc(cred.user.uid).set(userDoc);
      _user = cred.user;
      _doc  = userDoc;
      return userDoc;
    },

    async login(username, password) {
      const email = `${username.trim().toLowerCase()}@lesbancs.app`;
      try {
        const cred = await fbAuth.signInWithEmailAndPassword(email, password);
        const snap = await db.collection('users').doc(cred.user.uid).get();
        _user = cred.user;
        _doc  = snap.exists ? snap.data() : null;
        return _doc;
      } catch {
        throw new Error('Identifiants incorrects.');
      }
    },

    async logout() {
      await fbAuth.signOut();
      _user = null;
      _doc  = null;
    },

    async getUsers() {
      const snap = await db.collection('users').orderBy('createdAt').get();
      return snap.docs.map(d => {
        const u = d.data();
        return { id: u.id, username: u.username, role: u.role, createdAt: u.createdAt };
      });
    },

    async setRole(userId, newRole) {
      const snap = await db.collection('users').doc(userId).get();
      if (!snap.exists || snap.data().role === 'admin') return;
      await db.collection('users').doc(userId).update({ role: newRole });
    },
  };
})();

// ── Header auth ───────────────────────────────────────────────────────────────

function updateHeaderAuth(opts = {}) {
  const slot = document.getElementById('header-auth-slot');
  if (!slot) return;

  const authHref = opts.authPath || 'pages/auth.html';
  const returnTo = encodeURIComponent(window.location.href);

  if (AUTH.isLoggedIn()) {
    const isSuper    = AUTH.isSuperAdmin();
    const isMod      = AUTH.isAdmin() && !isSuper;
    const badgeClass = isSuper ? ' user-badge-admin' : (isMod ? ' user-badge-mod' : '');
    const icon       = isSuper ? '👑' : (isMod ? '🛡️' : '👤');
    const adminHref  = authHref.replace('auth.html', 'admin.html');
    const panelBtn   = isSuper
      ? `<a class="btn btn-secondary btn-sm" href="${adminHref}">Panel</a>`
      : '';
    slot.innerHTML = `
      <div class="user-badge${badgeClass}">
        <span>${icon}</span>
        <span class="user-badge-name">${escapeHtml(AUTH.getUsername())}</span>
      </div>
      ${panelBtn}
      <button class="btn btn-secondary btn-sm" id="btn-logout">Déconnexion</button>
    `;
    document.getElementById('btn-logout').addEventListener('click', async () => {
      await AUTH.logout();
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
