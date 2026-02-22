export class BoardUI {
    constructor({ state, getTasks, onTaskClick, onDropTask }) {
        this.state = state;
        this.getTasks = getTasks;
        this.onTaskClick = onTaskClick;
        this.onDropTask = onDropTask;
        this.$moveIndicator = null;
    }

    init() {
        this.bindDragAndDrop();
    }

    getTaskLists() {
        return Array.from(document.querySelectorAll(".kanban-board__task-list"));
    }

    getColumns() {
        return Array.from(document.querySelectorAll(".kanban-board__column"));
    }

    getTasksInColumn($column) {
        return Array.from($column.querySelectorAll(".kanban-task"));
    }

    renderTasks() {
        this.clearBoard();
        this.appendTasks();
        this.restoreTaskFocus();
        this.updateSelectionVisuals();
    }

    clearBoard() {
        this.getTaskLists().forEach($taskList => {
            while ($taskList.firstChild) {
                $taskList.removeChild($taskList.firstChild);
            }
        });
    }

    appendTasks() {
        this.getTasks().forEach(task => this.appendTask(task));
    }

    appendTask(task) {
        const $task = this.createTaskElement(task);
        const $taskList = document.querySelector(`.kanban-board__column[data-column="${task.status}"] .kanban-board__task-list`);
        if ($taskList) {
            $taskList.appendChild($task);
        }
    }

    restoreTaskFocus() {
        if (!this.state.selectedTaskId) return;
        const $selected = document.querySelector(`.kanban-task[data-task-id="${this.state.selectedTaskId}"]`);
        if ($selected) {
            $selected.focus();
        }
    }

    createTaskElement(task) {
        const $task = document.createElement("div");
        $task.classList.add("kanban-task");
        $task.draggable = true;
        $task.dataset.taskId = task.id;
        $task.tabIndex = 0;
        $task.setAttribute("role", "button");

        const $title = document.createElement("span");
        $title.className = "kanban-task__title";
        $title.textContent = task.title;
        $task.appendChild($title);

        this.appendDueDate($task, task.due);
        this.bindTaskEvents($task, task);
        return $task;
    }

    appendDueDate($task, dueDate) {
        if (!dueDate) return;
        const $due = document.createElement("span");
        $due.className = "kanban-task__due";
        $due.textContent = `Due: ${this.formatDueDate(dueDate)}`;
        $task.appendChild($due);
    }

    formatDueDate(dueDate) {
        const parsedDate = new Date(`${dueDate}T00:00:00`);
        if (Number.isNaN(parsedDate.getTime())) {
            return dueDate;
        }
        const day = parsedDate.getDate();
        const month = parsedDate.toLocaleString("en-US", { month: "long" });
        const year = parsedDate.getFullYear();
        return `${day} ${month}, ${year}`;
    }

    bindTaskEvents($task, task) {
        $task.addEventListener("click", () => this.handleTaskClick(task));
        $task.addEventListener("focus", () => this.handleTaskFocus($task));
        $task.addEventListener("blur", () => this.handleTaskBlur());
        $task.addEventListener("dragstart", () => this.handleTaskDragStart($task));
        $task.addEventListener("dragend", () => this.handleTaskDragEnd($task));
    }

    handleTaskClick(task) {
        this.onTaskClick(task);
    }

    handleTaskFocus($task) {
        this.state.selectedTaskId = $task.dataset.taskId;
        this.updateSelectionVisuals();
    }

    handleTaskBlur() {
        this.updateSelectionVisuals();
    }

    handleTaskDragStart($task) {
        $task.classList.add("kanban-task--dragging");
    }

    handleTaskDragEnd($task) {
        $task.classList.remove("kanban-task--dragging");
    }

    showMoveIndicator() {
        if (this.$moveIndicator) return;
        this.$moveIndicator = this.createMoveIndicator();
        document.body.appendChild(this.$moveIndicator);
    }

    createMoveIndicator() {
        const $indicator = document.createElement("div");
        $indicator.className = "move-indicator";
        $indicator.textContent = "Move mode: (1) Todo, (2) Doing, (3) Done. Esc to cancel.";
        return $indicator;
    }

    hideMoveIndicator() {
        if (!this.$moveIndicator) return;
        this.$moveIndicator.remove();
        this.$moveIndicator = null;
    }

    updateSelectionVisuals() {
        document.querySelectorAll(".kanban-task").forEach($task => {
            $task.classList.toggle("kanban-task--selected", $task.dataset.taskId === this.state.selectedTaskId);
            $task.classList.toggle("kanban-task--pending-delete", $task.dataset.taskId === this.state.pendingDeleteId);
            $task.classList.toggle("kanban-task--move-target", this.shouldMarkMoveTarget($task));
        });
    }

    shouldMarkMoveTarget($task) {
        return Boolean(this.state.pendingMoveTarget) && $task.dataset.taskId === this.state.selectedTaskId;
    }

    moveFocusInMoveMode(next = true) {
        const targets = this.buildMoveTargets();
        const activeIndex = targets.indexOf(document.activeElement);
        const nextIndex = this.getNextFocusIndex(activeIndex, targets.length, next);
        const $target = targets[nextIndex];
        if ($target) {
            $target.focus();
        }
    }

    buildMoveTargets() {
        const targets = [];
        this.getColumns().forEach($column => {
            targets.push($column);
            this.getTasksInColumn($column).forEach($task => targets.push($task));
        });
        return targets;
    }

    getNextFocusIndex(activeIndex, size, next) {
        if (activeIndex === -1) {
            return next ? 0 : size - 1;
        }
        if (next && activeIndex >= size - 1) return 0;
        if (!next && activeIndex <= 0) return size - 1;
        return next ? activeIndex + 1 : activeIndex - 1;
    }

    focusAdjacentTask(direction) {
        const $active = document.activeElement;
        if (!$active) return;
        const $column = $active.closest(".kanban-board__column");
        if (!$column) return;

        const tasks = this.getTasksInColumn($column);
        if (!tasks.length) return;

        const activeTaskIndex = tasks.indexOf($active.classList.contains("kanban-task") ? $active : null);
        if (activeTaskIndex === -1) {
            this.focusBoundaryTask(tasks, direction);
            return;
        }

        const $nextTask = tasks[activeTaskIndex + direction];
        if ($nextTask) {
            $nextTask.focus();
        }
    }

    focusBoundaryTask(tasks, direction) {
        const boundaryIndex = direction === 1 ? 0 : tasks.length - 1;
        tasks[boundaryIndex].focus();
    }

    focusAdjacentColumn(direction) {
        const columns = this.getColumns();
        const $active = document.activeElement;
        const currentIndex = columns.indexOf($active.closest(".kanban-board__column"));
        if (currentIndex === -1) return;

        const $nextColumn = columns[currentIndex + direction];
        if ($nextColumn) {
            $nextColumn.focus();
        }
    }

    showUndoToast() {
        const $toast = document.createElement("div");
        $toast.className = "undo-toast";
        $toast.textContent = "Task deleted. Press Ctrl+Z to undo.";
        document.body.appendChild($toast);
        setTimeout(() => $toast.remove(), 5000);
    }

    bindDragAndDrop() {
        this.getTaskLists().forEach($taskList => {
            $taskList.addEventListener("dragover", event => this.handleTaskListDragOver(event));
            $taskList.addEventListener("drop", event => this.handleTaskListDrop(event, $taskList));
        });
    }

    handleTaskListDragOver(event) {
        event.preventDefault();
    }

    handleTaskListDrop(event, $taskList) {
        event.preventDefault();
        const $draggedTask = document.querySelector(".kanban-task--dragging");
        if (!$draggedTask) return;

        const taskId = $draggedTask.dataset.taskId;
        const newStatus = $taskList.closest(".kanban-board__column").dataset.column;
        this.onDropTask(taskId, newStatus);
    }
}
