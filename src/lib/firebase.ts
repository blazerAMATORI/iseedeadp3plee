import { initializeApp } from "firebase/app";
import { getDatabase } from "firebase/database";

const firebaseConfig = {
  apiKey: "AIzaSyD-G2bc3cEpRzMwllhRqTRzaplz-oafei0",
  authDomain: "iseedeadp3ple.firebaseapp.com",
  databaseURL: "https://iseedeadp3ple-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "iseedeadp3ple",
  storageBucket: "iseedeadp3ple.firebasestorage.app",
  messagingSenderId: "79076923752",
  appId: "1:79076923752:web:3ef1f127c287ff6116dedd",
  measurementId: "G-QDV4JX3B82"
};

const app = initializeApp(firebaseConfig);
export const db = getDatabase(app);
