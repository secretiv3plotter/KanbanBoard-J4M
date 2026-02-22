export class LocalStorageTaskStore {
    constructor(storageKey = "tasks") {
        this.storageKey = storageKey;
    }

    getTasks() {
        return JSON.parse(localStorage.getItem(this.storageKey)) || [];
    }

    saveTasks(tasks) {
        localStorage.setItem(this.storageKey, JSON.stringify(tasks));
    }
}
