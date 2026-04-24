const BenchAPI = (() => {
  function load() {
    try {
      return JSON.parse(localStorage.getItem(CONFIG.STORAGE_KEY_BENCHES) || '[]');
    } catch {
      return [];
    }
  }

  function persist(benches) {
    localStorage.setItem(CONFIG.STORAGE_KEY_BENCHES, JSON.stringify(benches));
  }

  return {
    getAll() {
      return load();
    },

    getById(id) {
      return load().find(b => b.id === id) || null;
    },

    save(bench) {
      const benches = load();
      const idx = benches.findIndex(b => b.id === bench.id);
      if (idx >= 0) {
        benches[idx] = bench;
      } else {
        benches.push(bench);
      }
      persist(benches);
      return bench;
    },

    delete(id) {
      persist(load().filter(b => b.id !== id));
    },

    addReview(benchId, review) {
      const bench = this.getById(benchId);
      if (!bench) return null;
      bench.reviews = bench.reviews || [];
      bench.reviews.push(review);
      return this.save(bench);
    },

    deleteReview(benchId, reviewId) {
      const bench = this.getById(benchId);
      if (!bench) return null;
      bench.reviews = (bench.reviews || []).filter(r => r.id !== reviewId);
      return this.save(bench);
    },
  };
})();
