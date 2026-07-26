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
  deleteDoc,
  setDoc,
  doc,
  onSnapshot,
  query,
  where,
  orderBy,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const habitsRef = collection(db, "habits");
const logsRef = collection(db, "habitLogs");

// ---------- Elementos ----------
const nameGate = document.getElementById("name-gate");
const nameForm = document.getElementById("name-form");
const nameInput = document.getElementById("name-input");
const appEl = document.getElementById("app");
const whoAmI = document.getElementById("who-am-i");
const habitListEl = document.getElementById("habit-list");
const emptyState = document.getElementById("empty-state");
const addForm = document.getElementById("add-form");
const habitInput = document.getElementById("habit-input");
const statusBanner = document.getElementById("status-banner");
const monthLabel = document.getElementById("month-label");
const prevMonthBtn = document.getElementById("prev-month");
const nextMonthBtn = document.getElementById("next-month");

const MONTH_NAMES = [
  "janeiro", "fevereiro", "março", "abril", "maio", "junho",
  "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"
];

function pad2(n) {
  return String(n).padStart(2, "0");
}

function dateStr(year, monthIndex, day) {
  return `${year}-${pad2(monthIndex + 1)}-${pad2(day)}`;
}

function todayStr() {
  const t = new Date();
  return dateStr(t.getFullYear(), t.getMonth(), t.getDate());
}

function slug(name) {
  return name.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-");
}

// ---------- Nome do usuário ----------
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
    renderAll();
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
window.addEventListener("offline", () => showStatus("Sem conexão — mostrando a última versão salva."));
window.addEventListener("online", () => hideStatus());

// ---------- Autenticação ----------
signInAnonymously(auth).catch((err) => {
  showStatus("Não foi possível conectar. Confira a configuração do Firebase.");
  console.error(err);
});

onAuthStateChanged(auth, (user) => {
  if (user) {
    listenHabits();
    listenLogsForMonth();
  }
});

// ---------- Estado ----------
const today = new Date();
let viewYear = today.getFullYear();
let viewMonth = today.getMonth(); // 0-indexed
let habits = [];
let logsByHabitAndDate = {}; // { habitId: { dateStr: [personName, ...] } }
let unsubscribeLogs = null;

function updateMonthLabel() {
  monthLabel.textContent = `${MONTH_NAMES[viewMonth]} de ${viewYear}`;
}
updateMonthLabel();

prevMonthBtn.addEventListener("click", () => {
  viewMonth -= 1;
  if (viewMonth < 0) { viewMonth = 11; viewYear -= 1; }
  updateMonthLabel();
  listenLogsForMonth();
});

nextMonthBtn.addEventListener("click", () => {
  viewMonth += 1;
  if (viewMonth > 11) { viewMonth = 0; viewYear += 1; }
  updateMonthLabel();
  listenLogsForMonth();
});

// ---------- Firestore: hábitos ----------
function listenHabits() {
  const q = query(habitsRef, orderBy("createdAt", "asc"));
  onSnapshot(
    q,
    (snapshot) => {
      habits = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
      renderAll();
    },
    (err) => {
      showStatus("Erro ao sincronizar os hábitos.");
      console.error(err);
    }
  );
}

// ---------- Firestore: registros do mês ----------
function listenLogsForMonth() {
  if (unsubscribeLogs) unsubscribeLogs();

  const start = dateStr(viewYear, viewMonth, 1);
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const end = dateStr(viewYear, viewMonth, daysInMonth);

  const q = query(logsRef, where("date", ">=", start), where("date", "<=", end));
  unsubscribeLogs = onSnapshot(
    q,
    (snapshot) => {
      logsByHabitAndDate = {};
      snapshot.forEach((docSnap) => {
        const log = docSnap.data();
        if (!logsByHabitAndDate[log.habitId]) logsByHabitAndDate[log.habitId] = {};
        if (!logsByHabitAndDate[log.habitId][log.date]) logsByHabitAndDate[log.habitId][log.date] = [];
        logsByHabitAndDate[log.habitId][log.date].push(log.personName);
      });
      renderAll();
    },
    (err) => {
      showStatus("Erro ao sincronizar o calendário.");
      console.error(err);
    }
  );
}

