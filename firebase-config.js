// ============================================================
// CONFIGURAÇÃO DO FIREBASE (compartilhada entre as páginas)
// Se você trocar de projeto Firebase, atualize só este arquivo.
// ============================================================
const firebaseConfig = {
  apiKey: "AIzaSyCTRY6opxUv3IBQT_VHPpNqG543EhDW-Hk",
  authDomain: "novo-app-3d354.firebaseapp.com",
  databaseURL: "https://novo-app-3d354-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "novo-app-3d354",
  storageBucket: "novo-app-3d354.firebasestorage.app",
  messagingSenderId: "747833469752",
  appId: "1:747833469752:web:0035c7a2927753e25c6fcd"
};

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

// ---------- Cores fixas para as etiquetas de nome (usado em todas as páginas) ----------
export const AVATAR_COLORS = ["#FF6B4A", "#3F6B57", "#D9A441", "#5B6BB5", "#B5566B", "#4A8B8C"];

export function colorForName(name) {
  const normalized = name.trim().toLowerCase();
  let hash = 0;
  for (let i = 0; i < normalized.length; i++) hash = normalized.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

export function initials(name) {
  return name.trim().slice(0, 2).toUpperCase();
}

export function getSavedName() {
  return localStorage.getItem("lista-nome");
}

export function saveName(name) {
  localStorage.setItem("lista-nome", name);
}

export function clearSavedName() {
  localStorage.removeItem("lista-nome");
}
