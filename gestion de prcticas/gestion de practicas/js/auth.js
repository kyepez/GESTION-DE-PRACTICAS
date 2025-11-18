// @ts-nocheck
// js/auth.js
console.log("🔐 auth.js cargado");

import { auth, provider, db } from "./firebase-config.js";
import {
  signInWithPopup,
  onAuthStateChanged,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  updateProfile,
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import {
  doc,
  setDoc,
  getDoc,
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { RolSelector } from "./rol-selector.js";

const googleButtons = document.querySelectorAll("[data-google-login]");
const loginForm = document.getElementById("loginForm");
const registerForm = document.getElementById("registerForm");
const forgotPasswordBtn = document.getElementById("btnForgotPassword");
const statusMessage = document.getElementById("authStatus");
const emailLoginButton = document.getElementById("btnEmailLogin");
const registerButton = document.getElementById("btnRegister");

if (emailLoginButton) emailLoginButton.dataset.originalText = emailLoginButton.innerHTML;
if (registerButton) registerButton.dataset.originalText = registerButton.innerHTML;

googleButtons.forEach((button) => {
  button.dataset.originalText = button.innerHTML;
  button.addEventListener("click", () => handleGoogleLogin(button));
});

loginForm?.addEventListener("submit", async (event) => {
  event.preventDefault();
  const email = loginForm.loginEmail.value.trim();
  const password = loginForm.loginPassword.value;

  toggleButtonLoading(emailLoginButton, true, "Ingresando...");
  showStatus("Validando credenciales...", "info");

  try {
    const { user } = await signInWithEmailAndPassword(auth, email, password);
    await ensureUserProfile(user);
    showStatus("Sesión iniciada con éxito. Redirigiendo...", "success");
    redirectToDashboard();
  } catch (error) {
    console.error("Error al iniciar sesión", error);
    showStatus(mapAuthError(error.code), "error");
  } finally {
    toggleButtonLoading(emailLoginButton, false, "Entrar");
  }
});

registerForm?.addEventListener("submit", async (event) => {
  event.preventDefault();
  const name = registerForm.registerName.value.trim();
  const email = registerForm.registerEmail.value.trim();
  const password = registerForm.registerPassword.value;
  const role = registerForm.registerRole.value;

  toggleButtonLoading(registerButton, true, "Creando cuenta...");
  showStatus("Creando tu cuenta segura...", "info");

  try {
    const { user } = await createUserWithEmailAndPassword(auth, email, password);
    await updateProfile(user, { displayName: name });
    
    // Guardar perfil con rol seleccionado
    await ensureUserProfile(user, {
      nombre: name,
      rol: role,
    });
    
    showStatus("Cuenta creada. Bienvenido/a a GestionPrácticas.", "success");
    
    // Redirigir al dashboard o a completar perfil
    setTimeout(() => {
      window.location.href = "dashboard.html";
    }, 1000);
  } catch (error) {
    console.error("Error al registrar cuenta", error);
    showStatus(mapAuthError(error.code), "error");
  } finally {
    toggleButtonLoading(registerButton, false, "Crear cuenta");
  }
});

forgotPasswordBtn?.addEventListener("click", async () => {
  const email = loginForm?.loginEmail.value.trim();
  if (!email) {
    showStatus("Ingresa tu correo institucional para recuperar tu contraseña.", "error");
    return;
  }
  showStatus("Enviando enlace de recuperación...", "info");
  try {
    await sendPasswordResetEmail(auth, email);
    showStatus("Revisa tu bandeja de entrada para restablecer tu contraseña.", "success");
  } catch (error) {
    console.error("Error enviando restablecimiento", error);
    showStatus(mapAuthError(error.code), "error");
  }
});

async function handleGoogleLogin(button) {
  toggleButtonLoading(button, true, "Conectando...");
  try {
    const { user } = await signInWithPopup(auth, provider);
    const userRef = doc(db, "usuarios", user.uid);
    const snap = await getDoc(userRef);
    
    // Si es usuario nuevo o no tiene rol definido, mostrar selector
    if (!snap.exists() || !snap.data().rol) {
      const selector = new RolSelector(user.uid, {
        displayName: user.displayName,
        email: user.email,
        photoURL: user.photoURL,
      });
      await selector.mostrarSelector();
    }
    
    await ensureUserProfile(user);
    showStatus("Sesión iniciada con Google. Redirigiendo...", "success");
    redirectToDashboard();
  } catch (error) {
    console.error("Error al iniciar sesión", error);
    showStatus(mapAuthError(error.code), "error");
  } finally {
    toggleButtonLoading(button, false);
  }
}

async function ensureUserProfile(user, overrides = {}) {
  const userRef = doc(db, "usuarios", user.uid);
  const snap = await getDoc(userRef);

  // Si ya existe, solo actualizar si hay cambios
  if (snap.exists()) {
    const datosActuales = snap.data();
    const datosNuevos = {
      nombre: overrides.nombre || datosActuales.nombre || user.displayName,
      email: user.email || datosActuales.email,
      foto: user.photoURL || datosActuales.foto || "",
    };
    
    // Solo actualizar si hay cambios
    if (overrides.rol) {
      datosNuevos.rol = overrides.rol;
    }
    
    await setDoc(userRef, datosNuevos, { merge: true });
    return;
  }

  // Si no existe, crear nuevo perfil
  await setDoc(userRef, {
    uid: user.uid,
    nombre: overrides.nombre || user.displayName,
    email: user.email,
    foto: user.photoURL || "",
    rol: overrides.rol || "estudiante",
    datos_completos: false,
    fecha_registro: new Date().toISOString(),
  });
}

function toggleButtonLoading(button, isLoading, loadingLabel) {
  if (!button) return;
  if (!button.dataset.originalText) {
    button.dataset.originalText = button.innerHTML;
  }
  if (isLoading) {
    button.disabled = true;
    button.setAttribute("aria-busy", "true");
    button.innerHTML = `<span class="spinner-mini"></span> ${loadingLabel || "Procesando..."}`;
  } else {
    button.disabled = false;
    button.setAttribute("aria-busy", "false");
    button.innerHTML = button.dataset.originalText || button.innerHTML;
  }
}

function showStatus(message, variant = "info") {
  if (!statusMessage) return;
  statusMessage.textContent = message;
  statusMessage.dataset.variant = variant;
}

function redirectToDashboard() {
  setTimeout(() => {
    window.location.href = "dashboard.html";
  }, 700);
}

function mapAuthError(code = "") {
  const messages = {
    "auth/invalid-email": "El correo no es válido.",
    "auth/user-disabled": "Tu cuenta ha sido deshabilitada. Contacta soporte.",
    "auth/user-not-found": "No encontramos una cuenta con ese correo.",
    "auth/wrong-password": "Contraseña incorrecta. Intenta nuevamente.",
    "auth/email-already-in-use": "Ya existe una cuenta registrada con este correo.",
    "auth/weak-password": "La contraseña debe tener al menos 8 caracteres.",
    "auth/popup-closed-by-user": "La ventana de Google se cerró antes de finalizar.",
  };
  return messages[code] || "Ocurrió un error inesperado. Intenta nuevamente.";
}

onAuthStateChanged(auth, (user) => {
  const isDashboard = location.pathname.includes("dashboard");
  if (user && !isDashboard) window.location.href = "dashboard.html";
  if (!user && isDashboard) window.location.href = "index.html";
});