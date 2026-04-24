(function () {
  'use strict';

  const benchId = getUrlParam('id');

  // Formulaire absent si non connecté
  const form = document.getElementById('review-form');
  if (!form) return;

  let selectedRating = 0;
  const stars = document.querySelectorAll('.review-star');

  stars.forEach(star => {
    const val = parseInt(star.dataset.value);

    star.addEventListener('click', () => {
      selectedRating = val;
      paint();
    });

    star.addEventListener('mouseenter', () =>
      stars.forEach(s => s.classList.toggle('on', parseInt(s.dataset.value) <= val)));

    star.addEventListener('mouseleave', () => paint());
  });

  function paint() {
    stars.forEach(s =>
      s.classList.toggle('on', parseInt(s.dataset.value) <= selectedRating));
  }

  // ── Soumission ────────────────────────────────────────────────────────────

  form.addEventListener('submit', (e) => {
    e.preventDefault();

    if (!selectedRating) {
      showErr('Choisissez une note en étoiles.');
      return;
    }

    BenchAPI.addReview(benchId, {
      id:        generateId(),
      benchId,
      rating:    selectedRating,
      comment:   document.getElementById('review-comment').value.trim(),
      author:    AUTH.getUsername(),
      authorId:  AUTH.getId(),
      createdAt: Date.now(),
    });

    selectedRating = 0;
    paint();
    form.reset();
    document.getElementById('review-error').hidden = true;

    renderReviews();
    document.getElementById('reviews-list').scrollIntoView({ behavior: 'smooth' });
  });

  function showErr(msg) {
    const el = document.getElementById('review-error');
    el.textContent = msg;
    el.hidden      = false;
  }
})();
