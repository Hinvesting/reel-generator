// src/firebase.ts
import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "YOUR_FIREBASE_CONFIG",
  authDomain: "YOUR_FIREBASE_CONFIG",
  projectId: "YOUR_FIREBASE_CONFIG",
  storageBucket: "YOUR_FIREBASE_CONFIG",
  messagingSenderId: "YOUR_FIREBASE_CONFIG",
  appId: "YOUR_FIREBASE_CONFIG",
  measurementId: "YOUR_FIREBASE_CONFIG"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Cloud Firestore and get a reference to the service
const db = getFirestore(app);

export { db };
