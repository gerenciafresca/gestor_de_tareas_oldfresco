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
        const titles = { info: "📋 Gestor de Tareas", warning: "⚠️ Tarea tardía" };
        new Notification(titles[type] || "Gestor", { body: msg });
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

// ── Toggle filtros ────────────────────────────────────────────
window.toggleFilters = function() {
    const panel  = document.getElementById("filtersPanel");
    const btn    = document.querySelector(".filters-toggle");
    const open   = panel.classList.toggle("hidden");
    btn.textContent = open ? "▼ Filtros" : "▲ Filtros";
};

window.applyFilters = function() {
    renderTasks(window._lastTasks || []);
    updateFilterBadge();
};

window.clearFilters = function() {
    document.getElementById("filterPersona").value   = "todos";
    document.getElementById("filterCategoria").value = "todos";
    document.getElementById("filterPrioridad").value = "todos";
    applyFilters();
};

function updateFilterBadge() {
    const p = document.getElementById("filterPersona").value;
    const c = document.getElementById("filterCategoria").value;
    const r = document.getElementById("filterPrioridad").value;
    const active = [p, c, r].filter(v => v !== "todos").length;
    const btn = document.querySelector(".filters-toggle");
    const isOpen = !document.getElementById("filtersPanel").classList.contains("hidden");
    btn.textContent = `${isOpen ? "▲" : "▼"} Filtros${active > 0 ? ` (${active})` : ""}`;
}

// ── Renderizar ────────────────────────────────────────────────
function renderTasks(tasks) {
    window._lastTasks = tasks;
    const taskList = document.getElementById("taskList");
    taskList.innerHTML = "";

    const fp = document.getElementById("filterPersona")?.value   || "todos";
    const fc = document.getElementById("filterCategoria")?.value || "todos";
    const fr = document.getElementById("filterPrioridad")?.value || "todos";

    const filtered = tasks.filter(({ data }) =>
        (fp === "todos" || data.assigned === fp) &&
        (fc === "todos" || data.category === fc) &&
        (fr === "todos" || data.priority === fr)
    );

    // Pendientes y tardías arriba, completadas al fondo
    filtered.sort((a, b) => {
        if (a.data.completed === b.data.completed) return 0;
        return a.data.completed ? 1 : -1;
    });

    if (filtered.length === 0) {
        taskList.innerHTML = `<p class="empty">No hay tareas con estos filtros.</p>`;
        return;
    }

    filtered.forEach(({ id, data }) => {
        const status = getStatus(data);
        const li = document.createElement("li");
        li.classList.add(status);

        const pCfg = priorityConfig[data.priority] || priorityConfig["Media"];
        li.style.borderRight = `5px solid ${pCfg.color}`;

        const assignedHTML  = data.assigned
            ? `<span class="badge-pill" style="background:${memberColors[data.assigned]||"#6b7280"}">${data.assigned}</span>` : "";
        const categoryHTML  = data.category
            ? `<span class="badge-pill" style="background:${categoryColors[data.category]||"#6b7280"}">${data.category}</span>` : "";
        const priorityHTML  = `<span class="badge-pill" style="background:${pCfg.color}">${pCfg.label}</span>`;
        const dateHTML      = data.dueDate ? `<span class="due-date">📅 ${formatDate(data.dueDate)}</span>` : "";
        const statusBadge   = status === "overdue"
            ? `<span class="badge overdue-badge">Tardía</span>`
            : status === "completed" ? `<span class="badge completed-badge">Completada</span>` : "";
        const notesHTML     = data.notes ? `<div class="task-notes">${data.notes}</div>` : "";

        li.innerHTML = `
            <div class="task-info">
                <span class="task-text ${status === "completed" ? "crossed" : ""}">${data.text}</span>
                ${notesHTML}
                <div class="task-meta">
                    ${assignedHTML}${categoryHTML}${priorityHTML}${dateHTML}${statusBadge}
                </div>
            </div>
            <div class="actions">
                <button onclick="toggleTask('${id}', ${data.completed})">${data.completed ? "Pendiente" : "Completar"}</button>
                <button onclick="editTask('${id}')">Editar</button>
                <button onclick="deleteTask('${id}')">Eliminar</button>
            </div>
        `;
        taskList.appendChild(li);
    });
}

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
        if (overdue.length > 0) notify(`⚠️ Tenés ${overdue.length} tarea(s) tardía(s).`, "warning");
        firstLoad = false;
        return;
    }

    snapshot.docChanges().forEach(change => {
        if (change.type === "added" && !knownIds.has(change.doc.id)) {
            knownIds.add(change.doc.id);
            const data = change.doc.data();
            const who  = data.assigned ? ` → ${data.assigned}` : "";
            notify(`📌 Nueva tarea: "${data.text}"${who}`, "info");
        }
    });
});

setInterval(() => {
    const overdue = (window._lastTasks || []).filter(({ data }) => getStatus(data) === "overdue");
    if (overdue.length > 0) notify(`⚠️ ${overdue.length} tarea(s) tardía(s).`, "warning");
}, 30 * 60 * 1000);

// ── CRUD ──────────────────────────────────────────────────────
window.addTask = async function () {
    const text = document.getElementById("taskInput").value.trim();
    if (text === "") { alert("Ingrese el nombre de la tarea"); return; }

    await addDoc(tasksCol, {
        text,
        assigned:  document.getElementById("assignedInput").value  || null,
        category:  document.getElementById("categoryInput").value  || null,
        priority:  document.getElementById("priorityInput").value  || "Media",
        notes:     document.getElementById("notesInput").value.trim() || null,
        dueDate:   document.getElementById("dateInput").value      || null,
        completed: false,
        createdAt: Date.now()
    });

    ["taskInput","notesInput","dateInput"].forEach(id => document.getElementById(id).value = "");
    document.getElementById("assignedInput").value = "";
    document.getElementById("categoryInput").value = "";
    document.getElementById("priorityInput").value = "Media";
};

window.toggleTask = async function (id, current) {
    await updateDoc(doc(db, "tasks", id), { completed: !current });
};

window.editTask = async function (id) {
    const task = window._lastTasks.find(t => t.id === id);
    if (!task) return;
    const d = task.data;

    const newText     = prompt("Nombre de la tarea:", d.text);
    if (!newText?.trim()) return;
    const members     = ["Cristian","Andrés","Ignacio","Felipe","Fabian","Diego"];
    const categories  = ["Producción","Logística","Marketing","Artistas","Finanzas"];
    const priorities  = ["Alta","Media","Baja"];
    const newAssigned = prompt(`Responsable (${members.join(", ")}) o vacío:`, d.assigned || "");
    const newCategory = prompt(`Categoría (${categories.join(", ")}) o vacío:`, d.category || "");
    const newPriority = prompt(`Prioridad (${priorities.join(", ")}):`, d.priority || "Media");
    const newNotes    = prompt("Notas:", d.notes || "");
    const newDate     = prompt("Fecha (YYYY-MM-DD) o vacío:", d.dueDate || "");

    await updateDoc(doc(db, "tasks", id), {
        text:     newText.trim(),
        assigned: members.includes(newAssigned?.trim())    ? newAssigned.trim()  : null,
        category: categories.includes(newCategory?.trim()) ? newCategory.trim()  : null,
        priority: priorities.includes(newPriority?.trim()) ? newPriority.trim()  : "Media",
        notes:    newNotes?.trim() || null,
        dueDate:  newDate?.trim()  || null,
    });
};

window.deleteTask = async function (id) {
    if (confirm("¿Eliminar tarea?")) await deleteDoc(doc(db, "tasks", id));
};