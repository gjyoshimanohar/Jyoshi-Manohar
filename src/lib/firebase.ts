import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { initializeFirestore, getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import firebaseConfig from '../../firebase-applet-config.json';
export { firebaseConfig };

const app = initializeApp(firebaseConfig);

let firestoreInstance;
try {
  // Try initializing with long-polling since sandbox environments often block WebSockets/gRPC
  const dbId = firebaseConfig.firestoreDatabaseId && firebaseConfig.firestoreDatabaseId !== "(default)" 
    ? firebaseConfig.firestoreDatabaseId 
    : undefined;
  firestoreInstance = initializeFirestore(app, {
    experimentalForceLongPolling: true,
  }, dbId);
} catch (e) {
  console.warn("initializeFirestore failed, falling back to getFirestore:", e);
  // Fall back to standard initialization which might already have been initialized
  const dbId = firebaseConfig.firestoreDatabaseId && firebaseConfig.firestoreDatabaseId !== "(default)" 
    ? firebaseConfig.firestoreDatabaseId 
    : undefined;
  firestoreInstance = getFirestore(app, dbId);
}

export const db = firestoreInstance;
export const auth = getAuth(app);
export const storage = getStorage(app);


