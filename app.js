// ============================================================
// 1) CONFIGURAÇÃO DO FIREBASE
// Troque os valores abaixo pelos do SEU projeto Firebase.
// Você encontra isso em: Configurações do projeto > Geral >
// "Seus apps" > ícone Web (</>) > firebaseConfig
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
import {
  getAuth,
  signInAnonymously,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {
  getFirestore,
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  onSnapshot,
  query,
  orderBy,
  serverTimestamp,
  disableNetwork,
  enableNetwork
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const itemsRef = collection(db, "items");

// ---------- Cores fixas para as etiquetas de nome ----------
const AVATAR_COLORS = ["#FF6B4A", "#3F6B57", "#D9A441", "#5B6BB5", "#B5566B", "#4A8B8C"];

function colorForName(name) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

function initials(name) {
  return name.trim().slice(0, 2).toUpperCase();
}

// ---------- Elementos ----------
const nameGate = document.getElementById("name-gate");
const nameForm = document.getElementById("name-form");
const nameInput = document.getElementById("name-input");
const appEl = document.getElementById("app");
const whoAmI = document.getElementById("who-am-i");
const itemList = document.getElementById("item-list");
const emptyState = document.getElementById("empty-state");
const addForm = document.getElementById("add-form");
const itemInput = document.getElementById("item-input");
const statusBanner = document.getElementById("status-banner");

// ---------- Nome do usuário (guardado no aparelho) ----------
function getSavedName() {
  return localStorage.getItem("lista-nome");
}

function saveName(name) {
  localStorage.setItem("lista-nome", name);
}

function paintWhoAmI() {
  const name = getSavedName();
  if (!name) return;
  whoAmI.textContent = initials(name);
  whoAmI.style.background = colorForName(name);
  whoAmI.title = `Você: ${name} — toque para trocar`;
}

function showApp() {
  nameGate.classList.add("hidden");
  appEl.classList.remove("hidden");
  paintWhoAmI();
}

if (getSavedName()) {
  showApp();
} else {
  nameGate.classList.remove("hidden");
}

nameForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const value = nameInput.value.trim();
  if (!value) return;
  saveName(value);
  showApp();
});

whoAmI.addEventListener("click", () => {
  const current = getSavedName() || "";
  const next = prompt("Trocar nome:", current);
  if (next && next.trim()) {
    saveName(next.trim());
    paintWhoAmI();
  }
});

// ---------- Autenticação anônima ----------
signInAnonymously(auth).catch((err) => {
  showStatus("Não foi possível conectar. Confira a configuração do Firebase.");
  console.error(err);
});

onAuthStateChanged(auth, (user) => {
  if (user) startListening();
});

// ---------- Status online/offline ----------
function showStatus(msg) {
  statusBanner.textContent = msg;
  statusBanner.classList.remove("hidden");
}

function hideStatus() {
  statusBanner.classList.add("hidden");
}

window.addEventListener("offline", () => showStatus("Sem conexão — mostrando a última versão salva."));
window.addEventListener("online", () => hideStatus());

// ---------- Lista em tempo real ----------
function startListening() {
  const q = query(itemsRef, orderBy("createdAt", "asc"));
  onSnapshot(
    q,
    (snapshot) => {
      renderItems(snapshot.docs);
    },
    (err) => {
      showStatus("Erro ao sincronizar a lista.");
      console.error(err);
    }
  );
}

function renderItems(docs) {
  itemList.innerHTML = "";

  if (docs.length === 0) {
    emptyState.classList.remove("hidden");
    return;
  }
  emptyState.classList.add("hidden");

  for (const docSnap of docs) {
    const item = docSnap.data();
    itemList.appendChild(buildItemRow(docSnap.id, item));
  }
}

function buildItemRow(id, item) {
  const li = document.createElement("li");
  li.className = "item-row" + (item.done ? " done" : "");

  const checkBtn = document.createElement("button");
  checkBtn.className = "check-btn";
  checkBtn.setAttribute("aria-label", item.done ? "Desmarcar" : "Marcar como feito");
  checkBtn.textContent = item.done ? "✓" : "";
  checkBtn.addEventListener("click", () => toggleDone(id, item));

  const body = document.createElement("div");
  body.className = "item-body";

  const text = document.createElement("p");
  text.className = "item-text";
  text.textContent = item.text;

  const meta = document.createElement("div");
  meta.className = "item-meta";

  const who = item.done ? item.doneByName : item.addedByName;
  const action = item.done ? "concluído por" : "adicionado por";

  if (who) {
    const dot = document.createElement("span");
    dot.className = "meta-dot";
    dot.style.background = colorForName(who);
    meta.appendChild(dot);

    const label = document.createElement("span");
    label.textContent = `${action} ${who}`;
    meta.appendChild(label);
  }

  body.appendChild(text);
  body.appendChild(meta);

  const deleteBtn = document.createElement("button");
  deleteBtn.className = "delete-btn";
  deleteBtn.setAttribute("aria-label", "Remover item");
  deleteBtn.textContent = "×";
  deleteBtn.addEventListener("click", () => removeItem(id));

  li.appendChild(checkBtn);
  li.appendChild(body);
  li.appendChild(deleteBtn);
  return li;
}

// ---------- Ações ----------
async function toggleDone(id, item) {
  const name = getSavedName() || "Alguém";
  try {
    await updateDoc(doc(db, "items", id), {
      done: !item.done,
      doneByName: !item.done ? name : null,
      doneAt: !item.done ? serverTimestamp() : null
    });
  } catch (err) {
    showStatus("Não foi possível salvar essa alteração agora.");
    console.error(err);
  }
}

async function removeItem(id) {
  try {
    await deleteDoc(doc(db, "items", id));
  } catch (err) {
    showStatus("Não foi possível remover esse item agora.");
    console.error(err);
  }
}

addForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const text = itemInput.value.trim();
  if (!text) return;
  const name = getSavedName() || "Alguém";

  itemInput.value = "";
  try {
    await addDoc(itemsRef, {
      text,
      done: false,
      addedByName: name,
      createdAt: serverTimestamp()
    });
  } catch (err) {
    showStatus("Não foi possível adicionar o item agora.");
    console.error(err);
  }
});

// ---------- Service worker (app instalável / offline) ----------
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("sw.js").catch((err) => console.error(err));
  });
}
