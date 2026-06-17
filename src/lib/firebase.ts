import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

// Configuration from firebase-applet-config.json
const firebaseConfig = {
  apiKey: "AIzaSyDvor7cZsX3dDM050FtQv6ObqrT0rzwDUU",
  authDomain: "gen-lang-client-0892544887.firebaseapp.com",
  projectId: "gen-lang-client-0892544887",
  storageBucket: "gen-lang-client-0892544887.firebasestorage.app",
  messagingSenderId: "161185499873",
  appId: "1:161185499873:web:1f83ece734be057e03c5a0"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firestore
export const db = getFirestore(app, "ai-studio-0ef9560d-8f9b-4250-b741-6b2acd7257f9");
