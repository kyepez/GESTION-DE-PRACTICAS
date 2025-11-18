// Configuración y utilidad para Firebase Firestore v9+
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, addDoc, getDocs, doc, getDoc, setDoc, query, where } from "firebase/firestore";

// Configuración de Firebase (pon aquí tus credenciales reales)
const firebaseConfig = {
  apiKey: "TU_API_KEY",
  authDomain: "TU_AUTH_DOMAIN",
  projectId: "TU_PROJECT_ID",
  storageBucket: "TU_STORAGE_BUCKET",
  messagingSenderId: "TU_MSG_SENDER_ID",
  appId: "TU_APP_ID"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);

// Guardar cualquier DTO (usuarios, trabajos, empresas, etc)
export async function guardarDTO(ruta, datos) {
  try {
    const docRef = await addDoc(collection(db, ruta), datos);
    return docRef.id;
  } catch (e) {
    console.error("Error al guardar:", e);
    throw e;
  }
}