import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';

const firebaseConfig = {
  apiKey: "AIzaSyBQSw8RkLSD3Uvn5D4-ryIbL4wMFDLx9k0",
  authDomain: "dati-lms.firebaseapp.com",
  projectId: "dati-lms",
  storageBucket: "dati-lms.firebasestorage.app",
  messagingSenderId: "484767352084",
  appId: "1:484767352084:web:7c2298e7842ee1e1ce2e01"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
