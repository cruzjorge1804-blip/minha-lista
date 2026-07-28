import {
  auth,
  db,
  colorForName,
  initials,
  getSavedName,
  saveName
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

const milestonesRef = collection(db, "milestones");

// ---------- Elementos ----------
const nameGate = document.getElementById("name-gate");
const nameForm = document.getElementById("name-form");
const nameInput = document.getElementById("name-input");
const appEl = document.getElementById("app");
const whoAmI = document.getElementById("who-am-i");
const statusBanner = document.getElementById("status-banner");
const groupsEl = document.getElementById("milestone-groups");
const emptyState = document.getElementById("empty-state");
const toggleAddBtn = document.getElementById("toggle-add");
const addForm = document.getElementById("add-form");
const yearSelect = document.getElementById("ms-year");
const monthSelect = document.getElementById("ms-month");
const dayInput = document.getElementById("ms-day");
const titleInput = document.getElementById("ms-title");
const notesInput = document.getElementById("ms-notes");

// ---------- Preenche o seletor de ano (ano atual até +4) ----------
const nowYear = new Date().getFullYear();
for (let y = nowYear; y <= nowYear + 4; y++) {
  const opt = document.createElement("option");
  opt.value = y;
  opt.textContent = `${y}年`;
  yearSelect.appendChild(opt);
}

// ---------- Nome do usuário ----------
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
  const next = prompt("名前を変更:", current);
  if (next && next.trim()) {
    saveName(next.trim());
    paintWhoAmI();
    renderAll();
  }
});

// ---------- Mostrar/ocultar formulário ----------
toggleAddBtn.addEventListener("click", () => {
  addForm.classList.toggle("hidden");
  if (!addForm.classList.contains("hidden")) {
    titleInput.focus();
  }
});

// ---------- Status ----------
function showStatus(msg) {
  statusBanner.textContent = msg;
  statusBanner.classList.remove("hidden");
}
function hideStatus() {
  statusBanner.classList.add("hidden");
}
window.addEventListener("offline", () => showStatus("オフラインです — 保存された最新のバージョンを表示しています。"));
window.addEventListener("online", () => hideStatus());

// ---------- Autenticação ----------
signInAnonymously(auth).catch((err) => {
  showStatus("接続できませんでした。Firebaseの設定を確認してください。");
  console.error(err);
});

onAuthStateChanged(auth, (user) => {
  if (user) startListening();
});

// ---------- Sincronização em tempo real ----------
let milestones = [];

function startListening() {
  const q = query(milestonesRef, orderBy("sortKey", "asc"));
  onSnapshot(
    q,
    (snapshot) => {
      milestones = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
      renderAll();
    },
    (err) => {
      showStatus("計画表の同期エラーが発生しました。");
      console.error(err);
    }
  );
}

// ---------- Render ----------
function monthGroupLabel(year, month) {
  return `${year}年${month}月`;
}

function dayLabel(m) {
  return m.day ? `${m.month}/${m.day}` : `${m.month}月`;
}

function renderAll() {
  groupsEl.innerHTML = "";

  if (milestones.length === 0) {
    emptyState.classList.remove("hidden");
    return;
  }
  emptyState.classList.add("hidden");

  const groups = new Map();
  for (const m of milestones) {
    const key = `${m.year}-${String(m.month).padStart(2, "0")}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(m);
  }

  for (const [key, items] of groups) {
    const [year, month] = key.split("-").map(Number);
    groupsEl.appendChild(buildGroup(year, month, items));
  }
}

function buildGroup(year, month, items) {
  const section = document.createElement("section");
  section.className = "milestone-group";

  const heading = document.createElement("h2");
  heading.className = "milestone-group-heading";
  heading.textContent = monthGroupLabel(year, month);
  section.appendChild(heading);

  for (const m of items) {
    section.appendChild(buildMilestoneCard(m));
  }

  return section;
}

function buildMilestoneCard(m) {
  const card = document.createElement("div");
  card.className = "milestone-card" + (m.done ? " done" : "");

  const checkBtn = document.createElement("button");
  checkBtn.className = "check-btn";
  checkBtn.setAttribute("aria-label", m.done ? "チェックを外す" : "完了にする");
  checkBtn.textContent = m.done ? "✓" : "";
  checkBtn.addEventListener("click", () => toggleDone(m));

  const body = document.createElement("div");
  body.className = "milestone-body";

  const dateTag = document.createElement("span");
  dateTag.className = "milestone-date-tag";
  dateTag.textContent = dayLabel(m);

  const title = document.createElement("p");
  title.className = "milestone-title";
  title.textContent = m.title;

  const head = document.createElement("div");
  head.className = "milestone-head";
  head.appendChild(dateTag);
  head.appendChild(title);
  body.appendChild(head);

  if (m.notes) {
    const notes = document.createElement("p");
    notes.className = "milestone-notes";
    notes.textContent = m.notes;
    body.appendChild(notes);
  }

  const meta = document.createElement("div");
  meta.className = "item-meta";
  const who = m.done ? m.doneByName : m.addedByName;
  const action = m.done ? "完了" : "追加";
  if (who) {
    const dot = document.createElement("span");
    dot.className = "meta-dot";
    dot.style.background = colorForName(who);
    meta.appendChild(dot);
    const label = document.createElement("span");
    label.textContent = `${who}が${action}`;
    meta.appendChild(label);
  }
  body.appendChild(meta);

  const deleteBtn = document.createElement("button");
  deleteBtn.className = "delete-btn";
  deleteBtn.setAttribute("aria-label", "項目を削除");
  deleteBtn.textContent = "×";
  deleteBtn.addEventListener("click", () => removeMilestone(m.id));

  card.appendChild(checkBtn);
  card.appendChild(body);
  card.appendChild(deleteBtn);
  return card;
}

// ---------- Ações ----------
async function toggleDone(m) {
  const name = getSavedName() || "だれか";
  try {
    await updateDoc(doc(db, "milestones", m.id), {
      done: !m.done,
      doneByName: !m.done ? name : null,
      doneAt: !m.done ? serverTimestamp() : null
    });
  } catch (err) {
    showStatus("この変更を保存できませんでした。");
    console.error(err);
  }
}

async function removeMilestone(id) {
  try {
    await deleteDoc(doc(db, "milestones", id));
  } catch (err) {
    showStatus("この項目を削除できませんでした。");
    console.error(err);
  }
}

addForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const title = titleInput.value.trim();
  if (!title) return;

  const year = Number(yearSelect.value);
  const month = Number(monthSelect.value);
  const day = dayInput.value ? Number(dayInput.value) : null;
  const notes = notesInput.value.trim();
  const sortKey = year * 10000 + month * 100 + (day || 0);
  const name = getSavedName() || "だれか";

  titleInput.value = "";
  notesInput.value = "";
  dayInput.value = "";
  addForm.classList.add("hidden");

  try {
    await addDoc(milestonesRef, {
      year,
      month,
      day,
      title,
      notes: notes || null,
      sortKey,
      done: false,
      addedByName: name,
      createdAt: serverTimestamp()
    });
  } catch (err) {
    showStatus("項目を追加できませんでした。");
    console.error(err);
  }
});

// ---------- Service worker ----------
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("sw.js").catch((err) => console.error(err));
  });
}
