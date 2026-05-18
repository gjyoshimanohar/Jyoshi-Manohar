import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore, doc, getDocFromServer } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyDU6bogpUM069m-o8I-bDwYKs1moeyaicY",
  authDomain: "jyoshimanohar-com.firebaseapp.com",
  projectId: "jyoshimanohar-com",
  storageBucket: "jyoshimanohar-com.firebasestorage.app",
  messagingSenderId: "255732479780",
  appId: "1:255732479780:web:56f47693a88099b112e5b1"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth();

// Validate connection
async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error("Please check your Firebase configuration or internet connection.");
    }
  }
}

testConnection();
