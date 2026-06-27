import { initializeApp } from "https://www.gstatic.com/firebasejs/12.15.0/firebase-app.js";
import {
    getFirestore, collection, addDoc, updateDoc,
    deleteDoc, doc, onSnapshot, query, orderBy
} from "https://www.gstatic.com/firebasejs/12.15.0/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyBEdPk6-rvCnP3cHcFfsMmzyAsfmkdI5W4",
    authDomain: "gestor-de-tareas-old-fresco.firebaseapp.com",
    projectId: "gestor-de-tareas-old-fresco",
    storageBucket: "gestor-de-tareas-old-fresco.firebasestorage.app",
    messagingSenderId: "1032150577943",
    appId: "1:1032150577943:web:3534a53c73c533ae21fd52",
    measurementId: "G-55Q9J86NRR"
};

const app = initializeApp(firebaseConfig);
const db  = getFirestore(app);
const tasksCol = collection(db, "tasks");

let editingId = null;

const ARTISTS = ["Pirlo", "Lucho SSJ", "Akapellah", "Big Soto", "Tussiwarrios", "Kase.O"];
const GROUP_ORDER = [...ARTISTS, "General"];

const memberColors = {
    "Cristian": "#2563eb", "Andrés": "#7c3aed",
    "Ignacio":  "#0891b2", "Felipe": "#d97706",
    "Fabian":   "#be185d", "Diego":  "#059669",
};

const categoryColors = {
    "Producción": "#6366f1", "Logística": "#0ea5e9",
    "Marketing":  "#ec4899", "Artistas":  "#f59e0b",
    "Finanzas":   "#10b981",
};

const priorityConfig = {
    "Alta":  { color: "#e53e3e", label: "Alta" },
    "Media": { color: "#d97706", label: "Media" },
    "Baja":  { color: "#38a169", label: "Baja" },
};

// ── Notificaciones ────────────────────────────────────────────
async function requestNotificationPermission() {
    if ("Notification" in window && Notification.permission === "default")
        await Notification.requestPermission();
}
requestNotificationPermission();

function showBanner(msg, type = "info") {
    const banner = document.getElementById("banner");
    banner.textContent = msg;
    banner.className = `banner ${type}`;
    clearTimeout(banner._timeout);
    banner._timeout = setTimeout(() => { banner.className = "banner hidden"; }, 4000);
}

function notify(msg, type = "info") {
    showBanner(msg, type);
    if ("Notification" in window && Notification.permission === "granted") {
        new Notification("Old Fresco", { body: msg });
    }
}

// ── Helpers ───────────────────────────────────────────────────
function getStatus(task) {
    if (task.completed) return "completed";
    if (!task.dueDate)  return "pending";
    const today = new Date(); today.setHours(0,0,0,0);
    return new Date(task.dueDate + "T00:00:00") < today ? "overdue" : "pending";
}

function formatDate(dateStr) {
    if (!dateStr) return "";
    const [y, m, d] = dateStr.split("-");
    return `${d}/${m}/${y}`;
}

// ── Resumen ───────────────────────────────────────────────────
function updateSummary(tasks) {
    const total     = tasks.length;
    const pending   = tasks.filter(({ data }) => getStatus(data) === "pending").length;
    const overdue   = tasks.filter(({ data }) => getStatus(data) === "overdue").length;
    const completed = tasks.filter(({ data }) => getStatus(data) === "completed").length;

    document.getElementById("summary").innerHTML = `
        <span class="sum-item sum-total">${total} total</span>
        <span class="sum-item sum-pending">${pending} pendiente${pending !== 1 ? "s" : ""}</span>
        ${overdue > 0 ? `<span class="sum-item sum-overdue">${overdue} tardía${overdue !== 1 ? "s" : ""}</span>` : ""}
        <span class="sum-item sum-completed">${completed} completada${completed !== 1 ? "s" : ""}</span>
    `;
}

// ── Filtros ───────────────────────────────────────────────────
window.toggleFilters = function() {
    const panel = document.getElementById("filtersPanel");
    const btn   = document.querySelector(".filters-toggle");
    const open  = panel.classList.toggle("hidden");
    updateFilterBadge(!open);
};

window.applyFilters = function() {
    renderTasks(window._lastTasks || []);
    updateFilterBadge(!document.getElementById("filtersPanel").classList.contains("hidden"));
};

window.clearFilters = function() {
    document.getElementById("filterArtist").value   = "todos";
    document.getElementById("filterPersona").value  = "todos";
    document.getElementById("filterCategoria").value= "todos";
    document.getElementById("filterPrioridad").value= "todos";
    applyFilters();
};

