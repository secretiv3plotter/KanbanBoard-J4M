import { MODES, STATUS_BY_SHORTCUT } from "./constants.js";

export class KeyboardController {
    constructor({ state, elements, taskService, ui, modal, onChange }) {
        this.state = state;
        this.elements = elements;
        this.taskService = taskService;
        this.ui = ui;
        this.modal = modal;
        this.onChange = onChange;
    }

    init() {
        document.addEventListener("keydown", event => this.handleKeydown(event));
    }

    getActiveContext() {
        const $active = document.activeElement;
        const activeTag = $active && $active.tagName;
        const isActiveInput = activeTag === "INPUT" || activeTag === "TEXTAREA" || activeTag === "SELECT";
        const isActiveButtonLike = Boolean($active && (activeTag === "BUTTON" || $active.getAttribute("role") === "button"));
        const isActiveTask = Boolean($active && $active.classList.contains("kanban-task"));
        return { $active, isActiveInput, isActiveButtonLike, isActiveTask };
    }

    resetModeState() {
        this.state.mode = MODES.NORMAL;
        this.state.pendingDeleteId = null;
        this.state.pendingMoveTarget = null;
    }

    clearSelectedTask() {
        this.state.selectedTaskId = null;
    }

    handleKeydown(event) {
        const context = this.getActiveContext();
        if (this.handleMoveTab(event)) return;
        if (this.handleEscapeKey(event)) return;
        if (this.handleModalKeys(event, context)) return;
        if (this.handleTaskShortcuts(event, context)) return;
        if (this.handleConfirmKey(event, context)) return;
        if (this.handleMoveModeNumbers(event, context)) return;
        if (this.handleArrowNavigation(event)) return;
        this.handleUndoShortcut(event);
    }

    handleMoveTab(event) {
        if (this.state.mode !== MODES.MOVE || event.key !== "Tab") return false;
        event.preventDefault();
        this.ui.moveFocusInMoveMode(!event.shiftKey);
        return true;
    }

    handleEscapeKey(event) {
        if (event.key !== "Escape") return false;
        if (this.modal.isOpen()) {
            this.modal.closeModal();
        }
        this.resetModeState();
        this.ui.hideMoveIndicator();
        this.ui.updateSelectionVisuals();
        return true;
    }

    handleModalKeys(event, context) {
        if (!this.modal.isOpen()) return false;
        if (event.key !== "Enter") return true;
        if (this.shouldActivateModalButton(context)) {
            context.$active.click();
            return true;
        }
        if (!this.shouldAllowModalInputEnter(context)) {
            event.preventDefault();
        }
        return true;
    }

    shouldActivateModalButton(context) {
        return context.isActiveButtonLike && this.elements.$editModal.contains(context.$active);
    }

    shouldAllowModalInputEnter(context) {
        return context.isActiveInput && this.elements.$editModal.contains(context.$active);
    }

    handleTaskShortcuts(event, context) {
        if (this.handleAddShortcut(event, context)) return true;
        if (this.handleEditShortcut(event, context)) return true;
        if (this.handleMoveShortcut(event, context)) return true;
        return this.handleDeleteShortcut(event, context);
    }

    handleAddShortcut(event, context) {
        if (!(event.key === "n" || event.key === "N") || context.isActiveInput) return false;
        event.preventDefault();
        this.state.mode = MODES.ADD;
        this.elements.$taskTitleInput.focus();
        this.elements.$taskTitleInput.select();
        return true;
    }

    handleEditShortcut(event, context) {
        if (!(event.key === "e" || event.key === "E") || !context.isActiveTask) return false;
        event.preventDefault();
        const task = this.taskService.getTaskByIdOrThrow(context.$active.dataset.taskId);
        this.modal.openModal(task);
        this.state.mode = MODES.EDIT;
        return true;
    }

    handleMoveShortcut(event, context) {
        if (!(event.key === "m" || event.key === "M") || context.isActiveInput) return false;
        event.preventDefault();
        this.state.mode = MODES.MOVE;
        this.state.pendingMoveTarget = null;
        this.state.pendingDeleteId = null;
        if (context.isActiveTask) {
            this.state.selectedTaskId = context.$active.dataset.taskId;
        }
        this.ui.updateSelectionVisuals();
        this.ui.showMoveIndicator();
        return true;
    }

    handleDeleteShortcut(event, context) {
        if (event.key !== "Backspace" || !context.isActiveTask) return false;
        event.preventDefault();
        this.taskService.deleteTask(context.$active.dataset.taskId, true);
        this.ui.showUndoToast();
        this.resetModeState();
        this.clearSelectedTask();
        this.ui.hideMoveIndicator();
        this.onChange();
        return true;
    }

    handleConfirmKey(event, context) {
        if (event.key !== "Enter") return false;
        if (context.isActiveButtonLike) {
            context.$active.click();
        }
        return true;
    }

    handleMoveModeNumbers(event, context) {
        const targetStatus = STATUS_BY_SHORTCUT[event.key];
        if (this.state.mode !== MODES.MOVE || !targetStatus || !context.isActiveTask) return false;
        this.taskService.updateTaskStatus(context.$active.dataset.taskId, targetStatus);
        this.resetModeState();
        this.clearSelectedTask();
        this.ui.hideMoveIndicator();
        this.onChange();
        return true;
    }

    handleArrowNavigation(event) {
        const arrowHandlers = {
            ArrowDown: () => this.ui.focusAdjacentTask(1),
            ArrowUp: () => this.ui.focusAdjacentTask(-1),
            ArrowLeft: () => this.ui.focusAdjacentColumn(-1),
            ArrowRight: () => this.ui.focusAdjacentColumn(1)
        };
        const handler = arrowHandlers[event.key];
        if (!handler) return false;
        handler();
        return true;
    }

    handleUndoShortcut(event) {
        const isUndo = (event.ctrlKey || event.metaKey) && (event.key === "z" || event.key === "Z");
        if (!isUndo || !this.taskService.hasUndoDelete()) return;
        this.taskService.undoDelete();
        this.onChange();
    }
}
