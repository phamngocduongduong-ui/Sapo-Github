import { initializeApp, getApps, getApp } from "firebase/app";
import { getAnalytics, isSupported } from "firebase/analytics";

const firebaseConfig = {
  apiKey: "AIzaSyAp9LueIH5bV6v_nBZgq6XywHLRcCZ58KI",
  authDomain: "sapo-firebase.firebaseapp.com",
  projectId: "sapo-firebase",
  storageBucket: "sapo-firebase.firebasestorage.app",
  messagingSenderId: "263496443997",
  appId: "1:263496443997:web:e9d3cb5058b9c64fe9c5b4",
  measurementId: "G-VMWKVWBV67"
};

// Initialize Firebase
const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

// Initialize Analytics conditionally
const analytics = typeof window !== 'undefined' ? isSupported().then(supported => supported ? getAnalytics(app) : null) : null;

export { app, analytics };
