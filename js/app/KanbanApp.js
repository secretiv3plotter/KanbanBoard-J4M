import { BoardUI } from "../features/board/BoardUI.js";
import { KeyboardController } from "../features/keyboard/KeyboardController.js";
import { ShortcutHelpController } from "../features/shortcut-help/ShortcutHelpController.js";
import { AddTaskController } from "../features/tasks/AddTaskController.js";
import { LocalStorageTaskStore } from "../features/tasks/LocalStorageTaskStore.js";
import { TaskModalController } from "../features/tasks/TaskModalController.js";
import { TaskService } from "../features/tasks/TaskService.js";
import { AuthService } from "../features/auth/AuthService.js";
import { MODES } from "../shared/constants.js";

export class KanbanApp {
    constructor() {
        this.elements = {
            $taskForm: document.querySelector(".task-form"),
            $addTaskButton: document.querySelector(".action-button--add"),
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
            $closeModalButton: document.getElementById("CLOSE_MODAL_BTN"),
            $logoutButton: document.getElementById("LOGOUT_BTN")
        };

        this.state = {
            mode: MODES.NORMAL,
            selectedTaskId: null,
            pendingDeleteId: null,
            pendingMoveTarget: null
        };

        this.taskStore = new LocalStorageTaskStore(this.authService);
        this.taskService = new TaskService(this.taskStore);
        this.authService = new AuthService();
        this.modal = null;
        this.ui = null;
        this.addTaskController = null;
        this.keyboardController = null;
        this.shortcutHelpController = null;
    }

    start() {
        if (!this.authService.isLoggedIn()) {
            window.location.href = "login.html";
            return;
        }

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

        this.elements.$logoutButton.addEventListener("click", () => this.handleLogout());

        this.refresh();
    }

    handleLogout() {
        this.authService.logout();
        window.location.href = "login.html";
    }

    refresh() {
        this.ui.renderTasks();
    }
}
