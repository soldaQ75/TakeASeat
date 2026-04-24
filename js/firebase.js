/* global firebase, CONFIG */

const app    = firebase.initializeApp(CONFIG.FIREBASE);
const db     = firebase.firestore();
const fbAuth = firebase.auth();
