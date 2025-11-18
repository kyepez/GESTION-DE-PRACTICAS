import { auth, db } from "./firebase-config.js";
import {
  onAuthStateChanged,
  signOut,
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import {
  doc,
  getDoc,
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const DOM = {
  pageTitle: document.getElementById("pageTitle"),
  pageSubtitle: document.getElementById("pageSubtitle"),
  roleBadge: document.getElementById("roleBadge"),
  menuItems: document.getElementById("menuItems"),
  summaryGrid: document.getElementById("summaryGrid"),
  panelsWrapper: document.getElementById("dynamicPanels"),
  timelinePanel: document.getElementById("timelinePanel"),
  timelineList: document.getElementById("timelineList"),
  emptyState: document.getElementById("emptyState"),
  loader: document.getElementById("pageLoader"),
  sidebar: document.getElementById("sidebar"),
  sidebarToggle: document.getElementById("sidebarToggle"),
  themeToggle: document.getElementById("themeToggle"),
  userName: document.getElementById("userName"),
  userEmail: document.getElementById("userEmail"),
  userPhoto: document.getElementById("userPhoto"),
  logoutButton: document.getElementById("btnLogout"),
};

const MENU_BY_ROLE = {
  estudiante: [
    { id: "resumen", label: "Resumen", icon: "layout-dashboard" },
    { id: "ofertas", label: "Ofertas activas", icon: "briefcase" },
    { id: "aplicaciones", label: "Mis aplicaciones", icon: "file-plus" },
    { id: "informes", label: "Seguimiento", icon: "chart-line" },
  ],
  supervisor_empresa: [
    { id: "resumen", label: "Resumen", icon: "layout-dashboard" },
    { id: "equipo", label: "Equipo asignado", icon: "users" },
    { id: "evaluaciones", label: "Evaluaciones", icon: "check-circle" },
    { id: "reportes", label: "Reportes", icon: "file-text" },
  ],
  administrador: [
    { id: "resumen", label: "Resumen", icon: "layout-dashboard" },
    { id: "usuarios", label: "Usuarios", icon: "shield" },
    { id: "empresas", label: "Empresas", icon: "building-2" },
    { id: "analytics", label: "Analítica", icon: "line-chart" },
  ],
};

const VIEW_CONFIG = {
  estudiante: {
    subtitle: "Revisa tu progreso y aplica a oportunidades en segundos.",
    stats: [
      { title: "Prácticas activas", value: "02", trend: "+1 mes actual" },
      { title: "Aplicaciones", value: "05", trend: "2 pendientes" },
      { title: "Horas registradas", value: "148h", trend: "+18% respecto a meta" },
    ],
    panels: [
      {
        title: "Siguiente paso",
        description:
          "Sube el informe de avance semanal y actualiza tu bitácora.",
        actions: [{ label: "Subir informe", icon: "upload-cloud" }],
      },
      {
        title: "Ofertas recomendadas",
        description: "3 nuevas vacantes según tu perfil.",
        list: [
          { label: "Desarrollador Frontend", helper: "TechSolutions · Híbrido" },
          { label: "Analista de Datos Jr.", helper: "DataCorp · Remoto" },
          { label: "UX Research Intern", helper: "DesignHub · Bogotá" },
        ],
      },
    ],
    timeline: [
      { title: "Informe enviado", time: "Hace 3h", detail: "Semana #8" },
      {
        title: "Entrevista agendada",
        time: "Ayer",
        detail: "Con empresa InnovaLabs",
      },
      {
        title: "Aplicación aprobada",
        time: "12 Nov",
        detail: "Programa de investigación",
      },
    ],
  },
  supervisor_empresa: {
    subtitle: "Supervisa el avance de tu equipo y valida entregables.",
    stats: [
      { title: "Estudiantes a cargo", value: "04", trend: "2 en onboarding" },
      { title: "Informes pendientes", value: "05", trend: "Due esta semana", trendType: "down" },
      { title: "Evaluaciones completadas", value: "12", trend: "+4 mes actual" },
    ],
    panels: [
      {
        title: "Alertas",
        description: "Revisa las tareas con riesgo de retraso.",
        list: [
          { label: "Informe QA - Laura P.", helper: "3 días de retraso" },
          { label: "Bitácora semanal - Marco R.", helper: "Sin enviar" },
        ],
      },
      {
        title: "Acciones rápidas",
        actions: [
          { label: "Crear evaluación", icon: "file-pen-line" },
          { label: "Enviar recordatorio", icon: "bell" },
        ],
      },
    ],
    timeline: [
      { title: "Evaluación enviada", time: "Hoy", detail: "Sprint móvil" },
      { title: "Feedback registrado", time: "Ayer", detail: "Equipo Data" },
      { title: "Nuevo estudiante", time: "11 Nov", detail: "Camila Ruiz" },
    ],
  },
  administrador: {
    subtitle: "Gestiona usuarios, empresas y analíticas de la plataforma.",
    stats: [
      { title: "Usuarios activos", value: "1.235", trend: "+6% vs mes pasado" },
      { title: "Empresas verificadas", value: "180", trend: "+12 nuevas" },
      { title: "Prácticas cerradas", value: "920", trend: "+58 este trimestre" },
    ],
    panels: [
      {
        title: "Panel de control",
        description: "Todo en orden. No hay incidentes reportados.",
        actions: [{ label: "Ver reportes", icon: "bar-chart-3" }],
      },
      {
        title: "Tareas pendientes",
        list: [
          { label: "Aprobar empresa: NovaTech", helper: "Documentación lista" },
          { label: "Asignar rol a nuevo supervisor", helper: "Soporte · 2 solicitudes" },
        ],
      },
    ],
    timeline: [
      { title: "Backup completado", time: "Hace 2h", detail: "Firestore & Storage" },
      { title: "Nuevo registro", time: "Hoy", detail: "Empresa Credicorp" },
      { title: "Se actualizó reglamento", time: "12 Nov", detail: "Versión 2.3" },
    ],
  },
};

const state = {
  profile: null,
  role: null,
  currentSection: "resumen",
};

init();

function init() {
  attachEventListeners();
  applySavedTheme();
  handleAuthState();
  hydrateIcons();
}

function attachEventListeners() {
  DOM.sidebarToggle?.addEventListener("click", () => {
    DOM.sidebar?.classList.toggle("active");
  });

  DOM.themeToggle?.addEventListener("click", () => {
    const prefersDark = document.body.classList.toggle("dark-mode");
    localStorage.setItem("theme", prefersDark ? "dark" : "light");
    updateThemeToggleIcon(prefersDark);
    hydrateIcons();
  });

  DOM.logoutButton?.addEventListener("click", async () => {
    await signOut(auth);
    window.location.href = "index.html";
  });
}

function applySavedTheme() {
  const theme = localStorage.getItem("theme");
  if (theme === "dark") {
    document.body.classList.add("dark-mode");
  }
  updateThemeToggleIcon(document.body.classList.contains("dark-mode"));
}

function updateThemeToggleIcon(isDark) {
  const icon = DOM.themeToggle?.querySelector("i");
  if (icon) {
    icon.setAttribute("data-lucide", isDark ? "sun" : "moon");
  }
}

function handleAuthState() {
  onAuthStateChanged(auth, async (user) => {
    if (!user) {
      window.location.href = "index.html";
      return;
    }
    try {
      const snap = await getDoc(doc(db, "usuarios", user.uid));
      state.profile = snap.data() || {};
      state.role = state.profile.rol || "estudiante";
      updateUserUI(user);
      renderDashboard();
    } catch (error) {
      console.error("No se pudo cargar el perfil", error);
      showErrorState("No pudimos cargar tu información. Intenta nuevamente.");
    }
  });
}

function updateUserUI(user) {
  DOM.userName.textContent = state.profile.nombre || user.displayName || "Usuario";
  DOM.userEmail.textContent = state.profile.email || user.email || "";
  DOM.userPhoto.src =
    state.profile.foto ||
    user.photoURL ||
    `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(
      DOM.userName.textContent
    )}`;
}

function renderDashboard() {
  const resolvedRole = VIEW_CONFIG[state.role] ? state.role : "estudiante";
  const config = VIEW_CONFIG[resolvedRole];
  DOM.pageTitle.textContent = `Hola, ${DOM.userName.textContent.split(" ")[0]}!`;
  DOM.pageSubtitle.textContent = config.subtitle;
  DOM.roleBadge.textContent = (state.profile.rol || resolvedRole).replace("_", " ");
  DOM.roleBadge.hidden = false;

  renderMenu(resolvedRole);
  renderStats(config.stats);
  renderPanels(config.panels);
  renderTimeline(config.timeline);
  toggleSectionsVisibility({ summary: true, panels: true, timeline: true });
  hideLoader();
  hydrateIcons();
}

function renderMenu(roleKey) {
  DOM.menuItems.innerHTML = "";
  const menu = MENU_BY_ROLE[roleKey] || MENU_BY_ROLE.estudiante;
  menu.forEach((item) => {
    const li = document.createElement("li");
    li.className = "menu-item";
    if (item.id === state.currentSection) {
      li.classList.add("active");
    }
    const button = document.createElement("button");
    button.type = "button";
    button.dataset.section = item.id;
    button.innerHTML = `
      <i data-lucide="${item.icon}"></i>
      <span>${item.label}</span>
    `;
    button.addEventListener("click", () => {
      state.currentSection = item.id;
      document.querySelectorAll(".menu-item").forEach((el) => el.classList.remove("active"));
      li.classList.add("active");
      handleSectionChange(item.id);
    });
    li.appendChild(button);
    DOM.menuItems.appendChild(li);
  });
}

function handleSectionChange(section) {
  if (section === "resumen") {
    renderDashboard();
    return;
  }
  DOM.pageTitle.textContent = sectionLabel(section);
  DOM.pageSubtitle.textContent = sectionSubtitle(section);
  toggleSectionsVisibility({ summary: false, panels: true, timeline: false });
  DOM.timelinePanel.hidden = true;
  DOM.summaryGrid.hidden = true;
  DOM.panelsWrapper.hidden = false;
  DOM.panelsWrapper.innerHTML = `
    <div class="card">
      <h3>${sectionLabel(section)}</h3>
      <p class="text-muted">${sectionSubtitle(section)}</p>
      <button class="cta" type="button">
        <span>Crear registro</span>
        <i data-lucide="plus"></i>
      </button>
    </div>
  `;
  hydrateIcons();
}

function sectionLabel(section) {
  const menu = MENU_BY_ROLE[state.role] || MENU_BY_ROLE.estudiante;
  return menu.find((item) => item.id === section)?.label || section;
}

function sectionSubtitle(section) {
  const subtitles = {
    ofertas: "Explora oportunidades compatibles con tu perfil.",
    aplicaciones: "Controla cada postulación y su estado.",
    informes: "Entrega reportes a tiempo y lleva registro histórico.",
    equipo: "Monitorea asignaciones y desempeño del equipo.",
    evaluaciones: "Revisa y aprueba las evaluaciones pendientes.",
    reportes: "Genera reportes exportables en segundos.",
    usuarios: "Gestiona roles y accesos de la plataforma.",
    empresas: "Valida documentación y convenios.",
    analytics: "Obtén indicadores clave en tiempo real.",
  };
  return subtitles[section] || "Sección personalizada.";
}

function renderStats(stats = []) {
  DOM.summaryGrid.innerHTML = "";
  stats.forEach((stat) => {
    const card = document.createElement("article");
    card.className = "card";
    card.innerHTML = `
      <p class="card__title">${stat.title}</p>
      <p class="card__value">${stat.value}</p>
      <p class="trend ${stat.trendType === "down" ? "trend--down" : ""}">
        ${stat.trend}
      </p>
    `;
    DOM.summaryGrid.appendChild(card);
  });
  DOM.summaryGrid.hidden = stats.length === 0;
}

function renderPanels(panels = []) {
  DOM.panelsWrapper.innerHTML = "";
  panels.forEach((panel) => {
    const card = document.createElement("article");
    card.className = "card";
    card.innerHTML = `
      <h3>${panel.title}</h3>
      ${panel.description ? `<p class="text-muted">${panel.description}</p>` : ""}
      ${renderList(panel.list)}
      ${renderActions(panel.actions)}
    `;
    DOM.panelsWrapper.appendChild(card);
  });
  DOM.panelsWrapper.hidden = panels.length === 0;
}

function renderList(list = []) {
  if (!list.length) return "";
  return `
    <ul class="timeline" style="gap:1rem; margin-top:1rem;">
      ${list
        .map(
          (item) => `
        <li style="padding-left:0;">
          <p><strong>${item.label}</strong></p>
          <p class="text-muted">${item.helper || ""}</p>
        </li>
      `
        )
        .join("")}
    </ul>
  `;
}

function renderActions(actions = []) {
  if (!actions.length) return "";
  return `
    <div style="display:flex; flex-wrap:wrap; gap:0.75rem; margin-top:1rem;">
      ${actions
        .map(
          (action) => `
        <button class="cta" type="button">
          <i data-lucide="${action.icon}"></i>
          <span>${action.label}</span>
        </button>
      `
        )
        .join("")}
    </div>
  `;
}

function renderTimeline(items = []) {
  DOM.timelineList.innerHTML = "";
  if (!items.length) {
    DOM.timelinePanel.hidden = true;
    return;
  }
  items.forEach((item) => {
    const li = document.createElement("li");
    li.innerHTML = `
      <p class="timeline__time">${item.time}</p>
      <p><strong>${item.title}</strong></p>
      <p class="text-muted">${item.detail}</p>
    `;
    DOM.timelineList.appendChild(li);
  });
  DOM.timelinePanel.hidden = false;
}

function toggleSectionsVisibility({ summary, panels, timeline }) {
  DOM.summaryGrid.hidden = !summary;
  DOM.panelsWrapper.hidden = !panels;
  DOM.timelinePanel.hidden = !timeline;
  DOM.emptyState.hidden = summary || panels || timeline;
}

function hideLoader() {
  DOM.loader.hidden = true;
}

function showErrorState(message) {
  DOM.loader.hidden = true;
  DOM.emptyState.hidden = false;
  DOM.emptyState.querySelector("p").textContent = message;
}

function hydrateIcons() {
  if (window.lucide?.createIcons) {
    window.lucide.createIcons();
  }
}

