/* global Cesium, CONFIG, BenchAPI, escapeHtml, formatDate, renderStarsHTML, scoreBadgeClass */

// Désactive toute requête Cesium Ion
Cesium.Ion.defaultAccessToken = undefined;

// ── Viewer ────────────────────────────────────────────────────────────────────

const viewer = new Cesium.Viewer('map', {
  // Terrain plat (sans Ion, sans token)
  terrainProvider:      new Cesium.EllipsoidTerrainProvider(),
  baseLayerPicker:      false,
  geocoder:             false,
  homeButton:           false,
  sceneModePicker:      false,
  navigationHelpButton: false,
  animation:            false,
  timeline:             false,
  fullscreenButton:     false,
  infoBox:              false,
  selectionIndicator:   false,
  skyBox:               false,   // fond noir pur
  skyAtmosphere:        false,
});

// Apparence du globe
viewer.scene.backgroundColor             = Cesium.Color.BLACK;
viewer.scene.globe.baseColor             = new Cesium.Color(0.04, 0.04, 0.10, 1);
viewer.scene.globe.enableLighting        = false;
viewer.scene.globe.showGroundAtmosphere  = false;

// Limites de zoom (80 m → 30 000 km)
viewer.scene.screenSpaceCameraController.minimumZoomDistance = 80;
viewer.scene.screenSpaceCameraController.maximumZoomDistance = 3e7;

// ── Imagery : Google satellite (sans clé) → Esri fallback ────────────────────

viewer.imageryLayers.removeAll();

// Tuiles satellite Google Maps – accès public, sans clé API
// (identique visuellement à Google Maps satellite)
const googleLayer = viewer.imageryLayers.addImageryProvider(
  new Cesium.UrlTemplateImageryProvider({
    url:          'https://mt{s}.google.com/vt/lyrs=s&x={x}&y={y}&z={z}',
    subdomains:   ['0', '1', '2', '3'],
    credit:       '© Google Maps',
    maximumLevel: 20,
    minimumLevel: 0,
  })
);

// Si Google refuse la requête → Esri World Imagery en secours
googleLayer.imageryProvider.errorEvent.addEventListener(() => {
  viewer.imageryLayers.remove(googleLayer);
  viewer.imageryLayers.addImageryProvider(
    new Cesium.UrlTemplateImageryProvider({
      url:          'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
      credit:       '© Esri – Maxar, Earthstar Geographics',
      maximumLevel: 19,
      minimumLevel: 0,
    })
  );
  console.log('[LesBancs] Fallback Esri activé');
});

// ── Marqueurs ─────────────────────────────────────────────────────────────────

const benchDataSource = new Cesium.CustomDataSource('benches');
viewer.dataSources.add(benchDataSource);

async function refreshMarkers() {
  benchDataSource.entities.removeAll();
  const benches = await BenchAPI.getAll();
  benches.forEach(addBenchMarker);
}

function addBenchMarker(bench) {
  benchDataSource.entities.add({
    position: Cesium.Cartesian3.fromDegrees(bench.lng, bench.lat),
    billboard: {
      image:           buildMarkerCanvas(bench.scores.total),
      width:           44,
      height:          52,
      verticalOrigin:  Cesium.VerticalOrigin.BOTTOM,
      heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
      disableDepthTestDistance: Number.POSITIVE_INFINITY,
    },
    properties: { benchId: bench.id },
  });
}

function buildMarkerCanvas(score) {
  const color = score >= 7 ? '#22C55E' : score >= 4 ? '#F59E0B' : '#EF4444';
  const c   = document.createElement('canvas');
  c.width   = 44;
  c.height  = 52;
  const ctx = c.getContext('2d');

  // Forme pin
  ctx.beginPath();
  ctx.moveTo(22, 50);
  ctx.bezierCurveTo(22, 50, 2, 34, 2, 22);
  ctx.arc(22, 22, 20, Math.PI, 0);
  ctx.bezierCurveTo(42, 34, 22, 50, 22, 50);
  ctx.closePath();
  ctx.fillStyle = color;
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.7)';
  ctx.lineWidth   = 1.5;
  ctx.stroke();

  // Score
  ctx.fillStyle     = color === '#22C55E' ? '#000' : '#fff';
  ctx.font          = 'bold 13px Arial,sans-serif';
  ctx.textAlign     = 'center';
  ctx.textBaseline  = 'middle';
  ctx.fillText(score % 1 === 0 ? String(score) : score.toFixed(1), 22, 20);

  return c;
}

