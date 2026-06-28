const { initializeApp } = require('firebase/app');
const { getFirestore, getDocs, collection } = require('firebase/firestore');
const c = require('./firebase-applet-config.json');
const app = initializeApp(c);
const db = getFirestore(app);
getDocs(collection(db, 'users')).then(s => {
  console.log('Users:', s.docs.map(d => ({id: d.id, email: d.data().email})));
  process.exit(0);
}).catch(e => console.error(e.message));
