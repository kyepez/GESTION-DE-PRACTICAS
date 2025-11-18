// Módulo de gestión de perfil de usuario
import { db } from "./firebase-config.js";
import {
  doc,
  getDoc,
  updateDoc,
  setDoc,
  Timestamp,
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

export class PerfilManager {
  constructor(userId) {
    this.userId = userId;
  }

  async obtenerPerfil() {
    try {
      const userRef = doc(db, "usuarios", this.userId);
      const snap = await getDoc(userRef);
      
      if (!snap.exists()) {
        return null;
      }
      
      return {
        id: snap.id,
        ...snap.data()
      };
    } catch (error) {
      console.error("Error obteniendo perfil:", error);
      throw error;
    }
  }

  async actualizarPerfil(datos) {
    try {
      const userRef = doc(db, "usuarios", this.userId);
      const datosActualizados = {
        ...datos,
        fecha_actualizacion: Timestamp.now(),
        datos_completos: this.verificarDatosCompletos(datos),
      };
      
      await updateDoc(userRef, datosActualizados);
      return true;
    } catch (error) {
      console.error("Error actualizando perfil:", error);
      throw error;
    }
  }

  async completarPerfilInicial(datos) {
    try {
      const userRef = doc(db, "usuarios", this.userId);
      const perfilCompleto = {
        ...datos,
        datos_completos: true,
        fecha_registro: Timestamp.now(),
        fecha_actualizacion: Timestamp.now(),
      };
      
      await setDoc(userRef, perfilCompleto, { merge: true });
      return true;
    } catch (error) {
      console.error("Error completando perfil:", error);
      throw error;
    }
  }

  verificarDatosCompletos(datos) {
    // Para estudiantes
    if (datos.rol === "estudiante") {
      return !!(
        datos.nombre &&
        datos.email &&
        datos.carrera &&
        datos.semestre &&
        datos.cv_url
      );
    }
    
    // Para empresas
    if (datos.rol === "empresa" || datos.rol === "supervisor_empresa") {
      return !!(
        datos.nombre &&
        datos.email &&
        datos.nombre_empresa &&
        datos.nit
      );
    }
    
    return false;
  }

  async actualizarCV(cvUrl) {
    try {
      return await this.actualizarPerfil({ cv_url: cvUrl });
    } catch (error) {
      console.error("Error actualizando CV:", error);
      throw error;
    }
  }
}

