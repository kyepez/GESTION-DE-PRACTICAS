// Módulo para selección de rol después de autenticación
import { db } from "./firebase-config.js";
import { doc, getDoc, setDoc, Timestamp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

export class RolSelector {
  constructor(userId, userData) {
    this.userId = userId;
    this.userData = userData;
  }

  async mostrarSelector() {
    return new Promise((resolve) => {
      // Crear modal
      const modal = document.createElement("div");
      modal.className = "rol-selector-modal";
      modal.innerHTML = `
        <div class="rol-selector-overlay"></div>
        <div class="rol-selector-content">
          <h2>Selecciona tu tipo de cuenta</h2>
          <p class="text-muted">Elige cómo quieres usar la plataforma</p>
          <div class="rol-selector-grid">
            <button class="rol-option" data-rol="estudiante">
              <div class="rol-icon">🎓</div>
              <h3>Estudiante</h3>
              <p>Busco oportunidades de práctica profesional</p>
            </button>
            <button class="rol-option" data-rol="empresa">
              <div class="rol-icon">🏢</div>
              <h3>Empresa</h3>
              <p>Ofrezco prácticas y busco talento</p>
            </button>
            <button class="rol-option" data-rol="supervisor_empresa">
              <div class="rol-icon">👔</div>
              <h3>Supervisor</h3>
              <p>Superviso estudiantes en prácticas</p>
            </button>
          </div>
        </div>
      `;

      document.body.appendChild(modal);

      // Agregar estilos si no existen
      if (!document.getElementById("rol-selector-styles")) {
        const style = document.createElement("style");
        style.id = "rol-selector-styles";
        style.textContent = `
          .rol-selector-modal {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            z-index: 10000;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 1rem;
          }
          .rol-selector-overlay {
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0, 0, 0, 0.7);
            backdrop-filter: blur(4px);
          }
          .rol-selector-content {
            position: relative;
            background: white;
            border-radius: 1.5rem;
            padding: 3rem;
            max-width: 800px;
            width: 100%;
            box-shadow: 0 25px 80px rgba(0, 0, 0, 0.3);
            z-index: 1;
          }
          .rol-selector-content h2 {
            font-size: 2rem;
            margin-bottom: 0.5rem;
            color: #0f172a;
          }
          .rol-selector-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 1.5rem;
            margin-top: 2rem;
          }
          .rol-option {
            background: #f8fafc;
            border: 2px solid #e2e8f0;
            border-radius: 1rem;
            padding: 2rem 1.5rem;
            cursor: pointer;
            transition: all 0.3s ease;
            text-align: center;
          }
          .rol-option:hover {
            border-color: #667eea;
            background: #f0f4ff;
            transform: translateY(-4px);
            box-shadow: 0 12px 30px rgba(102, 126, 234, 0.2);
          }
          .rol-option.selected {
            border-color: #667eea;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
          }
          .rol-icon {
            font-size: 3rem;
            margin-bottom: 1rem;
          }
          .rol-option h3 {
            font-size: 1.25rem;
            margin-bottom: 0.5rem;
          }
          .rol-option p {
            font-size: 0.9rem;
            opacity: 0.8;
          }
        `;
        document.head.appendChild(style);
      }

      // Manejar selección
      const options = modal.querySelectorAll(".rol-option");
      options.forEach((option) => {
        option.addEventListener("click", async () => {
          const rol = option.dataset.rol;
          option.classList.add("selected");
          
          // Guardar rol en Firebase
          await this.guardarRol(rol);
          
          // Esperar un momento para mostrar la selección
          setTimeout(() => {
            modal.remove();
            resolve(rol);
          }, 500);
        });
      });
    });
  }

  async guardarRol(rol) {
    try {
      const userRef = doc(db, "usuarios", this.userId);
      await setDoc(
        userRef,
        {
          uid: this.userId,
          nombre: this.userData.displayName || this.userData.nombre || "",
          email: this.userData.email || "",
          foto: this.userData.photoURL || this.userData.foto || "",
          rol: rol,
          datos_completos: false,
          fecha_registro: Timestamp.now(),
        },
        { merge: true }
      );
    } catch (error) {
      console.error("Error guardando rol:", error);
      throw error;
    }
  }
}

