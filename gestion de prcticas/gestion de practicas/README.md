# GestionPrácticas - Sistema de Gestión de Prácticas Universitarias

## 🚀 Inicio Rápido

### Importante: Servidor Local Requerido

Este proyecto usa módulos ES6 que requieren un servidor HTTP. **NO funciona** si abres los archivos directamente (file://).

### Opciones para ejecutar:

#### Opción 1: Firebase Hosting (Recomendado)
```bash
firebase serve
```
Luego abre: http://localhost:5000

#### Opción 2: Python (si tienes Python instalado)
```bash
python -m http.server 8000
```
Luego abre: http://localhost:8000

#### Opción 3: Node.js (si tienes Node.js)
```bash
npx http-server -p 8000
```
Luego abre: http://localhost:8000

#### Opción 4: VS Code Live Server
1. Instala la extensión "Live Server" en VS Code
2. Click derecho en `index.html` → "Open with Live Server"

## 📁 Estructura del Proyecto

```
gestion de practicas/
├── index.html              # Página de inicio y autenticación
├── dashboard.html          # Panel de control principal
├── assets/
│   ├── assets.css         # Estilos de la página principal
│   └── dashboard.css      # Estilos del dashboard
└── js/
    ├── firebase-config.js  # Configuración de Firebase
    ├── auth.js             # Autenticación (Google + Email)
    ├── dashboard.js        # Lógica del dashboard
    ├── ofertas.js          # Gestión de ofertas
    ├── aplicaciones.js     # Gestión de aplicaciones
    ├── practicas.js        # Gestión de prácticas
    └── evaluaciones.js     # Sistema de evaluaciones
```

## 🔐 Funcionalidades de Autenticación

- ✅ Inicio de sesión con Google
- ✅ Registro con correo y contraseña
- ✅ Inicio de sesión con correo y contraseña
- ✅ Recuperación de contraseña
- ✅ Selección de rol al registrarse (Estudiante, Supervisor, Administrador)

## 🎨 Características

- Diseño moderno y profesional
- Modo oscuro
- Responsive (móvil, tablet, desktop)
- Animaciones suaves
- Sistema completo de gestión de prácticas

## 🔧 Configuración Firebase

El proyecto está configurado con:
- Firebase Authentication
- Cloud Firestore
- Firebase Hosting

Las credenciales están en `js/firebase-config.js`

## 📝 Notas

- Asegúrate de tener habilitado Firebase Authentication con Google y Email/Password
- Las colecciones de Firestore se crean automáticamente al usar la aplicación
- El primer usuario se registra como "estudiante" por defecto

## 🐛 Solución de Problemas

Si no ves nada al abrir el archivo:
1. Verifica que estés usando un servidor local (no file://)
2. Abre la consola del navegador (F12) para ver errores
3. Verifica que todos los archivos estén en la carpeta correcta
4. Asegúrate de que Firebase esté configurado correctamente

