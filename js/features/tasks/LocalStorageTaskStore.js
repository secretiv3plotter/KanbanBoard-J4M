export class LocalStorageTaskStore {
    constructor(authService) {
        this.authService = authService;
        this.storageKey = "tasks";
    }

    getTasks() {
        const user = this.authService.getCurrentUser();
        if (!user) return [];
        const allTasks = JSON.parse(localStorage.getItem(this.storageKey)) || {};
        return allTasks[user] || [];
    }

    saveTasks(tasks) {
        const user = this.authService.getCurrentUser();
        if (!user) return;
        const allTasks = JSON.parse(localStorage.getItem(this.storageKey)) || {};
        allTasks[user] = tasks;
        localStorage.setItem(this.storageKey, JSON.stringify(allTasks));
    }
}
