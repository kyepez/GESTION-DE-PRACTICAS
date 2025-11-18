// Módulo de gestión de ofertas
import { db } from "./firebase-config.js";
import {
  collection,
  query,
  where,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  orderBy,
  limit,
  Timestamp,
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

export class OfertasManager {
  constructor(userId, userRole) {
    this.userId = userId;
    this.userRole = userRole;
    this.collection = collection(db, "ofertas");
  }

  async obtenerTodas(filtros = {}) {
    try {
      let q = query(this.collection, orderBy("fecha_publicacion", "desc"));
      
      if (filtros.estado) {
        q = query(q, where("estado", "==", filtros.estado));
      }
      
      if (filtros.empresa) {
        q = query(q, where("id_empresa", "==", filtros.empresa));
      }

      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    } catch (error) {
      console.error("Error obteniendo ofertas:", error);
      throw error;
    }
  }

  async obtenerPorId(ofertaId) {
    try {
      const docRef = doc(this.collection, ofertaId);
      const docSnap = await getDocs(query(this.collection, where("__name__", "==", ofertaId)));
      if (!docSnap.empty) {
        return { id: docSnap.docs[0].id, ...docSnap.docs[0].data() };
      }
      return null;
    } catch (error) {
      console.error("Error obteniendo oferta:", error);
      throw error;
    }
  }

  async crear(datos) {
    try {
      const nuevaOferta = {
        ...datos,
        id_empresa: this.userId,
        fecha_publicacion: Timestamp.now(),
        fecha_limite: datos.fecha_limite ? Timestamp.fromDate(new Date(datos.fecha_limite)) : null,
        estado: "activa",
        aplicaciones_count: 0,
        creado_por: this.userId,
      };
      
      const docRef = await addDoc(this.collection, nuevaOferta);
      return { id: docRef.id, ...nuevaOferta };
    } catch (error) {
      console.error("Error creando oferta:", error);
      throw error;
    }
  }

  async actualizar(ofertaId, datos) {
    try {
      const docRef = doc(this.collection, ofertaId);
      await updateDoc(docRef, {
        ...datos,
        fecha_actualizacion: Timestamp.now(),
      });
      return true;
    } catch (error) {
      console.error("Error actualizando oferta:", error);
      throw error;
    }
  }

  async eliminar(ofertaId) {
    try {
      const docRef = doc(this.collection, ofertaId);
      await deleteDoc(docRef);
      return true;
    } catch (error) {
      console.error("Error eliminando oferta:", error);
      throw error;
    }
  }

  async cambiarEstado(ofertaId, nuevoEstado) {
    try {
      return await this.actualizar(ofertaId, { estado: nuevoEstado });
    } catch (error) {
      console.error("Error cambiando estado:", error);
      throw error;
    }
  }
}

