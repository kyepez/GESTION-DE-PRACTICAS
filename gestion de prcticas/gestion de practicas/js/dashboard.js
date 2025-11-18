// Dashboard principal con todas las funcionalidades
import { auth, db } from "./firebase-config.js";
import {
  onAuthStateChanged,
  signOut,
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import {
  doc,
  getDoc,
  collection,
  query,
  where,
  getDocs,
  orderBy,
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { OfertasManager } from "./ofertas.js";
import { AplicacionesManager } from "./aplicaciones.js";
import { PracticasManager } from "./practicas.js";
import { EvaluacionesManager } from "./evaluaciones.js";
import { PerfilManager } from "./perfil.js";
import { StorageManager } from "./storage.js";

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
    { id: "perfil", label: "Mi Perfil", icon: "user" },
    { id: "ofertas", label: "Ofertas activas", icon: "briefcase" },
    { id: "aplicaciones", label: "Mis Postulaciones", icon: "file-plus" },
    { id: "practicas", label: "Mis prácticas", icon: "briefcase" },
    { id: "informes", label: "Informes", icon: "file-text" },
  ],
  empresa: [
    { id: "resumen", label: "Resumen", icon: "layout-dashboard" },
    { id: "perfil", label: "Perfil Empresa", icon: "building-2" },
    { id: "ofertas", label: "Mis Ofertas", icon: "briefcase" },
    { id: "postulantes", label: "Postulantes", icon: "users" },
    { id: "reportes", label: "Reportes", icon: "bar-chart-3" },
  ],
  supervisor_empresa: [
    { id: "resumen", label: "Resumen", icon: "layout-dashboard" },
    { id: "perfil", label: "Mi Perfil", icon: "user" },
    { id: "equipo", label: "Equipo asignado", icon: "users" },
    { id: "evaluaciones", label: "Evaluaciones", icon: "check-circle" },
    { id: "reportes", label: "Reportes", icon: "bar-chart-3" },
  ],
  administrador: [
    { id: "resumen", label: "Resumen", icon: "layout-dashboard" },
    { id: "usuarios", label: "Usuarios", icon: "users" },
    { id: "empresas", label: "Empresas", icon: "building-2" },
    { id: "ofertas", label: "Ofertas", icon: "briefcase" },
    { id: "analytics", label: "Analítica", icon: "line-chart" },
  ],
};

