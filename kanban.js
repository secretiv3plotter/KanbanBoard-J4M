document.addEventListener("DOMContentLoaded", () => {

    const addBtn = document.querySelector(".btn.add");
    const titleInput = document.getElementById("taskTitle");
    const columnSelect = document.getElementById("taskColumn");
    const dueInput = document.getElementById("taskDue");
    const modal = document.getElementById("editModal");
    const modalTitle = document.getElementById("modalTitle");
    const modalDue = document.getElementById("modalDue");
    const saveBtn = document.getElementById("saveTaskBtn");
    const deleteBtn = document.getElementById("deleteTaskBtn");
    const closeBtn = document.getElementById("closeModalBtn");
    const modalStatus = document.getElementById("modalStatus");

    let currentEditingId = null;
    let mode = "normal"; // normal | add | edit | move
    let selectedTaskId = null;
    let pendingDeleteId = null;
    let pendingMoveTarget = null; // 'todo'|'doing'|'done'
    let lastDeleted = null; // { task, index }
    let moveIndicator = null;

    renderTasks();

    addBtn.addEventListener("click", () => {

        const title = titleInput.value.trim();
        const status = columnSelect.value;
        const due = dueInput.value;

        if (!title) return;

        const newTask = {
            id: Date.now().toString(),
            title: title,
            due: due,
            status: status
        };

        const tasks = getTasks();
        tasks.push(newTask);
        saveTasks(tasks);

        titleInput.value = "";
        dueInput.value = "";

        renderTasks();
    });

    function moveFocusInMoveMode(next = true) {
        const cols = Array.from(document.querySelectorAll('.column'));
        const targets = [];
        cols.forEach(col => {
            targets.push(col);
            const colTasks = Array.from(col.querySelectorAll('.task'));
            colTasks.forEach(t => targets.push(t));
        });

        const active = document.activeElement;
        let idx = targets.indexOf(active);
        if (idx === -1) {
            const toFocus = next ? targets[0] : targets[targets.length - 1];
            if (toFocus) toFocus.focus();
            return;
        }
        idx = next ? idx + 1 : idx - 1;
        if (idx < 0) idx = targets.length - 1;
        if (idx >= targets.length) idx = 0;
        const toFocus = targets[idx];
        if (toFocus) toFocus.focus();
    }

    function getTasks() {
        return JSON.parse(localStorage.getItem("tasks")) || [];
    }

    function saveTasks(tasks) {
        localStorage.setItem("tasks", JSON.stringify(tasks));
    }

    function renderTasks() {

        document.querySelectorAll(".task-list").forEach(col => {
            col.innerHTML = "";
        });

        const tasks = getTasks();

        tasks.forEach(task => {
            const taskElement = createTaskElement(task);

            const column = document.querySelector(
                `.column[data-column="${task.status}"] .task-list`
            );

            column.appendChild(taskElement);
        });

        // restore focus to selected task if present
        if (selectedTaskId) {
            const el = document.querySelector(`.task[data-task-id="${selectedTaskId}"]`);
            if (el) el.focus();
        }
    }

    function createTaskElement(task) {

        const div = document.createElement("div");
        div.classList.add("task");
        div.draggable = true;
        div.dataset.taskId = task.id;
        div.tabIndex = 0;
        div.setAttribute('role','button');

        const title = document.createElement("span");
        title.textContent = task.title;
        div.appendChild(title);

        if (task.due) {
            const due = document.createElement("small");
            due.textContent = " (Due: " + task.due + ")";
            div.appendChild(due);
        }

        // CLICK TO OPEN MODAL
        div.addEventListener("click", () => {
            openModal(task);
        });

        div.addEventListener('focus', () => {
            selectedTaskId = div.dataset.taskId;
            updateSelectionVisuals();
        });

        div.addEventListener('blur', () => {
            // don't clear selectedTaskId here — keep until another focus occurs
            updateSelectionVisuals();
        });

        div.addEventListener("dragstart", () => {
            div.classList.add("dragging");
        });

        div.addEventListener("dragend", () => {
            div.classList.remove("dragging");
        });

        return div;
    }

    function showMoveIndicator() {
        if (!moveIndicator) {
            moveIndicator = document.createElement('div');
            moveIndicator.id = 'moveIndicator';
            moveIndicator.textContent = 'Move mode — (1) Todo, (2) Doing, (3) Done. Esc to cancel.';
            Object.assign(moveIndicator.style, {
                position: 'fixed',
                bottom: '12px',
                left: '50%',
                transform: 'translateX(-50%)',
                background: '#333',
                color: '#fff',
                padding: '8px 12px',
                borderRadius: '6px',
                zIndex: 9999,
                fontSize: '13px'
            });
            document.body.appendChild(moveIndicator);
        }
    }

    function hideMoveIndicator() {
        if (moveIndicator) {
            moveIndicator.remove();
            moveIndicator = null;
        }
    }

    function updateSelectionVisuals() {
        document.querySelectorAll('.task').forEach(t => {
            t.classList.toggle('selected', t.dataset.taskId === selectedTaskId);
            t.classList.toggle('pending-delete', t.dataset.taskId === pendingDeleteId);
            t.classList.toggle('move-target', pendingMoveTarget && t.dataset.taskId === selectedTaskId);
        });
    }

    function getColumns() {
        return Array.from(document.querySelectorAll('.column'));
    }

    function focusAdjacentTask(direction) { // direction: 1 down, -1 up
        const active = document.activeElement;
        if (!active) return;
        let columnEl = active.closest('.column');
        if (!columnEl) return;
        const tasks = Array.from(columnEl.querySelectorAll('.task'));
        if (!tasks.length) return;
        const idx = tasks.indexOf(active.classList.contains('task') ? active : null);
        // if active is column or not a task, focus first/last
        if (idx === -1) {
            const toFocus = direction === 1 ? tasks[0] : tasks[tasks.length - 1];
            toFocus.focus();
            return;
        }
        const next = tasks[idx + direction];
        if (next) next.focus();
    }

    function focusAdjacentColumn(direction) { // -1 left, 1 right
        const cols = getColumns();
        const active = document.activeElement;
        let idx = cols.indexOf(active.closest('.column'));
        if (idx === -1) return;
        const next = cols[idx + direction];
        if (next) next.focus();
        else {
            // if active was column container, focus first/last task in that column
        }
    }

    // Global keyboard handling
    document.addEventListener('keydown', (e) => {

        // identify active element and whether it's an input or interactive control
        const active = document.activeElement;
        const tag = active && active.tagName;
        const activeIsInput = tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT';
        const activeIsButtonLike = !!(active && (
            tag === 'BUTTON' ||
            active.getAttribute && active.getAttribute('role') === 'button' ||
            active.classList && active.classList.contains('btn')
        ));

        // If in move mode, intercept Tab to constrain focus to columns/tasks
        if (mode === 'move' && e.key === 'Tab') {
            e.preventDefault();
            moveFocusInMoveMode(!e.shiftKey);
            return;
        }

        // ESC handling — cancel modes and close modal
        if (e.key === 'Escape') {
            if (!modal.classList.contains('hidden')) {
                closeModal();
            }
            mode = 'normal';
            pendingDeleteId = null;
            pendingMoveTarget = null;
            hideMoveIndicator();
            updateSelectionVisuals();
            return;
        }

        // If modal open: allow typing in inputs; only let Enter activate button-like elements inside modal
        if (!modal.classList.contains('hidden')) {
            if (e.key === 'Enter') {
                // if a button in the modal is focused, activate it
                if (activeIsButtonLike && modal.contains(active)) {
                    active.click();
                    return;
                }
                // allow Enter to behave normally when focused in modal inputs/selects
                if (activeIsInput && modal.contains(active)) {
                    return;
                }
                // otherwise prevent accidental Enter actions
                e.preventDefault();
                return;
            }
            // allow other keys (typing) to behave normally inside modal
        }

        // Add task: N (ignore when typing in inputs)
        if ((e.key === 'n' || e.key === 'N') && !activeIsInput) {
            e.preventDefault();
            mode = 'add';
            titleInput.focus();
            titleInput.select();
            return;
        }

        // Edit task: E (when focused on a task)
        if ((e.key === 'e' || e.key === 'E') && active && active.classList && active.classList.contains('task')) {
            e.preventDefault();
            const id = active.dataset.taskId;
            const tasks = getTasks();
            const task = tasks.find(t => t.id === id);
            if (task) {
                openModal(task);
                mode = 'edit';
            }
            return;
        }

        // Move mode: M (start move mode when not typing)
        if ((e.key === 'm' || e.key === 'M') && !activeIsInput) {
            e.preventDefault();
            mode = 'move';
            pendingMoveTarget = null;
            pendingDeleteId = null;
            if (active && active.classList && active.classList.contains('task')) {
                selectedTaskId = active.dataset.taskId;
            }
            updateSelectionVisuals();
            showMoveIndicator();
            return;
        }

        // Delete: Backspace when focused on a task (immediate delete with undo)
        if (e.key === 'Backspace' && active && active.classList && active.classList.contains('task')) {
            e.preventDefault();
            const id = active.dataset.taskId;
            deleteTask(id, true);
            mode = 'normal';
            pendingDeleteId = null;
            selectedTaskId = null;
            hideMoveIndicator();
            updateSelectionVisuals();
            return;
        }

        // If Enter pressed, only act when focused on interactive elements (buttons/role=button)
        if (e.key === 'Enter') {
            // If focused on a button-like element, trigger its click (this covers task activation)
            if (activeIsButtonLike) {
                active.click();
                return;
            }

            // All other Enter actions are ignored here — additions/saves must be done via buttons
            return;
        }

        // Move mode number keys
        if (mode === 'move') {
            // allow Tab to be handled specially in move mode (handled elsewhere)
            if (e.key === '1' || e.key === '2' || e.key === '3') {
                const map = { '1': 'todo', '2': 'doing', '3': 'done' };
                const target = map[e.key];
                // only act when focused on a task
                if (active && active.classList && active.classList.contains('task')) {
                    const id = active.dataset.taskId;
                    updateTaskStatus(id, target);
                    mode = 'normal';
                    pendingMoveTarget = null;
                    selectedTaskId = null;
                    hideMoveIndicator();
                    renderTasks();
                }
                return;
            }
        }

        // Navigation: Arrow keys when focus is on task or column
        if (e.key === 'ArrowDown') {
            focusAdjacentTask(1);
            return;
        }

        if (e.key === 'ArrowUp') {
            focusAdjacentTask(-1);
            return;
        }

        if (e.key === 'ArrowLeft') {
            focusAdjacentColumn(-1);
            return;
        }

        if (e.key === 'ArrowRight') {
            focusAdjacentColumn(1);
            return;
        }

        // Undo: Ctrl+Z or Cmd+Z
        if ((e.ctrlKey || e.metaKey) && (e.key === 'z' || e.key === 'Z')) {
            if (lastDeleted) {
                const tasks = getTasks();
                const idx = Math.min(lastDeleted.index, tasks.length);
                tasks.splice(idx, 0, lastDeleted.task);
                saveTasks(tasks);
                renderTasks();
                lastDeleted = null;
            }
            return;
        }

    });

    function updateTaskStatus(taskId, newStatus) {

        const tasks = getTasks();

        const updated = tasks.map(task => {
            if (task.id === taskId) {
                task.status = newStatus;
            }
            return task;
        });

        saveTasks(updated);
    }

    function editTask(taskId) {

        const tasks = getTasks();
        const task = tasks.find(t => t.id === taskId);

        const newTitle = prompt("Edit task title:", task.title);
        if (newTitle === null) return;

        const newDue = prompt("Edit due date (YYYY-MM-DD):", task.due);

        task.title = newTitle.trim() || task.title;
        task.due = newDue;

        saveTasks(tasks);
        renderTasks();
    }

    function deleteTask(taskId, record = false) {
        const tasks = getTasks();
        const idx = tasks.findIndex(t => t.id === taskId);
        if (idx === -1) return;
        const task = tasks[idx];
        const updated = tasks.slice(0, idx).concat(tasks.slice(idx + 1));

        if (record) {
            lastDeleted = { task: task, index: idx };
            // show simple toast about undo availability
            const toast = document.createElement('div');
            toast.textContent = 'Task deleted — press Ctrl+Z to undo';
            Object.assign(toast.style, {
                position: 'fixed',
                bottom: '48px',
                left: '50%',
                transform: 'translateX(-50%)',
                background: '#222',
                color: '#fff',
                padding: '6px 10px',
                borderRadius: '6px',
                zIndex: 10000,
                fontSize: '13px'
            });
            document.body.appendChild(toast);
            setTimeout(() => toast.remove(), 5000);
        }

        saveTasks(updated);
        renderTasks();
    }

    function openModal(task) {
        currentEditingId = task.id;
        modalTitle.value = task.title;
        modalDue.value = task.due || "";
        modalStatus.value = task.status;
        modal.classList.remove("hidden");
        // focus input for immediate editing
        setTimeout(() => {
            modalTitle.focus();
            modalTitle.select();
        }, 0);
        modal.dataset.taskId = task.id;
    }

    function closeModal() {
        modal.classList.add("hidden");
        currentEditingId = null;
        delete modal.dataset.taskId;
    }

    saveBtn.addEventListener("click", () => {
        const id = currentEditingId || modal.dataset.taskId;
        const tasks = getTasks();
        const task = tasks.find(t => t.id === id);
        if (!task) return;
        task.title = modalTitle.value.trim();
        task.due = modalDue.value;
        task.status = modalStatus.value;
        saveTasks(tasks);
        renderTasks();
        closeModal();
    });

    deleteBtn.addEventListener("click", () => {
        const id = currentEditingId || modal.dataset.taskId;
        if (!id) return;
        deleteTask(id, true);
        closeModal();
    });

    closeBtn.addEventListener("click", closeModal);

    document.querySelectorAll(".task-list").forEach(column => {

        column.addEventListener("dragover", (e) => {
            e.preventDefault();
        });

        column.addEventListener("drop", (e) => {
            e.preventDefault();

            const dragged = document.querySelector(".dragging");
            if (!dragged) return;

            const taskId = dragged.dataset.taskId;
            const newStatus = column.closest(".column").dataset.column;

            updateTaskStatus(taskId, newStatus);

            renderTasks();
        });
    });

});