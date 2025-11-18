// @ts-nocheck
// js/dashboard.js
import { auth, db } from "./firebase-config.js";
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { collection, addDoc, getDocs, deleteDoc, doc, updateDoc, query, where } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const userNameEl = document.getElementById("userName");
const btnLogout = document.getElementById("btnLogout");
const menuEl = document.getElementById("menuItems");
const contentEl = document.getElementById("mainContent");

btnLogout.onclick = () => signOut(auth).then(() => location.href = "index.html");

onAuthStateChanged(auth, async user => {
  if (!user) return;
  const snap = await getDoc(doc(db, "usuarios", user.uid));
  const data = snap.data();
  userNameEl.textContent = data?.nombre || "Usuario";

  const rol = data?.rol || "estudiante";
  renderMenu(rol);
  loadView(rol, "inicio");
});

function renderMenu(rol) {
  const menus = {
    estudiante: [
      { id: "inicio", label: "Inicio", icon: "Inicio" },
      { id: "ofertas", label: "Ofertas", icon: "Ofertas" },
      { id: "aplicaciones", label: "Mis Aplicaciones", icon: "Aplicaciones" }
    ],
    supervisor_empresa: [
      { id: "inicio", label: "Inicio", icon: "Inicio" },
      { id: "aplicaciones", label: "Aplicaciones", icon: "Aplicaciones" },
      { id: "estudiantes", label: "Estudiantes", icon: "Estudiantes" }
    ],
    administrador: [
      { id: "inicio", label: "Inicio", icon: "Inicio" },
      { id: "ofertas", label: "Gestionar Ofertas", icon: "Ofertas" },
      { id: "usuarios", label: "Usuarios", icon: "Usuarios" },
      { id: "empresas", label: "Empresas", icon: "Empresas" }
    ]
  };

  menuEl.innerHTML = menus[rol].map(m => `
    <li onclick="loadView('${rol}', '${m.id}')">
      <span>${m.icon}</span> ${m.label}
    </li>
  `).join("");
}

window.loadView = async (rol, view) => {
  document.querySelectorAll(".sidebar li").forEach(li => li.classList.remove("active"));
  document.querySelector(`li[onclick*="'${view}'"]`)?.classList.add("active");

  contentEl.innerHTML = "<div class='loader'></div>";

  if (view === "inicio") {
    contentEl.innerHTML = `<h2>Bienvenido</h2><p>Selecciona una opción del menú.</p>`;
  } else if (view === "ofertas" && rol === "estudiante") {
    await loadOfertasEstudiante();
  } else if (view === "ofertas" && rol === "administrador") {
    await loadOfertasAdmin();
  }
  // Agrega más vistas según necesites
};

async function loadOfertasEstudiante() {
  const q = query(collection(db, "ofertas"), where("estado", "==", "publicada"));
  const snap = await getDocs(q);
  const html = snap.empty ? "<p>No hay ofertas disponibles.</p>" : snap.docs.map(d => {
    const o = d.data();
    return `
      <div class="card">
        <h3>${o.titulo}</h3>
        <p><strong>Empresa:</strong> ${o.empresa}</p>
        <p>${o.descripcion}</p>
        <button class="btn-success" onclick="aplicarOferta('${d.id}')">Aplicar</button>
      </div>
    `;
  }).join("");
  contentEl.innerHTML = `<h2>Ofertas Disponibles</h2>${html}`;
}

window.aplicarOferta = async (id) => {
  if (!confirm("¿Enviar aplicación?")) return;
  await addDoc(collection(db, "aplicaciones"), {
    id_oferta: id,
    id_estudiante: auth.currentUser.uid,
    estado: "pendiente",
    fecha: new Date().toISOString(),
    carta: "Carta de presentación..."
  });
  alert("Aplicación enviada");
};