// ---------- Render ----------
function renderAll() {
  habitListEl.innerHTML = "";

  if (habits.length === 0) {
    emptyState.classList.remove("hidden");
    return;
  }
  emptyState.classList.add("hidden");

  for (const habit of habits) {
    habitListEl.appendChild(buildHabitCard(habit));
  }
}

function buildHabitCard(habit) {
  const card = document.createElement("div");
  card.className = "habit-card";

  const head = document.createElement("div");
  head.className = "habit-card-head";

  const name = document.createElement("p");
  name.className = "habit-name";
  name.textContent = habit.name;

  const deleteBtn = document.createElement("button");
  deleteBtn.className = "habit-delete";
  deleteBtn.setAttribute("aria-label", "Remover hábito");
  deleteBtn.textContent = "×";
  deleteBtn.addEventListener("click", () => removeHabit(habit.id));

  head.appendChild(name);
  head.appendChild(deleteBtn);
  card.appendChild(head);

  const divider = document.createElement("div");
  divider.className = "habit-divider";
  card.appendChild(divider);

  card.appendChild(buildCalendarGrid(habit));

  return card;
}

function buildCalendarGrid(habit) {
  const grid = document.createElement("div");
  grid.className = "calendar-grid";

  const firstWeekday = new Date(viewYear, viewMonth, 1).getDay();
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const myName = getSavedName();
  const t = todayStr();

  for (let i = 0; i < firstWeekday; i++) {
    const empty = document.createElement("div");
    empty.className = "calendar-day empty";
    grid.appendChild(empty);
  }

  for (let day = 1; day <= daysInMonth; day++) {
    const ds = dateStr(viewYear, viewMonth, day);
    const isFuture = ds > t;
    const people = (logsByHabitAndDate[habit.id] && logsByHabitAndDate[habit.id][ds]) || [];
    const meDone = myName && people.includes(myName);

    const cell = document.createElement("button");
    cell.className = "calendar-day" + (isFuture ? " future" : "") + (ds === t ? " today" : "") + (meDone ? " me-done" : "");
    cell.disabled = isFuture;
    cell.setAttribute("aria-label", `${day} — ${people.length} pessoa(s) concluíram`);

    const num = document.createElement("span");
    num.className = "calendar-day-num";
    num.textContent = day;
    cell.appendChild(num);

    if (meDone) {
      const check = document.createElement("span");
      check.className = "calendar-day-check";
      check.textContent = "✓";
      cell.appendChild(check);
    }

    if (people.length > 0) {
      const dots = document.createElement("span");
      dots.className = "calendar-dots";
      for (const person of people.slice(0, 6)) {
        const dot = document.createElement("span");
        dot.className = "calendar-dot";
        dot.style.background = colorForName(person);
        dots.appendChild(dot);
      }
      cell.appendChild(dots);
    }

    if (!isFuture) {
      cell.addEventListener("click", () => toggleDay(habit.id, ds));
    }

    grid.appendChild(cell);
  }

  return grid;
}

// ---------- Ações ----------
async function toggleDay(habitId, ds) {
  const name = getSavedName() || "Alguém";
  const logId = `${habitId}_${ds}_${slug(name)}`;
  const already = (logsByHabitAndDate[habitId] && logsByHabitAndDate[habitId][ds] || []).includes(name);

  try {
    if (already) {
      await deleteDoc(doc(db, "habitLogs", logId));
    } else {
      await setDoc(doc(db, "habitLogs", logId), {
        habitId,
        date: ds,
        personName: name,
        doneAt: serverTimestamp()
      });
    }
  } catch (err) {
    showStatus("Não foi possível salvar essa marcação agora.");
    console.error(err);
  }
}

async function removeHabit(id) {
  try {
    await deleteDoc(doc(db, "habits", id));
  } catch (err) {
    showStatus("Não foi possível remover esse hábito agora.");
    console.error(err);
  }
}

addForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const name = habitInput.value.trim();
  if (!name) return;
  const addedByName = getSavedName() || "Alguém";

  habitInput.value = "";
  try {
    await addDoc(habitsRef, {
      name,
      addedByName,
      createdAt: serverTimestamp()
    });
  } catch (err) {
    showStatus("Não foi possível adicionar o hábito agora.");
    console.error(err);
  }
});

// ---------- Service worker ----------
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("sw.js").catch((err) => console.error(err));
  });
}
