
import { getFirestore } from 'firebase/firestore'  // ✅ Este import falta
import { getAuth } from 'firebase/auth'

// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyBHKZgbogGTw5YwEkNZqSKpi8CxngttThQ",
  authDomain: "churrasqueria-4d8a1.firebaseapp.com",
  projectId: "churrasqueria-4d8a1",
  storageBucket: "churrasqueria-4d8a1.firebasestorage.app",
  messagingSenderId: "846026374460",
  appId: "1:846026374460:web:8d897c39694adc0a233239",
  measurementId: "G-BYJJ9EQZPD"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);

export const db = getFirestore(app)      // ✅ Exporta db
export const auth=getAuth(app)