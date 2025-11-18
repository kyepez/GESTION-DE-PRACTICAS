// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration

const firebaseConfig = {
  apiKey: "AIzaSyB1xCzEy61zPsnuW9VCkbYfcZItTeU-Hjo",
  authDomain: "gestion-de-practicas-3ed66.firebaseapp.com",
  projectId: "gestion-de-practicas-3ed66",
  storageBucket: "gestion-de-practicas-3ed66.firebasestorage.app",
  messagingSenderId: "165505941156",
  appId: "1:165505941156:web:4597643dc32e7c74daf031"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

const provider = new GoogleAuthProvider();

export function auth() {
  const auth = getAuth();

  try {
    const result = signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    const token = credential.accessToken;
    const user = result.user;
  } catch (error) {}
}
// migrate.js
require('dotenv').config();
const admin = require('firebase-admin');
const mysql = require('mysql2/promise');

// Inicializar Firebase Admin
const serviceAccount = require('./serviceAccountKey.json');
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  projectId: process.env.FIREBASE_PROJECT_ID,
});
const db = admin.firestore();

// Configuración MySQL
const mysqlConfig = {
  host: process.env.MYSQL_HOST,
  user: process.env.MYSQL_USER,
  password: process.env.MYSQL_PASSWORD,
  database: process.env.MYSQL_DATABASE,
};

async function migrar() {
  let connection;
  try {
    console.log('Conectando a MySQL...');
    connection = await mysql.createConnection(mysqlConfig);

    console.log('Iniciando migración a Firestore...\n');

    // 1. Migrar usuarios + estudiantes + supervisores
    await migrarUsuarios(connection);

    // 2. Migrar empresas
    await migrarEmpresas(connection);

    // 3. Migrar ofertas
    await migrarOfertas(connection);

    // 4. Migrar aplicaciones
    await migrarAplicaciones(connection);

    // 5. Migrar prácticas
    await migrarPracticas(connection);

    // 6. Migrar informes
    await migrarInformes(connection);

    console.log('\n¡Migración completada con éxito!');
  } catch (error) {
    console.error('Error en migración:', error);
  } finally {
    if (connection) await connection.end();
  }
}

// === MIGRACIÓN DE USUARIOS + ESTUDIANTES + SUPERVISORES ===
async function migrarUsuarios(connection) {
  console.log('Migrando usuarios...');

  const [usuarios] = await connection.query(`
    SELECT * FROM usuarios ORDER BY id_usuario
  `);

  const [estudiantes] = await connection.query(`
    SELECT * FROM estudiantes
  `);

  const [supervisores] = await connection.query(`
    SELECT * FROM supervisores_empresa
  `);

  const estudiantesMap = Object.fromEntries(
    estudiantes.map(e => [e.id_usuario, e])
  );
  const supervisoresMap = Object.fromEntries(
    supervisores.map(s => [s.id_usuario, s])
  );

  const batch = db.batch();
  let count = 0;

  for (const u of usuarios) {
    const docRef = db.collection('usuarios').doc(u.id_usuario.toString());

    const data = {
      uid: u.id_usuario.toString(),
      nombre: u.nombre,
      email: u.email,
      telefono: u.telefono || null,
      direccion: u.direccion || null,
      ciudad: u.ciudad || null,
      fecha_nacimiento: u.fecha_nacimiento ? u.fecha_nacimiento.toISOString().split('T')[0] : null,
      documento: u.documento || null,
      genero: u.genero || null,
      datos_completos: Boolean(u.datos_completos),
      rol: u.rol,
    };

    // Agregar datos de estudiante
    if (u.rol === 'estudiante' && estudiantesMap[u.id_usuario]) {
      const e = estudiantesMap[u.id_usuario];
      Object.assign(data, {
        carrera: e.carrera,
        semestre: e.semestre || null,
        cv_url: e.cv_url || null,
      });
    }

    // Agregar datos de supervisor
    if (u.rol === 'supervisor_empresa' && supervisoresMap[u.id_usuario]) {
      const s = supervisoresMap[u.id_usuario];
      Object.assign(data, {
        cargo: s.cargo || null,
        telefono_supervisor: s.telefono || null,
      });
    }

    batch.set(docRef, data, { merge: true });
    count++;
  }

  await batch.commit();
  console.log(`  ${count} usuarios migrados.`);
}

// === MIGRAR EMPRESAS ===
async function migrarEmpresas(connection) {
  console.log('Migrando empresas...');
  const [rows] = await connection.query(`SELECT * FROM empresas`);
  const batch = db.batch();
  let count = 0;

  for (const e of rows) {
    const docRef = db.collection('empresas').doc(e.id_empresa.toString());
    batch.set(docRef, {
      id_empresa: e.id_empresa,
      nombre_empresa: e.nombre_empresa,
      nit: e.nit || null,
      sector: e.sector || null,
      direccion: e.direccion || null,
      telefono: e.telefono || null,
      email_contacto: e.email_contacto || null,
    }, { merge: true });
    count++;
  }

  await batch.commit();
  console.log(`  ${count} empresas migradas.`);
}

