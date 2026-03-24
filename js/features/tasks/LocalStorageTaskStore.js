export class LocalStorageTaskStore {
    constructor() {
        this.storageKey = "tasks";
    }

    getTasks() {
        return JSON.parse(localStorage.getItem(this.storageKey)) || [];
    }

    saveTasks(tasks) {
        localStorage.setItem(this.storageKey, JSON.stringify(tasks));
    }
}
