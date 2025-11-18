// Módulo de gestión de aplicaciones
import { db } from "./firebase-config.js";
import {
  collection,
  query,
  where,
  getDocs,
  addDoc,
  updateDoc,
  doc,
  orderBy,
  Timestamp,
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

export class AplicacionesManager {
  constructor(userId, userRole) {
    this.userId = userId;
    this.userRole = userRole;
    this.collection = collection(db, "aplicaciones");
  }

  async obtenerTodas(filtros = {}) {
    try {
      let q = query(this.collection, orderBy("fecha_aplicacion", "desc"));
      
      if (filtros.estudiante) {
        q = query(q, where("id_usuario", "==", filtros.estudiante));
      }
      
      if (filtros.oferta) {
        q = query(q, where("id_oferta", "==", filtros.oferta));
      }
      
      if (filtros.estado) {
        q = query(q, where("estado", "==", filtros.estado));
      }

      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    } catch (error) {
      console.error("Error obteniendo aplicaciones:", error);
      throw error;
    }
  }

  async aplicarAOferta(ofertaId, datos) {
    try {
      // Verificar si ya aplicó
      const existentes = await this.obtenerTodas({
        estudiante: this.userId,
        oferta: ofertaId
      });
      
      if (existentes.length > 0) {
        throw new Error("Ya has aplicado a esta oferta");
      }

      const nuevaAplicacion = {
        id_usuario: this.userId,
        id_oferta: ofertaId,
        estado: "pendiente",
        mensaje: datos.mensaje || "",
        carta_presentacion: datos.carta_presentacion || "",
        cv_url: datos.cv_url || "",
        fecha_aplicacion: Timestamp.now(),
      };
      
      const docRef = await addDoc(this.collection, nuevaAplicacion);
      return { id: docRef.id, ...nuevaAplicacion };
    } catch (error) {
      console.error("Error aplicando:", error);
      throw error;
    }
  }

  async actualizarEstado(aplicacionId, nuevoEstado, comentario = "") {
    try {
      const docRef = doc(this.collection, aplicacionId);
      await updateDoc(docRef, {
        estado: nuevoEstado,
        comentario: comentario,
        fecha_revision: Timestamp.now(),
        revisado_por: this.userId,
      });
      return true;
    } catch (error) {
      console.error("Error actualizando estado:", error);
      throw error;
    }
  }

  async obtenerPorId(aplicacionId) {
    try {
      const docRef = doc(this.collection, aplicacionId);
      const snapshot = await getDocs(query(this.collection, where("__name__", "==", aplicacionId)));
      if (!snapshot.empty) {
        return { id: snapshot.docs[0].id, ...snapshot.docs[0].data() };
      }
      return null;
    } catch (error) {
      console.error("Error obteniendo aplicación:", error);
      throw error;
    }
  }
}

