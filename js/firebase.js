import { initializeApp } from "https://www.gstatic.com/firebasejs/12.10.0/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/12.10.0/firebase-firestore.js";
import { getStorage } from "https://www.gstatic.com/firebasejs/12.10.0/firebase-storage.js";

const firebaseConfig = {
  apiKey: "AIzaSyBjQmRNg_CFiO3_bLKYq-RT3P40BMSNy2U",
  authDomain: "resgata-pets.firebaseapp.com",
  projectId: "resgata-pets",
  storageBucket: "resgata-pets.firebasestorage.app",
  messagingSenderId: "940230973594",
  appId: "1:940230973594:web:9a7ca2a4aa4f03a5a06723"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const storage = getStorage(app);

export { app, db, storage };