function updateFilterBadge(isOpen) {
    const a = document.getElementById("filterArtist").value;
    const p = document.getElementById("filterPersona").value;
    const c = document.getElementById("filterCategoria").value;
    const r = document.getElementById("filterPrioridad").value;
    const active = [a, p, c, r].filter(v => v !== "todos").length;
    document.querySelector(".filters-toggle").textContent =
        `${isOpen ? "▲" : "▼"} Filtros${active > 0 ? ` (${active})` : ""}`;
}

// ── Modal ─────────────────────────────────────────────────────
window.openEditModal = function(id) {
    const task = window._lastTasks.find(t => t.id === id);
    if (!task) return;
    const d = task.data;
    editingId = id;

    document.getElementById("editText").value     = d.text || "";
    document.getElementById("editArtist").value   = d.artist || "";
    document.getElementById("editAssigned").value = d.assigned || "";
    document.getElementById("editCategory").value = d.category || "";
    document.getElementById("editPriority").value = d.priority || "Media";
    document.getElementById("editDate").value     = d.dueDate || "";
    document.getElementById("editNotes").value    = d.notes || "";

    document.getElementById("editModal").classList.remove("hidden");
};

window.closeModal = function() {
    document.getElementById("editModal").classList.add("hidden");
    editingId = null;
};

window.saveEdit = async function() {
    if (!editingId) return;
    const newText = document.getElementById("editText").value.trim();
    if (!newText) { alert("El nombre no puede estar vacío"); return; }

    await updateDoc(doc(db, "tasks", editingId), {
        text:     newText,
        artist:   document.getElementById("editArtist").value   || null,
        assigned: document.getElementById("editAssigned").value || null,
        category: document.getElementById("editCategory").value || null,
        priority: document.getElementById("editPriority").value || "Media",
        dueDate:  document.getElementById("editDate").value     || null,
        notes:    document.getElementById("editNotes").value.trim() || null,
    });
    closeModal();
};

document.getElementById("editModal").addEventListener("click", function(e) {
    if (e.target === this) closeModal();
});

// ── Renderizar tarea individual ───────────────────────────────
function taskHTML(id, data) {
    const status   = getStatus(data);
    const pCfg     = priorityConfig[data.priority] || priorityConfig["Media"];

    const assignedHTML = data.assigned
        ? `<span class="badge-pill" style="background:${memberColors[data.assigned]||"#6b7280"}">${data.assigned}</span>` : "";
    const categoryHTML = data.category
        ? `<span class="badge-pill" style="background:${categoryColors[data.category]||"#6b7280"}">${data.category}</span>` : "";
    const priorityHTML = `<span class="badge-pill" style="background:${pCfg.color}">${pCfg.label}</span>`;
    const dateHTML     = data.dueDate ? `<span class="due-date">${formatDate(data.dueDate)}</span>` : "";
    const statusBadge  = status === "overdue"
        ? `<span class="badge overdue-badge">Tardía</span>`
        : status === "completed" ? `<span class="badge completed-badge">Completada</span>` : "";
    const notesHTML    = data.notes ? `<div class="task-notes">${data.notes}</div>` : "";

    return `
        <li class="task-item ${status}" style="border-right: 4px solid ${pCfg.color}">
            <div class="task-info">
                <span class="task-text ${status === "completed" ? "crossed" : ""}">${data.text}</span>
                ${notesHTML}
                <div class="task-meta">
                    ${assignedHTML}${categoryHTML}${priorityHTML}${dateHTML}${statusBadge}
                </div>
            </div>
            <div class="actions">
                <button class="btn-complete" onclick="toggleTask('${id}', ${data.completed})">
                    ${data.completed ? "Pendiente" : "Completar"}
                </button>
                <button class="btn-edit" onclick="openEditModal('${id}')">Editar</button>
                <button class="btn-delete" onclick="deleteTask('${id}')" title="Eliminar">✕</button>
            </div>
        </li>
    `;
}

