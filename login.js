/**
 * login.js — Pàgina de login
 */

import { loginWithGoogle, onAuthReady, showToast } from './assets/js/auth.js';

/* Si ja hi ha sessió, redirigir directament */
onAuthReady((user) => {
  if (user) {
    const next = new URLSearchParams(window.location.search).get('next') || 'mapa.html';
    window.location.href = next;
  }
});

/* ── Login amb Google ── */
document.getElementById('btn-google-login').addEventListener('click', async () => {
  const loading = document.getElementById('loading');
  loading.classList.remove('hidden');
  try {
    await loginWithGoogle();
    // onAuthReady gestionarà la redirecció
  } catch (err) {
    loading.classList.add('hidden');
    let msg = '❌ Error en iniciar sessió.';
    if (err.code === 'auth/popup-closed-by-user') {
      msg = 'Has tancat la finestra de Google. Torna a intentar-ho!';
    } else if (err.code === 'auth/popup-blocked') {
      msg = 'El navegador ha bloquejat la finestra emergent. Activa els popups!';
    }
    showToast(msg, 'error', 5000);
  }
});