function buildClusterCanvas(count, avgScore) {
  const color = avgScore >= 7 ? '#22C55E' : avgScore >= 4 ? '#F59E0B' : '#EF4444';
  const size  = count >= 100 ? 62 : count >= 10 ? 54 : 46;
  const c     = document.createElement('canvas');
  c.width = c.height = size;
  const ctx   = c.getContext('2d');
  const r     = size / 2;

  // Halo translucide
  ctx.beginPath();
  ctx.arc(r, r, r - 1, 0, Math.PI * 2);
  ctx.fillStyle = color + '40';
  ctx.fill();

  // Cercle plein
  ctx.beginPath();
  ctx.arc(r, r, r - 8, 0, Math.PI * 2);
  ctx.fillStyle = color;
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.85)';
  ctx.lineWidth   = 2;
  ctx.stroke();

  // Nombre de bancs
  ctx.fillStyle    = color === '#22C55E' ? '#000' : '#fff';
  ctx.font         = `bold ${count >= 100 ? 13 : 15}px Arial,sans-serif`;
  ctx.textAlign    = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(count, r, r);

  return c;
}

AUTH.onReady(() => refreshMarkers());

// ── Clustering ────────────────────────────────────────────────────────────────

benchDataSource.clustering.enabled           = true;
benchDataSource.clustering.pixelRange        = 30;
benchDataSource.clustering.minimumClusterSize = 2;

benchDataSource.clustering.clusterEvent.addEventListener((entities, cluster) => {
  cluster.label.show     = false;
  cluster.point.show     = false;
  cluster.billboard.show = true;
  cluster.billboard.verticalOrigin          = Cesium.VerticalOrigin.CENTER;
  cluster.billboard.heightReference         = Cesium.HeightReference.CLAMP_TO_GROUND;
  cluster.billboard.disableDepthTestDistance = Number.POSITIVE_INFINITY;

  let sum = 0, n = 0;
  entities.forEach(e => {
    if (e.properties && e.properties.benchId) {
      const bench = BenchAPI.getById(e.properties.benchId.getValue());
      if (bench) { sum += bench.scores.total; n++; }
    }
  });
  const avg = n ? sum / n : 0;

  cluster.billboard.image  = buildClusterCanvas(entities.length, avg);
  cluster.billboard.width  = cluster.billboard.height =
    entities.length >= 100 ? 62 : entities.length >= 10 ? 54 : 46;
});

// ── Événements clic ───────────────────────────────────────────────────────────

const MAX_HEIGHT_ADD = 1500; // mètres

// Désactive le "track entity" natif déclenché par double-clic
viewer.screenSpaceEventHandler.removeInputAction(Cesium.ScreenSpaceEventType.LEFT_DOUBLE_CLICK);

const handler = new Cesium.ScreenSpaceEventHandler(viewer.scene.canvas);

handler.setInputAction((click) => {
  const picked = viewer.scene.pick(click.position);

  if (Cesium.defined(picked)) {
    // Clic sur un cluster → zoom in
    if (Cesium.defined(picked.cluster)) {
      const ray  = viewer.camera.getPickRay(click.position);
      const cart = viewer.scene.globe.pick(ray, viewer.scene);
      if (Cesium.defined(cart)) {
        const carto = Cesium.Cartographic.fromCartesian(cart);
        viewer.camera.flyTo({
          destination: Cesium.Cartesian3.fromRadians(
            carto.longitude,
            carto.latitude,
            viewer.camera.positionCartographic.height * 0.25,
          ),
          duration: 1.0,
        });
      }
      return;
    }

    // Clic sur un marqueur individuel
    if (picked.id && picked.id.properties) {
      const id = picked.id.properties.benchId && picked.id.properties.benchId.getValue();
      if (id) {
        const bench = BenchAPI.getById(id);
        if (bench) { showBenchPopup(bench); return; }
      }
    }
  }

  closeBenchPopup();

  // Connexion requise pour créer un banc
  if (!AUTH.isLoggedIn()) {
    flashHint('🔒 Connectez-vous pour ajouter un banc', true);
    return;
  }

  // Hauteur caméra suffisante ?
  const alt = viewer.camera.positionCartographic.height;
  if (alt > MAX_HEIGHT_ADD) {
    const km = (alt / 1000).toFixed(0);
    flashHint(`⚠️ Zoomez davantage pour ajouter un banc (altitude actuelle : ${km} km)`, true);
    return;
  }

  // Coordonnées du clic sur le globe
  const ray  = viewer.camera.getPickRay(click.position);
  const cart = viewer.scene.globe.pick(ray, viewer.scene);
  if (!Cesium.defined(cart)) return;

  const carto = Cesium.Cartographic.fromCartesian(cart);
  openLocationModal({
    lat: Cesium.Math.toDegrees(carto.latitude),
    lng: Cesium.Math.toDegrees(carto.longitude),
  });
}, Cesium.ScreenSpaceEventType.LEFT_CLICK);

