function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

function formatDate(ts) {
  return new Date(ts).toLocaleDateString('fr-FR', {
    year: 'numeric', month: 'long', day: 'numeric',
  });
}

function getUrlParam(name) {
  return new URLSearchParams(window.location.search).get(name);
}

function escapeHtml(str) {
  const d = document.createElement('div');
  d.textContent = str;
  return d.innerHTML;
}

function renderStarsHTML(rating, max = 5) {
  return Array.from({ length: max }, (_, i) =>
    `<span class="star ${i < Math.round(rating) ? 'filled' : ''}">★</span>`
  ).join('');
}

function scoreBadgeClass(score) {
  return score >= 7 ? 'high' : score >= 4 ? 'medium' : 'low';
}

function compressImage(file) {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ratio = Math.min(1, CONFIG.PHOTO_MAX_WIDTH / img.width);
        canvas.width = Math.round(img.width * ratio);
        canvas.height = Math.round(img.height * ratio);
        canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/jpeg', CONFIG.PHOTO_QUALITY));
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  });
}
