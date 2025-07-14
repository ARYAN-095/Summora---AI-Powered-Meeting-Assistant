import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyATwDeC1anQ6pStJXhSODibBWQYErqWehU",
  authDomain: "summora-cb5ad.firebaseapp.com",
  projectId: "summora-cb5ad",
  storageBucket: "summora-cb5ad.firebasestorage.app",
  messagingSenderId: "545658518766",
  appId: "1:545658518766:web:9cc596223db71da48907ff",
  measurementId: "G-TPDEWT1ZPC"
};

// Initialize Firebase
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const auth = getAuth(app);
const db = getFirestore(app);

export { app, auth, db };