// === MIGRAR OFERTAS ===
async function migrarOfertas(connection) {
  console.log('Migrando ofertas...');
  const [rows] = await connection.query(`SELECT * FROM ofertas_practica`);
  const batch = db.batch();
  let count = 0;

  for (const o of rows) {
    const docRef = db.collection('ofertas').doc(o.id_oferta.toString());
    batch.set(docRef, {
      id_oferta: o.id_oferta,
      id_empresa: o.id_empresa.toString(),
      titulo: o.titulo,
      descripcion: o.descripcion,
      requisitos: o.requisitos || null,
      fecha_publicacion: o.fecha_publicacion.toISOString().split('T')[0],
      fecha_limite: o.fecha_limite ? o.fecha_limite.toISOString().split('T')[0] : null,
      estado: o.estado,
    }, { merge: true });
    count++;
  }

  await batch.commit();
  console.log(`  ${count} ofertas migradas.`);
}

// === MIGRAR APLICACIONES ===
async function migrarAplicaciones(connection) {
  console.log('Migrando aplicaciones...');
  const [rows] = await connection.query(`
    SELECT a.*, e.id_usuario 
    FROM aplicaciones a
    JOIN estudiantes e ON a.id_estudiante = e.id_estudiante
  `);
  const batch = db.batch();
  let count = 0;

  for (const a of rows) {
    const docRef = db.collection('aplicaciones').doc(a.id_aplicacion.toString());
    batch.set(docRef, {
      id_aplicacion: a.id_aplicacion,
      id_estudiante: a.id_estudiante.toString(),
      id_usuario: a.id_usuario.toString(),
      id_oferta: a.id_oferta.toString(),
      estado: a.estado,
      mensaje: a.mensaje || null,
      fecha_aplicacion: a.fecha_aplicacion.toISOString(),
      carta_presentacion: a.carta_presentacion,
    }, { merge: true });
    count++;
  }

  await batch.commit();
  console.log(`  ${count} aplicaciones migradas.`);
}

// === MIGRAR PRÁCTICAS ===
async function migrarPracticas(connection) {
  console.log('Migrando prácticas...');
  const [rows] = await connection.query(`SELECT * FROM practicas`);
  const batch = db.batch();
  let count = 0;

  for (const p of rows) {
    const docRef = db.collection('practicas').doc(p.id_practica.toString());
    batch.set(docRef, {
      id_practica: p.id_practica,
      id_aplicacion: p.id_aplicacion.toString(),
      id_supervisor_empresa: p.id_supervisor_empresa ? p.id_supervisor_empresa.toString() : null,
      fecha_inicio: p.fecha_inicio.toISOString().split('T')[0],
      fecha_fin: p.fecha_fin ? p.fecha_fin.toISOString().split('T')[0] : null,
      estado_practica: p.estado_practica,
      horas_realizadas: p.horas_realizadas || 0,
    }, { merge: true });
    count++;
  }

  await batch.commit();
  console.log(`  ${count} prácticas migradas.`);
}

// === MIGRAR INFORMES ===
async function migrarInformes(connection) {
  console.log('Migrando informes...');
  const [rows] = await connection.query(`SELECT * FROM informes_progreso`);
  const batch = db.batch();
  let count = 0;

  for (const i of rows) {
    const docRef = db.collection('informes').doc(i.id_informe.toString());
    batch.set(docRef, {
      id_informe: i.id_informe,
      id_practica: i.id_practica.toString(),
      titulo_informe: i.titulo_informe,
      contenido: i.contenido,
      tipo_informe: i.tipo_informe,
      evaluacion_supervisor: i.evaluacion_supervisor || null,
      calificacion: i.calificacion ? parseFloat(i.calificacion) : null,
    }, { merge: true });
    count++;
  }

  await batch.commit();
  console.log(`  ${count} informes migrados.`);
}
// js/dashboard.js
import { auth, db } from "../firebase-config.js";
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const userNameEl = document.getElementById("userName");
const btnLogout = document.getElementById("btnLogout");
const contentEl = document.getElementById("content");

btnLogout?.addEventListener("click", () => {
  signOut(auth).then(() => {
    window.location.href = "index.html";
  });
});

onAuthStateChanged(auth, async (user) => {
  if (user) {
    const userRef = doc(db, "usuarios", user.uid);
    const snap = await getDoc(userRef);
    const data = snap.data();

    userNameEl.textContent = data?.nombre || user.displayName;

    // Cargar vista según rol
    switch (data?.rol) {
      case "estudiante":
        loadEstudianteView();
        break;
      case "supervisor_empresa":
        loadSupervisorView();
        break;
      case "administrador":
        loadAdminView();
        break;
      default:
        contentEl.innerHTML = `<h2>Bienvenido, ${data?.nombre}</h2><p>Tu rol está en revisión.</p>`;
    }
  }
});

function loadEstudianteView() {
  contentEl.innerHTML = `
    <h2>Mis Prácticas</h2>
    <div class="card">
      <h3>Buscar Ofertas</h3>
      <p>Explora oportunidades disponibles</p>
      <button class="btn-secondary">Ver Ofertas</button>
    </div>
    <div class="card">
      <h3>Mis Aplicaciones</h3>
      <p>3 pendientes • 1 aceptada</p>
    </div>
  `;
}

function loadSupervisorView() {
  contentEl.innerHTML = `
    <h2>Supervisión</h2>
    <div class="card">
      <h3>Estudiantes Asignados</h3>
      <p>2 en curso</p>
    </div>
    <div class="card">
      <h3>Evaluar Informes</h3>
      <p>5 pendientes</p>
    </div>
  `;
}

function loadAdminView() {
  contentEl.innerHTML = `
    <h2>Administración</h2>
    <div class="card">
      <h3>Empresas</h3>
      <p>Gestión completa</p>
    </div>
    <div class="card">
      <h3>Usuarios</h3>
      <p>Control de roles</p>
    </div>
  `;
}

// Ejecutar
migrar();
