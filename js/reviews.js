/* global AUTH, BenchAPI, generateId, getUrlParam */

AUTH.onReady(function () {
  'use strict';

  const benchId = getUrlParam('id');
  const form    = document.getElementById('review-form');
  if (!form) return;

  let selectedRating = 0;
  const stars = document.querySelectorAll('.review-star');

  stars.forEach(star => {
    const val = parseInt(star.dataset.value);
    star.addEventListener('click', () => { selectedRating = val; paint(); });
    star.addEventListener('mouseenter', () =>
      stars.forEach(s => s.classList.toggle('on', parseInt(s.dataset.value) <= val)));
    star.addEventListener('mouseleave', () => paint());
  });

  function paint() {
    stars.forEach(s =>
      s.classList.toggle('on', parseInt(s.dataset.value) <= selectedRating));
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!selectedRating) { showErr('Choisissez une note en étoiles.'); return; }

    const btn = form.querySelector('[type="submit"]');
    btn.disabled    = true;
    btn.textContent = 'Publication…';

    try {
      await BenchAPI.addReview(benchId, {
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
      await renderReviews();
      document.getElementById('reviews-list').scrollIntoView({ behavior: 'smooth' });
    } catch {
      showErr('Erreur lors de la publication. Réessayez.');
    } finally {
      btn.disabled    = false;
      btn.textContent = "Publier l'avis ★";
    }
  });

  function showErr(msg) {
    const el = document.getElementById('review-error');
    el.textContent = msg;
    el.hidden      = false;
  }
});
