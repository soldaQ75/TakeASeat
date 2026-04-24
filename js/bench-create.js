(function () {
  'use strict';

  // ── Auth : redirige si non connecté ──────────────────────────────────────────

  if (!AUTH.isLoggedIn()) {
    const returnUrl = encodeURIComponent(window.location.href);
    window.location.href = `auth.html?return=${returnUrl}`;
    return;
  }

  updateHeaderAuth({ authPath: 'auth.html', homeUrl: '../index.html' });

  // ── Location ──────────────────────────────────────────────────────────────────

  const loc = JSON.parse(sessionStorage.getItem('pendingBenchLocation') || 'null');
  if (!loc) { window.location.href = '../index.html'; return; }

  document.getElementById('location-display').textContent =
    `${loc.lat.toFixed(5)}, ${loc.lng.toFixed(5)}`;

  // Afficher le pseudo de l'auteur (non modifiable)
  document.getElementById('author-name').textContent = AUTH.getUsername();

  // ── Notation ──────────────────────────────────────────────────────────────────

  const scores = { ambiance: 0, comfort: 0, design: 0, originality: 0 };

  ['ambiance', 'comfort', 'design', 'originality'].forEach(key => {
    const slider  = document.getElementById(`score-${key}`);
    const display = document.getElementById(`score-${key}-value`);
    slider.addEventListener('input', () => {
      scores[key]      = parseFloat(slider.value);
      display.textContent = scores[key].toFixed(1);
      updateTotal();
    });
  });

  function updateTotal() {
    const total = scores.ambiance + scores.comfort + scores.design + scores.originality;
    const el    = document.getElementById('total-score');
    el.textContent = total.toFixed(1);
    el.className   = 'total-score-value ' + scoreBadgeClass(total);
  }

  // ── Photos ────────────────────────────────────────────────────────────────────

  const photos   = [];
  const dropZone = document.getElementById('photo-drop-zone');
  const fileInput = document.getElementById('photo-input');
  const grid     = document.getElementById('photo-grid');
  const countEl  = document.getElementById('photo-count');

  dropZone.addEventListener('click', () => fileInput.click());
  dropZone.addEventListener('dragover', (e) => { e.preventDefault(); dropZone.classList.add('dragover'); });
  dropZone.addEventListener('dragleave', () => dropZone.classList.remove('dragover'));
  dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropZone.classList.remove('dragover');
    handleFiles([...e.dataTransfer.files]);
  });
  fileInput.addEventListener('change', () => { handleFiles([...fileInput.files]); fileInput.value = ''; });

  async function handleFiles(files) {
    const images = files.filter(f => f.type.startsWith('image/'));
    for (const f of images.slice(0, CONFIG.MAX_PHOTOS - photos.length)) {
      photos.push(await compressImage(f));
    }
    renderGrid();
  }

  function renderGrid() {
    grid.innerHTML = photos.map((src, i) => `
      <div class="photo-thumb">
        <img src="${src}" alt="Photo ${i + 1}">
        <button class="photo-remove" data-i="${i}" title="Supprimer">✕</button>
      </div>
    `).join('');
    countEl.textContent    = `${photos.length}/${CONFIG.MAX_PHOTOS} photos`;
    dropZone.style.display = photos.length >= CONFIG.MAX_PHOTOS ? 'none' : '';
  }

  grid.addEventListener('click', (e) => {
    const btn = e.target.closest('.photo-remove');
    if (!btn) return;
    photos.splice(parseInt(btn.dataset.i), 1);
    renderGrid();
  });

  // ── Soumission ────────────────────────────────────────────────────────────────

  document.getElementById('bench-form').addEventListener('submit', (e) => {
    e.preventDefault();

    const comment = document.getElementById('bench-comment').value.trim();
    if (!comment) return showError('Ajoutez un commentaire décrivant le banc.');

    const total = scores.ambiance + scores.comfort + scores.design + scores.originality;
    const bench = {
      id:      generateId(),
      lat:     loc.lat,
      lng:     loc.lng,
      photos,
      scores:  {
        ambiance:    scores.ambiance,
        comfort:     scores.comfort,
        design:      scores.design,
        originality: scores.originality,
        total:       parseFloat(total.toFixed(1)),
      },
      comment,
      author:   AUTH.getUsername(),
      authorId: AUTH.getId(),
      createdAt: Date.now(),
      reviews:   [],
    };

    BenchAPI.save(bench);
    sessionStorage.removeItem('pendingBenchLocation');
    window.location.href = `bench-detail.html?id=${bench.id}&new=1`;
  });

  function showError(msg) {
    const el  = document.getElementById('form-error');
    el.textContent = msg;
    el.hidden      = false;
    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }
})();
