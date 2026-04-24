(function () {
  'use strict';

  if (!AUTH.isSuperAdmin()) {
    window.location.href = '../index.html';
    return;
  }

  updateHeaderAuth({ authPath: 'auth.html', homeUrl: '../index.html' });

  const ROLE_LABEL = { admin: '👑 Super Admin', moderator: '🛡️ Modérateur', user: '👤 Utilisateur' };
  const ROLE_CLASS = { admin: 'role-badge-admin', moderator: 'role-badge-mod', user: 'role-badge-user' };

  function render() {
    const me   = AUTH.getId();
    const users = AUTH.getUsers().sort((a, b) => {
      const order = { admin: 0, moderator: 1, user: 2 };
      return (order[a.role] - order[b.role]) || a.username.localeCompare(b.username);
    });

    const list = document.getElementById('user-list');

    if (!users.length) {
      list.innerHTML = '<p class="muted">Aucun utilisateur.</p>';
      return;
    }

    list.innerHTML = users.map(u => {
      const isMe        = u.id === me;
      const isSuperAdmin = u.role === 'admin';

      let actionBtn = '';
      if (!isSuperAdmin && !isMe) {
        if (u.role === 'user') {
          actionBtn = `<button class="btn btn-secondary btn-sm" data-id="${u.id}" data-action="promote">
            🛡️ Promouvoir modérateur
          </button>`;
        } else {
          actionBtn = `<button class="btn btn-danger btn-sm" data-id="${u.id}" data-action="revoke">
            Révoquer
          </button>`;
        }
      } else if (isSuperAdmin) {
        actionBtn = `<span style="font-size:.75rem;color:var(--muted);">non modifiable</span>`;
      }

      return `
        <div class="user-row">
          <div class="user-row-info">
            <div class="user-row-name">${escapeHtml(u.username)}${isMe ? ' <span style="color:var(--muted);font-weight:400;font-size:.8rem;">(vous)</span>' : ''}</div>
            <div class="user-row-date">Inscrit le ${formatDate(u.createdAt)}</div>
          </div>
          <span class="role-badge ${ROLE_CLASS[u.role]}">${ROLE_LABEL[u.role]}</span>
          ${actionBtn}
        </div>
      `;
    }).join('');

    list.querySelectorAll('[data-action]').forEach(btn => {
      btn.addEventListener('click', () => {
        const { id, action } = btn.dataset;
        const u = AUTH.getUsers().find(u => u.id === id);
        if (!u) return;

        if (action === 'promote') {
          if (!confirm(`Promouvoir « ${u.username} » en modérateur ?\nIl pourra supprimer des bancs et des avis.`)) return;
          AUTH.setRole(id, 'moderator');
        } else {
          if (!confirm(`Révoquer les droits de modérateur de « ${u.username} » ?`)) return;
          AUTH.setRole(id, 'user');
        }
        render();
      });
    });
  }

  render();
})();
