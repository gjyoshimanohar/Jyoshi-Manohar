const { initializeApp } = require('firebase/app');
const { initializeFirestore, doc, setDoc } = require('firebase/firestore');
const c = require('./firebase-applet-config.json');
const app = initializeApp(c);
const db = initializeFirestore(app, {}, c.firestoreDatabaseId);

async function addAdmin() {
  const uid = 'PhqxBwukG1gpCWpy5NG48TEEUaB2'; // uid for gjyoshimanohar@gmail.com
  await setDoc(doc(db, 'admins', uid), { email: 'gjyoshimanohar@gmail.com', role: 'admin' });
  console.log('Admin added successfully.');
  process.exit(0);
}

addAdmin().catch(e => { console.error(e.message); process.exit(1); });