// ── Renderizar agrupado ───────────────────────────────────────
function renderTasks(tasks) {
    window._lastTasks = tasks;
    updateSummary(tasks);

    const fa = document.getElementById("filterArtist")?.value   || "todos";
    const fp = document.getElementById("filterPersona")?.value  || "todos";
    const fc = document.getElementById("filterCategoria")?.value|| "todos";
    const fr = document.getElementById("filterPrioridad")?.value|| "todos";

    let filtered = tasks.filter(({ data }) =>
        (fa === "todos" || (data.artist || null) === (fa === "" ? null : fa)) &&
        (fp === "todos" || data.assigned === fp) &&
        (fc === "todos" || data.category === fc) &&
        (fr === "todos" || data.priority === fr)
    );

    // Agrupar por artista
    const groups = {};
    filtered.forEach(task => {
        const key = task.data.artist || "General";
        if (!groups[key]) groups[key] = [];
        groups[key].push(task);
    });

    // Ordenar dentro de cada grupo: pendientes arriba, completadas abajo
    Object.values(groups).forEach(g => {
        g.sort((a, b) => {
            if (a.data.completed === b.data.completed) return 0;
            return a.data.completed ? 1 : -1;
        });
    });

    const taskList = document.getElementById("taskList");

    if (Object.keys(groups).length === 0) {
        taskList.innerHTML = `<p class="empty">No hay tareas con estos filtros.</p>`;
        return;
    }

    // Ordenar grupos: artistas primero, General al final
    const sortedKeys = Object.keys(groups).sort((a, b) => {
        const ai = GROUP_ORDER.indexOf(a);
        const bi = GROUP_ORDER.indexOf(b);
        return (ai === -1 ? 999 : ai) - (bi === -1 ? 999 : bi);
    });

    taskList.innerHTML = sortedKeys.map(key => {
        const groupTasks = groups[key];
        const pending  = groupTasks.filter(t => !t.data.completed).length;
        const total    = groupTasks.length;

        return `
            <div class="group">
                <div class="group-header" onclick="toggleGroup('${key}')">
                    <div class="group-title">
                        <span class="group-name">${key}</span>
                        <span class="group-count">${pending} pendiente${pending !== 1 ? "s" : ""} · ${total} total</span>
                    </div>
                    <span class="group-chevron" id="chevron-${key.replace(/\s/g,'-').replace(/\./g,'')}">▼</span>
                </div>
                <ul class="group-list" id="group-${key.replace(/\s/g,'-').replace(/\./g,'')}">
                    ${groupTasks.map(({ id, data }) => taskHTML(id, data)).join("")}
                </ul>
            </div>
        `;
    }).join("");
}

window.toggleGroup = function(key) {
    const safeKey = key.replace(/\s/g,'-').replace(/\./g,'');
    const list    = document.getElementById(`group-${safeKey}`);
    const chevron = document.getElementById(`chevron-${safeKey}`);
    list.classList.toggle("collapsed");
    chevron.textContent = list.classList.contains("collapsed") ? "▶" : "▼";
};

// ── Firebase listener ─────────────────────────────────────────
let firstLoad = true;
let knownIds  = new Set();

const q = query(tasksCol, orderBy("createdAt"));
onSnapshot(q, (snapshot) => {
    const tasks = snapshot.docs.map(d => ({ id: d.id, data: d.data() }));
    renderTasks(tasks);

    if (firstLoad) {
        tasks.forEach(t => knownIds.add(t.id));
        const overdue = tasks.filter(({ data }) => getStatus(data) === "overdue");
        if (overdue.length > 0) notify(`${overdue.length} tarea(s) tardía(s).`);
        firstLoad = false;
        return;
    }

    snapshot.docChanges().forEach(change => {
        if (change.type === "added" && !knownIds.has(change.doc.id)) {
            knownIds.add(change.doc.id);
            const data = change.doc.data();
            const who  = data.assigned ? ` — ${data.assigned}` : "";
            notify(`Nueva tarea: "${data.text}"${who}`);
        }
    });
});

setInterval(() => {
    const overdue = (window._lastTasks || []).filter(({ data }) => getStatus(data) === "overdue");
    if (overdue.length > 0) notify(`${overdue.length} tarea(s) tardía(s).`, "warning");
}, 30 * 60 * 1000);

// ── CRUD ──────────────────────────────────────────────────────
window.addTask = async function () {
    const text = document.getElementById("taskInput").value.trim();
    if (text === "") { alert("Ingrese el nombre de la tarea"); return; }

    await addDoc(tasksCol, {
        text,
        artist:    document.getElementById("artistInput").value   || null,
        assigned:  document.getElementById("assignedInput").value || null,
        category:  document.getElementById("categoryInput").value || null,
        priority:  document.getElementById("priorityInput").value || "Media",
        notes:     document.getElementById("notesInput").value.trim() || null,
        dueDate:   document.getElementById("dateInput").value     || null,
        completed: false,
        createdAt: Date.now()
    });

    ["taskInput","notesInput","dateInput"].forEach(id => document.getElementById(id).value = "");
    document.getElementById("artistInput").value   = "";
    document.getElementById("assignedInput").value = "";
    document.getElementById("categoryInput").value = "";
    document.getElementById("priorityInput").value = "Media";
};

window.toggleTask = async function (id, current) {
    await updateDoc(doc(db, "tasks", id), { completed: !current });
};

window.deleteTask = async function (id) {
    if (confirm("¿Eliminar esta tarea?")) await deleteDoc(doc(db, "tasks", id));
};
