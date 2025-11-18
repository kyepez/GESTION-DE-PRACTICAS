// @ts-nocheck
// js/auth.js
import { auth, provider, db } from "./firebase-config.js";
import {
  signInWithPopup,
  onAuthStateChanged,
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import {
  doc,
  setDoc,
  getDoc,
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const loginButton = document.getElementById("btnLogin");
const originalLabel = loginButton?.innerHTML;

loginButton?.addEventListener("click", () => handleGoogleLogin());

async function handleGoogleLogin() {
  setButtonLoading(true);
  try {
    const { user } = await signInWithPopup(auth, provider);
    await ensureUserProfile(user);
    window.location.href = "dashboard.html";
  } catch (error) {
    console.error("Error al iniciar sesión", error);
    alert("No pudimos completar el inicio de sesión. Intenta nuevamente.");
  } finally {
    setButtonLoading(false);
  }
}

async function ensureUserProfile(user) {
  const userRef = doc(db, "usuarios", user.uid);
  const snap = await getDoc(userRef);

  if (snap.exists()) return;

  await setDoc(userRef, {
    uid: user.uid,
    nombre: user.displayName,
    email: user.email,
    foto: user.photoURL,
    rol: "estudiante",
    datos_completos: false,
    fecha_registro: new Date().toISOString(),
  });
}

function setButtonLoading(isLoading) {
  if (!loginButton) return;
  loginButton.disabled = isLoading;
  loginButton.setAttribute("aria-busy", String(isLoading));
  loginButton.innerHTML = isLoading
    ? `<span class="spinner-mini"></span> Conectando...`
    : originalLabel;
}

onAuthStateChanged(auth, (user) => {
  const isDashboard = location.pathname.includes("dashboard");
  if (user && !isDashboard) window.location.href = "dashboard.html";
  if (!user && isDashboard) window.location.href = "index.html";
});