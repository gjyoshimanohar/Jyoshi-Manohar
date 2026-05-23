import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { initializeFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: "AIzaSyDU6bogpUM069m-o8I-bDwYKs1moeyaicY",
  authDomain: "jyoshimanohar-com.firebaseapp.com",
  projectId: "jyoshimanohar-com",
  storageBucket: "jyoshimanohar-com.firebasestorage.app",
  messagingSenderId: "255732479780",
  appId: "1:255732479780:web:56f47693a88099b112e5b1"
};

const app = initializeApp(firebaseConfig);
export const db = initializeFirestore(app, {
  experimentalForceLongPolling: true,
});
export const auth = getAuth();
export const storage = getStorage(app);
