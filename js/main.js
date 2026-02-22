import { AddTaskController } from "./features/add-task.js";
import { MODES, STORAGE_KEY } from "./features/constants.js";
import { KeyboardController } from "./features/keyboard.js";
import { TaskModalController } from "./features/modal.js";
import { ShortcutHelpController } from "./features/shortcut-help.js";
import { LocalStorageTaskStore } from "./features/storage.js";
import { TaskService } from "./features/tasks.js";
import { BoardUI } from "./features/ui.js";

class KanbanApp {
    constructor() {
        this.elements = {
            $taskForm: document.querySelector(".task-form"),
            $addTaskButton: document.querySelector(".button--add"),
            $taskTitleInput: document.getElementById("TASK_TITLE"),
            $taskColumnSelect: document.getElementById("TASK_COLUMN"),
            $taskDueInput: document.getElementById("TASK_DUE"),
            $shortcutHelpOpenButton: document.getElementById("SHORTCUT_HELP_OPEN_BTN"),
            $shortcutHelpModal: document.getElementById("SHORTCUT_HELP_MODAL"),
            $shortcutHelpCloseButton: document.getElementById("SHORTCUT_HELP_CLOSE_BTN"),

            $editModal: document.getElementById("EDIT_MODAL"),
            $modalTitleInput: document.getElementById("MODAL_TITLE"),
            $modalDueInput: document.getElementById("MODAL_DUE"),
            $modalStatusSelect: document.getElementById("MODAL_STATUS"),

            $saveTaskButton: document.getElementById("SAVE_TASK_BTN"),
            $deleteTaskButton: document.getElementById("DELETE_TASK_BTN"),
            $closeModalButton: document.getElementById("CLOSE_MODAL_BTN")
        };

        this.state = {
            mode: MODES.NORMAL,
            selectedTaskId: null,
            pendingDeleteId: null,
            pendingMoveTarget: null
        };

        this.taskStore = new LocalStorageTaskStore(STORAGE_KEY);
        this.taskService = new TaskService(this.taskStore);
        this.modal = null;
        this.ui = null;
        this.addTaskController = null;
        this.keyboardController = null;
        this.shortcutHelpController = null;
    }

    start() {
        this.ui = new BoardUI({
            state: this.state,
            getTasks: () => this.taskService.getTasks(),
            onTaskClick: task => this.modal.openModal(task),
            onDropTask: (taskId, newStatus) => {
                this.taskService.updateTaskStatus(taskId, newStatus);
                this.refresh();
            }
        });

        this.modal = new TaskModalController({
            elements: this.elements,
            taskService: this.taskService,
            onChange: () => this.refresh()
        });

        this.addTaskController = new AddTaskController({
            elements: this.elements,
            taskService: this.taskService,
            onChange: () => this.refresh()
        });

        this.keyboardController = new KeyboardController({
            state: this.state,
            elements: this.elements,
            taskService: this.taskService,
            ui: this.ui,
            modal: this.modal,
            onChange: () => this.refresh()
        });

        this.shortcutHelpController = new ShortcutHelpController({
            elements: this.elements
        });

        this.ui.init();
        this.modal.init();
        this.addTaskController.init();
        this.keyboardController.init();
        this.shortcutHelpController.init();

        this.refresh();
    }

    refresh() {
        this.ui.renderTasks();
    }
}

document.addEventListener("DOMContentLoaded", () => {
    const app = new KanbanApp();
    app.start();
});
