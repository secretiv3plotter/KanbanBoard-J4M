export class TaskService {
    constructor(taskStore) {
        this.taskStore = taskStore;
        this.lastDeleted = null;
    }

    getTasks() {
        return this.taskStore.getTasks();
    }

    addTask({ title, due, status }) {
        const trimmedTitle = title.trim();
        if (!trimmedTitle) {
            throw new Error("Task title is required.");
        }

        const tasks = this.getTasks();
        const newTask = {
            id: Date.now().toString(),
            title: trimmedTitle,
            due,
            status
        };

        tasks.push(newTask);
        this.taskStore.saveTasks(tasks);
        return newTask;
    }

    getTaskById(taskId) {
        return this.getTasks().find(task => task.id === taskId) || null;
    }

    getTaskByIdOrThrow(taskId) {
        const task = this.getTaskById(taskId);
        if (!task) {
            throw new Error(`Task not found: ${taskId}`);
        }
        return task;
    }

    updateTaskStatus(taskId, newStatus) {
        const tasks = this.getTasks();
        const hasTask = tasks.some(task => task.id === taskId);
        if (!hasTask) {
            throw new Error(`Task not found: ${taskId}`);
        }
        const updated = tasks.map(task => {
            if (task.id === taskId) {
                return { ...task, status: newStatus };
            }
            return task;
        });

        this.taskStore.saveTasks(updated);
    }

    updateTask(taskId, updates) {
        const tasks = this.getTasks();
        const targetIndex = tasks.findIndex(task => task.id === taskId);
        if (targetIndex === -1) {
            throw new Error(`Task not found: ${taskId}`);
        }

        tasks[targetIndex] = {
            ...tasks[targetIndex],
            ...updates,
            title: updates.title !== undefined ? updates.title.trim() : tasks[targetIndex].title
        };

        this.taskStore.saveTasks(tasks);
    }

    deleteTask(taskId, recordUndo = false) {
        const tasks = this.getTasks();
        const index = tasks.findIndex(task => task.id === taskId);
        if (index === -1) {
            throw new Error(`Task not found: ${taskId}`);
        }

        const task = tasks[index];
        const updated = tasks.slice(0, index).concat(tasks.slice(index + 1));

        if (recordUndo) {
            this.lastDeleted = { task, index };
        }

        this.taskStore.saveTasks(updated);
    }

    hasUndoDelete() {
        return Boolean(this.lastDeleted);
    }

    undoDelete() {
        if (!this.lastDeleted) {
            throw new Error("No deleted task available to undo.");
        }

        const tasks = this.getTasks();
        const insertIndex = Math.min(this.lastDeleted.index, tasks.length);
        tasks.splice(insertIndex, 0, this.lastDeleted.task);
        this.taskStore.saveTasks(tasks);
        this.lastDeleted = null;
    }
}
