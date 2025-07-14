// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyATwDeC1anQ6pStJXhSODibBWQYErqWehU",
  authDomain: "summora-cb5ad.firebaseapp.com",
  projectId: "summora-cb5ad",
  storageBucket: "summora-cb5ad.firebasestorage.app",
  messagingSenderId: "545658518766",
  appId: "1:545658518766:web:a88897f782c39fd28907ff",
  measurementId: "G-VLQEFWTK3Y"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);