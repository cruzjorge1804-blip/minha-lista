import {
  auth,
  db,
  colorForName,
  initials,
  getSavedName,
  saveName,
  clearSavedName
} from "./firebase-config.js";
import {
  signInAnonymously,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  onSnapshot,
  query,
  orderBy,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const itemsRef = collection(db, "items");

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

function paintWhoAmI() {
  const name = getSavedName();
  if (!name) return;
  whoAmI.textContent = initials(name);
  whoAmI.style.background = colorForName(name);
  whoAmI.title = `あなた: ${name} — タップで変更`;
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
  const next = prompt("名前を変更（空欄でログアウト）:", current);
  if (next === null) return;
  const trimmed = next.trim();
  if (trimmed === "") {
    clearSavedName();
    location.reload();
    return;
  }
  saveName(trimmed);
  paintWhoAmI();
});

// ---------- Autenticação anônima ----------
signInAnonymously(auth).catch((err) => {
  showStatus("接続できませんでした。Firebaseの設定を確認してください。");
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

window.addEventListener("offline", () => showStatus("オフラインです — 保存された最新のバージョンを表示しています。"));
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
      showStatus("リストの同期エラーが発生しました。");
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
  checkBtn.setAttribute("aria-label", item.done ? "チェックを外す" : "完了にする");
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
  const action = item.done ? "完了" : "追加";

  if (who) {
    const dot = document.createElement("span");
    dot.className = "meta-dot";
    dot.style.background = colorForName(who);
    meta.appendChild(dot);

    const label = document.createElement("span");
    label.textContent = `${who}が${action}`;
    meta.appendChild(label);
  }

  body.appendChild(text);
  body.appendChild(meta);

  const deleteBtn = document.createElement("button");
  deleteBtn.className = "delete-btn";
  deleteBtn.setAttribute("aria-label", "アイテムを削除");
  deleteBtn.textContent = "×";
  deleteBtn.addEventListener("click", () => removeItem(id));

  li.appendChild(checkBtn);
  li.appendChild(body);
  li.appendChild(deleteBtn);
  return li;
}

// ---------- Ações ----------
async function toggleDone(id, item) {
  const name = getSavedName() || "だれか";
  try {
    await updateDoc(doc(db, "items", id), {
      done: !item.done,
      doneByName: !item.done ? name : null,
      doneAt: !item.done ? serverTimestamp() : null
    });
  } catch (err) {
    showStatus("この変更を保存できませんでした。");
    console.error(err);
  }
}

async function removeItem(id) {
  try {
    await deleteDoc(doc(db, "items", id));
  } catch (err) {
    showStatus("このアイテムを削除できませんでした。");
    console.error(err);
  }
}

addForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const text = itemInput.value.trim();
  if (!text) return;
  const name = getSavedName() || "だれか";

  itemInput.value = "";
  try {
    await addDoc(itemsRef, {
      text,
      done: false,
      addedByName: name,
      createdAt: serverTimestamp()
    });
  } catch (err) {
    showStatus("アイテムを追加できませんでした。");
    console.error(err);
  }
});

// ---------- Service worker (app instalável / offline) ----------
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("sw.js").catch((err) => console.error(err));
  });
}
