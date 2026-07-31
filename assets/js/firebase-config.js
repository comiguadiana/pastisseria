/**
 * firebase-config.js — Pastisseria Guadiana
 * Configuració de Firebase (autenticació + Firestore)
 *
 * ⚠️  IMPORTANT: Substitueix aquest objecte firebaseConfig amb
 *     les credencials del teu projecte Firebase.
 *     Ves a: https://console.firebase.google.com
 *     → El teu projecte → Configuració del projecte → Apps web
 */

// TODO: Substitueix amb les teves credencials reals
const firebaseConfig = {
  apiKey: "AIzaSyDqPWAZaL4FfIlGL05FxUOGUYBeOF7a3u8",
  authDomain: "pastiseriaguadiana.firebaseapp.com",
  projectId: "pastiseriaguadiana",
  storageBucket: "pastiseriaguadiana.firebasestorage.app",
  messagingSenderId: "66882919424",
  appId: "1:66882919424:web:b509360b7654b5a7890ce5"
};

// Importa Firebase des de CDN
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getAuth, GoogleAuthProvider }
  from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { getFirestore }
  from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

// Inicialitza
const app       = initializeApp(firebaseConfig);
const auth      = getAuth(app);
const db        = getFirestore(app);
const provider  = new GoogleAuthProvider();

export { app, auth, db, provider };
