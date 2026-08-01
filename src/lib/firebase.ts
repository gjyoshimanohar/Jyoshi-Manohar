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
  const customDbId = (firebaseConfig as { firestoreDatabaseId?: string }).firestoreDatabaseId;
  if (customDbId) {
    firestoreInstance = initializeFirestore(app, {
      experimentalForceLongPolling: true,
    }, customDbId);
  } else {
    firestoreInstance = initializeFirestore(app, {
      experimentalForceLongPolling: true,
    });
  }
} catch (e) {
  console.warn("initializeFirestore failed, falling back to getFirestore:", e);
  // Fall back to standard initialization
  firestoreInstance = getFirestore(app);
}

export const db = firestoreInstance;
export const auth = getAuth(app);
export const storage = getStorage(app);

// Secondary app setup to create users securely without logging out the primary admin session
const secondaryApp = initializeApp(firebaseConfig, "Secondary");
export const secondaryAuth = getAuth(secondaryApp);


