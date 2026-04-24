const CONFIG = {
  // Clé Google Maps Platform (activer "Map Tiles API" dans Google Cloud Console)
  // Sans clé → fallback automatique sur Esri (continents visibles quand même)
  GOOGLE_MAPS_API_KEY: 'YOUR_GOOGLE_MAPS_API_KEY',

  MAP_DEFAULT_CENTER: { lat: 46.2276, lng: 2.2137 },
  MAP_DEFAULT_ZOOM: 3,
  MAP_MIN_ZOOM_TO_ADD: 16,

  STORAGE_KEY_BENCHES: 'lesBancs_v1',

  MAX_PHOTOS: 5,
  PHOTO_MAX_WIDTH: 1000,
  PHOTO_QUALITY: 0.75,
};