const state = {
  profile: null,
  role: null,
  currentSection: "resumen",
  userId: null,
  managers: {},
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
      const userRef = doc(db, "usuarios", user.uid);
      const snap = await getDoc(userRef);
      state.profile = snap.data() || {};
      state.role = state.profile.rol || "estudiante";
      state.userId = user.uid;
      
      // Inicializar managers
      state.managers.ofertas = new OfertasManager(user.uid, state.role);
      state.managers.aplicaciones = new AplicacionesManager(user.uid, state.role);
      state.managers.practicas = new PracticasManager(user.uid, state.role);
      state.managers.evaluaciones = new EvaluacionesManager(user.uid);
      state.managers.perfil = new PerfilManager(user.uid);
      state.managers.storage = new StorageManager(user.uid);
      
      updateUserUI(user);
      renderDashboard();
    } catch (error) {
      console.error("Error cargando perfil:", error);
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

async function renderDashboard() {
  const resolvedRole = MENU_BY_ROLE[state.role] ? state.role : "estudiante";
  DOM.pageTitle.textContent = `Hola, ${DOM.userName.textContent.split(" ")[0]}!`;
  DOM.pageSubtitle.textContent = getSubtitleForRole(resolvedRole);
  DOM.roleBadge.textContent = (state.profile.rol || resolvedRole).replace("_", " ");
  DOM.roleBadge.hidden = false;

  renderMenu(resolvedRole);
  
  if (state.currentSection === "resumen") {
    await renderResumen(resolvedRole);
  } else {
    await handleSectionChange(state.currentSection);
  }
  
  hideLoader();
  hydrateIcons();
}

function getSubtitleForRole(role) {
  const subtitles = {
    estudiante: "Revisa tu progreso y aplica a oportunidades en segundos.",
    supervisor_empresa: "Supervisa el avance de tu equipo y valida entregables.",
    administrador: "Gestiona usuarios, empresas y analíticas de la plataforma.",
  };
  return subtitles[role] || subtitles.estudiante;
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

async function handleSectionChange(section) {
  DOM.loader.hidden = false;
  DOM.summaryGrid.hidden = true;
  DOM.panelsWrapper.hidden = true;
  DOM.timelinePanel.hidden = true;
  DOM.emptyState.hidden = true;

  const menu = MENU_BY_ROLE[state.role] || MENU_BY_ROLE.estudiante;
  const sectionLabel = menu.find((item) => item.id === section)?.label || section;
  DOM.pageTitle.textContent = sectionLabel;
  DOM.pageSubtitle.textContent = getSectionSubtitle(section);

  try {
    switch (section) {
      case "resumen":
        await renderResumen(state.role);
        break;
      case "perfil":
        await renderPerfil();
        break;
      case "ofertas":
        await renderOfertas();
        break;
      case "aplicaciones":
        await renderAplicaciones();
        break;
      case "postulantes":
        await renderPostulantes();
        break;
      case "practicas":
        await renderPracticas();
        break;
      case "informes":
        await renderInformes();
        break;
      case "equipo":
        await renderEquipo();
        break;
      case "evaluaciones":
        await renderEvaluaciones();
        break;
      case "reportes":
        await renderReportes();
        break;
      case "usuarios":
        await renderUsuarios();
        break;
      case "empresas":
        await renderEmpresas();
        break;
      case "analytics":
        await renderAnalytics();
        break;
      default:
        DOM.panelsWrapper.innerHTML = `<div class="card"><h3>${sectionLabel}</h3><p class="text-muted">Sección en desarrollo</p></div>`;
        DOM.panelsWrapper.hidden = false;
    }
  } catch (error) {
    console.error("Error renderizando sección:", error);
    showErrorState("Error al cargar la sección. Intenta nuevamente.");
  } finally {
    hideLoader();
    hydrateIcons();
  }
}

function getSectionSubtitle(section) {
  const subtitles = {
    perfil: "Completa y actualiza tu información personal y profesional.",
    ofertas: "Explora oportunidades compatibles con tu perfil.",
    aplicaciones: "Controla cada postulación y su estado.",
    postulantes: "Revisa y gestiona las postulaciones recibidas.",
    practicas: "Gestiona tus prácticas profesionales activas.",
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

async function renderResumen(role) {
  try {
    const stats = await getStatsForRole(role);
    renderStats(stats);
    
    const panels = await getPanelsForRole(role);
    renderPanels(panels);
    
    const timeline = await getTimelineForRole(role);
    renderTimeline(timeline);
    
    DOM.summaryGrid.hidden = false;
    DOM.panelsWrapper.hidden = false;
    DOM.timelinePanel.hidden = false;
  } catch (error) {
    console.error("Error renderizando resumen:", error);
  }
}

async function getStatsForRole(role) {
  try {
    if (role === "estudiante") {
      const practicas = await state.managers.practicas.obtenerTodas({ estudiante: state.userId, estado: "en_curso" });
      const aplicaciones = await state.managers.aplicaciones.obtenerTodas({ estudiante: state.userId });
      const pendientes = aplicaciones.filter(a => a.estado === "pendiente").length;
      const horas = practicas.reduce((sum, p) => sum + (p.horas_realizadas || 0), 0);
      
      return [
        { title: "Prácticas activas", value: practicas.length.toString(), trend: `${practicas.length} en curso` },
        { title: "Aplicaciones", value: aplicaciones.length.toString(), trend: `${pendientes} pendientes` },
        { title: "Horas registradas", value: `${horas}h`, trend: "Total acumulado" },
      ];
    } else if (role === "supervisor_empresa") {
      const practicas = await state.managers.practicas.obtenerTodas({ supervisor: state.userId });
      const pendientes = await state.managers.evaluaciones.obtenerPendientes();
      
      return [
        { title: "Estudiantes a cargo", value: practicas.length.toString(), trend: `${practicas.filter(p => p.estado_practica === "en_curso").length} activos` },
        { title: "Informes pendientes", value: pendientes.length.toString(), trend: "Requieren revisión", trendType: "down" },
        { title: "Evaluaciones", value: "12", trend: "+4 este mes" },
      ];
    } else {
      // Admin stats
      return [
        { title: "Usuarios activos", value: "1.235", trend: "+6% vs mes pasado" },
        { title: "Empresas verificadas", value: "180", trend: "+12 nuevas" },
        { title: "Prácticas cerradas", value: "920", trend: "+58 este trimestre" },
      ];
    }
  } catch (error) {
    console.error("Error obteniendo stats:", error);
    return [];
  }
}

async function getPanelsForRole(role) {
  if (role === "estudiante") {
    try {
      const ofertas = await state.managers.ofertas.obtenerTodas({ estado: "activa" });
      const recomendadas = ofertas.slice(0, 3);
      
      return [
        {
          title: "Ofertas recomendadas",
          description: `${ofertas.length} oportunidades disponibles`,
          list: recomendadas.map(o => ({
            label: o.titulo,
            helper: `${o.empresa || "Empresa"} · ${o.modalidad || "Presencial"}`,
          })),
        },
        {
          title: "Acciones rápidas",
          actions: [
            { label: "Buscar ofertas", icon: "search", action: () => handleSectionChange("ofertas") },
            { label: "Ver aplicaciones", icon: "file-plus", action: () => handleSectionChange("aplicaciones") },
          ],
        },
      ];
    } catch (error) {
      return [];
    }
  }
  return [];
}

async function getTimelineForRole(role) {
  // Timeline básico - se puede mejorar con datos reales
  if (role === "estudiante") {
    return [
      { title: "Última actividad", time: "Hoy", detail: "Sistema actualizado" },
    ];
  }
  return [];
}

async function renderOfertas() {
  try {
    const ofertas = await state.managers.ofertas.obtenerTodas({ estado: "activa" });
    
    if (ofertas.length === 0) {
      DOM.panelsWrapper.innerHTML = `
        <div class="card empty-state">
          <h3>No hay ofertas disponibles</h3>
          <p class="text-muted">Vuelve más tarde para ver nuevas oportunidades.</p>
        </div>
      `;
      DOM.panelsWrapper.hidden = false;
      return;
    }

    DOM.panelsWrapper.innerHTML = `
      <div class="grid grid--2">
        ${ofertas.map(oferta => `
          <div class="card">
            <h3>${oferta.titulo}</h3>
            <p class="text-muted">${oferta.descripcion?.substring(0, 150)}...</p>
            <div style="margin-top: 1rem; display: flex; gap: 0.5rem; flex-wrap: wrap;">
              <span class="status-badge status-badge--info">${oferta.estado}</span>
              ${state.role === "estudiante" ? `
                <button class="btn-primary" onclick="aplicarAOferta('${oferta.id}')">
                  Aplicar ahora
                </button>
              ` : ""}
            </div>
          </div>
        `).join("")}
      </div>
    `;
    DOM.panelsWrapper.hidden = false;
  } catch (error) {
    console.error("Error renderizando ofertas:", error);
    showErrorState("Error al cargar las ofertas.");
  }
}

async function renderAplicaciones() {
  try {
    const aplicaciones = await state.managers.aplicaciones.obtenerTodas({ estudiante: state.userId });
    
    if (aplicaciones.length === 0) {
      DOM.panelsWrapper.innerHTML = `
        <div class="card empty-state">
          <h3>No tienes postulaciones</h3>
          <p class="text-muted">Comienza aplicando a ofertas disponibles.</p>
          <button class="cta" onclick="handleSectionChange('ofertas')">
            <span>Ver ofertas</span>
            <i data-lucide="arrow-right"></i>
          </button>
        </div>
      `;
      DOM.panelsWrapper.hidden = false;
      return;
    }

    // Obtener detalles de las ofertas
    const aplicacionesConDetalles = await Promise.all(
      aplicaciones.map(async (app) => {
        try {
          const ofertas = await state.managers.ofertas.obtenerTodas();
          const oferta = ofertas.find(o => o.id === app.id_oferta);
          return { ...app, oferta };
        } catch {
          return app;
        }
      })
    );

    DOM.panelsWrapper.innerHTML = `
      <div class="table-wrapper">
        <table class="table">
          <thead>
            <tr>
              <th>Oferta</th>
              <th>Empresa</th>
              <th>Estado</th>
              <th>Fecha de postulación</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            ${aplicacionesConDetalles.map(app => `
              <tr>
                <td><strong>${app.oferta?.titulo || "Oferta eliminada"}</strong></td>
                <td>${app.oferta?.empresa || "N/A"}</td>
                <td><span class="status-badge status-badge--${getStatusClass(app.estado)}">${app.estado}</span></td>
                <td>${formatDate(app.fecha_aplicacion)}</td>
                <td>
                  <button class="btn-secondary" onclick="verDetalleAplicacion('${app.id}')">Ver detalles</button>
                  ${app.estado === "aprobada" ? `
                    <button class="btn-primary" onclick="aceptarOferta('${app.id}')">Aceptar</button>
                  ` : ""}
                </td>
              </tr>
            `).join("")}
          </tbody>
        </table>
      </div>
    `;
    DOM.panelsWrapper.hidden = false;
    hydrateIcons();
  } catch (error) {
    console.error("Error renderizando aplicaciones:", error);
    showErrorState("Error al cargar las postulaciones.");
  }
}

async function renderPracticas() {
  try {
    const practicas = await state.managers.practicas.obtenerTodas({ estudiante: state.userId });
    
    if (practicas.length === 0) {
      DOM.panelsWrapper.innerHTML = `
        <div class="card empty-state">
          <h3>No tienes prácticas activas</h3>
          <p class="text-muted">Comienza aplicando a ofertas para iniciar una práctica.</p>
        </div>
      `;
      DOM.panelsWrapper.hidden = false;
      return;
    }

    DOM.panelsWrapper.innerHTML = `
      <div class="grid grid--2">
        ${practicas.map(p => `
          <div class="card">
            <h3>Práctica #${p.id}</h3>
            <p class="text-muted">Estado: ${p.estado_practica}</p>
            <p>Horas: ${p.horas_realizadas || 0} / ${p.horas_totales || 0}</p>
            <button class="btn-primary" onclick="verDetallePractica('${p.id}')">Ver detalles</button>
          </div>
        `).join("")}
      </div>
    `;
    DOM.panelsWrapper.hidden = false;
  } catch (error) {
    console.error("Error renderizando prácticas:", error);
    showErrorState("Error al cargar las prácticas.");
  }
}

async function renderInformes() {
  DOM.panelsWrapper.innerHTML = `
    <div class="card">
      <h3>Gestión de Informes</h3>
      <p class="text-muted">Crea y gestiona tus informes de práctica.</p>
      <button class="cta" onclick="crearNuevoInforme()">
        <i data-lucide="plus"></i>
        <span>Nuevo informe</span>
      </button>
    </div>
  `;
  DOM.panelsWrapper.hidden = false;
}

async function renderEquipo() {
  try {
    const practicas = await state.managers.practicas.obtenerTodas({ supervisor: state.userId });
    DOM.panelsWrapper.innerHTML = `
      <div class="grid grid--2">
        ${practicas.map(p => `
          <div class="card">
            <h3>Estudiante #${p.id_usuario}</h3>
            <p class="text-muted">Estado: ${p.estado_practica}</p>
            <button class="btn-primary" onclick="verDetalleEstudiante('${p.id}')">Ver detalles</button>
          </div>
        `).join("")}
      </div>
    `;
    DOM.panelsWrapper.hidden = false;
  } catch (error) {
    showErrorState("Error al cargar el equipo.");
  }
}

async function renderEvaluaciones() {
  try {
    const pendientes = await state.managers.evaluaciones.obtenerPendientes();
    DOM.panelsWrapper.innerHTML = `
      <div class="card">
        <h3>Evaluaciones pendientes</h3>
        <p class="text-muted">${pendientes.length} informes requieren revisión</p>
        ${pendientes.length > 0 ? `
          <div class="table-wrapper" style="margin-top: 1.5rem;">
            <table class="table">
              <thead>
                <tr>
                  <th>Informe</th>
                  <th>Estudiante</th>
                  <th>Fecha</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                ${pendientes.map(e => `
                  <tr>
                    <td>${e.titulo_informe}</td>
                    <td>${e.practica?.id_usuario || "N/A"}</td>
                    <td>${formatDate(e.fecha_entrega)}</td>
                    <td>
                      <button class="btn-primary" onclick="evaluarInforme('${e.id}')">Evaluar</button>
                    </td>
                  </tr>
                `).join("")}
              </tbody>
            </table>
          </div>
        ` : ""}
      </div>
    `;
    DOM.panelsWrapper.hidden = false;
  } catch (error) {
    showErrorState("Error al cargar evaluaciones.");
  }
}

async function renderReportes() {
  DOM.panelsWrapper.innerHTML = `
    <div class="card">
      <h3>Generar Reportes</h3>
      <p class="text-muted">Exporta reportes de seguimiento y evaluación.</p>
      <button class="cta">
        <i data-lucide="download"></i>
        <span>Generar reporte</span>
      </button>
    </div>
  `;
  DOM.panelsWrapper.hidden = false;
}

async function renderUsuarios() {
  DOM.panelsWrapper.innerHTML = `
    <div class="card">
      <h3>Gestión de Usuarios</h3>
      <p class="text-muted">Administra usuarios y roles del sistema.</p>
    </div>
  `;
  DOM.panelsWrapper.hidden = false;
}

async function renderEmpresas() {
  DOM.panelsWrapper.innerHTML = `
    <div class="card">
      <h3>Gestión de Empresas</h3>
      <p class="text-muted">Valida y gestiona empresas registradas.</p>
    </div>
  `;
  DOM.panelsWrapper.hidden = false;
}

async function renderAnalytics() {
  DOM.panelsWrapper.innerHTML = `
    <div class="card">
      <h3>Analítica de la Plataforma</h3>
      <p class="text-muted">Métricas y estadísticas en tiempo real.</p>
    </div>
  `;
  DOM.panelsWrapper.hidden = false;
}

async function renderPerfil() {
  try {
    const perfil = await state.managers.perfil.obtenerPerfil();
    
    if (!perfil) {
      DOM.panelsWrapper.innerHTML = `
        <div class="card empty-state">
          <h3>Error al cargar perfil</h3>
          <p class="text-muted">No se pudo cargar tu información.</p>
        </div>
      `;
      DOM.panelsWrapper.hidden = false;
      return;
    }

    const esEstudiante = state.role === "estudiante";
    const esEmpresa = state.role === "empresa";

    DOM.panelsWrapper.innerHTML = `
      <div class="card">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 2rem;">
          <h3>Información Personal</h3>
          <button class="btn-primary" onclick="editarPerfil()">
            <i data-lucide="edit"></i>
            <span>Editar Perfil</span>
          </button>
        </div>
        
        <div class="grid grid--2" style="margin-bottom: 2rem;">
          <div class="form-group">
            <label class="form-label">Nombre completo</label>
            <input type="text" class="form-input" id="perfilNombre" value="${perfil.nombre || ""}" readonly />
          </div>
          <div class="form-group">
            <label class="form-label">Correo electrónico</label>
            <input type="email" class="form-input" id="perfilEmail" value="${perfil.email || ""}" readonly />
          </div>
          ${esEstudiante ? `
            <div class="form-group">
              <label class="form-label">Carrera</label>
              <input type="text" class="form-input" id="perfilCarrera" value="${perfil.carrera || ""}" readonly />
            </div>
            <div class="form-group">
              <label class="form-label">Semestre</label>
              <input type="number" class="form-input" id="perfilSemestre" value="${perfil.semestre || ""}" readonly />
            </div>
            <div class="form-group">
              <label class="form-label">Teléfono</label>
              <input type="tel" class="form-input" id="perfilTelefono" value="${perfil.telefono || ""}" readonly />
            </div>
            <div class="form-group">
              <label class="form-label">Documento de identidad</label>
              <input type="text" class="form-input" id="perfilDocumento" value="${perfil.documento || ""}" readonly />
            </div>
          ` : ""}
          ${esEmpresa ? `
            <div class="form-group">
              <label class="form-label">Nombre de la empresa</label>
              <input type="text" class="form-input" id="perfilEmpresa" value="${perfil.nombre_empresa || ""}" readonly />
            </div>
            <div class="form-group">
              <label class="form-label">NIT</label>
              <input type="text" class="form-input" id="perfilNIT" value="${perfil.nit || ""}" readonly />
            </div>
            <div class="form-group">
              <label class="form-label">Sector</label>
              <input type="text" class="form-input" id="perfilSector" value="${perfil.sector || ""}" readonly />
            </div>
            <div class="form-group">
              <label class="form-label">Dirección</label>
              <input type="text" class="form-input" id="perfilDireccion" value="${perfil.direccion || ""}" readonly />
            </div>
          ` : ""}
        </div>

        ${esEstudiante ? `
          <div class="card" style="margin-top: 2rem;">
            <h3>Hoja de Vida (CV)</h3>
            <div id="cvSection">
              ${perfil.cv_url ? `
                <p class="text-muted">CV actual: <a href="${perfil.cv_url}" target="_blank">Ver CV</a></p>
                <button class="btn-secondary" onclick="eliminarCV()">Eliminar CV</button>
              ` : `
                <p class="text-muted">No has subido tu CV aún.</p>
              `}
              <input type="file" id="cvInput" accept=".pdf,.doc,.docx" style="margin-top: 1rem; display: none;" />
              <button class="btn-primary" onclick="document.getElementById('cvInput').click()">
                <i data-lucide="upload"></i>
                <span>${perfil.cv_url ? "Actualizar CV" : "Subir CV"}</span>
              </button>
            </div>
          </div>
          
          <div class="card" style="margin-top: 2rem;">
            <h3>Descripción Personal</h3>
            <textarea class="form-textarea" id="perfilDescripcion" readonly>${perfil.descripcion || ""}</textarea>
          </div>
        ` : ""}
        
        <div style="margin-top: 2rem; display: none;" id="perfilEditActions">
          <button class="btn-primary" onclick="guardarPerfil()">Guardar Cambios</button>
          <button class="btn-secondary" onclick="cancelarEdicionPerfil()">Cancelar</button>
        </div>
      </div>
    `;
    
    // Manejar subida de CV
    const cvInput = document.getElementById("cvInput");
    if (cvInput) {
      cvInput.addEventListener("change", async (e) => {
        const archivo = e.target.files[0];
        if (!archivo) return;
        
        try {
          const btn = e.target.nextElementSibling;
          btn.disabled = true;
          btn.innerHTML = '<span class="spinner-mini"></span> Subiendo...';
          
          const resultado = await state.managers.storage.subirCV(archivo);
          await state.managers.perfil.actualizarCV(resultado.url);
          
          alert("CV subido exitosamente");
          await renderPerfil();
        } catch (error) {
          alert("Error: " + error.message);
          e.target.value = "";
        }
      });
    }
    
    DOM.panelsWrapper.hidden = false;
    hydrateIcons();
  } catch (error) {
    console.error("Error renderizando perfil:", error);
    showErrorState("Error al cargar el perfil.");
  }
}

async function renderPostulantes() {
  try {
    // Obtener ofertas de la empresa
    const ofertas = await state.managers.ofertas.obtenerTodas({ empresa: state.userId });
    
    if (ofertas.length === 0) {
      DOM.panelsWrapper.innerHTML = `
        <div class="card empty-state">
          <h3>No tienes ofertas publicadas</h3>
          <p class="text-muted">Crea una oferta para comenzar a recibir postulaciones.</p>
        </div>
      `;
      DOM.panelsWrapper.hidden = false;
      return;
    }

    // Obtener todas las aplicaciones de las ofertas
    const todasAplicaciones = [];
    for (const oferta of ofertas) {
      const aplicaciones = await state.managers.aplicaciones.obtenerTodas({ oferta: oferta.id });
      aplicaciones.forEach(app => {
        todasAplicaciones.push({ ...app, oferta: oferta });
      });
    }

    if (todasAplicaciones.length === 0) {
      DOM.panelsWrapper.innerHTML = `
        <div class="card empty-state">
          <h3>No hay postulaciones aún</h3>
          <p class="text-muted">Las postulaciones aparecerán aquí cuando los estudiantes apliquen a tus ofertas.</p>
        </div>
      `;
      DOM.panelsWrapper.hidden = false;
      return;
    }

    DOM.panelsWrapper.innerHTML = `
      <div class="table-wrapper">
        <table class="table">
          <thead>
            <tr>
              <th>Postulante</th>
              <th>Oferta</th>
              <th>Estado</th>
              <th>Fecha</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            ${todasAplicaciones.map(app => `
              <tr>
                <td>${app.id_usuario}</td>
                <td>${app.oferta?.titulo || "N/A"}</td>
                <td><span class="status-badge status-badge--${getStatusClass(app.estado)}">${app.estado}</span></td>
                <td>${formatDate(app.fecha_aplicacion)}</td>
                <td>
                  <button class="btn-primary" onclick="verPostulante('${app.id}')">Ver</button>
                  ${app.estado === "pendiente" ? `
                    <button class="btn-secondary" onclick="aprobarPostulacion('${app.id}')">Aprobar</button>
                    <button class="btn-secondary" onclick="rechazarPostulacion('${app.id}')">Rechazar</button>
                  ` : ""}
                </td>
              </tr>
            `).join("")}
          </tbody>
        </table>
      </div>
    `;
    DOM.panelsWrapper.hidden = false;
  } catch (error) {
    console.error("Error renderizando postulantes:", error);
    showErrorState("Error al cargar las postulaciones.");
  }
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
        <button class="cta" type="button" ${action.action ? `onclick="(${action.action.toString()})()"` : ""}>
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

function hideLoader() {
  DOM.loader.hidden = true;
}

function showErrorState(message) {
  DOM.loader.hidden = true;
  DOM.emptyState.hidden = false;
  const p = DOM.emptyState.querySelector("p");
  if (p) p.textContent = message;
}

function hydrateIcons() {
  if (window.lucide?.createIcons) {
    window.lucide.createIcons();
  }
}

function formatDate(timestamp) {
  if (!timestamp) return "N/A";
  const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
  return date.toLocaleDateString("es-ES");
}

function getStatusClass(status) {
  const statusMap = {
    pendiente: "warning",
    aprobada: "success",
    rechazada: "danger",
    activa: "info",
  };
  return statusMap[status] || "info";
}

// Funciones globales para botones
window.aplicarAOferta = async function(ofertaId) {
  try {
    await state.managers.aplicaciones.aplicarAOferta(ofertaId, {
      mensaje: "Aplicación desde dashboard",
    });
    alert("¡Aplicación enviada exitosamente!");
    await renderAplicaciones();
  } catch (error) {
    alert("Error: " + error.message);
  }
};

window.verDetalleAplicacion = async function(id) {
  try {
    const aplicacion = await state.managers.aplicaciones.obtenerPorId(id);
    const ofertas = await state.managers.ofertas.obtenerTodas();
    const oferta = ofertas.find(o => o.id === aplicacion.id_oferta);

    const modal = document.createElement("div");
    modal.className = "modal-overlay";
    modal.innerHTML = `
      <div class="modal-content">
        <h2>Detalle de Postulación</h2>
        <div class="form-group">
          <label><strong>Oferta:</strong> ${oferta?.titulo || "N/A"}</label>
        </div>
        <div class="form-group">
          <label><strong>Estado:</strong> <span class="status-badge status-badge--${getStatusClass(aplicacion.estado)}">${aplicacion.estado}</span></label>
        </div>
        <div class="form-group">
          <label><strong>Fecha de postulación:</strong> ${formatDate(aplicacion.fecha_aplicacion)}</label>
        </div>
        ${aplicacion.mensaje ? `
          <div class="form-group">
            <label><strong>Mensaje enviado:</strong></label>
            <p>${aplicacion.mensaje}</p>
          </div>
        ` : ""}
        ${aplicacion.comentario ? `
          <div class="form-group">
            <label><strong>Comentario de la empresa:</strong></label>
            <p>${aplicacion.comentario}</p>
          </div>
        ` : ""}
        <button class="btn-secondary" onclick="this.closest('.modal-overlay').remove()">Cerrar</button>
      </div>
    `;
    document.body.appendChild(modal);
    hydrateIcons();
  } catch (error) {
    alert("Error: " + error.message);
  }
};

window.aceptarOferta = async function(aplicacionId) {
  if (!confirm("¿Aceptar esta oferta y comenzar la práctica?")) return;
  
  try {
    const aplicacion = await state.managers.aplicaciones.obtenerPorId(aplicacionId);
    await state.managers.practicas.crear({
      id_aplicacion: aplicacionId,
      id_estudiante: state.userId,
      fecha_inicio: new Date().toISOString().split('T')[0],
      horas_totales: 240, // Por defecto
    });
    alert("¡Práctica iniciada exitosamente!");
    await handleSectionChange("practicas");
  } catch (error) {
    alert("Error: " + error.message);
  }
};

window.verDetallePractica = function(id) {
  alert("Ver detalle de práctica: " + id);
};

window.verDetalleEstudiante = function(id) {
  alert("Ver detalle de estudiante: " + id);
};

window.evaluarInforme = function(id) {
  alert("Evaluar informe: " + id);
};

window.crearNuevoInforme = function() {
  alert("Crear nuevo informe");
};

window.editarPerfil = function() {
  const inputs = document.querySelectorAll("#perfilNombre, #perfilEmail, #perfilCarrera, #perfilSemestre, #perfilTelefono, #perfilDocumento, #perfilEmpresa, #perfilNIT, #perfilSector, #perfilDireccion, #perfilDescripcion");
  inputs.forEach(input => {
    if (input) input.removeAttribute("readonly");
  });
  document.getElementById("perfilEditActions").style.display = "flex";
  document.getElementById("perfilEditActions").style.gap = "1rem";
};

window.cancelarEdicionPerfil = async function() {
  await renderPerfil();
};

window.guardarPerfil = async function() {
  try {
    const datos = {
      nombre: document.getElementById("perfilNombre")?.value || "",
      email: document.getElementById("perfilEmail")?.value || "",
    };

    if (state.role === "estudiante") {
      datos.carrera = document.getElementById("perfilCarrera")?.value || "";
      datos.semestre = parseInt(document.getElementById("perfilSemestre")?.value) || null;
      datos.telefono = document.getElementById("perfilTelefono")?.value || "";
      datos.documento = document.getElementById("perfilDocumento")?.value || "";
      datos.descripcion = document.getElementById("perfilDescripcion")?.value || "";
    }

    if (state.role === "empresa") {
      datos.nombre_empresa = document.getElementById("perfilEmpresa")?.value || "";
      datos.nit = document.getElementById("perfilNIT")?.value || "";
      datos.sector = document.getElementById("perfilSector")?.value || "";
      datos.direccion = document.getElementById("perfilDireccion")?.value || "";
    }

    await state.managers.perfil.actualizarPerfil(datos);
    alert("Perfil actualizado exitosamente");
    await renderPerfil();
  } catch (error) {
    alert("Error: " + error.message);
  }
};

window.eliminarCV = async function() {
  if (!confirm("¿Estás seguro de eliminar tu CV?")) return;
  
  try {
    await state.managers.perfil.actualizarCV("");
    alert("CV eliminado");
    await renderPerfil();
  } catch (error) {
    alert("Error: " + error.message);
  }
};

window.verPostulante = async function(aplicacionId) {
  try {
    const aplicacion = await state.managers.aplicaciones.obtenerPorId(aplicacionId);
    const estudianteRef = doc(db, "usuarios", aplicacion.id_usuario);
    const estudianteSnap = await getDoc(estudianteRef);
    const estudiante = estudianteSnap.data();

    const modal = document.createElement("div");
    modal.className = "modal-overlay";
    modal.innerHTML = `
      <div class="modal-content">
        <h2>Detalle del Postulante</h2>
        <div class="form-group">
          <label>Nombre: ${estudiante?.nombre || "N/A"}</label>
        </div>
        <div class="form-group">
          <label>Email: ${estudiante?.email || "N/A"}</label>
        </div>
        <div class="form-group">
          <label>Carrera: ${estudiante?.carrera || "N/A"}</label>
        </div>
        ${estudiante?.cv_url ? `
          <div class="form-group">
            <a href="${estudiante.cv_url}" target="_blank" class="btn-primary">Ver CV</a>
          </div>
        ` : ""}
        <div class="form-group">
          <label>Mensaje:</label>
          <p>${aplicacion.mensaje || "Sin mensaje"}</p>
        </div>
        <button class="btn-secondary" onclick="this.closest('.modal-overlay').remove()">Cerrar</button>
      </div>
    `;
    document.body.appendChild(modal);
  } catch (error) {
    alert("Error: " + error.message);
  }
};

window.aprobarPostulacion = async function(aplicacionId) {
  if (!confirm("¿Aprobar esta postulación?")) return;
  
  try {
    await state.managers.aplicaciones.actualizarEstado(aplicacionId, "aprobada", "Postulación aprobada");
    alert("Postulación aprobada");
    await renderPostulantes();
  } catch (error) {
    alert("Error: " + error.message);
  }
};

window.rechazarPostulacion = async function(aplicacionId) {
  const motivo = prompt("Motivo del rechazo (opcional):");
  if (motivo === null) return;
  
  try {
    await state.managers.aplicaciones.actualizarEstado(aplicacionId, "rechazada", motivo || "Postulación rechazada");
    alert("Postulación rechazada");
    await renderPostulantes();
  } catch (error) {
    alert("Error: " + error.message);
  }
};

window.handleSectionChange = handleSectionChange;
