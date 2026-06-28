const { initializeApp } = require('firebase/app');
const { initializeFirestore } = require('firebase/firestore');
const { getDocs, collection } = require('firebase/firestore');
const c = require('./firebase-applet-config.json');
const app = initializeApp(c);
const db = initializeFirestore(app, {}, c.firestoreDatabaseId);
getDocs(collection(db, 'users')).then(s => {
  console.log('Users in ai-studio db:', s.docs.map(d => ({id: d.id, email: d.data().email})));
  process.exit(0);
}).catch(e => { console.error(e.message); process.exit(1); });
