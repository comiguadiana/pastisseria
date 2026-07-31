/**
 * auth.js — Gestió d'autenticació i sessió
 * Compartit entre totes les pàgines
 */

import { auth, db, provider } from './firebase-config.js';
import {
  signInWithPopup,
  signOut,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import {
  doc, getDoc, setDoc, updateDoc, serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

/* ─── Estat actual de l'usuari ─── */
let currentUser = null;
let currentProfile = null;

/* ─── Observador d'estat d'autenticació ─── */
export function onAuthReady(callback) {
  return onAuthStateChanged(auth, async (user) => {
    currentUser = user;
    if (user) {
      currentProfile = await getOrCreateProfile(user);
    } else {
      currentProfile = null;
    }
    callback(user, currentProfile);
  });
}

/* ─── Login amb Google ─── */
export async function loginWithGoogle() {
  try {
    const result = await signInWithPopup(auth, provider);
    return result.user;
  } catch (err) {
    console.error('Error login Google:', err);
    throw err;
  }
}

/* ─── Logout ─── */
export async function logout() {
  await signOut(auth);
}

/* ─── Obtenir o crear perfil a Firestore ─── */
export async function getOrCreateProfile(user) {
  const ref  = doc(db, 'users', user.uid);
  const snap = await getDoc(ref);

  if (snap.exists()) {
    const data = snap.data();
    if (!data.unlockedGames) {
      data.unlockedGames = ['pasteblock'];
      await updateDoc(ref, { unlockedGames: data.unlockedGames });
    }
    return data;
  }

  // Primer accés: creem el perfil
  const firstName = user.displayName
    ? user.displayName.split(' ')[0]
    : 'Jugador';

  const profile = {
    uid:          user.uid,
    displayName:  firstName,
    fullName:     user.displayName || firstName,
    email:        user.email,
    avatarSeed:   user.uid.slice(0, 8),
    avatarStyle:  'adventurer',
    totalScore:   0,
    gamesPlayed:  0,
    unlockedGames: ['pasteblock'],
    createdAt:    serverTimestamp(),
    updatedAt:    serverTimestamp()
  };

  await setDoc(ref, profile);
  return profile;
}

/* ─── Actualitzar perfil ─── */
export async function updateProfile(uid, data) {
  const ref = doc(db, 'users', uid);
  await updateDoc(ref, { ...data, updatedAt: serverTimestamp() });
  currentProfile = { ...currentProfile, ...data };
  return currentProfile;
}

/* ─── Obtenir usuari actual ─── */
export function getCurrentUser()    { return currentUser; }
export function getCurrentProfile() { return currentProfile; }

/* ─── Protegir pàgines que requereixen login ─── */
export function requireAuth(redirectTo = '/login.html') {
  return new Promise((resolve, reject) => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      unsub();
      if (user) {
        const profile = await getOrCreateProfile(user);
        resolve({ user, profile });
      } else {
        window.location.href = redirectTo;
        reject(new Error('Not authenticated'));
      }
    });
  });
}

/* ─── Renderitzar navbar amb avatar/nom ─── */
export function renderNavbarUser(profile, user) {
  const avatarEl = document.getElementById('nav-avatar');
  const nameEl   = document.getElementById('nav-username');
  const loginBtn = document.getElementById('nav-login-btn');
  const userArea = document.getElementById('nav-user-area');

  if (!profile) {
    if (loginBtn)  loginBtn.classList.remove('hidden');
    if (userArea)  userArea.classList.add('hidden');
    return;
  }

  if (loginBtn)  loginBtn.classList.add('hidden');
  if (userArea)  userArea.classList.remove('hidden');

  const avatarUrl = getDiceBearUrl(profile.avatarStyle, profile.avatarSeed);
  if (avatarEl)  avatarEl.src = avatarUrl;
  if (nameEl)    nameEl.textContent = profile.displayName;
}

/* ─── URL de l'avatar DiceBear ─── */
export function getDiceBearUrl(style = 'adventurer', seed = 'guadiana', size = 64) {
  return `https://api.dicebear.com/9.x/${style}/svg?seed=${encodeURIComponent(seed)}&size=${size}`;
}

/* ─── Toast (notificació) ─── */
export function showToast(message, type = 'info', duration = 3000) {
  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    document.body.appendChild(container);
  }

  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.textContent = message;
  container.appendChild(toast);

  setTimeout(() => {
    toast.style.animation = 'fade-in 0.3s reverse forwards';
    setTimeout(() => toast.remove(), 300);
  }, duration);
}
