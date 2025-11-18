// Configuración e inicialización de Firebase para la app web
console.log("🔥 firebase-config.js cargado");

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth, GoogleAuthProvider } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyB1xCzEy61zPsnuW9VCkbYfcZItTeU-Hjo",
  authDomain: "gestion-de-practicas-3ed66.firebaseapp.com",
  projectId: "gestion-de-practicas-3ed66",
  storageBucket: "gestion-de-practicas-3ed66.firebasestorage.app",
  messagingSenderId: "165505941156",
  appId: "1:165505941156:web:4597643dc32e7c74daf031"
};

export const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
export const provider = new GoogleAuthProvider();
