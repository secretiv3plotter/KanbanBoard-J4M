function safeParse(value) {
    if (!value) return null;
    try {
        return JSON.parse(value);
    } catch {
        return null;
    }
}

function createId(prefix) {
    if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
        return `${prefix}_${crypto.randomUUID()}`;
    }

    return `${prefix}_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

function normalizeTaskPayload(task = {}) {
    return {
        title: String(task.title || "").trim(),
        due: task.due === undefined || task.due === null || task.due === "" ? null : String(task.due),
        status: String(task.status || "todo")
    };
}

export class OfflineTaskStore {
    constructor(userId) {
        this.userId = String(userId || "anonymous");
        this.storageKey = `kanban:${this.userId}:tasks-state`;
        this.legacyKey = "tasks";
    }

    getDefaultState() {
        return {
            serverTasks: [],
            pendingOps: [],
            migratedLegacyTasks: false
        };
    }

    normalizeState(state) {
        const defaultState = this.getDefaultState();
        return {
            serverTasks: Array.isArray(state?.serverTasks) ? state.serverTasks : defaultState.serverTasks,
            pendingOps: Array.isArray(state?.pendingOps) ? state.pendingOps : defaultState.pendingOps,
            migratedLegacyTasks: Boolean(state?.migratedLegacyTasks)
        };
    }

    loadState() {
        const stored = safeParse(localStorage.getItem(this.storageKey));
        const state = this.normalizeState(stored);

        if (state.migratedLegacyTasks) {
            return state;
        }

        const legacyTasks = safeParse(localStorage.getItem(this.legacyKey));
        if (!Array.isArray(legacyTasks) || legacyTasks.length === 0) {
            state.migratedLegacyTasks = true;
            return state;
        }

        state.pendingOps = legacyTasks.map(task => {
            const payload = normalizeTaskPayload(task);
            return {
                id: createId("op"),
                type: "create",
                localId: String(task.id || createId("task")),
                payload,
                createdAt: Date.now()
            };
        });
        state.migratedLegacyTasks = true;
        localStorage.removeItem(this.legacyKey);
        this.saveState(state);
        return state;
    }

    saveState(state) {
        localStorage.setItem(this.storageKey, JSON.stringify(this.normalizeState(state)));
    }
}