// ── Location modal ────────────────────────────────────────────────────────────

let pendingLocation   = null;
let activePopupBench  = null;

function openLocationModal(loc) {
  pendingLocation = loc;
  document.getElementById('modal-coords').textContent =
    `${loc.lat.toFixed(5)}, ${loc.lng.toFixed(5)}`;
  document.getElementById('location-modal').hidden = false;
}

document.getElementById('location-modal-close').addEventListener('click', () => {
  document.getElementById('location-modal').hidden = true;
  pendingLocation = null;
});

document.getElementById('btn-cancel-location').addEventListener('click', () => {
  document.getElementById('location-modal').hidden = true;
  pendingLocation = null;
});

document.getElementById('btn-confirm-location').addEventListener('click', () => {
  if (!pendingLocation) return;
  sessionStorage.setItem('pendingBenchLocation', JSON.stringify(pendingLocation));
  document.getElementById('location-modal').hidden = true;
  window.location.href = 'pages/bench-create.html';
});

// ── Popup banc ────────────────────────────────────────────────────────────────

function showBenchPopup(bench) {
  activePopupBench = bench;

  document.getElementById('popup-score').textContent = bench.scores.total.toFixed(1);
  document.getElementById('popup-score').className   =
    'popup-score-value ' + scoreBadgeClass(bench.scores.total);

  const reviews = bench.reviews || [];
  const avg     = reviews.length
    ? (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1)
    : null;

  document.getElementById('popup-meta').innerHTML = avg
    ? `${renderStarsHTML(avg)} ${avg}/5`
    : '<span class="muted">Aucun avis</span>';

  document.getElementById('popup-img').innerHTML = bench.photos && bench.photos[0]
    ? `<img src="${bench.photos[0]}" alt="Photo">`
    : `<div class="popup-no-img">📷</div>`;

  const txt = bench.comment;
  document.getElementById('popup-comment').textContent =
    txt.length > 90 ? txt.slice(0, 87) + '…' : txt;
  document.getElementById('popup-author').textContent =
    `par ${escapeHtml(bench.author)} · ${formatDate(bench.createdAt)}`;

  document.getElementById('bench-popup').hidden = false;
}

function closeBenchPopup() {
  document.getElementById('bench-popup').hidden = true;
  activePopupBench = null;
}

document.getElementById('popup-close').addEventListener('click', closeBenchPopup);

document.getElementById('popup-view-btn').addEventListener('click', () => {
  if (activePopupBench)
    window.location.href = `pages/bench-detail.html?id=${activePopupBench.id}`;
});

// ── Contrôles flottants ───────────────────────────────────────────────────────

// Globe entier
document.getElementById('btn-recenter').addEventListener('click', () => {
  viewer.camera.flyTo({
    destination: Cesium.Cartesian3.fromDegrees(
      CONFIG.MAP_DEFAULT_CENTER.lng,
      CONFIG.MAP_DEFAULT_CENTER.lat,
      13_000_000
    ),
    duration: 2.2,
  });
});

// Zoom maximum (150 m au-dessus du centre actuel)
document.getElementById('btn-zoom-max').addEventListener('click', () => {
  const pos = viewer.camera.positionCartographic;
  viewer.camera.flyTo({
    destination: Cesium.Cartesian3.fromRadians(pos.longitude, pos.latitude, 150),
    orientation: {
      heading: 0,
      pitch:   -Cesium.Math.PI_OVER_TWO,
      roll:    0,
    },
    duration:        2.5,
    easingFunction:  Cesium.EasingFunction.CUBIC_IN_OUT,
  });
});

document.getElementById('btn-zoom-in').addEventListener('click', () => {
  viewer.camera.zoomIn(viewer.camera.positionCartographic.height * 0.4);
});

document.getElementById('btn-zoom-out').addEventListener('click', () => {
  viewer.camera.zoomOut(viewer.camera.positionCartographic.height * 0.6);
});

// ── Hint bar ──────────────────────────────────────────────────────────────────

function flashHint(msg, isError = false) {
  const el   = document.getElementById('map-hint');
  const span = el.querySelector('span');
  const orig = span.textContent;

  span.textContent      = msg;
  el.style.background   = isError ? 'rgba(80,10,10,.9)'        : '';
  el.style.color        = isError ? 'var(--red)'               : '';
  el.style.borderColor  = isError ? 'rgba(239,68,68,.3)'       : '';
  el.hidden             = false;

  setTimeout(() => {
    span.textContent    = orig;
    el.style.background = el.style.color = el.style.borderColor = '';
  }, 3000);
}

document.getElementById('hint-close').addEventListener('click', () => {
  document.getElementById('map-hint').hidden = true;
});
