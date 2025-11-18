// Módulo de gestión de prácticas e informes
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

export class PracticasManager {
  constructor(userId, userRole) {
    this.userId = userId;
    this.userRole = userRole;
    this.practicasCollection = collection(db, "practicas");
    this.informesCollection = collection(db, "informes");
  }

  // ===== PRÁCTICAS =====
  async obtenerTodas(filtros = {}) {
    try {
      let q = query(this.practicasCollection, orderBy("fecha_inicio", "desc"));
      
      if (filtros.estudiante) {
        q = query(q, where("id_usuario", "==", filtros.estudiante));
      }
      
      if (filtros.supervisor) {
        q = query(q, where("id_supervisor_empresa", "==", filtros.supervisor));
      }
      
      if (filtros.estado) {
        q = query(q, where("estado_practica", "==", filtros.estado));
      }

      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    } catch (error) {
      console.error("Error obteniendo prácticas:", error);
      throw error;
    }
  }

  async crear(datos) {
    try {
      const nuevaPractica = {
        ...datos,
        id_usuario: datos.id_estudiante || this.userId,
        fecha_inicio: Timestamp.fromDate(new Date(datos.fecha_inicio)),
        fecha_fin: datos.fecha_fin ? Timestamp.fromDate(new Date(datos.fecha_fin)) : null,
        estado_practica: "en_curso",
        horas_realizadas: 0,
        horas_totales: datos.horas_totales || 0,
        fecha_creacion: Timestamp.now(),
      };
      
      const docRef = await addDoc(this.practicasCollection, nuevaPractica);
      return { id: docRef.id, ...nuevaPractica };
    } catch (error) {
      console.error("Error creando práctica:", error);
      throw error;
    }
  }

  async actualizar(practicaId, datos) {
    try {
      const docRef = doc(this.practicasCollection, practicaId);
      const updateData = { ...datos };
      
      if (datos.fecha_inicio) {
        updateData.fecha_inicio = Timestamp.fromDate(new Date(datos.fecha_inicio));
      }
      if (datos.fecha_fin) {
        updateData.fecha_fin = Timestamp.fromDate(new Date(datos.fecha_fin));
      }
      
      updateData.fecha_actualizacion = Timestamp.now();
      
      await updateDoc(docRef, updateData);
      return true;
    } catch (error) {
      console.error("Error actualizando práctica:", error);
      throw error;
    }
  }

  async registrarHoras(practicaId, horas) {
    try {
      const practica = await this.obtenerPorId(practicaId);
      const nuevasHoras = (practica.horas_realizadas || 0) + horas;
      return await this.actualizar(practicaId, { horas_realizadas: nuevasHoras });
    } catch (error) {
      console.error("Error registrando horas:", error);
      throw error;
    }
  }

  async obtenerPorId(practicaId) {
    try {
      const snapshot = await getDocs(
        query(this.practicasCollection, where("__name__", "==", practicaId))
      );
      if (!snapshot.empty) {
        return { id: snapshot.docs[0].id, ...snapshot.docs[0].data() };
      }
      return null;
    } catch (error) {
      console.error("Error obteniendo práctica:", error);
      throw error;
    }
  }

  // ===== INFORMES =====
  async crearInforme(practicaId, datos) {
    try {
      const nuevoInforme = {
        id_practica: practicaId,
        titulo_informe: datos.titulo,
        contenido: datos.contenido,
        tipo_informe: datos.tipo || "semanal",
        fecha_entrega: Timestamp.now(),
        estado: "pendiente",
        evaluacion_supervisor: null,
        calificacion: null,
        creado_por: this.userId,
      };
      
      const docRef = await addDoc(this.informesCollection, nuevoInforme);
      return { id: docRef.id, ...nuevoInforme };
    } catch (error) {
      console.error("Error creando informe:", error);
      throw error;
    }
  }

  async obtenerInformes(practicaId) {
    try {
      const q = query(
        this.informesCollection,
        where("id_practica", "==", practicaId),
        orderBy("fecha_entrega", "desc")
      );
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    } catch (error) {
      console.error("Error obteniendo informes:", error);
      throw error;
    }
  }

  async evaluarInforme(informeId, evaluacion) {
    try {
      const docRef = doc(this.informesCollection, informeId);
      await updateDoc(docRef, {
        evaluacion_supervisor: evaluacion.comentario,
        calificacion: evaluacion.calificacion,
        fecha_evaluacion: Timestamp.now(),
        evaluado_por: this.userId,
        estado: "evaluado",
      });
      return true;
    } catch (error) {
      console.error("Error evaluando informe:", error);
      throw error;
    }
  }
}

