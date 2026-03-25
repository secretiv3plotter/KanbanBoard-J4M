import { apiClient } from "../../shared/apiClient.js";
import { WS_BASE_URL } from "../../shared/config.js";
import { clearSession } from "../../shared/session.js";

function createId(prefix) {
    if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
        return `${prefix}_${crypto.randomUUID()}`;
    }

    return `${prefix}_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

function parseDate(value) {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? 0 : parsed.getTime();
}

function normalizeDue(value) {
    if (value === undefined) {
        return undefined;
    }

    if (value === null || value === "") {
        return null;
    }

    return String(value);
}

function normalizeStatus(value) {
    const status = String(value || "todo");
    return ["todo", "doing", "done"].includes(status) ? status : "todo";
}

function normalizeServerTask(task) {
    const due = task.due ?? task.due_date ?? null;
    const createdAt = task.created_at || task.createdAt || new Date().toISOString();
    const updatedAt = task.updated_at || task.updatedAt || createdAt;

    return {
        id: String(task.id),
        serverId: String(task.id),
        title: String(task.title || ""),
        due: due === null ? "" : String(due),
        status: normalizeStatus(task.status),
        createdAt,
        updatedAt,
        syncState: "synced"
    };
}

function normalizePendingCreateOp(taskId, payload) {
    return {
        id: createId("op"),
        type: "create",
        localId: taskId,
        payload: {
            title: String(payload.title || ""),
            due: payload.due === undefined || payload.due === null || payload.due === "" ? null : String(payload.due),
            status: normalizeStatus(payload.status),
            createdAt: payload.createdAt || new Date().toISOString()
        },
        createdAt: Date.now()
    };
}

function normalizePendingUpdateOp(taskId, serverId, changes) {
    return {
        id: createId("op"),
        type: "update",
        localId: taskId,
        serverId: serverId || null,
        changes,
        createdAt: Date.now()
    };
}

function normalizePendingDeleteOp(taskId, serverId) {
    return {
        id: createId("op"),
        type: "delete",
        localId: taskId,
        serverId: serverId || null,
        createdAt: Date.now()
    };
}

function mergeTasks(baseTasks, pendingOps) {
    const tasks = new Map();

    baseTasks.forEach(task => {
        tasks.set(task.id, { ...task });
    });

    const orderedOps = [...pendingOps].sort((left, right) => left.createdAt - right.createdAt);

    orderedOps.forEach(op => {
        if (op.type === "create") {
            if (!tasks.has(op.localId)) {
                tasks.set(op.localId, {
                    id: op.localId,
                    serverId: op.serverId || null,
                    title: op.payload.title,
                    due: op.payload.due || "",
                    status: normalizeStatus(op.payload.status),
                    createdAt: op.payload.createdAt || new Date(op.createdAt).toISOString(),
                    updatedAt: op.payload.createdAt || new Date(op.createdAt).toISOString(),
                    syncState: op.serverId ? "synced" : "pending-create"
                });
            }
            return;
        }

        const targetId = op.serverId || op.localId;
        const task = tasks.get(targetId) || tasks.get(op.localId);
        if (!task) {
            return;
        }

        if (op.type === "update") {
            if (op.changes.title !== undefined) {
                task.title = String(op.changes.title);
            }

            if (op.changes.due !== undefined) {
                task.due = op.changes.due === null ? "" : String(op.changes.due);
            }

            if (op.changes.status !== undefined) {
                task.status = normalizeStatus(op.changes.status);
            }

            task.updatedAt = new Date(op.createdAt).toISOString();
            if (task.syncState !== "pending-create") {
                task.syncState = op.serverId ? "synced" : "pending-update";
            }
        }

        if (op.type === "delete") {
            tasks.delete(targetId);
            tasks.delete(op.localId);
        }
    });

    return [...tasks.values()].sort((left, right) => {
        const createdDiff = parseDate(right.createdAt) - parseDate(left.createdAt);
        if (createdDiff !== 0) {
            return createdDiff;
        }

        return parseDate(right.updatedAt) - parseDate(left.updatedAt);
    });
}

export class TaskService {
    constructor({ session, taskStore, onChange }) {
        this.session = session;
        this.taskStore = taskStore;
        this.onChange = onChange || (() => {});
        this.state = this.taskStore.loadState();
        this.lastDeleted = null;
        this.syncing = false;
        this.syncRequested = false;
        this.ws = null;
        this.reconnectTimer = null;
        this.destroyed = false;
        this.handleOnline = () => {
            if (!this.destroyed) {
                this.scheduleSync();
            }
        };
        this.handleVisibilityChange = () => {
            if (!this.destroyed && document.visibilityState === "visible") {
                this.scheduleSync();
            }
        };
    }

    async init() {
        if (this.destroyed) {
            return;
        }

        window.addEventListener("online", this.handleOnline);
        document.addEventListener("visibilitychange", this.handleVisibilityChange);

        if (navigator.onLine) {
            await this.pullServerSnapshot();
        }

        await this.syncPendingOps();
        this.connectWebSocket();
        this.persistAndNotify();
    }

    persistAndNotify() {
        this.taskStore.saveState(this.state);
        this.onChange();
    }

    getVisibleTasks() {
        return mergeTasks(this.state.serverTasks, this.state.pendingOps);
    }

    getTasks() {
        return this.getVisibleTasks();
    }

    getTaskById(taskId) {
        return this.getVisibleTasks().find(task => task.id === taskId) || null;
    }

    getTaskByIdOrThrow(taskId) {
        const task = this.getTaskById(taskId);
        if (!task) {
            throw new Error(`Task not found: ${taskId}`);
        }

        return task;
    }

    addTask({ title, due, status }) {
        const trimmedTitle = String(title || "").trim();
        if (!trimmedTitle) {
            throw new Error("Task title is required.");
        }

        const localId = createId("task");
        const createdAt = new Date().toISOString();

        this.state.pendingOps.push(normalizePendingCreateOp(localId, {
            title: trimmedTitle,
            due: normalizeDue(due),
            status: normalizeStatus(status),
            createdAt
        }));

        this.persistAndNotify();
        this.scheduleSync();

        return this.getTaskById(localId);
    }

    updateTaskStatus(taskId, newStatus) {
        return this.updateTask(taskId, { status: newStatus });
    }

    updateTask(taskId, updates) {
        const trimmedTitle = updates.title === undefined ? undefined : String(updates.title).trim();
        if (trimmedTitle === "") {
            throw new Error("Task title cannot be empty.");
        }

        const currentTask = this.getTaskByIdOrThrow(taskId);
        const payload = {};

        if (trimmedTitle !== undefined) {
            payload.title = trimmedTitle;
        }

        if (updates.due !== undefined) {
            payload.due = normalizeDue(updates.due);
        }

        if (updates.status !== undefined) {
            payload.status = normalizeStatus(updates.status);
        }

        const createOp = this.state.pendingOps.find(op => op.type === "create" && op.localId === taskId);
        if (createOp) {
            if (payload.title !== undefined) {
                createOp.payload.title = payload.title;
            }

            if (payload.due !== undefined) {
                createOp.payload.due = payload.due;
            }

            if (payload.status !== undefined) {
                createOp.payload.status = payload.status;
            }

            this.persistAndNotify();
            this.scheduleSync();
            return;
        }

        const existingUpdateOp = this.state.pendingOps.find(op => op.type === "update" && op.localId === taskId);
        if (existingUpdateOp) {
            existingUpdateOp.changes = {
                ...existingUpdateOp.changes,
                ...payload
            };
        } else {
            this.state.pendingOps.push(normalizePendingUpdateOp(taskId, currentTask.serverId || currentTask.id, payload));
        }

        this.persistAndNotify();
        this.scheduleSync();
    }

    deleteTask(taskId, recordUndo = false) {
        const currentTask = this.getTaskByIdOrThrow(taskId);
        const index = this.getVisibleTasks().findIndex(task => task.id === taskId);
        const pendingDeleteOp = this.state.pendingOps.find(op => op.type === "delete" && op.localId === taskId);

        if (!recordUndo) {
            this.lastDeleted = null;
        }

        if (recordUndo) {
            this.lastDeleted = {
                task: { ...currentTask },
                index,
                mode: currentTask.syncState === "pending-create" ? "create" : "delete",
                deleteOpId: pendingDeleteOp?.id || null
            };
        }

        this.state.pendingOps = this.state.pendingOps.filter(op => op.localId !== taskId || op.type === "delete");

        if (currentTask.syncState === "pending-create") {
            this.state.pendingOps = this.state.pendingOps.filter(op => op.localId !== taskId);
            this.persistAndNotify();
            return;
        }

        if (!pendingDeleteOp) {
            this.state.pendingOps.push(normalizePendingDeleteOp(taskId, currentTask.serverId || currentTask.id));
        }

        this.persistAndNotify();
        this.scheduleSync();
    }

    hasUndoDelete() {
        return Boolean(this.lastDeleted);
    }

    undoDelete() {
        if (!this.lastDeleted) {
            throw new Error("No deleted task available to undo.");
        }

        const deleted = this.lastDeleted;
        this.lastDeleted = null;

        if (deleted.mode === "create") {
            const existingCreate = this.state.pendingOps.find(op => op.type === "create" && op.localId === deleted.task.id);
            if (!existingCreate) {
                this.state.pendingOps.push(normalizePendingCreateOp(deleted.task.id, deleted.task));
            }

            this.persistAndNotify();
            this.scheduleSync();
            return;
        }

        if (deleted.deleteOpId) {
            this.state.pendingOps = this.state.pendingOps.filter(op => op.id !== deleted.deleteOpId);
            this.persistAndNotify();
            this.scheduleSync();
            return;
        }

        this.state.pendingOps.push(normalizePendingCreateOp(deleted.task.id, deleted.task));
        this.persistAndNotify();
        this.scheduleSync();
    }

    scheduleSync() {
        if (this.destroyed || this.syncRequested) {
            return;
        }

        this.syncRequested = true;
        Promise.resolve().then(() => {
            this.syncRequested = false;
            void this.syncPendingOps();
        });
    }

    async pullServerSnapshot() {
        if (this.destroyed || !this.session?.token || !navigator.onLine) {
            return;
        }

        try {
            const serverTasks = await apiClient.getTasks();
            this.state.serverTasks = Array.isArray(serverTasks) ? serverTasks.map(normalizeServerTask) : [];
            this.persistAndNotify();
        } catch (error) {
            if (error?.status === 401) {
                this.handleAuthFailure();
            }
        }
    }

    async syncPendingOps() {
        if (this.destroyed || this.syncing || !this.session?.token || !navigator.onLine) {
            return;
        }

        this.syncing = true;

        try {
            await this.pullServerSnapshot();

            while (this.state.pendingOps.length > 0) {
                const op = this.state.pendingOps[0];
                try {
                    if (op.type === "create") {
                        const task = op.payload;
                        const result = await apiClient.createTask({
                            title: task.title,
                            due: task.due,
                            status: task.status
                        });

                        const createdTask = normalizeServerTask(result.task || result);
                        this.state.serverTasks = this.upsertServerTask(this.state.serverTasks, createdTask);

                        this.state.pendingOps.shift();
                        this.state.pendingOps.forEach(queuedOp => {
                            if (queuedOp.localId === op.localId && !queuedOp.serverId) {
                                queuedOp.serverId = createdTask.id;
                            }
                        });

                        this.persistAndNotify();
                        continue;
                    }

                    const targetTask = this.getTaskById(op.serverId || op.localId);
                    if (!targetTask && op.type !== "delete") {
                        this.state.pendingOps.shift();
                        this.persistAndNotify();
                        continue;
                    }

                    if (op.type === "update") {
                        const result = await apiClient.updateTask({
                            id: op.serverId || op.localId,
                            ...op.changes
                        });

                        const updatedTask = normalizeServerTask(result.task || result);
                        this.state.serverTasks = this.upsertServerTask(this.state.serverTasks, updatedTask);
                        this.state.pendingOps.shift();
                        this.persistAndNotify();
                        continue;
                    }

                    if (op.type === "delete") {
                        if (!op.serverId && targetTask?.syncState === "pending-create") {
                            this.state.pendingOps.shift();
                            this.persistAndNotify();
                            continue;
                        }

                        await apiClient.deleteTask(op.serverId || op.localId);
                        this.state.serverTasks = this.state.serverTasks.filter(task => task.id !== String(op.serverId || op.localId));
                        this.state.pendingOps.shift();
                        this.persistAndNotify();
                    }
                } catch (error) {
                    if (error?.status === 401) {
                        this.handleAuthFailure();
                        return;
                    }

                    if (error?.status === 404 || error?.status === 409) {
                        this.state.pendingOps.shift();
                        this.persistAndNotify();
                        continue;
                    }

                    throw error;
                }
            }

            await this.pullServerSnapshot();
        } catch (error) {
            if (error?.status === 401) {
                this.handleAuthFailure();
            }
        } finally {
            this.syncing = false;
        }
    }

    upsertServerTask(tasks, task) {
        const next = tasks.filter(existing => existing.id !== task.id);
        next.push(task);
        return next;
    }

    connectWebSocket() {
        if (!this.session?.token || !("WebSocket" in window)) {
            return;
        }

        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            return;
        }

        try {
            this.ws = new WebSocket(`${WS_BASE_URL}?token=${encodeURIComponent(this.session.token)}`);
        } catch {
            return;
        }

        this.ws.addEventListener("message", event => {
            try {
                const payload = JSON.parse(event.data);
                if (payload.type === "tasks.updated" && Array.isArray(payload.data?.tasks)) {
                    this.state.serverTasks = payload.data.tasks.map(normalizeServerTask);
                    this.persistAndNotify();
                    this.scheduleSync();
                }
            } catch {
                // Ignore malformed websocket payloads.
            }
        });

        this.ws.addEventListener("close", () => {
            if (this.destroyed) {
                return;
            }

            if (this.reconnectTimer) {
                clearTimeout(this.reconnectTimer);
            }

            if (!navigator.onLine || !this.session?.token) {
                return;
            }

            this.reconnectTimer = setTimeout(() => {
                this.connectWebSocket();
            }, 2000);
        });
    }

    destroy() {
        this.destroyed = true;
        window.removeEventListener("online", this.handleOnline);
        document.removeEventListener("visibilitychange", this.handleVisibilityChange);

        if (this.reconnectTimer) {
            clearTimeout(this.reconnectTimer);
            this.reconnectTimer = null;
        }

        if (this.ws) {
            this.ws.close();
            this.ws = null;
        }
    }

    handleAuthFailure() {
        clearSession();
        this.destroy();
        window.location.replace("./auth.html");
    }
}
