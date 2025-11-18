// Módulo de evaluaciones para supervisores
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

export class EvaluacionesManager {
  constructor(userId) {
    this.userId = userId;
    this.collection = collection(db, "evaluaciones");
  }

  async crear(practicaId, datos) {
    try {
      const nuevaEvaluacion = {
        id_practica: practicaId,
        id_supervisor: this.userId,
        tipo: datos.tipo || "mensual",
        criterios: datos.criterios || {},
        calificacion_general: datos.calificacion_general,
        comentarios: datos.comentarios || "",
        fecha_evaluacion: Timestamp.now(),
        estado: "completada",
      };
      
      const docRef = await addDoc(this.collection, nuevaEvaluacion);
      return { id: docRef.id, ...nuevaEvaluacion };
    } catch (error) {
      console.error("Error creando evaluación:", error);
      throw error;
    }
  }

  async obtenerPorPractica(practicaId) {
    try {
      const q = query(
        this.collection,
        where("id_practica", "==", practicaId),
        orderBy("fecha_evaluacion", "desc")
      );
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    } catch (error) {
      console.error("Error obteniendo evaluaciones:", error);
      throw error;
    }
  }

  async obtenerPendientes() {
    try {
      // Obtener prácticas asignadas al supervisor
      const practicasCollection = collection(db, "practicas");
      const q = query(
        practicasCollection,
        where("id_supervisor_empresa", "==", this.userId),
        where("estado_practica", "==", "en_curso")
      );
      
      const snapshot = await getDocs(q);
      const practicas = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      // Obtener informes pendientes de evaluación
      const informesCollection = collection(db, "informes");
      const informesPendientes = [];
      
      for (const practica of practicas) {
        const informesQ = query(
          informesCollection,
          where("id_practica", "==", practica.id),
          where("estado", "==", "pendiente")
        );
        const informesSnap = await getDocs(informesQ);
        informesSnap.docs.forEach(doc => {
          informesPendientes.push({
            id: doc.id,
            ...doc.data(),
            practica: practica
          });
        });
      }
      
      return informesPendientes;
    } catch (error) {
      console.error("Error obteniendo pendientes:", error);
      throw error;
    }
  }
}

