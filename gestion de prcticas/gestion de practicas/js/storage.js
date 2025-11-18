// Módulo para gestión de archivos (CV, documentos) con Firebase Storage
import { getStorage, ref, uploadBytes, getDownloadURL, deleteObject } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-storage.js";
import { app } from "./firebase-config.js";

const storage = getStorage(app);

export class StorageManager {
  constructor(userId) {
    this.userId = userId;
  }

  async subirCV(archivo) {
    try {
      if (!archivo) throw new Error("No se seleccionó ningún archivo");
      
      // Validar tipo de archivo
      const tiposPermitidos = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
      if (!tiposPermitidos.includes(archivo.type)) {
        throw new Error("Solo se permiten archivos PDF o Word (.pdf, .doc, .docx)");
      }

      // Validar tamaño (máximo 5MB)
      const maxSize = 5 * 1024 * 1024; // 5MB
      if (archivo.size > maxSize) {
        throw new Error("El archivo no puede ser mayor a 5MB");
      }

      const nombreArchivo = `cv_${this.userId}_${Date.now()}.${archivo.name.split('.').pop()}`;
      const storageRef = ref(storage, `cvs/${this.userId}/${nombreArchivo}`);
      
      // Subir archivo
      const snapshot = await uploadBytes(storageRef, archivo);
      const downloadURL = await getDownloadURL(snapshot.ref);
      
      return {
        url: downloadURL,
        nombre: archivo.name,
        tamaño: archivo.size,
        tipo: archivo.type,
        fecha_subida: new Date().toISOString()
      };
    } catch (error) {
      console.error("Error subiendo CV:", error);
      throw error;
    }
  }

  async eliminarCV(url) {
    try {
      const fileRef = ref(storage, url);
      await deleteObject(fileRef);
      return true;
    } catch (error) {
      console.error("Error eliminando CV:", error);
      throw error;
    }
  }

  async subirDocumento(archivo, tipo) {
    try {
      if (!archivo) throw new Error("No se seleccionó ningún archivo");
      
      const nombreArchivo = `${tipo}_${this.userId}_${Date.now()}.${archivo.name.split('.').pop()}`;
      const storageRef = ref(storage, `documentos/${this.userId}/${tipo}/${nombreArchivo}`);
      
      const snapshot = await uploadBytes(storageRef, archivo);
      const downloadURL = await getDownloadURL(snapshot.ref);
      
      return {
        url: downloadURL,
        nombre: archivo.name,
        tipo: tipo,
        fecha_subida: new Date().toISOString()
      };
    } catch (error) {
      console.error("Error subiendo documento:", error);
      throw error;
    }
  }
}

