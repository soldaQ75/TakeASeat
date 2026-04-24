/* global db, firebase */

const BenchAPI = (() => {
  return {
    async getAll() {
      const snap = await db.collection('bancs').orderBy('createdAt', 'desc').get();
      return snap.docs.map(d => d.data());
    },

    async getById(id) {
      const snap = await db.collection('bancs').doc(id).get();
      return snap.exists ? snap.data() : null;
    },

    async save(bench) {
      await db.collection('bancs').doc(bench.id).set(bench, { merge: true });
      return bench;
    },

    async delete(id) {
      await db.collection('bancs').doc(id).delete();
    },

    async addReview(benchId, review) {
      await db.collection('bancs').doc(benchId).update({
        reviews: firebase.firestore.FieldValue.arrayUnion(review),
      });
      return this.getById(benchId);
    },

    async deleteReview(benchId, reviewId) {
      const bench = await this.getById(benchId);
      if (!bench) return null;
      const reviews = (bench.reviews || []).filter(r => r.id !== reviewId);
      await db.collection('bancs').doc(benchId).update({ reviews });
      return { ...bench, reviews };
    },
  };
})();
