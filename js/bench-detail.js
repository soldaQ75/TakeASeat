(function () {
  'use strict';

  const benchId = getUrlParam('id');
  if (!benchId) { window.location.href = '../index.html'; return; }

  const bench = BenchAPI.getById(benchId);
  if (!bench) {
    document.getElementById('content').innerHTML =
      '<div class="alert alert-error" style="margin:2rem auto;max-width:600px;">Banc introuvable. <a href="../index.html">Retour à la carte</a></div>';
    return;
  }

  // ── Header auth ────────────────────────────────────────────────────────────────

  updateHeaderAuth({ authPath: 'auth.html', homeUrl: '../index.html' });

  // ── Bannière succès ────────────────────────────────────────────────────────────

  if (getUrlParam('new') === '1') {
    document.getElementById('success-banner').hidden = false;
  }

  // ── Zone admin ─────────────────────────────────────────────────────────────────

  if (AUTH.isAdmin()) {
    document.getElementById('admin-bench-bar').hidden = false;

    // ── Suppression ────────────────────────────────────────────────────────────
    document.getElementById('btn-delete-bench').addEventListener('click', () => {
      if (confirm(`Supprimer définitivement ce banc ?\n"${bench.comment.slice(0, 60)}…"`)) {
        BenchAPI.delete(benchId);
        window.location.href = '../index.html';
      }
    });

    // ── Édition ────────────────────────────────────────────────────────────────

    let editPhotos = [];

    const editModal    = document.getElementById('edit-modal');
    const editDropZone = document.getElementById('photo-drop-zone');
    const editFileInput= document.getElementById('photo-input');
    const editGrid     = document.getElementById('photo-grid');
    const editCountEl  = document.getElementById('photo-count');
    const editErr      = document.getElementById('edit-error');

    function openEditModal() {
      const b = BenchAPI.getById(benchId);
      editPhotos = [...(b.photos || [])];

      ['ambiance', 'comfort', 'design', 'originality'].forEach(key => {
        const sl = document.getElementById(`score-${key}`);
        sl.value = b.scores[key];
        document.getElementById(`score-${key}-value`).textContent = b.scores[key].toFixed(1);
      });
      updateEditTotal();

      document.getElementById('edit-comment').value = b.comment;
      editErr.hidden = true;
      renderEditGrid();
      editModal.hidden = false;
    }

    function closeEditModal() { editModal.hidden = true; }

    function updateEditTotal() {
      const total = ['ambiance', 'comfort', 'design', 'originality'].reduce(
        (s, key) => s + parseFloat(document.getElementById(`score-${key}`).value), 0);
      const el = document.getElementById('edit-total-score');
      el.textContent = total.toFixed(1);
      el.className   = 'total-score-value ' + scoreBadgeClass(total);
    }

    function renderEditGrid() {
      editGrid.innerHTML = editPhotos.map((src, i) => `
        <div class="photo-thumb">
          <img src="${src}" alt="Photo ${i + 1}">
          <button class="photo-remove" data-i="${i}" title="Supprimer">✕</button>
        </div>
      `).join('');
      editCountEl.textContent    = `${editPhotos.length}/${CONFIG.MAX_PHOTOS} photos`;
      editDropZone.style.display = editPhotos.length >= CONFIG.MAX_PHOTOS ? 'none' : '';
    }

    async function handleEditFiles(files) {
      const images = files.filter(f => f.type.startsWith('image/'));
      for (const f of images.slice(0, CONFIG.MAX_PHOTOS - editPhotos.length)) {
        editPhotos.push(await compressImage(f));
      }
      renderEditGrid();
    }

    document.getElementById('btn-edit-bench').addEventListener('click', openEditModal);
    document.getElementById('btn-edit-close').addEventListener('click', closeEditModal);
    document.getElementById('btn-edit-cancel').addEventListener('click', closeEditModal);

    editModal.addEventListener('click', (e) => { if (e.target === editModal) closeEditModal(); });

    ['ambiance', 'comfort', 'design', 'originality'].forEach(key => {
      document.getElementById(`score-${key}`).addEventListener('input', () => {
        document.getElementById(`score-${key}-value`).textContent =
          parseFloat(document.getElementById(`score-${key}`).value).toFixed(1);
        updateEditTotal();
      });
    });

    editDropZone.addEventListener('click', () => editFileInput.click());
    editDropZone.addEventListener('dragover', (e) => { e.preventDefault(); editDropZone.classList.add('dragover'); });
    editDropZone.addEventListener('dragleave', () => editDropZone.classList.remove('dragover'));
    editDropZone.addEventListener('drop', (e) => {
      e.preventDefault();
      editDropZone.classList.remove('dragover');
      handleEditFiles([...e.dataTransfer.files]);
    });
    editFileInput.addEventListener('change', () => { handleEditFiles([...editFileInput.files]); editFileInput.value = ''; });

    editGrid.addEventListener('click', (e) => {
      const btn = e.target.closest('.photo-remove');
      if (!btn) return;
      editPhotos.splice(parseInt(btn.dataset.i), 1);
      renderEditGrid();
    });

    document.getElementById('btn-edit-save').addEventListener('click', () => {
      const comment = document.getElementById('edit-comment').value.trim();
      if (!comment) {
        editErr.textContent = 'Le commentaire ne peut pas être vide.';
        editErr.hidden = false;
        return;
      }
      const b = BenchAPI.getById(benchId);
      b.photos  = editPhotos;
      b.comment = comment;
      ['ambiance', 'comfort', 'design', 'originality'].forEach(key => {
        b.scores[key] = parseFloat(document.getElementById(`score-${key}`).value);
      });
      const total = b.scores.ambiance + b.scores.comfort + b.scores.design + b.scores.originality;
      b.scores.total = parseFloat(total.toFixed(1));
      BenchAPI.save(b);
      location.reload();
    });
  }

  // ── Galerie ────────────────────────────────────────────────────────────────────

  const gallery = document.getElementById('bench-gallery');
  if (bench.photos && bench.photos.length > 0) {
    let cur = 0;

    function updateGallery(idx) {
      cur = idx;
      document.getElementById('gallery-main-img').src = bench.photos[idx];
      gallery.querySelectorAll('.gallery-thumb').forEach((t, i) =>
        t.classList.toggle('active', i === idx));
    }

    gallery.innerHTML = `
      <div class="gallery-main">
        <img id="gallery-main-img" src="${bench.photos[0]}" alt="Photo principale">
        ${bench.photos.length > 1 ? `
          <button class="gallery-nav prev" id="gallery-prev">‹</button>
          <button class="gallery-nav next" id="gallery-next">›</button>
        ` : ''}
      </div>
      ${bench.photos.length > 1 ? `
        <div class="gallery-thumbs">
          ${bench.photos.map((src, i) => `
            <img class="gallery-thumb ${i === 0 ? 'active' : ''}" src="${src}"
                 data-idx="${i}" alt="Photo ${i + 1}">
          `).join('')}
        </div>
      ` : ''}
    `;

    gallery.querySelectorAll('.gallery-thumb').forEach(t =>
      t.addEventListener('click', () => updateGallery(parseInt(t.dataset.idx))));

    const prev = document.getElementById('gallery-prev');
    const next = document.getElementById('gallery-next');
    if (prev) {
      prev.addEventListener('click', () => updateGallery((cur - 1 + bench.photos.length) % bench.photos.length));
      next.addEventListener('click', () => updateGallery((cur + 1) % bench.photos.length));
    }
  } else {
    gallery.innerHTML = '<div class="no-photo-placeholder">📷 Pas de photo</div>';
  }

  // ── Score ──────────────────────────────────────────────────────────────────────

  const criteria = [
    { label: 'Ambiance',    key: 'ambiance',    max: 4, hint: 'Cadre, calme, végétation, vue…' },
    { label: 'Confort',     key: 'comfort',     max: 4, hint: 'Dossier, dureté, largeur, accoudoirs…' },
    { label: 'Design',      key: 'design',      max: 1, hint: 'Ergonomie, chaleur au soleil…' },
    { label: 'Originalité', key: 'originality', max: 1, hint: 'Design & emplacement insolites' },
  ];

  document.getElementById('score-breakdown').innerHTML = criteria.map(c => `
    <div class="score-row">
      <div class="score-row-header">
        <span class="score-row-label">${c.label}</span>
        <span class="score-row-value">${bench.scores[c.key].toFixed(1)}<span class="score-max">/${c.max}</span></span>
      </div>
      <div class="score-bar-track">
        <div class="score-bar-fill" style="width:${(bench.scores[c.key] / c.max) * 100}%"></div>
      </div>
      <p class="score-row-hint">${c.hint}</p>
    </div>
  `).join('');

  const totalEl = document.getElementById('total-score');
  totalEl.textContent = bench.scores.total.toFixed(1);
  totalEl.className   = 'total-score-value ' + scoreBadgeClass(bench.scores.total);

  // ── Meta ───────────────────────────────────────────────────────────────────────

  document.getElementById('bench-author').textContent = bench.author;
  document.getElementById('bench-date').textContent   = formatDate(bench.createdAt);
  document.getElementById('bench-comment').textContent = bench.comment;
  document.getElementById('bench-coords').textContent  =
    `${bench.lat.toFixed(5)}, ${bench.lng.toFixed(5)}`;
  document.getElementById('bench-map-link').href =
    `https://www.google.com/maps?q=${bench.lat},${bench.lng}`;

  // ── Formulaire d'avis : affiché selon auth ─────────────────────────────────────

  const authReturnUrl = encodeURIComponent(window.location.href);
  if (AUTH.isLoggedIn()) {
    document.getElementById('review-form-card').hidden = false;
    document.getElementById('review-author-display').textContent = AUTH.getUsername();
  } else {
    document.getElementById('connect-cta').hidden      = false;
    document.getElementById('connect-cta-link').href   = `auth.html?return=${authReturnUrl}`;
  }

  // ── renderReviews (global pour reviews.js) ─────────────────────────────────────

  window.renderReviews = function () {
    const fresh   = BenchAPI.getById(benchId);
    const reviews = (fresh && fresh.reviews) || [];
    const list    = document.getElementById('reviews-list');
    const countEl = document.getElementById('reviews-count');
    const avgEl   = document.getElementById('reviews-avg');
    const isAdmin = AUTH.isAdmin();

    countEl.textContent = reviews.length;

    if (reviews.length) {
      const avg = reviews.reduce((s, r) => s + r.rating, 0) / reviews.length;
      avgEl.innerHTML =
        `<span class="stars-display">${renderStarsHTML(avg)}</span> <span class="avg-number">${avg.toFixed(1)}/5</span>`;
    } else {
      avgEl.innerHTML = '<span class="muted">—</span>';
    }

    if (!reviews.length) {
      list.innerHTML = '<p class="no-reviews">Soyez le premier à laisser un avis !</p>';
      return;
    }

    list.innerHTML = [...reviews].reverse().map(r => `
      <div class="review-card card">
        <div class="card-body">
          <div class="review-header">
            <div class="stars-display">${renderStarsHTML(r.rating)}</div>
            <div class="review-meta">
              <strong>${escapeHtml(r.author)}</strong>
              <span class="muted">${formatDate(r.createdAt)}</span>
            </div>
            ${isAdmin ? `
              <button class="btn-admin-delete" data-review-id="${r.id}" title="Supprimer cet avis">
                🗑 Supprimer
              </button>` : ''}
          </div>
          ${r.comment ? `<p class="review-comment">${escapeHtml(r.comment)}</p>` : ''}
        </div>
      </div>
    `).join('');

    // Boutons suppression admin
    list.querySelectorAll('.btn-admin-delete').forEach(btn => {
      btn.addEventListener('click', () => {
        if (confirm('Supprimer cet avis ?')) {
          BenchAPI.deleteReview(benchId, btn.dataset.reviewId);
          renderReviews();
        }
      });
    });
  };

  renderReviews();
})();
